-- DropForeignKey
ALTER TABLE "bank_data_access_logs" DROP CONSTRAINT "bank_data_access_logs_userId_fkey";

-- AlterTable
ALTER TABLE "bank_data_access_logs" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "bank_data_access_logs" ADD CONSTRAINT "bank_data_access_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
