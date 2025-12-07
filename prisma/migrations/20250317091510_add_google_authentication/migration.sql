/*
  Warnings:

  - A unique constraint covering the columns `[googleId]` on the table `Profile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "googleProfile" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Profile_googleId_key" ON "Profile"("googleId");
