import { Prisma, SupplierPOStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  status?: SupplierPOStatus;
  vendorId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

const readInclude = {
  vendor: { select: { id: true, name: true, contactName: true, email: true, phone: true } },
  lineItems: { include: { product: { select: { id: true, sku: true, name: true, unit: true } } } },
} satisfies Prisma.SupplierPOInclude;

export const supplierPORepository = {
  async list(params: ListParams) {
    const { companyId, status, vendorId, search, page, pageSize } = params;

    const where: Prisma.SupplierPOWhereInput = {
      companyId,
      ...(status ? { status } : {}),
      ...(vendorId ? { vendorId } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { vendor: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.supplierPO.findMany({
        where,
        include: { vendor: readInclude.vendor },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.supplierPO.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  findById(companyId: string, id: string) {
    return prisma.supplierPO.findFirst({
      where: { id, companyId },
      include: { ...readInclude, receipts: true },
    });
  },

  create(data: Prisma.SupplierPOCreateInput) {
    return prisma.supplierPO.create({ data, include: readInclude });
  },
};
