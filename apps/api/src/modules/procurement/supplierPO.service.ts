import { supplierPORepository } from "./supplierPO.repository";
import { CreateSupplierPOInput, ListSupplierPOsQuery } from "./supplierPO.validation";
import { ApiError } from "../../utils/ApiError";
import { nextNumber } from "../../utils/numberSequence";
import { writeAuditLog } from "../../utils/audit";
import { prisma } from "../../config/prisma";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

export const supplierPOService = {
  async list(ctx: ActorCtx, query: ListSupplierPOsQuery) {
    return supplierPORepository.list({ companyId: ctx.companyId, ...query });
  },

  async getById(ctx: ActorCtx, id: string) {
    const po = await supplierPORepository.findById(ctx.companyId, id);
    if (!po) throw ApiError.notFound("Supplier purchase order not found");
    return po;
  },

  async create(ctx: ActorCtx, input: CreateSupplierPOInput) {
    const vendor = await prisma.vendor.findFirst({ where: { id: input.vendorId, companyId: ctx.companyId } });
    if (!vendor) throw ApiError.badRequest("Vendor not found");

    const productIds = [...new Set(input.lineItems.map((li) => li.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, companyId: ctx.companyId } });
    if (products.length !== productIds.length) {
      throw ApiError.badRequest("One or more products were not found");
    }

    const totalAmount = input.lineItems.reduce((sum, li) => sum + li.quantity * li.unitCost, 0);
    const code = await nextNumber(ctx.companyId, "SUPPLIER_PO", "SPO");

    const po = await supplierPORepository.create({
      companyId: ctx.companyId,
      branchId: ctx.branchId,
      code,
      vendor: { connect: { id: input.vendorId } },
      currency: input.currency ?? "AED",
      totalAmount,
      expectedDate: input.expectedDate ? new Date(input.expectedDate) : undefined,
      lineItems: {
        create: input.lineItems.map((li) => ({
          product: { connect: { id: li.productId } },
          quantity: li.quantity,
          unitCost: li.unitCost,
        })),
      },
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "SupplierPO",
      entityId: po.id,
      action: "CREATE",
      after: po,
    });

    return po;
  },
};
