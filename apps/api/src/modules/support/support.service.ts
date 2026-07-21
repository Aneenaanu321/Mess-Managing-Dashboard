import { supportRepository } from "./support.repository";
import { CreateTicketInput, UpdateTicketInput, CreateTicketCommentInput, ListTicketsQuery } from "./support.validation";
import { ApiError } from "../../utils/ApiError";
import { nextNumber } from "../../utils/numberSequence";
import { writeAuditLog } from "../../utils/audit";
import { notificationService } from "../notifications/notification.service";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

export const supportService = {
  async list(ctx: ActorCtx, query: ListTicketsQuery) {
    return supportRepository.list({ companyId: ctx.companyId, ...query });
  },

  async getById(ctx: ActorCtx, id: string) {
    const ticket = await supportRepository.findById(ctx.companyId, id);
    if (!ticket) throw ApiError.notFound("Ticket not found");
    return ticket;
  },

  async create(ctx: ActorCtx, input: CreateTicketInput) {
    const code = await nextNumber(ctx.companyId, "TICKET", "TKT");

    // Best-effort SLA clock start: if the company has a policy for this
    // priority, stamp response/resolution due-by timestamps at creation.
    const policy = await supportRepository.findSlaPolicy(ctx.companyId, input.priority);
    const now = Date.now();

    const ticket = await supportRepository.create({
      companyId: ctx.companyId,
      branchId: ctx.branchId,
      code,
      customer: { connect: { id: input.customerId } },
      ...(input.deviceId ? { device: { connect: { id: input.deviceId } } } : {}),
      subject: input.subject,
      description: input.description,
      priority: input.priority,
      raisedBy: { connect: { id: ctx.userId } },
      ...(policy
        ? {
            slaResponseDueAt: new Date(now + policy.responseMins * 60_000),
            slaResolutionDueAt: new Date(now + policy.resolutionMins * 60_000),
          }
        : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Ticket",
      entityId: ticket.id,
      action: "CREATE",
      after: ticket,
    });

    return ticket;
  },

  async update(ctx: ActorCtx, id: string, input: UpdateTicketInput) {
    const existing = await supportRepository.findByIdBare(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Ticket not found");

    const reopening = input.status === "REOPENED" && existing.status !== "REOPENED";
    const resolvingNow = input.status === "RESOLVED" && existing.status !== "RESOLVED";

    const updated = await supportRepository.update(id, {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.assigneeId !== undefined ? { assignee: { connect: { id: input.assigneeId } } } : {}),
      ...(input.resolutionNote !== undefined ? { resolutionNote: input.resolutionNote } : {}),
      ...(resolvingNow ? { resolvedAt: new Date() } : {}),
      ...(reopening ? { reopenCount: { increment: 1 } } : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Ticket",
      entityId: id,
      action: "UPDATE",
      before: existing,
      after: updated,
    });

    if (input.assigneeId && input.assigneeId !== existing.assigneeId) {
      await notificationService.notify({
        userId: input.assigneeId,
        type: "ASSIGNMENT",
        title: "Support ticket assigned",
        body: `${updated.subject} (${updated.code}) has been assigned to you.`,
        link: `/support/${id}`,
      });
    }

    return updated;
  },

  async addComment(ctx: ActorCtx, ticketId: string, input: CreateTicketCommentInput) {
    const ticket = await supportRepository.findByIdBare(ctx.companyId, ticketId);
    if (!ticket) throw ApiError.notFound("Ticket not found");

    const comment = await supportRepository.addComment({
      ticket: { connect: { id: ticketId } },
      body: input.body,
      isInternal: input.isInternal,
      authorId: ctx.userId,
    });

    return comment;
  },
};
