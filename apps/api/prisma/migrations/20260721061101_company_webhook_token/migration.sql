-- AlterTable: add nullable first so the existing company row survives, backfill a random token, then enforce NOT NULL + UNIQUE
ALTER TABLE "companies" ADD COLUMN     "webhookToken" TEXT;

UPDATE "companies" SET "webhookToken" = md5(random()::text || clock_timestamp()::text) WHERE "webhookToken" IS NULL;

ALTER TABLE "companies" ALTER COLUMN "webhookToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "companies_webhookToken_key" ON "companies"("webhookToken");
