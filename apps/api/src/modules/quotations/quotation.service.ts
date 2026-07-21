import { quotationRepository } from "./quotation.repository";
import { CreateQuotationInput, UpdateQuotationInput, QuotationLineItemInput } from "./quotation.validation";
import { ApiError } from "../../utils/ApiError";
import { nextNumber } from "../../utils/numberSequence";
import { writeAuditLog } from "../../utils/audit";
import { notificationService } from "../notifications/notification.service";
import { prisma } from "../../config/prisma";

// docs/04-process-mapping.md §4 — default approval routing thresholds.
const MANAGER_APPROVAL_DISCOUNT_PCT = 10;
const DIRECTOR_APPROVAL_DISCOUNT_PCT = 20;

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
  listPrice?: number;
  isPriceOverridden: boolean;
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

async function computeTotals(lineItems: QuotationLineItemInput[]): Promise<ComputedTotals> {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  const productIds = [...new Set(lineItems.map((item) => item.productId).filter((id): id is string => !!id))];
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, basePrice: true } })
    : [];
  const basePriceByProductId = new Map(products.map((p) => [p.id, Number(p.basePrice)]));

  const lines = lineItems.map((item, index) => {
    const gross = item.quantity * item.unitPrice;
    const discount = gross * (item.discountPct / 100);
    const afterDiscount = gross - discount;
    const tax = afterDiscount * (item.taxPct / 100);
    const lineTotal = afterDiscount + tax;

    subtotal += gross;
    discountTotal += discount;
    taxTotal += tax;

    const basePrice = item.productId ? basePriceByProductId.get(item.productId) : undefined;
    // Only underpricing vs. the catalog counts as an "override" requiring approval —
    // a rep charging more than list price doesn't need sign-off.
    const isPriceOverridden = basePrice !== undefined && item.unitPrice < basePrice;

    return {
      ...(item.productId ? { productId: item.productId } : {}),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPct: item.discountPct,
      taxPct: item.taxPct,
      lineTotal: round2(lineTotal),
      sortOrder: index,
      ...(basePrice !== undefined ? { listPrice: basePrice } : {}),
      isPriceOverridden,
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

interface ApprovalRequirement {
  required: boolean;
  reason: string | null;
}

function evaluateApprovalRequirement(quotation: { subtotal: unknown; discountTotal: unknown; lineItems: { isPriceOverridden: boolean }[] }): ApprovalRequirement {
  if (quotation.lineItems.some((l) => l.isPriceOverridden)) {
    return { required: true, reason: "Price override below catalog price on one or more line items" };
  }

  const subtotal = Number(quotation.subtotal);
  const discountPct = subtotal > 0 ? (Number(quotation.discountTotal) / subtotal) * 100 : 0;

  if (discountPct > DIRECTOR_APPROVAL_DISCOUNT_PCT) {
    return { required: true, reason: `Discount ${discountPct.toFixed(1)}% exceeds ${DIRECTOR_APPROVAL_DISCOUNT_PCT}% — Sales Director approval required` };
  }
  if (discountPct > MANAGER_APPROVAL_DISCOUNT_PCT) {
    return { required: true, reason: `Discount ${discountPct.toFixed(1)}% exceeds ${MANAGER_APPROVAL_DISCOUNT_PCT}% — Sales Manager approval required` };
  }
  return { required: false, reason: null };
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

    const totals = await computeTotals(input.lineItems);
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
          ...(line.listPrice !== undefined ? { listPrice: line.listPrice } : {}),
          isPriceOverridden: line.isPriceOverridden,
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

    const totals = input.lineItems ? await computeTotals(input.lineItems) : null;

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

  /**
   * docs/04-process-mapping.md §4 approval routing: a quotation whose discount
   * or price overrides cross the configured thresholds can't be sent directly
   * — it goes to an Approval record instead (see modules/approvals) and only
   * becomes SENT once a Sales Manager/Director decides it. Below-threshold
   * quotations skip approval entirely, same as before this pass.
   */
  async send(ctx: ActorCtx, id: string) {
    const existing = await quotationRepository.findById(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Quotation not found");
    if (existing.status === "SENT" || existing.status === "CUSTOMER_APPROVED") {
      throw ApiError.conflict(`Quotation has already been sent (status: ${existing.status})`);
    }
    if (existing.status === "PENDING_APPROVAL") {
      throw ApiError.conflict("Quotation is awaiting approval — it will be sent automatically once decided");
    }

    const approval = evaluateApprovalRequirement(existing);

    if (approval.required && existing.status !== "APPROVED_INTERNAL") {
      const updated = await quotationRepository.update(id, { status: "PENDING_APPROVAL" });

      const approvalRecord = await prisma.approval.create({
        data: {
          companyId: ctx.companyId,
          entityType: "Quotation",
          entityId: id,
          quotation: { connect: { id } },
          requestedBy: { connect: { id: ctx.userId } },
          reason: approval.reason,
        },
      });

      await writeAuditLog({
        companyId: ctx.companyId,
        actorId: ctx.userId,
        entityType: "Quotation",
        entityId: id,
        action: "REQUEST_APPROVAL",
        before: { status: existing.status },
        after: { status: updated.status, approvalId: approvalRecord.id, reason: approval.reason },
      });

      return updated;
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
