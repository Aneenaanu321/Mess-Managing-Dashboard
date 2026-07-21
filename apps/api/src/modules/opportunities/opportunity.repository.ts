import { OpportunityStage, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  stage?: OpportunityStage;
  search?: string;
  customerId?: string;
  page: number;
  pageSize: number;
}

const summaryInclude = {
  customer: { select: { id: true, code: true, name: true } },
  owner: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.OpportunityInclude;

export const opportunityRepository = {
  async list(params: ListParams) {
    const { companyId, stage, search, customerId, page, pageSize } = params;

    const where: Prisma.OpportunityWhereInput = {
      companyId,
      ...(stage ? { stage } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        include: summaryInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.opportunity.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  findById(companyId: string, id: string) {
    return prisma.opportunity.findFirst({
      where: { id, companyId },
      include: {
        ...summaryInclude,
        stageHistory: { orderBy: { enteredAt: "desc" } },
        quotations: { orderBy: { createdAt: "desc" }, select: { id: true, code: true, status: true, grandTotal: true, currency: true } },
      },
    });
  },

  create(data: Prisma.OpportunityCreateInput) {
    return prisma.opportunity.create({ data, include: summaryInclude });
  },

  update(id: string, data: Prisma.OpportunityUpdateInput) {
    return prisma.opportunity.update({ where: { id }, data, include: summaryInclude });
  },

  addStageHistory(data: Prisma.OpportunityStageHistoryCreateInput) {
    return prisma.opportunityStageHistory.create({ data });
  },
};
