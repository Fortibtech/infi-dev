/*
  Warnings:

  - The values [BAC_PLUS_1,AUTRE] on the enum `StudyLevelType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StudyLevelType_new" AS ENUM ('BAC', 'BAC_PLUS_2', 'BAC_PLUS_3', 'BAC_PLUS_4', 'BAC_PLUS_5', 'BAC_PLUS_8', 'CAP_SLASH_BEP');
ALTER TABLE "StudyLevel" ALTER COLUMN "type" TYPE "StudyLevelType_new" USING ("type"::text::"StudyLevelType_new");
ALTER TYPE "StudyLevelType" RENAME TO "StudyLevelType_old";
ALTER TYPE "StudyLevelType_new" RENAME TO "StudyLevelType";
DROP TYPE "StudyLevelType_old";
COMMIT;
