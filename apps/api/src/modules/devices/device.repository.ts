import { Prisma, DeviceType, DeviceStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  type?: DeviceType;
  status?: DeviceStatus;
  projectId?: string;
  siteId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

const detailInclude = {
  product: true,
  project: { select: { id: true, code: true, name: true } },
  site: { include: { customer: { select: { id: true, code: true, name: true } } } },
  tickets: { orderBy: { createdAt: "desc" as const }, take: 20 },
} satisfies Prisma.DeviceInclude;

export const deviceRepository = {
  async list(params: ListParams) {
    const { companyId, type, status, projectId, siteId, search, page, pageSize } = params;

    const where: Prisma.DeviceWhereInput = {
      companyId,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(projectId ? { projectId } : {}),
      ...(siteId ? { siteId } : {}),
      ...(search
        ? {
            OR: [
              { serialNumber: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.device.findMany({
        where,
        include: {
          product: { select: { id: true, sku: true, name: true } },
          project: { select: { id: true, code: true, name: true } },
          site: { select: { id: true, label: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.device.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  findById(companyId: string, id: string) {
    return prisma.device.findFirst({ where: { id, companyId }, include: detailInclude });
  },

  findByIdBare(companyId: string, id: string) {
    return prisma.device.findFirst({ where: { id, companyId } });
  },

  findBySerial(companyId: string, serialNumber: string) {
    return prisma.device.findFirst({ where: { companyId, serialNumber } });
  },

  create(data: Prisma.DeviceCreateInput) {
    return prisma.device.create({ data, include: detailInclude });
  },

  update(id: string, data: Prisma.DeviceUpdateInput) {
    return prisma.device.update({ where: { id }, data, include: detailInclude });
  },
};
