import { Prisma, TicketStatus, TicketPriority } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  customerId?: string;
  assigneeId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

const detailInclude = {
  customer: { select: { id: true, code: true, name: true } },
  device: { select: { id: true, serialNumber: true, type: true } },
  raisedBy: { select: { id: true, firstName: true, lastName: true } },
  assignee: { select: { id: true, firstName: true, lastName: true } },
  comments: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.TicketInclude;

export const supportRepository = {
  async list(params: ListParams) {
    const { companyId, status, priority, customerId, assigneeId, search, page, pageSize } = params;

    const where: Prisma.TicketWhereInput = {
      companyId,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(customerId ? { customerId } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(search
        ? {
            OR: [
              { subject: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          customer: { select: { id: true, code: true, name: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.ticket.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  findById(companyId: string, id: string) {
    return prisma.ticket.findFirst({ where: { id, companyId }, include: detailInclude });
  },

  findByIdBare(companyId: string, id: string) {
    return prisma.ticket.findFirst({ where: { id, companyId } });
  },

  create(data: Prisma.TicketCreateInput) {
    return prisma.ticket.create({ data, include: detailInclude });
  },

  update(id: string, data: Prisma.TicketUpdateInput) {
    return prisma.ticket.update({ where: { id }, data, include: detailInclude });
  },

  addComment(data: Prisma.TicketCommentCreateInput) {
    return prisma.ticketComment.create({ data });
  },

  findSlaPolicy(companyId: string, priority: TicketPriority) {
    return prisma.slaPolicy.findFirst({ where: { companyId, priority } });
  },
};
