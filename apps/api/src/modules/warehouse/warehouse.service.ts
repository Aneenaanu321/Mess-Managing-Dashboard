import { warehouseRepository } from "./warehouse.repository";
import { AdjustStockInput, ListStockQuery } from "./warehouse.validation";
import { ApiError } from "../../utils/ApiError";
import { writeAuditLog } from "../../utils/audit";
import { prisma } from "../../config/prisma";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

export const warehouseService = {
  async listWarehouses(ctx: ActorCtx) {
    return warehouseRepository.listWarehouses(ctx.companyId);
  },

  async listStock(ctx: ActorCtx, query: ListStockQuery) {
    if (query.warehouseId) {
      const warehouse = await warehouseRepository.findWarehouseById(ctx.companyId, query.warehouseId);
      if (!warehouse) throw ApiError.notFound("Warehouse not found");
    }
    return warehouseRepository.listStock({ companyId: ctx.companyId, ...query });
  },

  /**
   * US-12: every stock change is captured as an immutable StockMovement
   * (type ADJUSTMENT here) alongside the StockItem.onHandQty mutation, kept
   * inside one transaction so the two never drift apart.
   */
  async adjust(ctx: ActorCtx, input: AdjustStockInput) {
    const [warehouse, product] = await Promise.all([
      prisma.warehouse.findFirst({ where: { id: input.warehouseId, companyId: ctx.companyId } }),
      prisma.product.findFirst({ where: { id: input.productId, companyId: ctx.companyId } }),
    ]);
    if (!warehouse) throw ApiError.badRequest("Warehouse not found");
    if (!product) throw ApiError.badRequest("Product not found");

    const existing = await warehouseRepository.findStockItem(input.warehouseId, input.productId);
    const currentQty = existing ? Number(existing.onHandQty) : 0;
    if (currentQty + input.quantityDelta < 0) {
      throw ApiError.conflict(
        `Adjustment would result in negative stock (current: ${currentQty}, delta: ${input.quantityDelta})`,
      );
    }

    const result = await warehouseRepository.adjust({
      warehouseId: input.warehouseId,
      productId: input.productId,
      quantityDelta: input.quantityDelta,
      reason: input.reason,
      actorId: ctx.userId,
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "StockItem",
      entityId: result.stockItem.id,
      action: "ADJUSTMENT",
      before: { onHandQty: currentQty },
      after: { onHandQty: Number(result.stockItem.onHandQty), reason: input.reason },
    });

    return result;
  },
};
