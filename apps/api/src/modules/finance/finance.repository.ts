import { Prisma, InvoiceStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  status?: InvoiceStatus;
  customerId?: string;
  projectId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

const detailInclude = {
  customer: { select: { id: true, code: true, name: true } },
  salesOrder: { select: { id: true, code: true } },
  project: { select: { id: true, code: true, name: true } },
  lineItems: true,
  payments: { orderBy: { receivedAt: "desc" as const } },
} satisfies Prisma.InvoiceInclude;

export const financeRepository = {
  async list(params: ListParams) {
    const { companyId, status, customerId, projectId, search, page, pageSize } = params;

    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(search ? { code: { contains: search, mode: "insensitive" } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, code: true, name: true } },
          project: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invoice.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  findById(companyId: string, id: string) {
    return prisma.invoice.findFirst({ where: { id, companyId }, include: detailInclude });
  },

  findByIdBare(companyId: string, id: string) {
    return prisma.invoice.findFirst({ where: { id, companyId } });
  },

  create(data: Prisma.InvoiceCreateInput) {
    return prisma.invoice.create({ data, include: detailInclude });
  },

  update(id: string, data: Prisma.InvoiceUpdateInput) {
    return prisma.invoice.update({ where: { id }, data, include: detailInclude });
  },

  createPayment(data: Prisma.PaymentCreateInput) {
    return prisma.payment.create({ data });
  },
};
