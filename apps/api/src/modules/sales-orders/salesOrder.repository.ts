import { Prisma, SalesOrderStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  status?: SalesOrderStatus;
  customerId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

const readInclude = {
  customer: { select: { id: true, code: true, name: true } },
  customerPO: { select: { id: true, code: true, poNumber: true } },
  lineItems: { include: { product: { select: { id: true, sku: true, name: true, unit: true } }, allocations: true } },
  project: { select: { id: true, code: true, status: true } },
} satisfies Prisma.SalesOrderInclude;

export const salesOrderRepository = {
  async list(params: ListParams) {
    const { companyId, status, customerId, search, page, pageSize } = params;

    const where: Prisma.SalesOrderWhereInput = {
      companyId,
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search ? { code: { contains: search, mode: "insensitive" } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: { customer: { select: { id: true, code: true, name: true } }, customerPO: { select: { id: true, code: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.salesOrder.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  findById(companyId: string, id: string) {
    return prisma.salesOrder.findFirst({ where: { id, companyId }, include: readInclude });
  },
};
