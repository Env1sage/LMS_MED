/*
  Warnings:

  - The `bloomsLevel` column on the `mcqs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `mcqs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `difficultyLevel` on the `mcqs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "McqStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BloomsLevel" AS ENUM ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE');

-- DropForeignKey
ALTER TABLE "mcqs" DROP CONSTRAINT "mcqs_publisherId_fkey";

-- AlterTable
ALTER TABLE "mcqs" DROP COLUMN "difficultyLevel",
ADD COLUMN     "difficultyLevel" "DifficultyLevel" NOT NULL,
DROP COLUMN "bloomsLevel",
ADD COLUMN     "bloomsLevel" "BloomsLevel" NOT NULL DEFAULT 'REMEMBER',
DROP COLUMN "status",
ADD COLUMN     "status" "McqStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "mcqs_status_idx" ON "mcqs"("status");

-- AddForeignKey
ALTER TABLE "mcqs" ADD CONSTRAINT "mcqs_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "publishers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcqs" ADD CONSTRAINT "mcqs_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
