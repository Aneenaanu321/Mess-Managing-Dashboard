import { PrismaClient, Prisma } from "@prisma/client";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Singleton Prisma client. In dev, `tsx watch` hot-reloads the module, which
 * would otherwise spawn a new PrismaClient (and a new connection pool) on
 * every reload — global caching prevents connection exhaustion.
 *
 * Tenant scoping: every module's repository is expected to pass companyId
 * (and branchId where applicable) explicitly in its `where` clauses rather
 * than relying on implicit middleware magic — this keeps query intent
 * visible in the repository layer and easy to audit. The $extends hook below
 * only handles cross-cutting concerns that are safe to centralize: audit
 * timestamps are handled by Prisma's @default/@updatedAt already, so this
 * client is intentionally left un-extended for now. See
 * middleware/tenantScope.ts for how companyId is derived from the request
 * and threaded into service calls.
 */
export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

export { Prisma };
