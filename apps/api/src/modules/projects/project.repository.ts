import { Prisma, ProjectStatus, MilestoneStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  status?: ProjectStatus;
  statusIn?: ProjectStatus[];
  customerId?: string;
  managerId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

const detailInclude = {
  customer: { select: { id: true, code: true, name: true } },
  site: true,
  opportunity: { select: { id: true, code: true, title: true } },
  salesOrder: { select: { id: true, code: true } },
  manager: { select: { id: true, firstName: true, lastName: true } },
  milestones: { orderBy: { key: "asc" as const } },
  tasks: { orderBy: { createdAt: "desc" as const }, take: 20 },
  devices: { select: { id: true, serialNumber: true, type: true, status: true } },
} satisfies Prisma.ProjectInclude;

export const projectRepository = {
  async list(params: ListParams) {
    const { companyId, status, statusIn, customerId, managerId, search, page, pageSize } = params;

    const where: Prisma.ProjectWhereInput = {
      companyId,
      ...(status ? { status } : {}),
      ...(statusIn ? { status: { in: statusIn } } : {}),
      ...(customerId ? { customerId } : {}),
      ...(managerId ? { managerId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          customer: { select: { id: true, code: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
          milestones: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.project.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  findById(companyId: string, id: string) {
    return prisma.project.findFirst({ where: { id, companyId }, include: detailInclude });
  },

  findByIdBare(companyId: string, id: string) {
    return prisma.project.findFirst({ where: { id, companyId } });
  },

  create(data: Prisma.ProjectCreateInput) {
    return prisma.project.create({ data, include: detailInclude });
  },

  update(id: string, data: Prisma.ProjectUpdateInput) {
    return prisma.project.update({ where: { id }, data, include: detailInclude });
  },

  seedMilestones(projectId: string, keys: string[]) {
    return prisma.projectMilestone.createMany({
      data: keys.map((key) => ({ projectId, key: key as never, status: "PENDING" as MilestoneStatus })),
    });
  },

  findMilestone(projectId: string, milestoneId: string) {
    return prisma.projectMilestone.findFirst({ where: { id: milestoneId, projectId } });
  },

  updateMilestone(milestoneId: string, data: Prisma.ProjectMilestoneUpdateInput) {
    return prisma.projectMilestone.update({ where: { id: milestoneId }, data });
  },
};
