import { prisma } from "../../config/prisma";
import { ListAuditLogQuery, UpsertSlaPolicyInput } from "./settings.validation";
import { writeAuditLog } from "../../utils/audit";

const PRIORITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

interface Ctx {
  companyId: string;
}

interface WriteCtx extends Ctx {
  userId: string;
}

export const settingsService = {
  getOrg(ctx: Ctx) {
    return prisma.company.findUnique({
      where: { id: ctx.companyId },
      include: { branches: { orderBy: { name: "asc" } } },
    });
  },

  async getRoles() {
    // Roles are a global catalog (not company-scoped) — every tenant shares the same
    // 15-role RBAC matrix defined in config/permissions.ts and seeded into the DB.
    const roles = await prisma.role.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { permissions: true, users: true } } },
    });

    return roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissionCount: role._count.permissions,
      userCount: role._count.users,
    }));
  },

  async getUsers(ctx: Ctx) {
    const users = await prisma.user.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { createdAt: "desc" },
      include: { role: { select: { key: true, name: true } }, branch: { select: { name: true } } },
    });

    return users.map((user) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role.name,
      roleKey: user.role.key,
      branch: user.branch?.name ?? null,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
    }));
  },

  getSequences(ctx: Ctx) {
    return prisma.numberSequence.findMany({
      where: { companyId: ctx.companyId },
      orderBy: [{ key: "asc" }, { year: "desc" }],
    });
  },

  async getAuditLog(ctx: Ctx, query: ListAuditLogQuery) {
    const { entityType, action, actorId, dateFrom, dateTo, page, pageSize } = query;

    const where = {
      companyId: ctx.companyId,
      ...(entityType ? { entityType } : {}),
      ...(action ? { action } : {}),
      ...(actorId ? { actorId } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  async getSlaPolicies(ctx: Ctx) {
    const policies = await prisma.slaPolicy.findMany({ where: { companyId: ctx.companyId } });
    // Always return all 4 priorities even if a company somehow has fewer
    // seeded — the UI shouldn't have to handle a missing row as a special case.
    return PRIORITY_ORDER.map((priority) => policies.find((p) => p.priority === priority) ?? { id: null, priority, responseMins: null, resolutionMins: null });
  },

  async upsertSlaPolicy(ctx: WriteCtx, input: UpsertSlaPolicyInput) {
    const existing = await prisma.slaPolicy.findUnique({
      where: { companyId_priority: { companyId: ctx.companyId, priority: input.priority } },
    });

    const policy = await prisma.slaPolicy.upsert({
      where: { companyId_priority: { companyId: ctx.companyId, priority: input.priority } },
      create: { companyId: ctx.companyId, priority: input.priority, responseMins: input.responseMins, resolutionMins: input.resolutionMins },
      update: { responseMins: input.responseMins, resolutionMins: input.resolutionMins },
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "SlaPolicy",
      entityId: policy.id,
      action: existing ? "UPDATE" : "CREATE",
      before: existing,
      after: policy,
    });

    return policy;
  },
};
