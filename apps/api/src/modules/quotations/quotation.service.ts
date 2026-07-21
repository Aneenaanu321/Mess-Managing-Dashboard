import { quotationRepository } from "./quotation.repository";
import { CreateQuotationInput, UpdateQuotationInput, QuotationLineItemInput } from "./quotation.validation";
import { ApiError } from "../../utils/ApiError";
import { nextNumber } from "../../utils/numberSequence";
import { writeAuditLog } from "../../utils/audit";
import { prisma } from "../../config/prisma";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

interface ComputedLine {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
  lineTotal: number;
  sortOrder: number;
}

interface ComputedTotals {
  lines: ComputedLine[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
}

// Round to cents so Decimal(14,2) columns never receive floating-point noise
// like 199.99999999999997.
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeTotals(lineItems: QuotationLineItemInput[]): ComputedTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  const lines = lineItems.map((item, index) => {
    const gross = item.quantity * item.unitPrice;
    const discount = gross * (item.discountPct / 100);
    const afterDiscount = gross - discount;
    const tax = afterDiscount * (item.taxPct / 100);
    const lineTotal = afterDiscount + tax;

    subtotal += gross;
    discountTotal += discount;
    taxTotal += tax;

    return {
      ...(item.productId ? { productId: item.productId } : {}),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPct: item.discountPct,
      taxPct: item.taxPct,
      lineTotal: round2(lineTotal),
      sortOrder: index,
    };
  });

  return {
    lines,
    subtotal: round2(subtotal),
    discountTotal: round2(discountTotal),
    taxTotal: round2(taxTotal),
    grandTotal: round2(subtotal - discountTotal + taxTotal),
  };
}

export const quotationService = {
  async list(ctx: ActorCtx, query: { status?: any; search?: string; opportunityId?: string; customerId?: string; page: number; pageSize: number }) {
    return quotationRepository.list({ companyId: ctx.companyId, ...query });
  },

  async getById(ctx: ActorCtx, id: string) {
    const quotation = await quotationRepository.findById(ctx.companyId, id);
    if (!quotation) throw ApiError.notFound("Quotation not found");
    return quotation;
  },

  async create(ctx: ActorCtx, input: CreateQuotationInput) {
    const [opportunity, customer] = await Promise.all([
      prisma.opportunity.findFirst({ where: { id: input.opportunityId, companyId: ctx.companyId } }),
      prisma.customer.findFirst({ where: { id: input.customerId, companyId: ctx.companyId } }),
    ]);
    if (!opportunity) throw ApiError.badRequest("Unknown opportunityId for this company");
    if (!customer) throw ApiError.badRequest("Unknown customerId for this company");

    const totals = computeTotals(input.lineItems);
    const code = await nextNumber(ctx.companyId, "QUOTATION", "QT");

    const quotation = await quotationRepository.create({
      companyId: ctx.companyId,
      branchId: ctx.branchId,
      code,
      opportunity: { connect: { id: input.opportunityId } },
      customer: { connect: { id: input.customerId } },
      currency: input.currency || opportunity.currency || "AED",
      paymentTerms: input.paymentTerms,
      validUntil: input.validUntil,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      createdBy: { connect: { id: ctx.userId } },
      lineItems: {
        create: totals.lines.map((line) => ({
          ...(line.productId ? { product: { connect: { id: line.productId } } } : {}),
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountPct: line.discountPct,
          taxPct: line.taxPct,
          lineTotal: line.lineTotal,
          sortOrder: line.sortOrder,
        })),
      },
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Quotation",
      entityId: quotation.id,
      action: "CREATE",
      after: quotation,
    });

    return quotation;
  },

  async update(ctx: ActorCtx, id: string, input: UpdateQuotationInput) {
    const existing = await quotationRepository.findById(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Quotation not found");

    if (input.lineItems && existing.status !== "DRAFT" && existing.status !== "REVISION_REQUESTED") {
      throw ApiError.conflict(`Line items cannot be edited once a quotation is ${existing.status}`);
    }

    const totals = input.lineItems ? computeTotals(input.lineItems) : null;

    if (totals) {
      await quotationRepository.replaceLineItems(id, totals.lines);
    }

    const updated = await quotationRepository.update(id, {
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.paymentTerms !== undefined ? { paymentTerms: input.paymentTerms } : {}),
      ...(input.validUntil ? { validUntil: input.validUntil } : {}),
      ...(totals
        ? { subtotal: totals.subtotal, discountTotal: totals.discountTotal, taxTotal: totals.taxTotal, grandTotal: totals.grandTotal }
        : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Quotation",
      entityId: id,
      action: "UPDATE",
      before: existing,
      after: updated,
    });

    return updated;
  },

  async send(ctx: ActorCtx, id: string) {
    const existing = await quotationRepository.findById(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Quotation not found");
    if (existing.status === "SENT" || existing.status === "CUSTOMER_APPROVED") {
      throw ApiError.conflict(`Quotation has already been sent (status: ${existing.status})`);
    }

    const updated = await quotationRepository.update(id, { status: "SENT", sentAt: new Date() });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Quotation",
      entityId: id,
      action: "SEND",
      before: { status: existing.status },
      after: { status: updated.status, sentAt: updated.sentAt },
    });

    return updated;
  },

  async approve(ctx: ActorCtx, id: string) {
    const existing = await quotationRepository.findById(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Quotation not found");
    if (existing.status !== "DRAFT" && existing.status !== "PENDING_APPROVAL") {
      throw ApiError.conflict(`Quotation cannot be approved from status ${existing.status}`);
    }

    const updated = await quotationRepository.update(id, { status: "APPROVED_INTERNAL" });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Quotation",
      entityId: id,
      action: "APPROVE",
      before: { status: existing.status },
      after: { status: updated.status },
    });

    return updated;
  },
};
