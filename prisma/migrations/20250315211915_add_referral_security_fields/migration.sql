-- AlterTable
ALTER TABLE "Referral" ADD COLUMN     "responseToken" TEXT,
ADD COLUMN     "tokenExpiry" TIMESTAMP(3);
