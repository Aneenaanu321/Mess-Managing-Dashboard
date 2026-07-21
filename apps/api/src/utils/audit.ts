import { prisma } from "../config/prisma";

interface AuditParams {
  companyId: string;
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
}

/**
 * Writes an immutable audit row. Called explicitly from service-layer
 * methods that mutate financially/contractually significant entities
 * (Quotation, CustomerPO, Invoice, Payment, Project milestones, RBAC
 * changes) — see docs/04-process-mapping.md §11. Kept as an explicit call
 * rather than a Prisma middleware so it's obvious from reading a service
 * method exactly what gets audited and with what before/after snapshot.
 */
export async function writeAuditLog(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      companyId: params.companyId,
      actorId: params.actorId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      before: params.before as never,
      after: params.after as never,
      ipAddress: params.ipAddress ?? null,
    },
  });
}
