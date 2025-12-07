-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('USER', 'RECRUITER', 'RECOMMENDER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "type" "UserType" NOT NULL DEFAULT 'USER';
