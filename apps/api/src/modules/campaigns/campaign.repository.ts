import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  search?: string;
  page: number;
  pageSize: number;
}

export const campaignRepository = {
  async list(params: ListParams) {
    const { companyId, search, page, pageSize } = params;

    const where: Prisma.CampaignWhereInput = {
      companyId,
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { channel: { contains: search, mode: "insensitive" } }] } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: { _count: { select: { leads: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.campaign.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  findById(companyId: string, id: string) {
    return prisma.campaign.findFirst({
      where: { id, companyId },
      include: {
        leads: { select: { id: true, code: true, companyName: true, status: true }, orderBy: { createdAt: "desc" } },
        _count: { select: { leads: true } },
      },
    });
  },

  create(data: Prisma.CampaignCreateInput) {
    return prisma.campaign.create({ data });
  },

  update(id: string, data: Prisma.CampaignUpdateInput) {
    return prisma.campaign.update({ where: { id }, data });
  },
};
