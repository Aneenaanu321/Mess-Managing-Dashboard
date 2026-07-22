-- AlterTable
ALTER TABLE "users" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
