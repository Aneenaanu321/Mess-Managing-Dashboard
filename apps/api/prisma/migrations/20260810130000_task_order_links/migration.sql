-- AlterTable
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "salesOrderId" TEXT;
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "customerPoId" TEXT;
ALTER TABLE "engineer_tasks" ADD COLUMN IF NOT EXISTS "invoiceId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "engineer_tasks_salesOrderId_idx" ON "engineer_tasks"("salesOrderId");
CREATE INDEX IF NOT EXISTS "engineer_tasks_customerPoId_idx" ON "engineer_tasks"("customerPoId");
CREATE INDEX IF NOT EXISTS "engineer_tasks_invoiceId_idx" ON "engineer_tasks"("invoiceId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "engineer_tasks" ADD CONSTRAINT "engineer_tasks_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "engineer_tasks" ADD CONSTRAINT "engineer_tasks_customerPoId_fkey" FOREIGN KEY ("customerPoId") REFERENCES "customer_pos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "engineer_tasks" ADD CONSTRAINT "engineer_tasks_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
