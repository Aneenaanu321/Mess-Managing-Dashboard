import { Prisma, LeadStatus, DisqualifyReason } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  status?: LeadStatus;
  ownerId?: string;
  unassigned?: boolean;
  slaBreached?: boolean;
  slaHours?: number;
  industry?: Prisma.LeadWhereInput["industry"];
  search?: string;
  page: number;
  pageSize: number;
}

export const leadRepository = {
  async list(params: ListParams) {
    const { companyId, status, ownerId, unassigned, slaBreached, slaHours = 24, industry, search, page, pageSize } = params;

    const slaCutoff = new Date(Date.now() - slaHours * 60 * 60 * 1000);

    const where: Prisma.LeadWhereInput = {
      companyId,
      ...(status ? { status } : {}),
      ...(ownerId ? { ownerId } : {}),
      ...(unassigned ? { ownerId: null, status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } } : {}),
      ...(slaBreached
        ? {
            status: { in: ["NEW", "CONTACTED"] },
            firstContactedAt: null,
            createdAt: { lt: slaCutoff },
          }
        : {}),
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

  findDuplicateCandidates(companyId: string) {
    return prisma.lead.findMany({
      where: {
        companyId,
        status: { notIn: ["DISQUALIFIED", "CONVERTED"] },
        OR: [{ email: { not: null } }, { phone: { not: null } }],
      },
      select: {
        id: true,
        code: true,
        companyName: true,
        contactName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  },

  create(data: Prisma.LeadCreateInput) {
    return prisma.lead.create({ data });
  },

  update(id: string, data: Prisma.LeadUpdateInput) {
    return prisma.lead.update({ where: { id }, data });
  },

  assign(id: string, ownerId: string, firstContactedAt?: Date | null) {
    return prisma.lead.update({
      where: { id },
      data: {
        ownerId,
        status: "CONTACTED",
        ...(firstContactedAt === undefined ? {} : { firstContactedAt }),
      },
    });
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

  assignableUsers(companyId: string) {
    return prisma.user.findMany({
      where: {
        companyId,
        status: "ACTIVE",
        role: { key: { in: ["SALES_EXECUTIVE", "SALES_MANAGER", "SALES_DIRECTOR", "SALES_COORDINATOR"] } },
      },
      select: { id: true, firstName: true, lastName: true, role: { select: { name: true, key: true } } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  },
};
