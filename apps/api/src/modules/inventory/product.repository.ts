import { Prisma, ProductCategory } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  category?: ProductCategory;
  search?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
}

export const productRepository = {
  async list(params: ListParams) {
    const { companyId, category, search, isActive, page, pageSize } = params;

    const where: Prisma.ProductWhereInput = {
      companyId,
      ...(category ? { category } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { sku: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { brand: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  findById(companyId: string, id: string) {
    return prisma.product.findFirst({ where: { id, companyId } });
  },

  findBySku(companyId: string, sku: string) {
    return prisma.product.findFirst({ where: { companyId, sku } });
  },

  create(data: Prisma.ProductCreateInput) {
    return prisma.product.create({ data });
  },

  update(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({ where: { id }, data });
  },
};
