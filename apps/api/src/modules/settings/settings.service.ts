import { prisma } from "../../config/prisma";
import { ListAuditLogQuery, UpsertSlaPolicyInput } from "./settings.validation";
import { writeAuditLog } from "../../utils/audit";
import { RoleKey } from "@prisma/client";
import { buildCompanyDataWorkbook } from "./data-export";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

const PRIORITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

/** Settings → Roles only shows the working team (5 people / 4 roles). */
const WORKING_TEAM_ROLE_KEYS: RoleKey[] = [
  RoleKey.SUPER_ADMIN,
  RoleKey.SALES_COORDINATOR,
  RoleKey.SALES_MANAGER,
  RoleKey.DELIVERY_PERSON,
];

const ROLE_DESCRIPTION_FALLBACK: Partial<Record<RoleKey, string>> = {
  SUPER_ADMIN: "Full system access — Admin & Aneena",
  SALES_COORDINATOR: "Field jobs, docs, and delivery follow-up — Susan",
  SALES_MANAGER: "Sales team and field job oversight — Jeremy",
  DELIVERY_PERSON: "Field deliveries, collections, and Field Ops SOP — Rakesh",
};

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

  async getRoles(ctx: Ctx) {
    // Settings only lists the working-team roles (Admin, Aneena, Susan, Jeremy, Rakesh).
    // Full RBAC catalog still exists in DB for permissions; it is just hidden here.
    const roles = await prisma.role.findMany({
      where: { key: { in: WORKING_TEAM_ROLE_KEYS } },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { permissions: true } },
        users: {
          where: { companyId: ctx.companyId, status: "ACTIVE" },
          select: { id: true },
        },
      },
    });

    const order = new Map(WORKING_TEAM_ROLE_KEYS.map((key, i) => [key, i]));
    return roles
      .map((role) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        description: role.description ?? ROLE_DESCRIPTION_FALLBACK[role.key] ?? null,
        isSystem: role.isSystem,
        permissionCount: role._count.permissions,
        userCount: role.users.length,
      }))
      .sort((a, b) => (order.get(a.key as RoleKey) ?? 99) - (order.get(b.key as RoleKey) ?? 99));
  },

  async getUsers(ctx: Ctx) {
    const users = await prisma.user.findMany({
      where: { companyId: ctx.companyId, status: "ACTIVE" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
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

  async exportWorkbook(ctx: Ctx) {
    const buffer = await buildCompanyDataWorkbook(ctx.companyId);
    return Buffer.from(buffer);
  },

  /**
   * Dev/staging only — re-runs prisma seed so the working team + sample
   * records come back. Blocked in production so client live data cannot
   * be wiped from the UI.
   */
  async resetToDemoData(ctx: WriteCtx) {
    if (env.NODE_ENV === "production") {
      throw ApiError.forbidden("Reset to demo data is disabled in production. Export a backup, then re-seed from a secure shell if you truly need sample data.");
    }

    const apiRoot = path.resolve(__dirname, "../../..");
    await execFileAsync("npx", ["tsx", "prisma/seed.ts"], {
      cwd: apiRoot,
      env: process.env,
      timeout: 120_000,
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Company",
      entityId: ctx.companyId,
      action: "UPDATE",
      after: { resetToDemoData: true, at: new Date().toISOString() },
    });

    return { ok: true, message: "Demo data restored. Refresh the app and sign in again if your session was cleared." };
  },
};
