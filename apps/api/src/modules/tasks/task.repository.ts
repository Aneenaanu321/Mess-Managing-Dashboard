import { Prisma, TaskStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  status?: TaskStatus;
  jobType?: import("@prisma/client").TaskJobType;
  projectId?: string;
  assigneeId?: string;
  createdById?: string;
  search?: string;
  page: number;
  pageSize: number;
}

const detailInclude = {
  project: {
    select: {
      id: true,
      code: true,
      name: true,
      customer: { select: { id: true, name: true } },
      site: { select: { id: true, label: true, addressLine: true, city: true, geoLat: true, geoLng: true } },
    },
  },
  salesOrder: {
    select: {
      id: true,
      code: true,
      status: true,
      totalAmount: true,
      currency: true,
      customer: { select: { id: true, name: true, code: true } },
      lineItems: {
        select: {
          id: true,
          quantity: true,
          product: { select: { id: true, name: true, sku: true } },
          allocations: { select: { quantity: true, status: true } },
        },
      },
    },
  },
  customerPo: {
    select: {
      id: true,
      code: true,
      poNumber: true,
      amount: true,
      currency: true,
      status: true,
      customer: { select: { id: true, name: true, code: true } },
    },
  },
  invoice: {
    select: {
      id: true,
      code: true,
      status: true,
      totalAmount: true,
      amountPaid: true,
      currency: true,
      dueDate: true,
      customer: { select: { id: true, name: true, code: true } },
    },
  },
  assignee: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  verifiedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.EngineerTaskInclude;

function dayBounds(dateStr?: string) {
  const base = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : new Date();
  const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export const taskRepository = {
  async list(params: ListParams) {
    const { companyId, status, jobType, projectId, assigneeId, createdById, search, page, pageSize } = params;

    const where: Prisma.EngineerTaskWhereInput = {
      companyId,
      ...(status ? { status } : {}),
      ...(jobType ? { jobType } : {}),
      ...(projectId ? { projectId } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(createdById ? { createdById } : {}),
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

  async fieldDay(params: { companyId: string; assigneeId: string; date?: string }) {
    const { start, end } = dayBounds(params.date);
    const openStatuses: TaskStatus[] = ["TODO", "SEEN", "IN_PROGRESS", "BLOCKED", "SUBMITTED"];

    // Driver day board: all open jobs assigned to me, plus any jobs due on the
    // selected calendar day (including done ones still pending originals return).
    return prisma.engineerTask.findMany({
      where: {
        companyId: params.companyId,
        assigneeId: params.assigneeId,
        OR: [
          { status: { in: openStatuses } },
          { dueDate: { gte: start, lt: end } },
          { status: "DONE", originalsReturnedAt: null },
        ],
      },
      include: detailInclude,
      orderBy: [{ scheduleOrder: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
    });
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

  delete(id: string) {
    return prisma.engineerTask.delete({ where: { id } });
  },

  assignableUsers(companyId: string) {
    return prisma.user.findMany({
      where: {
        companyId,
        status: "ACTIVE",
        role: {
          key: {
            in: [
              "DELIVERY_PERSON",
              "IMPLEMENTATION_ENGINEER",
              "SUPPORT_ENGINEER",
              "PROJECT_MANAGER",
              "SALES_COORDINATOR",
              "SALES_EXECUTIVE",
              "WAREHOUSE",
            ],
          },
        },
      },
      select: { id: true, firstName: true, lastName: true, role: { select: { name: true, key: true } } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  },
};
