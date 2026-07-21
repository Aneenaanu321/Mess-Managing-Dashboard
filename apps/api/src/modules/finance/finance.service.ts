import { InvoiceStatus } from "@prisma/client";
import { financeRepository } from "./finance.repository";
import { CreateInvoiceInput, UpdateInvoiceInput, RecordPaymentInput, ListInvoicesQuery } from "./finance.validation";
import { ApiError } from "../../utils/ApiError";
import { nextNumber } from "../../utils/numberSequence";
import { writeAuditLog } from "../../utils/audit";
import { prisma } from "../../config/prisma";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

function computeTotals(lineItems: CreateInvoiceInput["lineItems"]) {
  let subtotal = 0;
  let taxTotal = 0;
  const items = lineItems.map((li) => {
    const base = li.quantity * li.unitPrice;
    const tax = base * (li.taxPct / 100);
    const lineTotal = base + tax;
    subtotal += base;
    taxTotal += tax;
    return {
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      taxPct: li.taxPct,
      lineTotal,
    };
  });
  return { items, subtotal, taxTotal, totalAmount: subtotal + taxTotal };
}

export const financeService = {
  async list(ctx: ActorCtx, query: ListInvoicesQuery) {
    return financeRepository.list({ companyId: ctx.companyId, ...query });
  },

  async getById(ctx: ActorCtx, id: string) {
    const invoice = await financeRepository.findById(ctx.companyId, id);
    if (!invoice) throw ApiError.notFound("Invoice not found");
    return invoice;
  },

  async create(ctx: ActorCtx, input: CreateInvoiceInput) {
    const code = await nextNumber(ctx.companyId, "INVOICE", "INV");
    const { items, subtotal, taxTotal, totalAmount } = computeTotals(input.lineItems);

    const invoice = await financeRepository.create({
      companyId: ctx.companyId,
      branchId: ctx.branchId,
      code,
      customer: { connect: { id: input.customerId } },
      ...(input.salesOrderId ? { salesOrder: { connect: { id: input.salesOrderId } } } : {}),
      ...(input.projectId ? { project: { connect: { id: input.projectId } } } : {}),
      ...(input.milestoneLabel ? { milestoneLabel: input.milestoneLabel } : {}),
      currency: input.currency || "AED",
      subtotal,
      taxTotal,
      totalAmount,
      dueDate: input.dueDate,
      lineItems: { create: items },
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Invoice",
      entityId: invoice.id,
      action: "CREATE",
      after: invoice,
    });

    return invoice;
  },

  async update(ctx: ActorCtx, id: string, input: UpdateInvoiceInput) {
    const existing = await financeRepository.findByIdBare(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Invoice not found");

    const updated = await financeRepository.update(id, {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.milestoneLabel !== undefined ? { milestoneLabel: input.milestoneLabel } : {}),
      ...(input.issuedAt !== undefined ? { issuedAt: input.issuedAt } : {}),
      ...(input.status === "SENT" && !existing.issuedAt ? { issuedAt: new Date() } : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Invoice",
      entityId: id,
      action: "UPDATE",
      before: existing,
      after: updated,
    });

    return updated;
  },

  async recordPayment(ctx: ActorCtx, invoiceId: string, input: RecordPaymentInput) {
    const invoice = await financeRepository.findByIdBare(ctx.companyId, invoiceId);
    if (!invoice) throw ApiError.notFound("Invoice not found");
    if (invoice.status === "CANCELLED") throw ApiError.conflict("Cannot record a payment against a cancelled invoice");

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          companyId: ctx.companyId,
          invoiceId,
          amount: input.amount,
          currency: invoice.currency,
          method: input.method,
          reference: input.reference,
          receivedAt: input.receivedAt || new Date(),
          recordedById: ctx.userId,
        },
      });

      const amountPaid = Number(invoice.amountPaid) + input.amount;
      const totalAmount = Number(invoice.totalAmount);
      const status: InvoiceStatus = amountPaid >= totalAmount ? "PAID" : "PARTIALLY_PAID";

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: { amountPaid, status },
        include: { lineItems: true, payments: { orderBy: { receivedAt: "desc" } } },
      });

      return { payment, invoice: updatedInvoice };
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Payment",
      entityId: result.payment.id,
      action: "CREATE",
      after: result.payment,
    });

    return result;
  },
};
