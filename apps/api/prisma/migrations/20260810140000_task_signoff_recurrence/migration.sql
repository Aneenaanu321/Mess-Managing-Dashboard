-- Digital sign-off metadata + recurring job templates
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "customerSignOff" JSONB;
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "recurrenceId" TEXT;

CREATE TABLE IF NOT EXISTS "task_recurrences" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "jobType" "TaskJobType" NOT NULL DEFAULT 'OTHER',
    "assigneeId" TEXT,
    "projectId" TEXT,
    "salesOrderId" TEXT,
    "customerPoId" TEXT,
    "invoiceId" TEXT,
    "cadence" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_recurrences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "task_recurrences_companyId_active_nextRunAt_idx"
  ON "task_recurrences"("companyId", "active", "nextRunAt");

CREATE INDEX IF NOT EXISTS "engineer_tasks_recurrenceId_idx" ON "engineer_tasks"("recurrenceId");

DO $$ BEGIN
  ALTER TABLE "engineer_tasks"
    ADD CONSTRAINT "engineer_tasks_recurrenceId_fkey"
    FOREIGN KEY ("recurrenceId") REFERENCES "task_recurrences"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
