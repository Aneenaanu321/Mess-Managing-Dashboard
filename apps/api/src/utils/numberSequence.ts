import { prisma } from "../config/prisma";

/**
 * Generates human-friendly, per-company/per-year sequential codes, e.g.
 * "LEAD-2026-0001", "QT-2026-0042". Uses an atomic upsert+increment so
 * concurrent requests never collide (Postgres row lock via the update).
 */
export async function nextNumber(companyId: string, key: string, prefix: string): Promise<string> {
  const year = new Date().getFullYear();

  const seq = await prisma.numberSequence.upsert({
    where: { companyId_key_year: { companyId, key, year } },
    create: { companyId, key, year, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });

  const padded = String(seq.lastValue).padStart(4, "0");
  return `${prefix}-${year}-${padded}`;
}
