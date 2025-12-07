-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('SAS', 'SARL', 'SA', 'EURL', 'SASU', 'ASSOCIATION', 'AUTRE');

-- CreateEnum
CREATE TYPE "CompanySector" AS ENUM ('TECHNOLOGIE', 'FINANCE', 'SANTE', 'EDUCATION', 'INDUSTRIE', 'COMMERCE', 'SERVICES', 'AGRICULTURE', 'ENERGIE', 'TRANSPORT', 'CONSTRUCTION', 'AUTRE');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siret" TEXT,
    "address" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "companyType" "CompanyType" NOT NULL,
    "sector" "CompanySector" NOT NULL,
    "employeeCount" INTEGER NOT NULL,
    "userPosition" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_userId_key" ON "Company"("userId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
