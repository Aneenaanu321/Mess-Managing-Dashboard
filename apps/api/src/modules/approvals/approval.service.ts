import { approvalRepository } from "./approval.repository";
import { DecideApprovalInput, ListApprovalsQuery } from "./approval.validation";
import { ApiError } from "../../utils/ApiError";
import { writeAuditLog } from "../../utils/audit";
import { notificationService } from "../notifications/notification.service";
import { prisma } from "../../config/prisma";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

export const approvalService = {
  list(ctx: ActorCtx, query: ListApprovalsQuery) {
    return approvalRepository.list(ctx.companyId, query.status);
  },

  /**
   * Decides a pending Approval. Currently the only producer is
   * quotation.service#send (discount/price-override routing) — deciding here
   * closes the loop by moving the linked Quotation to SENT (approve) or back
   * to DRAFT for revision (reject), rather than leaving it stuck in
   * PENDING_APPROVAL with no way forward.
   */
  async decide(ctx: ActorCtx, id: string, input: DecideApprovalInput) {
    const approval = await approvalRepository.findById(ctx.companyId, id);
    if (!approval) throw ApiError.notFound("Approval not found");
    if (approval.status !== "PENDING") {
      throw ApiError.conflict(`This approval has already been decided (${approval.status})`);
    }

    const decided = await approvalRepository.decide(id, {
      status: input.action === "APPROVE" ? "APPROVED" : "REJECTED",
      decidedBy: { connect: { id: ctx.userId } },
      comment: input.comment,
      decidedAt: new Date(),
    });

    if (approval.entityType === "Quotation" && approval.quotationId) {
      const newStatus = input.action === "APPROVE" ? "SENT" : "DRAFT";
      await prisma.quotation.update({
        where: { id: approval.quotationId },
        data: { status: newStatus, ...(input.action === "APPROVE" ? { sentAt: new Date() } : {}) },
      });
    }

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Approval",
      entityId: id,
      action: input.action,
      before: { status: approval.status },
      after: { status: decided.status, comment: input.comment },
    });

    await notificationService.notify({
      userId: approval.requestedById,
      type: "APPROVAL_DECISION",
      title: input.action === "APPROVE" ? "Your quotation was approved" : "Your quotation was rejected",
      body: approval.quotation
        ? `${approval.quotation.code} (${approval.quotation.customer.name}) — ${input.comment || (input.action === "APPROVE" ? "Approved, now sent to the customer." : "Sent back to draft for revision.")}`
        : input.comment || "",
      link: approval.quotationId ? `/quotations/${approval.quotationId}` : undefined,
    });

    return decided;
  },
};
