import { salesOrderRepository } from "./salesOrder.repository";
import { ListSalesOrdersQuery } from "./salesOrder.validation";
import { ApiError } from "../../utils/ApiError";
import { writeAuditLog } from "../../utils/audit";
import { prisma } from "../../config/prisma";
import { warehouseRepository } from "../warehouse/warehouse.repository";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

export const salesOrderService = {
  async list(ctx: ActorCtx, query: ListSalesOrdersQuery) {
    return salesOrderRepository.list({ companyId: ctx.companyId, ...query });
  },

  async getById(ctx: ActorCtx, id: string) {
    const salesOrder = await salesOrderRepository.findById(ctx.companyId, id);
    if (!salesOrder) throw ApiError.notFound("Sales order not found");
    return salesOrder;
  },

  /**
   * docs/04-process-mapping.md §5: "Inventory Allocation check" — reserves
   * as much of each line's quantity as is currently available in the chosen
   * warehouse (onHandQty - reservedQty), so partial stock doesn't block the
   * whole order. Re-running against the same warehouse only reserves the
   * still-outstanding remainder (idempotent, safe to retry after a restock).
   */
  async allocate(ctx: ActorCtx, id: string, warehouseId: string) {
    const salesOrder = await salesOrderRepository.findById(ctx.companyId, id);
    if (!salesOrder) throw ApiError.notFound("Sales order not found");
    if (salesOrder.status === "FULFILLED" || salesOrder.status === "CANCELLED") {
      throw ApiError.conflict(`Cannot allocate a ${salesOrder.status.toLowerCase()} sales order`);
    }

    const warehouse = await warehouseRepository.findWarehouseById(ctx.companyId, warehouseId);
    if (!warehouse) throw ApiError.badRequest("Warehouse not found");

    const result = await prisma.$transaction(async (tx) => {
      let fullyAllocatedLines = 0;

      for (const line of salesOrder.lineItems) {
        const alreadyReserved = line.allocations
          .filter((a) => a.warehouseId === warehouseId && a.status === "RESERVED")
          .reduce((sum, a) => sum + Number(a.quantity), 0);
        const outstanding = Number(line.quantity) - alreadyReserved;
        if (outstanding <= 0) {
          fullyAllocatedLines++;
          continue;
        }

        const stockItem = await tx.stockItem.findUnique({
          where: { warehouseId_productId: { warehouseId, productId: line.productId } },
        });
        const available = stockItem ? Number(stockItem.onHandQty) - Number(stockItem.reservedQty) : 0;
        const toReserve = Math.min(available, outstanding);
        if (toReserve <= 0) continue;

        await tx.inventoryAllocation.create({
          data: {
            salesOrderId: salesOrder.id,
            salesOrderLineItemId: line.id,
            warehouseId,
            quantity: toReserve,
            status: "RESERVED",
          },
        });
        await tx.stockItem.update({
          where: { id: stockItem!.id },
          data: { reservedQty: { increment: toReserve } },
        });
        await tx.stockMovement.create({
          data: {
            stockItemId: stockItem!.id,
            type: "ALLOCATION_RESERVE",
            quantity: toReserve,
            reference: salesOrder.code,
            createdById: ctx.userId,
          },
        });

        if (toReserve === outstanding) fullyAllocatedLines++;
      }

      const newStatus =
        fullyAllocatedLines === salesOrder.lineItems.length
          ? "ALLOCATED"
          : fullyAllocatedLines > 0
            ? "PARTIALLY_ALLOCATED"
            : salesOrder.status;

      return tx.salesOrder.update({
        where: { id: salesOrder.id },
        data: { status: newStatus },
        include: { lineItems: { include: { allocations: true, product: { select: { id: true, sku: true, name: true } } } } },
      });
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "SalesOrder",
      entityId: id,
      action: "ALLOCATE",
      before: { status: salesOrder.status },
      after: { status: result.status, warehouseId },
    });

    return result;
  },
};
