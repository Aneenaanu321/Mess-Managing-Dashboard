import { Prisma, QuotationStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  status?: QuotationStatus;
  search?: string;
  opportunityId?: string;
  customerId?: string;
  page: number;
  pageSize: number;
}

const detailInclude = {
  customer: { select: { id: true, code: true, name: true } },
  opportunity: { select: { id: true, code: true, title: true, stage: true } },
  lineItems: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.QuotationInclude;

export const quotationRepository = {
  async list(params: ListParams) {
    const { companyId, status, search, opportunityId, customerId, page, pageSize } = params;

    const where: Prisma.QuotationWhereInput = {
      companyId,
      ...(status ? { status } : {}),
      ...(opportunityId ? { opportunityId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { opportunity: { title: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        include: {
          customer: { select: { id: true, code: true, name: true } },
          opportunity: { select: { id: true, code: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.quotation.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  findById(companyId: string, id: string) {
    return prisma.quotation.findFirst({ where: { id, companyId }, include: detailInclude });
  },

  create(data: Prisma.QuotationCreateInput) {
    return prisma.quotation.create({ data, include: detailInclude });
  },

  update(id: string, data: Prisma.QuotationUpdateInput) {
    return prisma.quotation.update({ where: { id }, data, include: detailInclude });
  },

  async replaceLineItems(id: string, lineItems: Array<Omit<Prisma.QuotationLineItemCreateManyInput, "quotationId">>) {
    await prisma.$transaction([
      prisma.quotationLineItem.deleteMany({ where: { quotationId: id } }),
      prisma.quotationLineItem.createMany({ data: lineItems.map((item) => ({ ...item, quotationId: id })) }),
    ]);
  },
};
