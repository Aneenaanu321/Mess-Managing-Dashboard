-- AlterEnum
ALTER TYPE "RoleKey" ADD VALUE IF NOT EXISTS 'SALES_COORDINATOR';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "LeadAssignMode" AS ENUM ('MANUAL', 'ROUND_ROBIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable companies
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "leadAssignMode" "LeadAssignMode" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "roundRobinCursor" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "leadSlaHours" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "quoteChaseDays" INTEGER NOT NULL DEFAULT 7;

-- AlterTable leads
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "firstContactedAt" TIMESTAMP(3);

-- AlterTable opportunities
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;

-- AlterTable quotations
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "revisionNote" TEXT;

-- AlterTable activities
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "durationMins" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "shift_handover_notes" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shift_handover_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "shift_handover_notes_companyId_createdAt_idx" ON "shift_handover_notes"("companyId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "shift_handover_notes" ADD CONSTRAINT "shift_handover_notes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "shift_handover_notes" ADD CONSTRAINT "shift_handover_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
