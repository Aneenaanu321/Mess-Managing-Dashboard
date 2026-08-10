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

const ROLE_DESCRIPTION_FALLBACK: Partial<Record<RoleKey, string>> = {
  SUPER_ADMIN: "Full system access — org settings, roles, and all modules",
  MANAGING_DIRECTOR: "Executive oversight across sales and operations",
  SALES_DIRECTOR: "Owns sales strategy, pipeline, and approvals",
  SALES_MANAGER: "Manages sales team, leads, and field job oversight",
  SALES_EXECUTIVE: "Day-to-day lead and opportunity ownership",
  SALES_COORDINATOR: "Coordinates field jobs, docs, and delivery follow-up",
  PRE_SALES_ENGINEER: "Solution design and technical pre-sales support",
  TECHNICAL_CONSULTANT: "Technical consulting on opportunities and projects",
  PROJECT_MANAGER: "Customer project delivery and milestones",
  IMPLEMENTATION_ENGINEER: "On-site implementation and commissioning",
  DELIVERY_PERSON: "Field deliveries, collections, and Field Ops SOP",
  SUPPORT_ENGINEER: "After-sales support tickets and SLA work",
  FINANCE: "Invoices, payments, and collections finance",
  ACCOUNTS: "Accounts receivable / payable support",
  WAREHOUSE: "Stock, packing, and warehouse operations",
  PROCUREMENT: "Supplier POs and purchasing",
  CUSTOMER_PORTAL_USER: "Customer self-service portal access",
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
    // Roles are a global catalog (not company-scoped) — every tenant shares the same
    // RBAC matrix. User counts are company-scoped and ACTIVE-only so deactivated
    // demo accounts don’t inflate Settings → Roles.
    const roles = await prisma.role.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { permissions: true } },
        users: {
          where: { companyId: ctx.companyId, status: "ACTIVE" },
          select: { id: true },
        },
      },
    });

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
      .sort((a, b) => b.userCount - a.userCount || a.name.localeCompare(b.name));
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
