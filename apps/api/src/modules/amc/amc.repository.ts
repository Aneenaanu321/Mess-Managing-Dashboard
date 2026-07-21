import { Prisma, AmcStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  status?: AmcStatus;
  customerId?: string;
  expiringBefore?: Date;
  search?: string;
  page: number;
  pageSize: number;
}

const detailInclude = {
  customer: { select: { id: true, code: true, name: true } },
  devices: { include: { device: { select: { id: true, serialNumber: true, type: true } } } },
  renewedFrom: { select: { id: true, code: true } },
  renewedTo: { select: { id: true, code: true } },
} satisfies Prisma.AmcContractInclude;

export const amcRepository = {
  async list(params: ListParams) {
    const { companyId, status, customerId, expiringBefore, search, page, pageSize } = params;

    const where: Prisma.AmcContractWhereInput = {
      companyId,
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(expiringBefore ? { endDate: { lte: expiringBefore }, status: { in: ["ACTIVE", "EXPIRING_SOON"] } } : {}),
      ...(search ? { code: { contains: search, mode: "insensitive" } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.amcContract.findMany({
        where,
        include: { customer: { select: { id: true, code: true, name: true } } },
        orderBy: { endDate: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.amcContract.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  findById(companyId: string, id: string) {
    return prisma.amcContract.findFirst({ where: { id, companyId }, include: detailInclude });
  },

  findByIdBare(companyId: string, id: string) {
    return prisma.amcContract.findFirst({ where: { id, companyId } });
  },

  create(data: Prisma.AmcContractCreateInput) {
    return prisma.amcContract.create({ data, include: detailInclude });
  },

  update(id: string, data: Prisma.AmcContractUpdateInput) {
    return prisma.amcContract.update({ where: { id }, data, include: detailInclude });
  },

  replaceDevices(amcContractId: string, deviceIds: string[]) {
    return prisma.$transaction([
      prisma.amcContractDevice.deleteMany({ where: { amcContractId } }),
      prisma.amcContractDevice.createMany({ data: deviceIds.map((deviceId) => ({ amcContractId, deviceId })) }),
    ]);
  },
};
