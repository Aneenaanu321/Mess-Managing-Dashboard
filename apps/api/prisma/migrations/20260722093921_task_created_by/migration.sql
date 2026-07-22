-- AlterTable
ALTER TABLE "engineer_tasks" ADD COLUMN     "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "engineer_tasks" ADD CONSTRAINT "engineer_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
