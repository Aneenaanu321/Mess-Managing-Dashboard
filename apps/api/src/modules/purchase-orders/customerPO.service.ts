import { customerPORepository } from "./customerPO.repository";
import { CreateCustomerPOInput, ListCustomerPOsQuery } from "./customerPO.validation";
import { ApiError } from "../../utils/ApiError";
import { nextNumber } from "../../utils/numberSequence";
import { writeAuditLog } from "../../utils/audit";
import { prisma } from "../../config/prisma";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

export const customerPOService = {
  async list(ctx: ActorCtx, query: ListCustomerPOsQuery) {
    return customerPORepository.list({ companyId: ctx.companyId, ...query });
  },

  async getById(ctx: ActorCtx, id: string) {
    const po = await customerPORepository.findById(ctx.companyId, id);
    if (!po) throw ApiError.notFound("Purchase order not found");
    return po;
  },

  /**
   * US-10: a customer PO is received against a specific quotation. We flag
   * `amountMismatch` (rather than hard-blocking) when the PO amount differs
   * from the quotation's grand total, so Sales/Finance can reconcile before
   * the PO is verified — see docs/04-process-mapping.md §10.
   */
  async create(ctx: ActorCtx, input: CreateCustomerPOInput) {
    const [customer, quotation] = await Promise.all([
      prisma.customer.findFirst({ where: { id: input.customerId, companyId: ctx.companyId } }),
      prisma.quotation.findFirst({ where: { id: input.quotationId, companyId: ctx.companyId } }),
    ]);
    if (!customer) throw ApiError.badRequest("Customer not found");
    if (!quotation) throw ApiError.badRequest("Quotation not found");
    if (quotation.customerId !== customer.id) {
      throw ApiError.badRequest("Quotation does not belong to the selected customer");
    }
    if (input.opportunityId) {
      const opportunity = await prisma.opportunity.findFirst({ where: { id: input.opportunityId, companyId: ctx.companyId } });
      if (!opportunity) throw ApiError.badRequest("Opportunity not found");
    }

    const code = await nextNumber(ctx.companyId, "CUSTOMER_PO", "CPO");
    const amountMismatch = Number(quotation.grandTotal) !== Number(input.amount);

    const po = await customerPORepository.create({
      companyId: ctx.companyId,
      branchId: ctx.branchId,
      code,
      poNumber: input.poNumber,
      customer: { connect: { id: input.customerId } },
      quotation: { connect: { id: input.quotationId } },
      ...(input.opportunityId ? { opportunity: { connect: { id: input.opportunityId } } } : {}),
      amount: input.amount,
      currency: input.currency || quotation.currency,
      advanceRequired: input.advanceRequired ?? 0,
      amountMismatch,
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "CustomerPO",
      entityId: po.id,
      action: "CREATE",
      after: po,
    });

    return po;
  },

  /**
   * US-10 / docs/04-process-mapping.md §5: "PO logged (matched to Quotation)"
   * — verifying a PO is what actually creates the fulfillment-side
   * SalesOrder, copying the quotation's product line items across. Only
   * quotation lines with a catalog `productId` carry over (free-text /
   * service lines aren't inventory-allocatable). Idempotent: a PO can only
   * be verified once (guarded by status + the salesOrder 1:1 relation).
   */
  async verify(ctx: ActorCtx, id: string) {
    const po = await customerPORepository.findByIdWithQuotationLines(ctx.companyId, id);
    if (!po) throw ApiError.notFound("Purchase order not found");
    if (po.status !== "RECEIVED") throw ApiError.conflict("Only a received PO can be verified");
    if (po.salesOrder) throw ApiError.conflict("This PO has already been verified");

    const productLines = po.quotation.lineItems.filter((line) => line.productId);
    if (productLines.length === 0) {
      throw ApiError.conflict("The linked quotation has no catalog product lines to fulfill");
    }

    const soCode = await nextNumber(ctx.companyId, "SALES_ORDER", "SO");

    const salesOrder = await prisma.$transaction(async (tx) => {
      const so = await tx.salesOrder.create({
        data: {
          companyId: ctx.companyId,
          branchId: ctx.branchId,
          code: soCode,
          customer: { connect: { id: po.customerId } },
          customerPO: { connect: { id: po.id } },
          currency: po.currency,
          totalAmount: po.quotation.grandTotal,
          lineItems: {
            create: productLines.map((line) => ({
              product: { connect: { id: line.productId! } },
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.lineTotal,
            })),
          },
        },
        include: { lineItems: true },
      });

      await tx.customerPO.update({ where: { id: po.id }, data: { status: "VERIFIED" } });

      return so;
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "CustomerPO",
      entityId: id,
      action: "VERIFY",
      after: { status: "VERIFIED", salesOrderId: salesOrder.id },
    });

    return customerPORepository.findById(ctx.companyId, id);
  },

  /**
   * docs/04-process-mapping.md §5: Project creation is blocked until advance
   * payment is recorded (when the quotation's payment terms require one).
   */
  async recordAdvance(ctx: ActorCtx, id: string) {
    const po = await customerPORepository.findById(ctx.companyId, id);
    if (!po) throw ApiError.notFound("Purchase order not found");
    if (po.status !== "VERIFIED") throw ApiError.conflict("PO must be verified before recording an advance payment");
    if (po.advanceReceivedAt) throw ApiError.conflict("Advance payment has already been recorded for this PO");

    const updated = await customerPORepository.recordAdvance(id);

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "CustomerPO",
      entityId: id,
      action: "RECORD_ADVANCE",
      after: { advanceReceivedAt: updated.advanceReceivedAt },
    });

    return updated;
  },
};
