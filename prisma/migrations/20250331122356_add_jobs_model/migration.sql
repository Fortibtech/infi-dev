-- CreateEnum
CREATE TYPE "JobLevel" AS ENUM ('MAIN_CATEGORY', 'CATEGORY', 'SUB_CATEGORY', 'JOB');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "identifiers" TEXT,
    "level" "JobLevel" NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
