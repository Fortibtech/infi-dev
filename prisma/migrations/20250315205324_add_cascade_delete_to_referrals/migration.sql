-- DropForeignKey
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_referrerId_fkey";

-- DropForeignKey
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_requesterId_fkey";

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
