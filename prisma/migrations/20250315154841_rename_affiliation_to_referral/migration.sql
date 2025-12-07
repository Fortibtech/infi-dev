-- AlterTable
ALTER TABLE "User" ADD COLUMN     "affiliationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referredById" TEXT;

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrerId" TEXT NOT NULL,
    "affiliatedUserId" TEXT NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referrerId_affiliatedUserId_key" ON "Referral"("referrerId", "affiliatedUserId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_affiliatedUserId_fkey" FOREIGN KEY ("affiliatedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
