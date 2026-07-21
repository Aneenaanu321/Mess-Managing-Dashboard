import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface ListParams {
  companyId: string;
  ownerId?: string;
  from?: Date;
  to?: Date;
  includeCompleted: boolean;
}

const include = {
  opportunity: { select: { id: true, code: true, title: true } },
  owner: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.CalendarEventInclude;

export const calendarRepository = {
  list(params: ListParams) {
    const { companyId, ownerId, from, to, includeCompleted } = params;

    const where: Prisma.CalendarEventWhereInput = {
      companyId,
      ...(ownerId ? { ownerId } : {}),
      ...(from || to ? { startAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      ...(includeCompleted ? {} : { completedAt: null }),
    };

    return prisma.calendarEvent.findMany({ where, include, orderBy: { startAt: "asc" } });
  },

  findById(companyId: string, id: string) {
    return prisma.calendarEvent.findFirst({ where: { id, companyId }, include });
  },

  create(data: Prisma.CalendarEventCreateInput) {
    return prisma.calendarEvent.create({ data, include });
  },

  update(id: string, data: Prisma.CalendarEventUpdateInput) {
    return prisma.calendarEvent.update({ where: { id }, data, include });
  },
};
