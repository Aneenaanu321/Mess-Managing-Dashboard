-- AlterTable: add nullable first so existing rows survive, backfill, then enforce NOT NULL
ALTER TABLE "campaigns" ADD COLUMN     "companyId" TEXT;

-- Backfill: this table pre-dates tenant scoping, so every existing row is
-- assigned to the single earliest-created company (fine for the current
-- single-tenant demo dataset; a true multi-company deployment migrating in
-- later would need a real mapping, not a blanket backfill).
UPDATE "campaigns" SET "companyId" = (SELECT "id" FROM "companies" ORDER BY "createdAt" ASC LIMIT 1) WHERE "companyId" IS NULL;

ALTER TABLE "campaigns" ALTER COLUMN "companyId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "campaigns_companyId_idx" ON "campaigns"("companyId");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
