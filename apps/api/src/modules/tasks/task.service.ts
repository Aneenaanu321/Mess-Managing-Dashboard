import { Prisma } from "@prisma/client";
import { taskRepository } from "./task.repository";
import {
  CreateTaskInput,
  UpdateTaskInput,
  ListTasksQuery,
  SubmitTaskInput,
  VerifyTaskInput,
  UpdateSopInput,
  ReportIncompleteInput,
  FieldDayQuery,
} from "./task.validation";
import {
  assertRequiredDocsChecked,
  defaultSopChecklist,
  mergeSopChecklist,
  PackingDetails,
  PRE_DAY_ITEMS,
  requiredDocsForJob,
  sectionProgress,
  SopChecklistState,
  WAREHOUSE_ITEMS,
  VISIT_ITEMS,
  EOD_ITEMS,
  DOC_ITEMS_BY_JOB,
} from "./field-sop";
import { ApiError } from "../../utils/ApiError";
import { writeAuditLog } from "../../utils/audit";
import { notificationService } from "../notifications/notification.service";
import { prisma } from "../../config/prisma";
import { financeService } from "../finance/finance.service";
import { RoleKey } from "@prisma/client";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

function asChecklist(value: unknown): SopChecklistState {
  return (value && typeof value === "object" ? value : {}) as SopChecklistState;
}

function asPacking(value: unknown): PackingDetails {
  return (value && typeof value === "object" ? value : {}) as PackingDetails;
}

async function notifyCoordinators(
  companyId: string,
  payload: { title: string; body: string; link: string; emailSubject?: string },
  exceptUserId?: string,
) {
  const coordinators = await prisma.user.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      role: { key: { in: [RoleKey.SALES_COORDINATOR, RoleKey.SALES_MANAGER, RoleKey.SUPER_ADMIN] } },
      ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
    },
    select: { id: true },
    take: 20,
  });
  await Promise.all(
    coordinators.map((u) =>
      notificationService.notify({
        userId: u.id,
        type: "SYSTEM",
        title: payload.title,
        body: payload.body,
        link: payload.link,
        emailSubject: payload.emailSubject ?? payload.title,
        linkLabel: "Open job",
      }),
    ),
  );
}

type JobMailEvent =
  | "assigned"
  | "reassigned"
  | "received"
  | "started"
  | "submitted"
  | "done"
  | "blocked"
  | "originals_returned";

/** In-app + email alert for a job lifecycle event (respects user emailNotifications). */
async function notifyJobParty(params: {
  userId: string | null | undefined;
  exceptUserId?: string;
  event: JobMailEvent;
  jobId: string;
  jobTitle: string;
  detail?: string;
  actorName?: string;
}) {
  const { userId, exceptUserId, event, jobId, jobTitle, detail, actorName } = params;

  const who = actorName?.trim() || "Someone";
  const link = `/team-tasks/${jobId}`;

  const copy: Record<JobMailEvent, { type: "ASSIGNMENT" | "SYSTEM"; title: string; body: string; emailSubject: string }> = {
    assigned: {
      type: "ASSIGNMENT",
      title: "New job assigned",
      emailSubject: `New job assigned: ${jobTitle}`,
      body: `You've been assigned a new job: "${jobTitle}". Open it to review the schedule, checklist, and docs.`,
    },
    reassigned: {
      type: "ASSIGNMENT",
      title: "Job assigned to you",
      emailSubject: `Job assigned to you: ${jobTitle}`,
      body: `A job was assigned to you: "${jobTitle}". Open it to review details and mark it as received.`,
    },
    received: {
      type: "SYSTEM",
      title: "Job received by assignee",
      emailSubject: `Job received: ${jobTitle}`,
      body: `${who} marked "${jobTitle}" as received/seen.`,
    },
    started: {
      type: "SYSTEM",
      title: "Job started",
      emailSubject: `Job started: ${jobTitle}`,
      body: `${who} started work on "${jobTitle}".`,
    },
    submitted: {
      type: "SYSTEM",
      title: "Job submitted for review",
      emailSubject: `Job submitted for review: ${jobTitle}`,
      body: `${who} submitted "${jobTitle}" for verification. Please review docs/payment and close the job.`,
    },
    done: {
      type: "SYSTEM",
      title: "Job verified & closed",
      emailSubject: `Job done: ${jobTitle}`,
      body: `"${jobTitle}" was verified and closed. Return original documents at end of day if not already done.`,
    },
    blocked: {
      type: "SYSTEM",
      title: "Job cannot be completed",
      emailSubject: `Job blocked: ${jobTitle}`,
      body: `"${jobTitle}" was marked incomplete/blocked${detail ? `: ${detail}` : "."}`,
    },
    originals_returned: {
      type: "SYSTEM",
      title: "Originals returned",
      emailSubject: `Originals returned: ${jobTitle}`,
      body: `Original documents were returned for "${jobTitle}".`,
    },
  };

  const message = copy[event];
  const shouldNotifyParty = Boolean(userId && userId !== exceptUserId);

  if (shouldNotifyParty && userId) {
    await notificationService.notify({
      userId,
      type: message.type,
      title: message.title,
      body: message.body,
      link,
      emailSubject: message.emailSubject,
      linkLabel: "Open job",
      copyToWatchers: true,
    });
    return;
  }

  // Still email ops even when the primary party is the actor / missing
  await notificationService.copyWatchers({
    title: message.title,
    body: message.body,
    link,
    emailSubject: message.emailSubject,
    linkLabel: "Open job",
  });
}

/** When field collection is verified, post a finance Payment against an open invoice if one exists. */
async function autoRecordFieldPayment(ctx: ActorCtx, task: {
  id: string;
  projectId: string | null;
  paymentAmount: unknown;
  paymentMethod: string | null;
  paymentReference: string | null;
  title: string;
}) {
  const amount = task.paymentAmount != null ? Number(task.paymentAmount) : NaN;
  if (!task.paymentMethod || !Number.isFinite(amount) || amount <= 0) return null;

  let customerId: string | null = null;
  if (task.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: task.projectId, companyId: ctx.companyId },
      select: { customerId: true },
    });
    customerId = project?.customerId ?? null;
  }
  if (!customerId) return null;

  const invoice = await prisma.invoice.findFirst({
    where: {
      companyId: ctx.companyId,
      customerId,
      status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
      ...(task.projectId ? { OR: [{ projectId: task.projectId }, { projectId: null }] } : {}),
    },
    orderBy: [{ projectId: "desc" }, { dueDate: "asc" }],
  });
  if (!invoice) return null;

  try {
    return await financeService.recordPayment(ctx, invoice.id, {
      amount,
      method: task.paymentMethod as "CHEQUE" | "CASH" | "BANK_TRANSFER" | "CARD" | "ONLINE",
      reference: task.paymentReference ?? `Field job ${task.id}`,
      receivedAt: new Date(),
    });
  } catch {
    // Don't block job verify if invoice payment fails (e.g. overpay) — coordinator can record manually.
    return null;
  }
}

export const taskService = {
  sopTemplates() {
    return {
      preDay: PRE_DAY_ITEMS,
      warehouse: WAREHOUSE_ITEMS,
      visit: VISIT_ITEMS,
      eod: EOD_ITEMS,
      docsByJobType: DOC_ITEMS_BY_JOB,
    };
  },

  async list(ctx: ActorCtx, query: ListTasksQuery) {
    const { mine, assignedByMe, awaitingVerify, ...rest } = query;
    const assigneeId = mine ? ctx.userId : rest.assigneeId;
    const createdById = assignedByMe || awaitingVerify ? ctx.userId : undefined;
    const status = awaitingVerify ? ("SUBMITTED" as const) : rest.status;
    return taskRepository.list({
      companyId: ctx.companyId,
      ...rest,
      status,
      assigneeId,
      createdById,
    });
  },

  async fieldDay(ctx: ActorCtx, query: FieldDayQuery) {
    const assigneeId = query.mine || !query.assigneeId ? ctx.userId : query.assigneeId;
    const jobs = await taskRepository.fieldDay({
      companyId: ctx.companyId,
      assigneeId,
      date: query.date,
    });

    const enriched = jobs.map((job) => {
      const checklist = mergeSopChecklist(asChecklist(job.sopChecklist), job.jobType, {});
      const docs = requiredDocsForJob(job.jobType);
      return {
        ...job,
        sopChecklist: checklist,
        sopProgress: {
          preDay: sectionProgress(checklist.preDay, PRE_DAY_ITEMS),
          warehouse: sectionProgress(checklist.warehouse, WAREHOUSE_ITEMS),
          visit: sectionProgress(checklist.visit, VISIT_ITEMS),
          docs: sectionProgress(checklist.docs, docs),
          eod: sectionProgress(checklist.eod, EOD_ITEMS),
        },
      };
    });

    const stats = {
      total: enriched.length,
      open: enriched.filter((j) => !["DONE", "SUBMITTED"].includes(j.status)).length,
      submitted: enriched.filter((j) => j.status === "SUBMITTED").length,
      done: enriched.filter((j) => j.status === "DONE").length,
      blocked: enriched.filter((j) => j.status === "BLOCKED").length,
      originalsPending: enriched.filter((j) => j.status === "DONE" && !j.originalsReturnedAt).length,
    };

    return { date: query.date ?? new Date().toISOString().slice(0, 10), assigneeId, stats, jobs: enriched };
  },

  assignableUsers(ctx: ActorCtx) {
    return taskRepository.assignableUsers(ctx.companyId);
  },

  async getById(ctx: ActorCtx, id: string) {
    const task = await taskRepository.findById(ctx.companyId, id);
    if (!task) throw ApiError.notFound("Task not found");
    const checklist = mergeSopChecklist(asChecklist(task.sopChecklist), task.jobType, {});
    const docs = requiredDocsForJob(task.jobType);
    return {
      ...task,
      sopChecklist: checklist,
      packingDetails: asPacking(task.packingDetails),
      sopProgress: {
        preDay: sectionProgress(checklist.preDay, PRE_DAY_ITEMS),
        warehouse: sectionProgress(checklist.warehouse, WAREHOUSE_ITEMS),
        visit: sectionProgress(checklist.visit, VISIT_ITEMS),
        docs: sectionProgress(checklist.docs, docs),
        eod: sectionProgress(checklist.eod, EOD_ITEMS),
      },
      requiredDocs: docs,
    };
  },

  async getPackingSlipData(ctx: ActorCtx, id: string) {
    const task = await this.getById(ctx, id);
    const company = await prisma.company.findUnique({ where: { id: ctx.companyId } });
    if (!company) throw ApiError.notFound("Company not found");
    return {
      task: {
        id: task.id,
        title: task.title,
        jobType: task.jobType,
        status: task.status,
        dueDate: task.dueDate,
        packingDetails: asPacking(task.packingDetails),
        project: task.project,
        assignee: task.assignee,
      },
      company: {
        name: company.name,
        legalName: company.legalName,
        taxId: company.taxId,
      },
    };
  },

  async create(ctx: ActorCtx, input: CreateTaskInput) {
    const jobType = input.jobType ?? "OTHER";
    const task = await taskRepository.create({
      companyId: ctx.companyId,
      ...(input.projectId ? { project: { connect: { id: input.projectId } } } : {}),
      createdBy: { connect: { id: ctx.userId } },
      title: input.title,
      jobType,
      sopChecklist: defaultSopChecklist(jobType) as Prisma.InputJsonValue,
      ...(input.description ? { description: input.description } : {}),
      ...(input.dueAt ? { dueDate: input.dueAt } : {}),
      ...(input.scheduleOrder != null ? { scheduleOrder: input.scheduleOrder } : {}),
      ...(input.assigneeId ? { assignee: { connect: { id: input.assigneeId } } } : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "EngineerTask",
      entityId: task.id,
      action: "CREATE",
      after: task,
    });

    if (input.assigneeId) {
      await notifyJobParty({
        userId: input.assigneeId,
        exceptUserId: ctx.userId,
        event: "assigned",
        jobId: task.id,
        jobTitle: task.title,
      });
    }

    return task;
  },

  async update(ctx: ActorCtx, id: string, input: UpdateTaskInput) {
    const existing = await taskRepository.findByIdBare(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Task not found");

    if (input.status === "DONE" && existing.status !== "DONE") {
      throw ApiError.badRequest("Use Verify & close to mark a submitted job as done.");
    }

    const assigneeChanged = input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId;
    const statusChanged = input.status !== undefined && input.status !== existing.status;

    const updated = await taskRepository.update(id, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.dueAt !== undefined ? { dueDate: input.dueAt } : {}),
      ...(input.jobType !== undefined ? { jobType: input.jobType } : {}),
      ...(input.scheduleOrder !== undefined ? { scheduleOrder: input.scheduleOrder } : {}),
      ...(input.assigneeId !== undefined
        ? input.assigneeId
          ? { assignee: { connect: { id: input.assigneeId } } }
          : { assignee: { disconnect: true } }
        : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "EngineerTask",
      entityId: id,
      action: "UPDATE",
      before: existing,
      after: updated,
    });

    if (assigneeChanged && input.assigneeId) {
      await notifyJobParty({
        userId: input.assigneeId,
        exceptUserId: ctx.userId,
        event: "reassigned",
        jobId: id,
        jobTitle: updated.title,
      });
    }

    if (statusChanged && input.status === "SEEN") {
      await notifyJobParty({
        userId: existing.createdById,
        exceptUserId: ctx.userId,
        event: "received",
        jobId: id,
        jobTitle: updated.title,
        actorName: updated.assignee
          ? `${updated.assignee.firstName} ${updated.assignee.lastName}`.trim()
          : undefined,
      });
    }

    if (statusChanged && input.status === "IN_PROGRESS") {
      await notifyJobParty({
        userId: existing.createdById,
        exceptUserId: ctx.userId,
        event: "started",
        jobId: id,
        jobTitle: updated.title,
        actorName: updated.assignee
          ? `${updated.assignee.firstName} ${updated.assignee.lastName}`.trim()
          : undefined,
      });
    }

    if (statusChanged && input.status === "SUBMITTED") {
      await notifyJobParty({
        userId: existing.createdById,
        exceptUserId: ctx.userId,
        event: "submitted",
        jobId: id,
        jobTitle: updated.title,
        actorName: updated.assignee
          ? `${updated.assignee.firstName} ${updated.assignee.lastName}`.trim()
          : undefined,
      });
      await notifyCoordinators(
        ctx.companyId,
        {
          title: "Job submitted for review",
          emailSubject: `Job submitted for review: ${updated.title}`,
          body: `"${updated.title}" was submitted and needs verification.`,
          link: `/team-tasks/${id}`,
        },
        existing.createdById ?? ctx.userId,
      );
    }

    if (statusChanged && input.status === "BLOCKED") {
      const otherParty =
        existing.createdById && existing.createdById !== ctx.userId
          ? existing.createdById
          : existing.assigneeId && existing.assigneeId !== ctx.userId
            ? existing.assigneeId
            : null;
      await notifyJobParty({
        userId: otherParty,
        exceptUserId: ctx.userId,
        event: "blocked",
        jobId: id,
        jobTitle: updated.title,
        detail: updated.incompleteReason ?? undefined,
      });
    }

    return updated;
  },

  async updateSop(ctx: ActorCtx, id: string, input: UpdateSopInput) {
    const existing = await taskRepository.findByIdBare(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Task not found");

    const canEdit =
      existing.assigneeId === ctx.userId || existing.createdById === ctx.userId;
    if (!canEdit) {
      // Coordinators with task:update already passed authorize — allow
    }

    const nextChecklist = input.sopChecklist
      ? mergeSopChecklist(asChecklist(existing.sopChecklist), existing.jobType, input.sopChecklist)
      : asChecklist(existing.sopChecklist);

    const nextPacking = input.packingDetails
      ? { ...asPacking(existing.packingDetails), ...input.packingDetails }
      : asPacking(existing.packingDetails);

    const visitNotified = input.customerNotified || nextChecklist.visit?.customerNotified;
    const prevUrgent = Boolean(asChecklist(existing.sopChecklist).warehouse?.urgentUseNotified);
    const nextUrgent = Boolean(nextChecklist.warehouse?.urgentUseNotified);

    const updated = await taskRepository.update(id, {
      ...(input.sopChecklist
        ? { sopChecklist: nextChecklist as Prisma.InputJsonValue }
        : {}),
      ...(input.packingDetails
        ? { packingDetails: nextPacking as Prisma.InputJsonValue }
        : {}),
      ...(input.scheduleOrder !== undefined ? { scheduleOrder: input.scheduleOrder } : {}),
      ...(visitNotified && !existing.customerNotifiedAt
        ? {
            customerNotifiedAt: new Date(),
            sopChecklist: mergeSopChecklist(nextChecklist, existing.jobType, {
              visit: { customerNotified: true },
            }) as Prisma.InputJsonValue,
          }
        : {}),
    });

    if (!prevUrgent && nextUrgent) {
      await notifyCoordinators(
        ctx.companyId,
        {
          title: "Urgent: checklist stock used",
          emailSubject: `Urgent stock used: ${existing.title}`,
          body: `"${existing.title}" — warehouse flagged checklist items used for urgent needs.`,
          link: `/team-tasks/${id}`,
        },
        ctx.userId,
      );
      if (existing.createdById && existing.createdById !== ctx.userId) {
        await notificationService.notify({
          userId: existing.createdById,
          type: "SYSTEM",
          title: "Urgent: checklist stock used",
          body: `"${existing.title}" — warehouse flagged urgent use of checklist stock.`,
          link: `/team-tasks/${id}`,
          emailSubject: `Urgent stock used: ${existing.title}`,
          linkLabel: "Open job",
          copyToWatchers: true,
        });
      } else {
        await notificationService.copyWatchers({
          title: "Urgent: checklist stock used",
          body: `"${existing.title}" — warehouse flagged checklist items used for urgent needs.`,
          link: `/team-tasks/${id}`,
          emailSubject: `Urgent stock used: ${existing.title}`,
          linkLabel: "Open job",
        });
      }
    }

    return this.getById(ctx, updated.id);
  },

  async acknowledge(ctx: ActorCtx, id: string) {
    const existing = await taskRepository.findByIdBare(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Task not found");
    if (existing.assigneeId !== ctx.userId) throw ApiError.forbidden("Only the assigned person can mark this job as seen");
    if (existing.status === "DONE" || existing.status === "SUBMITTED") {
      throw ApiError.badRequest("This job is already past the seen stage");
    }

    const updated = await taskRepository.update(id, {
      status: "SEEN",
      seenAt: existing.seenAt ?? new Date(),
    });

    await notifyJobParty({
      userId: existing.createdById,
      exceptUserId: ctx.userId,
      event: "received",
      jobId: id,
      jobTitle: updated.title,
      actorName: updated.assignee
        ? `${updated.assignee.firstName} ${updated.assignee.lastName}`.trim()
        : undefined,
    });

    return updated;
  },

  async submit(ctx: ActorCtx, id: string, input: SubmitTaskInput) {
    const existing = await taskRepository.findByIdBare(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Task not found");
    if (existing.assigneeId !== ctx.userId) throw ApiError.forbidden("Only the assigned person can submit this job");
    if (existing.status === "DONE") throw ApiError.badRequest("Job is already closed");
    if (existing.status === "BLOCKED") {
      throw ApiError.badRequest("Job is marked incomplete/blocked — clear with coordinator or update status before submitting");
    }

    if (existing.jobType === "CHEQUE_COLLECTION" || input.paymentAmount != null || input.paymentMethod) {
      if (!input.paymentMethod) throw ApiError.badRequest("Payment method is required for collection jobs");
      if (input.paymentAmount == null) throw ApiError.badRequest("Payment amount is required for collection jobs");
    }

    const checklist = input.sopChecklist
      ? mergeSopChecklist(asChecklist(existing.sopChecklist), existing.jobType, input.sopChecklist)
      : asChecklist(existing.sopChecklist);

    const missingDocs = assertRequiredDocsChecked(existing.jobType, checklist);
    if (missingDocs.length > 0) {
      throw ApiError.badRequest(
        `Complete document submission checklist before submit: ${missingDocs.slice(0, 3).join("; ")}${missingDocs.length > 3 ? "…" : ""}`,
      );
    }

    const packing =
      existing.jobType === "DELIVERY" || existing.jobType === "EXPORT_SHIPMENT"
        ? { ...asPacking(existing.packingDetails), ...(input.packingDetails ?? {}) }
        : asPacking(existing.packingDetails);

    if (
      (existing.jobType === "DELIVERY" || existing.jobType === "EXPORT_SHIPMENT") &&
      packing.itemCount == null
    ) {
      throw ApiError.badRequest("Record packing item count before submitting a delivery/export job");
    }

    const updated = await taskRepository.update(id, {
      status: "SUBMITTED",
      seenAt: existing.seenAt ?? new Date(),
      submittedAt: new Date(),
      completionNote: input.completionNote,
      incompleteReason: null,
      sopChecklist: checklist as Prisma.InputJsonValue,
      packingDetails: packing as Prisma.InputJsonValue,
      ...(input.paymentAmount != null ? { paymentAmount: input.paymentAmount } : {}),
      ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
      ...(input.paymentReference !== undefined ? { paymentReference: input.paymentReference } : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "EngineerTask",
      entityId: id,
      action: "UPDATE",
      before: existing,
      after: updated,
    });

    if (existing.createdById) {
      await notifyJobParty({
        userId: existing.createdById,
        exceptUserId: ctx.userId,
        event: "submitted",
        jobId: id,
        jobTitle: updated.title,
        actorName: updated.assignee
          ? `${updated.assignee.firstName} ${updated.assignee.lastName}`.trim()
          : undefined,
      });
    }

    await notifyCoordinators(
      ctx.companyId,
      {
        title: "Job submitted for review",
        emailSubject: `Job submitted for review: ${updated.title}`,
        body: `${updated.assignee?.firstName ?? "Assignee"} submitted "${updated.title}". Please verify docs/payment.`,
        link: `/team-tasks/${id}`,
      },
      existing.createdById ?? ctx.userId,
    );

    return this.getById(ctx, id);
  },

  async reportIncomplete(ctx: ActorCtx, id: string, input: ReportIncompleteInput) {
    const existing = await taskRepository.findByIdBare(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Task not found");
    if (existing.assigneeId !== ctx.userId && existing.createdById !== ctx.userId) {
      throw ApiError.forbidden("Only assignee or assigner can report incomplete");
    }
    if (existing.status === "DONE") throw ApiError.badRequest("Job is already closed");

    const note = `INCOMPLETE: ${input.reason}${
      input.rescheduleDate ? ` (reschedule ${input.rescheduleDate.toISOString().slice(0, 10)})` : ""
    }`;

    const updated = await taskRepository.update(id, {
      status: "BLOCKED",
      incompleteReason: input.reason,
      ...(input.rescheduleDate ? { rescheduleDate: input.rescheduleDate } : {}),
      completionNote: existing.completionNote ? `${existing.completionNote}\n\n${note}` : note,
    });

    const notifyUserId =
      existing.createdById && existing.createdById !== ctx.userId
        ? existing.createdById
        : existing.assigneeId && existing.assigneeId !== ctx.userId
          ? existing.assigneeId
          : null;

    await notifyJobParty({
      userId: notifyUserId,
      exceptUserId: ctx.userId,
      event: "blocked",
      jobId: id,
      jobTitle: updated.title,
      detail: input.reason,
    });

    await notifyCoordinators(
      ctx.companyId,
      {
        title: "Job cannot be completed",
        emailSubject: `Job blocked: ${updated.title}`,
        body: `"${updated.title}" blocked: ${input.reason}`,
        link: `/team-tasks/${id}`,
      },
      notifyUserId ?? ctx.userId,
    );

    return this.getById(ctx, id);
  },

  async returnOriginals(ctx: ActorCtx, id: string) {
    const existing = await taskRepository.findByIdBare(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Task not found");

    const checklist = mergeSopChecklist(asChecklist(existing.sopChecklist), existing.jobType, {
      eod: { originalsReturned: true, noDocsRetained: true },
    });

    await taskRepository.update(id, {
      originalsReturnedAt: new Date(),
      sopChecklist: checklist as Prisma.InputJsonValue,
    });

    await notifyJobParty({
      userId: existing.createdById,
      exceptUserId: ctx.userId,
      event: "originals_returned",
      jobId: id,
      jobTitle: existing.title,
    });

    return this.getById(ctx, id);
  },

  async verify(ctx: ActorCtx, id: string, input: VerifyTaskInput) {
    const existing = await taskRepository.findByIdBare(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Task not found");
    if (existing.status !== "SUBMITTED") {
      throw ApiError.badRequest("Only submitted jobs can be verified and closed");
    }

    const updated = await taskRepository.update(id, {
      status: "DONE",
      completedAt: new Date(),
      verifiedAt: new Date(),
      verifiedBy: { connect: { id: ctx.userId } },
      ...(input.note
        ? {
            completionNote: existing.completionNote
              ? `${existing.completionNote}\n\nCoordinator: ${input.note}`
              : `Coordinator: ${input.note}`,
          }
        : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "EngineerTask",
      entityId: id,
      action: "UPDATE",
      before: existing,
      after: updated,
    });

    await notifyJobParty({
      userId: existing.assigneeId,
      exceptUserId: ctx.userId,
      event: "done",
      jobId: id,
      jobTitle: updated.title,
    });

    const paymentResult = await autoRecordFieldPayment(ctx, {
      id: existing.id,
      projectId: existing.projectId,
      paymentAmount: existing.paymentAmount,
      paymentMethod: existing.paymentMethod,
      paymentReference: existing.paymentReference,
      title: existing.title,
    });

    if (paymentResult?.payment) {
      await notificationService.notify({
        userId: ctx.userId,
        type: "SYSTEM",
        title: "Payment recorded from field job",
        body: `${Number(existing.paymentAmount).toLocaleString()} posted to invoice from "${existing.title}".`,
        link: `/invoices-payments/${paymentResult.invoice.id}`,
        emailSubject: `Payment recorded: ${existing.title}`,
        linkLabel: "Open invoice",
        copyToWatchers: true,
      });
    }

    return this.getById(ctx, id);
  },
};
