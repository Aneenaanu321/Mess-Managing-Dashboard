import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

const include = {
  actor: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ActivityInclude;

export const activityRepository = {
  list(companyId: string, filter: { leadId?: string; customerId?: string; opportunityId?: string }) {
    return prisma.activity.findMany({
      where: { companyId, ...filter },
      include,
      orderBy: { occurredAt: "desc" },
      take: 100,
    });
  },

  create(data: Prisma.ActivityCreateInput) {
    return prisma.activity.create({ data, include });
  },
};
