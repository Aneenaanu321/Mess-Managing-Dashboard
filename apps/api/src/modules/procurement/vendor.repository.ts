import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  search?: string;
  page: number;
  pageSize: number;
}

export const vendorRepository = {
  async list(params: ListParams) {
    const { companyId, search, page, pageSize } = params;

    const where: Prisma.VendorWhereInput = {
      companyId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { contactName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.vendor.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.vendor.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  findById(companyId: string, id: string) {
    return prisma.vendor.findFirst({ where: { id, companyId } });
  },

  create(data: Prisma.VendorCreateInput) {
    return prisma.vendor.create({ data });
  },
};
