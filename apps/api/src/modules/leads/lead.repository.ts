import { Prisma, LeadStatus, DisqualifyReason } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  status?: LeadStatus;
  ownerId?: string;
  industry?: Prisma.LeadWhereInput["industry"];
  search?: string;
  page: number;
  pageSize: number;
}

export const leadRepository = {
  async list(params: ListParams) {
    const { companyId, status, ownerId, industry, search, page, pageSize } = params;

    const where: Prisma.LeadWhereInput = {
      companyId,
      ...(status ? { status } : {}),
      ...(ownerId ? { ownerId } : {}),
      ...(industry ? { industry } : {}),
      ...(search
        ? {
            OR: [
              { companyName: { contains: search, mode: "insensitive" } },
              { contactName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: { owner: { select: { id: true, firstName: true, lastName: true } }, campaign: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lead.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  findById(companyId: string, id: string) {
    return prisma.lead.findFirst({
      where: { id, companyId },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        campaign: true,
        activities: { orderBy: { occurredAt: "desc" }, take: 50 },
      },
    });
  },

  findDuplicate(companyId: string, email?: string, phone?: string) {
    if (!email && !phone) return Promise.resolve(null);
    return prisma.lead.findFirst({
      where: {
        companyId,
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
    });
  },

  create(data: Prisma.LeadCreateInput) {
    return prisma.lead.create({ data });
  },

  update(id: string, data: Prisma.LeadUpdateInput) {
    return prisma.lead.update({ where: { id }, data });
  },

  assign(id: string, ownerId: string) {
    return prisma.lead.update({ where: { id }, data: { ownerId, status: "CONTACTED" } });
  },

  disqualify(id: string, reason: DisqualifyReason, note?: string) {
    return prisma.lead.update({
      where: { id },
      data: { status: "DISQUALIFIED", disqualifyReason: reason, disqualifyNote: note },
    });
  },

  markConverted(id: string, opportunityId: string) {
    return prisma.lead.update({
      where: { id },
      data: { status: "CONVERTED", convertedOpportunityId: opportunityId },
    });
  },

  updateScore(id: string, score: number) {
    return prisma.lead.update({ where: { id }, data: { score, scoreUpdatedAt: new Date() } });
  },
};
