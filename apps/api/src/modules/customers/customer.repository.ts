import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  industry?: Prisma.CustomerWhereInput["industry"];
  search?: string;
  page: number;
  pageSize: number;
}

export const customerRepository = {
  async list(params: ListParams) {
    const { companyId, industry, search, page, pageSize } = params;

    const where: Prisma.CustomerWhereInput = {
      companyId,
      ...(industry ? { industry } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
              { website: { contains: search, mode: "insensitive" } },
              { taxId: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          owner: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { contacts: true, sites: true, opportunities: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.customer.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  findById(companyId: string, id: string) {
    return prisma.customer.findFirst({
      where: { id, companyId },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        contacts: { orderBy: { isPrimary: "desc" } },
        sites: true,
        opportunities: { orderBy: { createdAt: "desc" }, select: { id: true, code: true, title: true, stage: true, estimatedValue: true, currency: true } },
      },
    });
  },

  findByName(companyId: string, name: string) {
    return prisma.customer.findFirst({ where: { companyId, name } });
  },

  create(data: Prisma.CustomerCreateInput) {
    return prisma.customer.create({
      data,
      include: { owner: { select: { id: true, firstName: true, lastName: true } }, contacts: true, sites: true },
    });
  },

  update(id: string, data: Prisma.CustomerUpdateInput) {
    return prisma.customer.update({
      where: { id },
      data,
      include: { owner: { select: { id: true, firstName: true, lastName: true } }, contacts: true, sites: true },
    });
  },
};
