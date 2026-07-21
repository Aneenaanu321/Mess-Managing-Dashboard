import { Prisma, CustomerPOStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  status?: CustomerPOStatus;
  customerId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

const readInclude = {
  customer: { select: { id: true, code: true, name: true } },
  quotation: { select: { id: true, code: true, grandTotal: true, currency: true, status: true } },
  opportunity: { select: { id: true, code: true, title: true } },
} satisfies Prisma.CustomerPOInclude;

export const customerPORepository = {
  async list(params: ListParams) {
    const { companyId, status, customerId, search, page, pageSize } = params;

    const where: Prisma.CustomerPOWhereInput = {
      companyId,
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { poNumber: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.customerPO.findMany({
        where,
        include: readInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.customerPO.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  findById(companyId: string, id: string) {
    return prisma.customerPO.findFirst({
      where: { id, companyId },
      include: { ...readInclude, salesOrder: { select: { id: true, code: true, status: true } } },
    });
  },

  create(data: Prisma.CustomerPOCreateInput) {
    return prisma.customerPO.create({ data, include: readInclude });
  },

  findByIdWithQuotationLines(companyId: string, id: string) {
    return prisma.customerPO.findFirst({
      where: { id, companyId },
      include: {
        quotation: { include: { lineItems: true } },
        salesOrder: { select: { id: true } },
      },
    });
  },

  markVerified(id: string) {
    return prisma.customerPO.update({
      where: { id },
      data: { status: "VERIFIED" },
      include: readInclude,
    });
  },

  recordAdvance(id: string) {
    return prisma.customerPO.update({
      where: { id },
      data: { advanceReceivedAt: new Date() },
      include: readInclude,
    });
  },
};
