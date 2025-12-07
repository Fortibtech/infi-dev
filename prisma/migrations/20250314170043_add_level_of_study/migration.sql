-- CreateEnum
CREATE TYPE "StudyLevelType" AS ENUM ('BAC', 'BAC_PLUS_1', 'BAC_PLUS_2', 'BAC_PLUS_3', 'BAC_PLUS_4', 'BAC_PLUS_5', 'BAC_PLUS_8', 'AUTRE');

-- CreateTable
CREATE TABLE "StudyLevel" (
    "id" TEXT NOT NULL,
    "type" "StudyLevelType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profileId" TEXT,

    CONSTRAINT "StudyLevel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StudyLevel" ADD CONSTRAINT "StudyLevel_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
