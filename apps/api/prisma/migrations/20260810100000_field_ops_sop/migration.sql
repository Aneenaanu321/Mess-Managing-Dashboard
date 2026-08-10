-- Extend TaskJobType for export/import logistics
ALTER TYPE "TaskJobType" ADD VALUE IF NOT EXISTS 'EXPORT_SHIPMENT';
ALTER TYPE "TaskJobType" ADD VALUE IF NOT EXISTS 'IMPORT_RECEIVING';

-- Field SOP columns on engineer_tasks
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "scheduleOrder" INTEGER;
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "sopChecklist" JSONB;
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "packingDetails" JSONB;
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "customerNotifiedAt" TIMESTAMP(3);
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "incompleteReason" TEXT;
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "rescheduleDate" TIMESTAMP(3);
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "originalsReturnedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "engineer_tasks_assigneeId_dueDate_idx" ON "engineer_tasks"("assigneeId", "dueDate");
