import { Prisma, TaskStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  status?: TaskStatus;
  projectId?: string;
  assigneeId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

const detailInclude = {
  project: { select: { id: true, code: true, name: true, customer: { select: { id: true, name: true } } } },
  assignee: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.EngineerTaskInclude;

export const taskRepository = {
  async list(params: ListParams) {
    const { companyId, status, projectId, assigneeId, search, page, pageSize } = params;

    const where: Prisma.EngineerTaskWhereInput = {
      companyId,
      ...(status ? { status } : {}),
      ...(projectId ? { projectId } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.engineerTask.findMany({
        where,
        include: detailInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.engineerTask.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  findById(companyId: string, id: string) {
    return prisma.engineerTask.findFirst({ where: { id, companyId }, include: detailInclude });
  },

  findByIdBare(companyId: string, id: string) {
    return prisma.engineerTask.findFirst({ where: { id, companyId } });
  },

  create(data: Prisma.EngineerTaskCreateInput) {
    return prisma.engineerTask.create({ data, include: detailInclude });
  },

  update(id: string, data: Prisma.EngineerTaskUpdateInput) {
    return prisma.engineerTask.update({ where: { id }, data, include: detailInclude });
  },
};
