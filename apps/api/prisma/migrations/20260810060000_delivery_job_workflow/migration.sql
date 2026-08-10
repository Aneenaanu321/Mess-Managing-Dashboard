-- AlterEnum RoleKey
ALTER TYPE "RoleKey" ADD VALUE IF NOT EXISTS 'DELIVERY_PERSON';

-- AlterEnum TaskStatus
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'SEEN';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';

-- CreateEnum TaskJobType
DO $$ BEGIN
  CREATE TYPE "TaskJobType" AS ENUM ('DELIVERY', 'CHEQUE_COLLECTION', 'DOCUMENT_PICKUP', 'SITE_VISIT', 'INSTALLATION', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable engineer_tasks
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "jobType" "TaskJobType" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "seenAt" TIMESTAMP(3);
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "verifiedById" TEXT;
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "completionNote" TEXT;
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "paymentAmount" DECIMAL(14,2);
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod";
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "paymentReference" TEXT;

CREATE INDEX IF NOT EXISTS "engineer_tasks_createdById_status_idx" ON "engineer_tasks"("createdById", "status");

DO $$ BEGIN
  ALTER TABLE "engineer_tasks" ADD CONSTRAINT "engineer_tasks_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
