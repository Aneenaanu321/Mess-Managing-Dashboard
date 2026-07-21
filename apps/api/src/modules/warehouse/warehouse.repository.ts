import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

const productSelect = {
  id: true,
  sku: true,
  name: true,
  category: true,
  unit: true,
  basePrice: true,
  reorderLevel: true,
} satisfies Prisma.ProductSelect;

export const warehouseRepository = {
  listWarehouses(companyId: string) {
    return prisma.warehouse.findMany({
      where: { companyId },
      include: {
        stockItems: { include: { product: { select: productSelect } } },
      },
      orderBy: { name: "asc" },
    });
  },

  findWarehouseById(companyId: string, id: string) {
    return prisma.warehouse.findFirst({ where: { id, companyId } });
  },

  listStock(params: { companyId: string; warehouseId?: string; search?: string; page: number; pageSize: number }) {
    const { companyId, warehouseId, search, page, pageSize } = params;

    const where: Prisma.StockItemWhereInput = {
      warehouse: { companyId },
      ...(warehouseId ? { warehouseId } : {}),
      ...(search
        ? {
            product: {
              OR: [
                { sku: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    };

    return Promise.all([
      prisma.stockItem.findMany({
        where,
        include: {
          product: { select: productSelect },
          warehouse: { select: { id: true, name: true, code: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.stockItem.count({ where }),
    ]).then(([items, total]) => ({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }));
  },

  findStockItem(warehouseId: string, productId: string) {
    return prisma.stockItem.findUnique({ where: { warehouseId_productId: { warehouseId, productId } } });
  },

  async adjust(params: { warehouseId: string; productId: string; quantityDelta: number; reason: string; actorId: string }) {
    const { warehouseId, productId, quantityDelta, reason, actorId } = params;

    return prisma.$transaction(async (tx) => {
      const stockItem = await tx.stockItem.upsert({
        where: { warehouseId_productId: { warehouseId, productId } },
        create: { warehouseId, productId, onHandQty: 0 },
        update: {},
      });

      const newQty = Number(stockItem.onHandQty) + quantityDelta;
      const updated = await tx.stockItem.update({
        where: { id: stockItem.id },
        data: { onHandQty: newQty },
        include: { product: { select: productSelect }, warehouse: { select: { id: true, name: true, code: true } } },
      });

      const movement = await tx.stockMovement.create({
        data: {
          stockItemId: stockItem.id,
          type: "ADJUSTMENT",
          quantity: quantityDelta,
          note: reason,
          createdById: actorId,
        },
      });

      return { stockItem: updated, movement };
    });
  },
};
