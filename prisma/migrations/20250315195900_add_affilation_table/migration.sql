/*
  Warnings:

  - You are about to drop the column `affiliatedUserId` on the `Referral` table. All the data in the column will be lost.
  - You are about to drop the column `affiliationCount` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `referredById` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[requesterId,referrerId]` on the table `Referral` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `requesterId` to the `Referral` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Referral` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_affiliatedUserId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_referredById_fkey";

-- DropIndex
DROP INDEX "Referral_referrerId_affiliatedUserId_key";

-- AlterTable
ALTER TABLE "Referral" DROP COLUMN "affiliatedUserId",
ADD COLUMN     "message" TEXT,
ADD COLUMN     "requesterId" TEXT NOT NULL,
ADD COLUMN     "responseDate" TIMESTAMP(3),
ADD COLUMN     "responseMessage" TEXT,
ADD COLUMN     "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "affiliationCount",
DROP COLUMN "referredById",
ADD COLUMN     "referralCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_requesterId_referrerId_key" ON "Referral"("requesterId", "referrerId");

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
