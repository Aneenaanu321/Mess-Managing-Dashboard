import { ApprovalStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

const include = {
  requestedBy: { select: { id: true, firstName: true, lastName: true } },
  decidedBy: { select: { id: true, firstName: true, lastName: true } },
  quotation: {
    select: { id: true, code: true, grandTotal: true, currency: true, status: true, customer: { select: { name: true } } },
  },
} satisfies Prisma.ApprovalInclude;

export const approvalRepository = {
  list(companyId: string, status: ApprovalStatus) {
    return prisma.approval.findMany({
      where: { companyId, status },
      include,
      orderBy: { requestedAt: "asc" },
    });
  },

  findById(companyId: string, id: string) {
    return prisma.approval.findFirst({ where: { id, companyId }, include });
  },

  decide(id: string, data: Prisma.ApprovalUpdateInput) {
    return prisma.approval.update({ where: { id }, data, include });
  },
};
