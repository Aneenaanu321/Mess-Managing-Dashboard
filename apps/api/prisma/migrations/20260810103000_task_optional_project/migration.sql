-- Allow field jobs without a linked project
ALTER TABLE "engineer_tasks" ALTER COLUMN "projectId" DROP NOT NULL;
