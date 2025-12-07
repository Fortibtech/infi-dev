/*
  Warnings:

  - You are about to drop the column `referralCount` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Referral" ALTER COLUMN "referrerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "referralCount";
