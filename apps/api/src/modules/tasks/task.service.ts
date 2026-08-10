import { Prisma } from "@prisma/client";
import { taskRepository } from "./task.repository";
import { sendCustomerBeforeArrivalNotice } from "./customer-notify";
import { salesOrderService } from "../sales-orders/salesOrder.service";
import { fileService } from "../files/file.service";
import { warehouseRepository } from "../warehouse/warehouse.repository";
import {
  CreateTaskInput,
  UpdateTaskInput,
  ListTasksQuery,
  SubmitTaskInput,
  VerifyTaskInput,
  UpdateSopInput,
  ReportIncompleteInput,
  FieldDayQuery,
  ReturnOriginalsDayInput,
  ReorderFieldDayInput,
  SopComplianceQuery,
  TaskSignOffInput,
} from "./task.validation";
import {
  assertEvidenceAttachmentsForSubmit,
  assertEvidenceTicksAllowed,
  assertRequiredDocsChecked,
  countCheckedEvidenceDocs,
  defaultSopChecklist,
  evidenceRequiredDocs,
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
  roleKey?: string;
}

function asChecklist(value: unknown): SopChecklistState {
  return (value && typeof value === "object" ? value : {}) as SopChecklistState;
}

function asPacking(value: unknown): PackingDetails {
  return (value && typeof value === "object" ? value : {}) as PackingDetails;
}

function bumpNextRunAt(from: Date, cadence: string): Date {
  const next = new Date(from);
  if (cadence === "MONTHLY") {
    next.setMonth(next.getMonth() + 1);
  } else if (cadence === "BIWEEKLY") {
    next.setDate(next.getDate() + 14);
  } else {
    next.setDate(next.getDate() + 7);
  }
  return next;
}

function parseSignatureDataUrl(dataUrl: string): { buffer: Buffer; mimetype: string; ext: string } {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i.exec(dataUrl);
  if (!match?.[1] || !match[2]) throw ApiError.badRequest("signatureDataUrl must be a PNG/JPEG data URL");
  const rawType = match[1].toLowerCase();
  const mimetype = rawType === "image/jpg" ? "image/jpeg" : rawType;
  const ext = mimetype === "image/png" ? "png" : mimetype === "image/webp" ? "webp" : "jpg";
  return { buffer: Buffer.from(match[2], "base64"), mimetype, ext };
}

async function countTaskAttachments(companyId: string, taskId: string) {
  return prisma.fileAsset.count({
    where: { companyId, entityType: "EngineerTask", entityId: taskId },
  });
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
  | "originals_returned"
  | "updated"
  | "cancelled";

/** In-app + email alert for a job lifecycle event (respects user emailNotifications). */
async function notifyJobParty(params: {
  userId: string | null | undefined;
  exceptUserId?: string;
  event: JobMailEvent;
  jobId: string;
  jobTitle: string;
  detail?: string;
  actorName?: string;
  /** Override deep link (e.g. cancelled jobs → list page). */
  link?: string;
}) {
  const { userId, exceptUserId, event, jobId, jobTitle, detail, actorName } = params;

  const who = actorName?.trim() || "Someone";
  const link = params.link ?? `/team-tasks/${jobId}`;

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
    updated: {
      type: "SYSTEM",
      title: "Job details updated",
      emailSubject: `Job updated: ${jobTitle}`,
      body: detail
        ? `"${jobTitle}" was updated: ${detail}`
        : `"${jobTitle}" details were updated. Open the job to review changes.`,
    },
    cancelled: {
      type: "SYSTEM",
      title: "Job cancelled",
      emailSubject: `Job cancelled: ${jobTitle}`,
      body: `"${jobTitle}" was deleted/cancelled by the coordinator.`,
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

/** When field collection is verified, post a finance Payment against a linked or matching open invoice. */
async function autoRecordFieldPayment(ctx: ActorCtx, task: {
  id: string;
  projectId: string | null;
  invoiceId: string | null;
  salesOrderId: string | null;
  customerPoId: string | null;
  paymentAmount: unknown;
  paymentMethod: string | null;
  paymentReference: string | null;
  title: string;
}) {
  const amount = task.paymentAmount != null ? Number(task.paymentAmount) : NaN;
  if (!task.paymentMethod || !Number.isFinite(amount) || amount <= 0) return null;

  if (task.invoiceId) {
    try {
      return await financeService.recordPayment(ctx, task.invoiceId, {
        amount,
        method: task.paymentMethod as "CHEQUE" | "CASH" | "BANK_TRANSFER" | "CARD" | "ONLINE",
        reference: task.paymentReference ?? `Field job ${task.id}`,
        receivedAt: new Date(),
      });
    } catch {
      return null;
    }
  }

  let customerId: string | null = null;
  if (task.salesOrderId) {
    const so = await prisma.salesOrder.findFirst({
      where: { id: task.salesOrderId, companyId: ctx.companyId },
      select: { customerId: true },
    });
    customerId = so?.customerId ?? null;
  }
  if (!customerId && task.customerPoId) {
    const po = await prisma.customerPO.findFirst({
      where: { id: task.customerPoId, companyId: ctx.companyId },
      select: { customerId: true },
    });
    customerId = po?.customerId ?? null;
  }
  if (!customerId && task.projectId) {
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
      ...(task.salesOrderId ? { salesOrderId: task.salesOrderId } : {}),
      ...(!task.salesOrderId && task.projectId
        ? { OR: [{ projectId: task.projectId }, { projectId: null }] }
        : {}),
    },
    orderBy: [{ dueDate: "asc" }],
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
    return null;
  }
}

async function resolveOrderLinks(
  companyId: string,
  input: {
    projectId?: string | null;
    salesOrderId?: string | null;
    customerPoId?: string | null;
    invoiceId?: string | null;
  },
) {
  let projectId = input.projectId ?? null;
  let salesOrderId = input.salesOrderId ?? null;
  let customerPoId = input.customerPoId ?? null;
  let invoiceId = input.invoiceId ?? null;
  let titleFromInvoice: string | null = null;
  let titleFromSo: string | null = null;
  let titleFromPo: string | null = null;
  let suggestedAmount: number | null = null;
  let packingFromSo: { itemCount: number; items: Array<{ name: string; weight: null }> } | null = null;

  if (invoiceId) {
    const inv = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: {
        customer: { select: { name: true } },
        salesOrder: { select: { id: true, customerPOId: true, project: { select: { id: true } } } },
        project: { select: { id: true } },
      },
    });
    if (!inv) throw ApiError.badRequest("Invoice not found");
    invoiceId = inv.id;
    if (!salesOrderId && inv.salesOrderId) salesOrderId = inv.salesOrderId;
    if (!customerPoId && inv.salesOrder?.customerPOId) customerPoId = inv.salesOrder.customerPOId;
    if (!projectId) projectId = inv.projectId ?? inv.salesOrder?.project?.id ?? null;
    const outstanding = Number(inv.totalAmount) - Number(inv.amountPaid);
    suggestedAmount = outstanding > 0 ? outstanding : Number(inv.totalAmount);
    titleFromInvoice = `Collect payment — ${inv.code} (${inv.customer.name})`;
  }

  if (salesOrderId) {
    const so = await prisma.salesOrder.findFirst({
      where: { id: salesOrderId, companyId },
      include: {
        customer: { select: { name: true } },
        project: { select: { id: true } },
        customerPO: { select: { id: true, poNumber: true, code: true } },
        lineItems: { include: { product: { select: { name: true, sku: true } } } },
      },
    });
    if (!so) throw ApiError.badRequest("Sales order not found");
    salesOrderId = so.id;
    if (!customerPoId) customerPoId = so.customerPOId;
    if (!projectId && so.project) projectId = so.project.id;
    titleFromSo = `Delivery — ${so.code} (${so.customer.name})`;
    if (so.lineItems.length > 0) {
      packingFromSo = {
        itemCount: so.lineItems.reduce((sum, li) => sum + Number(li.quantity), 0),
        items: so.lineItems.map((li) => ({
          name: `${li.product.name}${li.product.sku ? ` (${li.product.sku})` : ""} × ${Number(li.quantity)}`,
          weight: null,
        })),
      };
    }
  }

  if (customerPoId) {
    const po = await prisma.customerPO.findFirst({
      where: { id: customerPoId, companyId },
      include: {
        customer: { select: { name: true } },
        salesOrder: {
          select: {
            id: true,
            project: { select: { id: true } },
            lineItems: { include: { product: { select: { name: true, sku: true } } } },
          },
        },
      },
    });
    if (!po) throw ApiError.badRequest("Customer PO not found");
    customerPoId = po.id;
    if (!salesOrderId && po.salesOrder) {
      salesOrderId = po.salesOrder.id;
      if (!packingFromSo && po.salesOrder.lineItems.length > 0) {
        packingFromSo = {
          itemCount: po.salesOrder.lineItems.reduce((sum, li) => sum + Number(li.quantity), 0),
          items: po.salesOrder.lineItems.map((li) => ({
            name: `${li.product.name}${li.product.sku ? ` (${li.product.sku})` : ""} × ${Number(li.quantity)}`,
            weight: null,
          })),
        };
      }
    }
    if (!projectId && po.salesOrder?.project) projectId = po.salesOrder.project.id;
    titleFromPo = `Fulfil PO ${po.poNumber} — ${po.customer.name}`;
  }

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId },
      select: { id: true, salesOrderId: true },
    });
    if (!project) throw ApiError.badRequest("Project not found");
    if (!salesOrderId) salesOrderId = project.salesOrderId;
  }

  return {
    projectId,
    salesOrderId,
    customerPoId,
    invoiceId,
    titleFromInvoice,
    titleFromSo,
    titleFromPo,
    suggestedAmount,
    packingFromSo,
  };
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

  async reorderFieldDay(ctx: ActorCtx, input: ReorderFieldDayInput) {
    const assigneeId = ctx.userId;
    const jobs = await taskRepository.fieldDay({
      companyId: ctx.companyId,
      assigneeId,
      date: input.date,
    });
    const allowed = new Set(jobs.map((j) => j.id));
    for (const id of input.orderedIds) {
      if (!allowed.has(id)) throw ApiError.badRequest(`Job ${id} is not on this day board`);
    }

    await prisma.$transaction(
      input.orderedIds.map((id, index) =>
        prisma.engineerTask.update({
          where: { id },
          data: { scheduleOrder: index + 1 },
        }),
      ),
    );

    return this.fieldDay(ctx, { date: input.date, mine: true });
  },

  assignableUsers(ctx: ActorCtx) {
    return taskRepository.assignableUsers(ctx.companyId);
  },

  async linkOptions(ctx: ActorCtx) {
    const [salesOrders, customerPos, invoices] = await Promise.all([
      prisma.salesOrder.findMany({
        where: { companyId: ctx.companyId, status: { not: "CANCELLED" } },
        select: {
          id: true,
          code: true,
          status: true,
          totalAmount: true,
          currency: true,
          customerPOId: true,
          customer: { select: { id: true, name: true, code: true } },
          project: { select: { id: true, code: true, name: true } },
          customerPO: { select: { id: true, code: true, poNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.customerPO.findMany({
        where: { companyId: ctx.companyId, status: { not: "CANCELLED" } },
        select: {
          id: true,
          code: true,
          poNumber: true,
          amount: true,
          currency: true,
          status: true,
          customer: { select: { id: true, name: true, code: true } },
          salesOrder: { select: { id: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.invoice.findMany({
        where: {
          companyId: ctx.companyId,
          status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE", "DRAFT"] },
        },
        select: {
          id: true,
          code: true,
          status: true,
          totalAmount: true,
          amountPaid: true,
          currency: true,
          dueDate: true,
          salesOrderId: true,
          projectId: true,
          customer: { select: { id: true, name: true, code: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 100,
      }),
    ]);

    return {
      salesOrders: salesOrders.map((so) => ({
        ...so,
        label: `${so.code} — ${so.customer.name} (${so.status.replaceAll("_", " ")})`,
      })),
      customerPos: customerPos.map((po) => ({
        ...po,
        label: `${po.code} / PO ${po.poNumber} — ${po.customer.name}`,
      })),
      invoices: invoices.map((inv) => {
        const outstanding = Number(inv.totalAmount) - Number(inv.amountPaid);
        return {
          ...inv,
          outstanding,
          label: `${inv.code} — ${inv.customer.name} · due ${outstanding.toLocaleString()} ${inv.currency}`,
        };
      }),
    };
  },

  async sopCompliance(ctx: ActorCtx, query: SopComplianceQuery) {
    const now = new Date();
    const since = new Date(now);
    since.setUTCDate(since.getUTCDate() - query.days);

    let dueStart: Date | undefined;
    let dueEnd: Date | undefined;
    if (query.date) {
      dueStart = new Date(`${query.date}T00:00:00.000Z`);
      dueEnd = new Date(dueStart);
      dueEnd.setUTCDate(dueEnd.getUTCDate() + 1);
    }

    const tasks = await prisma.engineerTask.findMany({
      where: {
        companyId: ctx.companyId,
        ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
        ...(query.jobType ? { jobType: query.jobType } : {}),
        ...(dueStart && dueEnd
          ? { dueDate: { gte: dueStart, lt: dueEnd } }
          : {
              OR: [
                { status: { in: ["TODO", "SEEN", "IN_PROGRESS", "SUBMITTED", "BLOCKED"] } },
                { updatedAt: { gte: since } },
                { status: "DONE", originalsReturnedAt: null },
              ],
            }),
      },
      include: {
        project: { select: { id: true, code: true, name: true, customer: { select: { id: true, name: true } } } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        verifiedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ dueDate: "asc" }, { scheduleOrder: "asc" }, { updatedAt: "desc" }],
      take: 500,
    });

    const taskIds = tasks.map((t) => t.id);
    const attachments = taskIds.length
      ? await prisma.fileAsset.groupBy({
          by: ["entityId"],
          where: { companyId: ctx.companyId, entityType: "EngineerTask", entityId: { in: taskIds } },
          _count: { _all: true },
        })
      : [];
    const attachmentCount = new Map(attachments.map((a) => [a.entityId, a._count._all]));

    const rows = tasks.map((task) => {
      const checklist = mergeSopChecklist(asChecklist(task.sopChecklist), task.jobType, {});
      const docs = requiredDocsForJob(task.jobType);
      const progress = {
        preDay: sectionProgress(checklist.preDay, PRE_DAY_ITEMS),
        warehouse: sectionProgress(checklist.warehouse, WAREHOUSE_ITEMS),
        visit: sectionProgress(checklist.visit, VISIT_ITEMS),
        docs: sectionProgress(checklist.docs, docs),
        eod: sectionProgress(checklist.eod, EOD_ITEMS),
      };
      const missingDocLabels = assertRequiredDocsChecked(task.jobType, checklist);
      const files = attachmentCount.get(task.id) ?? 0;
      const pastDispatch = ["SUBMITTED", "DONE", "BLOCKED"].includes(task.status) || Boolean(task.submittedAt);
      const evidenceSlots = pastDispatch
        ? evidenceRequiredDocs(task.jobType).length
        : countCheckedEvidenceDocs(task.jobType, checklist);
      const missingScans =
        (pastDispatch && (missingDocLabels.length > 0 || files === 0)) ||
        (evidenceSlots > 0 && files < evidenceSlots);
      const incompleteChecklist =
        !progress.preDay.complete ||
        !progress.warehouse.complete ||
        !progress.visit.complete ||
        (pastDispatch && !progress.docs.complete) ||
        (["DONE", "SUBMITTED"].includes(task.status) && !progress.eod.complete);
      const originalsPending =
        (task.status === "DONE" && !task.originalsReturnedAt) ||
        (pastDispatch && !checklist.eod?.originalsReturned);
      const urgentStock = Boolean(checklist.warehouse?.urgentUseNotified);
      const blocked = task.status === "BLOCKED";

      const issueFlags = {
        missingScans,
        incompleteChecklist,
        originalsPending,
        urgentStock,
        blocked,
      };

      const sectionsTotal =
        progress.preDay.total +
        progress.warehouse.total +
        progress.visit.total +
        progress.docs.total +
        progress.eod.total;
      const sectionsDone =
        progress.preDay.done +
        progress.warehouse.done +
        progress.visit.done +
        progress.docs.done +
        progress.eod.done;
      const checklistPct = sectionsTotal > 0 ? Math.round((sectionsDone / sectionsTotal) * 100) : 100;

      return {
        id: task.id,
        title: task.title,
        jobType: task.jobType,
        status: task.status,
        dueDate: task.dueDate,
        scheduleOrder: task.scheduleOrder,
        seenAt: task.seenAt,
        submittedAt: task.submittedAt,
        verifiedAt: task.verifiedAt,
        completedAt: task.completedAt,
        originalsReturnedAt: task.originalsReturnedAt,
        customerNotifiedAt: task.customerNotifiedAt,
        incompleteReason: task.incompleteReason,
        rescheduleDate: task.rescheduleDate,
        paymentAmount: task.paymentAmount,
        paymentMethod: task.paymentMethod,
        paymentReference: task.paymentReference,
        completionNote: task.completionNote,
        project: task.project,
        assignee: task.assignee,
        createdBy: task.createdBy,
        verifiedBy: task.verifiedBy,
        attachmentCount: files,
        missingDocLabels,
        progress,
        checklistPct,
        issues: issueFlags,
        issueCount: Object.values(issueFlags).filter(Boolean).length,
        updatedAt: task.updatedAt,
        createdAt: task.createdAt,
      };
    });

    const filtered =
      query.issue && query.issue !== "any"
        ? rows.filter((r) => {
            if (query.issue === "missingScans") return r.issues.missingScans;
            if (query.issue === "incompleteChecklist") return r.issues.incompleteChecklist;
            if (query.issue === "originalsPending") return r.issues.originalsPending;
            if (query.issue === "urgentStock") return r.issues.urgentStock;
            if (query.issue === "blocked") return r.issues.blocked;
            return true;
          })
        : rows;

    const total = rows.length;
    const withIssues = rows.filter((r) => r.issueCount > 0).length;
    const summary = {
      totalJobs: total,
      withIssues,
      compliantJobs: total - withIssues,
      compliancePct: total > 0 ? Math.round(((total - withIssues) / total) * 100) : 100,
      missingScans: rows.filter((r) => r.issues.missingScans).length,
      incompleteChecklist: rows.filter((r) => r.issues.incompleteChecklist).length,
      originalsPending: rows.filter((r) => r.issues.originalsPending).length,
      urgentStock: rows.filter((r) => r.issues.urgentStock).length,
      blocked: rows.filter((r) => r.issues.blocked).length,
      avgChecklistPct: total > 0 ? Math.round(rows.reduce((s, r) => s + r.checklistPct, 0) / total) : 100,
      submittedAwaitingVerify: rows.filter((r) => r.status === "SUBMITTED").length,
    };

    return {
      filters: {
        date: query.date ?? null,
        days: query.days,
        assigneeId: query.assigneeId ?? null,
        jobType: query.jobType ?? null,
        issue: query.issue,
      },
      summary,
      jobs: filtered,
    };
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
    const links = await resolveOrderLinks(ctx.companyId, {
      projectId: input.projectId,
      salesOrderId: input.salesOrderId,
      customerPoId: input.customerPoId,
      invoiceId: input.invoiceId,
    });

    const isCollection = jobType === "CHEQUE_COLLECTION";
    const needsPacking = jobType === "DELIVERY" || jobType === "EXPORT_SHIPMENT";
    const title =
      input.title.trim() ||
      (isCollection
        ? links.titleFromInvoice || links.titleFromSo || links.titleFromPo
        : links.titleFromSo || links.titleFromPo || links.titleFromInvoice) ||
      `${jobType.replaceAll("_", " ")} job`;

    const task = await taskRepository.create({
      companyId: ctx.companyId,
      ...(links.projectId ? { project: { connect: { id: links.projectId } } } : {}),
      ...(links.salesOrderId ? { salesOrder: { connect: { id: links.salesOrderId } } } : {}),
      ...(links.customerPoId ? { customerPo: { connect: { id: links.customerPoId } } } : {}),
      ...(links.invoiceId ? { invoice: { connect: { id: links.invoiceId } } } : {}),
      createdBy: { connect: { id: ctx.userId } },
      title,
      jobType,
      sopChecklist: defaultSopChecklist(jobType) as Prisma.InputJsonValue,
      ...(input.description ? { description: input.description } : {}),
      ...(input.dueAt ? { dueDate: input.dueAt } : {}),
      ...(input.scheduleOrder != null ? { scheduleOrder: input.scheduleOrder } : {}),
      ...(input.assigneeId ? { assignee: { connect: { id: input.assigneeId } } } : {}),
      ...(isCollection && links.suggestedAmount != null ? { paymentAmount: links.suggestedAmount } : {}),
      ...(needsPacking && links.packingFromSo
        ? { packingDetails: links.packingFromSo as Prisma.InputJsonValue }
        : {}),
    });

    if (input.recurrence) {
      const due = input.dueAt ?? new Date();
      const dayOfWeek =
        input.recurrence.dayOfWeek ?? due.getDay();
      const recurrence = await prisma.taskRecurrence.create({
        data: {
          companyId: ctx.companyId,
          title,
          description: input.description,
          jobType,
          assigneeId: input.assigneeId,
          projectId: links.projectId,
          salesOrderId: links.salesOrderId,
          customerPoId: links.customerPoId,
          invoiceId: links.invoiceId,
          cadence: input.recurrence.cadence,
          dayOfWeek,
          nextRunAt: bumpNextRunAt(due, input.recurrence.cadence),
          createdById: ctx.userId,
        },
      });
      await taskRepository.update(task.id, { recurrence: { connect: { id: recurrence.id } } });
    }

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

    return this.getById(ctx, task.id);
  },

  async update(ctx: ActorCtx, id: string, input: UpdateTaskInput) {
    const existing = await taskRepository.findByIdBare(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Task not found");

    if (ctx.roleKey === RoleKey.DELIVERY_PERSON) {
      const tryingToManage =
        input.title !== undefined ||
        input.description !== undefined ||
        input.dueAt !== undefined ||
        input.jobType !== undefined ||
        input.assigneeId !== undefined ||
        input.scheduleOrder !== undefined ||
        input.projectId !== undefined ||
        input.salesOrderId !== undefined ||
        input.customerPoId !== undefined ||
        input.invoiceId !== undefined;
      if (tryingToManage) {
        throw ApiError.forbidden("Drivers cannot edit job details");
      }
    }

    if (input.status === "DONE" && existing.status !== "DONE") {
      throw ApiError.badRequest("Use Verify & close to mark a submitted job as done.");
    }

    const assigneeChanged = input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId;
    const statusChanged = input.status !== undefined && input.status !== existing.status;

    const linkPatch =
      input.projectId !== undefined ||
      input.salesOrderId !== undefined ||
      input.customerPoId !== undefined ||
      input.invoiceId !== undefined
        ? await resolveOrderLinks(ctx.companyId, {
            projectId: input.projectId !== undefined ? input.projectId : existing.projectId,
            salesOrderId: input.salesOrderId !== undefined ? input.salesOrderId : existing.salesOrderId,
            customerPoId: input.customerPoId !== undefined ? input.customerPoId : existing.customerPoId,
            invoiceId: input.invoiceId !== undefined ? input.invoiceId : existing.invoiceId,
          })
        : null;

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
      ...(linkPatch
        ? {
            project: linkPatch.projectId ? { connect: { id: linkPatch.projectId } } : { disconnect: true },
            salesOrder: linkPatch.salesOrderId
              ? { connect: { id: linkPatch.salesOrderId } }
              : { disconnect: true },
            customerPo: linkPatch.customerPoId
              ? { connect: { id: linkPatch.customerPoId } }
              : { disconnect: true },
            invoice: linkPatch.invoiceId ? { connect: { id: linkPatch.invoiceId } } : { disconnect: true },
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

    if (assigneeChanged && input.assigneeId) {
      await notifyJobParty({
        userId: input.assigneeId,
        exceptUserId: ctx.userId,
        event: "reassigned",
        jobId: id,
        jobTitle: updated.title,
      });
    }

    const titleChanged = input.title !== undefined && input.title !== existing.title;
    const descriptionChanged = input.description !== undefined && input.description !== (existing.description ?? "");
    const dueChanged =
      input.dueAt !== undefined &&
      (existing.dueDate?.toISOString().slice(0, 10) ?? "") !== input.dueAt.toISOString().slice(0, 10);
    const jobTypeChanged = input.jobType !== undefined && input.jobType !== existing.jobType;
    const detailsChanged = titleChanged || descriptionChanged || dueChanged || jobTypeChanged;

    if (detailsChanged && !assigneeChanged) {
      const changes: string[] = [];
      if (titleChanged) changes.push("title");
      if (descriptionChanged) changes.push("instructions");
      if (dueChanged) changes.push("due date");
      if (jobTypeChanged) changes.push("job type");
      await notifyJobParty({
        userId: updated.assigneeId ?? existing.assigneeId,
        exceptUserId: ctx.userId,
        event: "updated",
        jobId: id,
        jobTitle: updated.title,
        detail: changes.join(", "),
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

  async remove(ctx: ActorCtx, id: string) {
    if (ctx.roleKey === RoleKey.DELIVERY_PERSON) {
      throw ApiError.forbidden("Drivers cannot delete jobs");
    }

    const existing = await taskRepository.findByIdBare(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Task not found");

    await prisma.fileAsset.deleteMany({
      where: { companyId: ctx.companyId, entityType: "EngineerTask", entityId: id },
    });

    await taskRepository.delete(id);

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "EngineerTask",
      entityId: id,
      action: "DELETE",
      before: existing,
    });

    await notifyJobParty({
      userId: existing.assigneeId,
      exceptUserId: ctx.userId,
      event: "cancelled",
      jobId: id,
      jobTitle: existing.title,
      link: "/team-tasks",
    });

    return { id };
  },

  async updateSop(ctx: ActorCtx, id: string, input: UpdateSopInput) {
    const existing = await taskRepository.findByIdBare(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Task not found");

    const canEdit =
      existing.assigneeId === ctx.userId || existing.createdById === ctx.userId;
    if (!canEdit) {
      // Coordinators with task:update already passed authorize — allow
    }

    const previousChecklist = asChecklist(existing.sopChecklist);
    const nextChecklist = input.sopChecklist
      ? mergeSopChecklist(previousChecklist, existing.jobType, input.sopChecklist)
      : previousChecklist;

    if (input.sopChecklist) {
      const attachmentCount = await countTaskAttachments(ctx.companyId, id);
      const blockedEvidence = assertEvidenceTicksAllowed(
        existing.jobType,
        previousChecklist,
        nextChecklist,
        attachmentCount,
      );
      if (blockedEvidence.length > 0) {
        throw ApiError.badRequest(
          `Upload an attachment before ticking: ${blockedEvidence.slice(0, 2).join("; ")}${blockedEvidence.length > 2 ? "…" : ""}. Evidence ticks need one file each.`,
        );
      }
    }

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
      isOfflineSynced: true,
      ...(visitNotified && !existing.customerNotifiedAt
        ? {
            customerNotifiedAt: new Date(),
            sopChecklist: mergeSopChecklist(nextChecklist, existing.jobType, {
              visit: { customerNotified: true },
            }) as Prisma.InputJsonValue,
          }
        : {}),
    });

    if (visitNotified && !existing.customerNotifiedAt) {
      const notifyResult = await sendCustomerBeforeArrivalNotice(ctx.companyId, existing);
      if (notifyResult.sent) {
        await notifyJobParty({
          userId: existing.createdById,
          exceptUserId: ctx.userId,
          event: "updated",
          jobId: id,
          jobTitle: existing.title,
          detail: `Customer emailed before arrival (${notifyResult.email})`,
        });
      }
    }

    if (input.reserveStock) {
      if (!existing.salesOrderId) {
        throw ApiError.badRequest("Link a sales order to this job before reserving stock");
      }
      let warehouseId = input.warehouseId;
      if (!warehouseId) {
        const warehouses = await warehouseRepository.listWarehouses(ctx.companyId);
        warehouseId = warehouses[0]?.id;
      }
      if (!warehouseId) {
        throw ApiError.badRequest("No warehouse available to reserve stock");
      }
      await salesOrderService.allocate(
        { companyId: ctx.companyId, branchId: ctx.branchId, userId: ctx.userId },
        existing.salesOrderId,
        warehouseId,
      );
      const reservedChecklist = mergeSopChecklist(asChecklist(updated.sopChecklist), existing.jobType, {
        warehouse: { soChecklistMarked: true, soChecklistComplete: true },
      });
      await taskRepository.update(id, {
        sopChecklist: reservedChecklist as Prisma.InputJsonValue,
      });
    }

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

  async signOff(ctx: ActorCtx, id: string, input: TaskSignOffInput, source: "FIELD" | "PORTAL" = "FIELD") {
    const existing = await taskRepository.findByIdBare(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Task not found");
    if (existing.status === "DONE") {
      throw ApiError.badRequest("Job is already closed");
    }

    let fileAssetId: string | undefined;
    if (input.signatureDataUrl) {
      try {
        const parsed = parseSignatureDataUrl(input.signatureDataUrl);
        const asset = await fileService.uploadInternal(ctx.companyId, ctx.userId, "EngineerTask", id, {
          originalname: `customer-signoff-${input.document.toLowerCase()}.${parsed.ext}`,
          mimetype: parsed.mimetype,
          size: parsed.buffer.length,
          buffer: parsed.buffer,
        });
        fileAssetId = asset.id;
      } catch (err) {
        // S3 may be unset in local demo — still stamp the digital sign-off.
        if (!(err instanceof ApiError)) {
          // eslint-disable-next-line no-console
          console.warn("[sign-off] signature upload skipped", err);
        } else {
          throw err;
        }
      }
    }

    const visitPatch: Record<string, boolean> = {};
    const docsPatch: Record<string, boolean> = {};
    if (input.document === "DO" || input.document === "BOTH") {
      visitPatch.doSigned = true;
      if (fileAssetId) docsPatch.signedDoScanned = true;
    }
    if (input.document === "INVOICE" || input.document === "BOTH") {
      visitPatch.invoiceSigned = true;
      if (fileAssetId) docsPatch.signedInvoiceScanned = true;
    }

    const checklist = mergeSopChecklist(asChecklist(existing.sopChecklist), existing.jobType, {
      visit: visitPatch,
      ...(Object.keys(docsPatch).length ? { docs: docsPatch } : {}),
    });

    const signOff = {
      name: input.name.trim(),
      signedAt: new Date().toISOString(),
      document: input.document,
      source,
      ...(fileAssetId ? { fileAssetId } : {}),
    };

    await taskRepository.update(id, {
      customerSignOff: signOff as Prisma.InputJsonValue,
      sopChecklist: checklist as Prisma.InputJsonValue,
    });

    await notifyJobParty({
      userId: existing.createdById,
      exceptUserId: ctx.userId,
      event: "updated",
      jobId: id,
      jobTitle: existing.title,
      detail: `Customer signed ${input.document} digitally (${input.name.trim()})`,
    });

    return this.getById(ctx, id);
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

    const attachmentCount = await countTaskAttachments(ctx.companyId, id);
    const missingEvidence = assertEvidenceAttachmentsForSubmit(existing.jobType, checklist, attachmentCount);
    if (missingEvidence.length > 0) {
      throw ApiError.badRequest(
        `Upload evidence before submit (${attachmentCount}/${missingEvidence.length} file${missingEvidence.length === 1 ? "" : "s"}): ${missingEvidence.slice(0, 2).join("; ")}${missingEvidence.length > 2 ? "…" : ""}`,
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

  /** One-tap EOD: mark originals returned for all of the assignee's done jobs still pending on the day board. */
  async returnOriginalsForDay(ctx: ActorCtx, input: ReturnOriginalsDayInput) {
    const assigneeId = input.mine || !input.assigneeId ? ctx.userId : input.assigneeId;
    if (assigneeId !== ctx.userId && ctx.roleKey === RoleKey.DELIVERY_PERSON) {
      throw ApiError.forbidden("Drivers can only return originals for their own jobs");
    }

    const jobs = await taskRepository.fieldDay({
      companyId: ctx.companyId,
      assigneeId,
      date: input.date,
    });

    const pending = jobs.filter((j) => j.status === "DONE" && !j.originalsReturnedAt);
    if (pending.length === 0) {
      return { date: input.date ?? new Date().toISOString().slice(0, 10), assigneeId, count: 0, ids: [] as string[] };
    }

    const now = new Date();
    const ids: string[] = [];

    for (const job of pending) {
      const checklist = mergeSopChecklist(asChecklist(job.sopChecklist), job.jobType, {
        eod: { originalsReturned: true, noDocsRetained: true },
      });
      await taskRepository.update(job.id, {
        originalsReturnedAt: now,
        sopChecklist: checklist as Prisma.InputJsonValue,
      });
      ids.push(job.id);

      await notifyJobParty({
        userId: job.createdById,
        exceptUserId: ctx.userId,
        event: "originals_returned",
        jobId: job.id,
        jobTitle: job.title,
      });
    }

    return {
      date: input.date ?? new Date().toISOString().slice(0, 10),
      assigneeId,
      count: ids.length,
      ids,
    };
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
      invoiceId: existing.invoiceId,
      salesOrderId: existing.salesOrderId,
      customerPoId: existing.customerPoId,
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
