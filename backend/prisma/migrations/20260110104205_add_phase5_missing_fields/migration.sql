/*
  Warnings:

  - Added the required column `stepNumber` to the `learning_flow_steps` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "courseCode" TEXT;

-- AlterTable
ALTER TABLE "learning_flow_steps" ADD COLUMN     "isMandatory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "referenceId" TEXT,
ADD COLUMN     "stepNumber" INTEGER;

-- Update stepNumber to match stepOrder for existing rows
UPDATE "learning_flow_steps" SET "stepNumber" = "stepOrder";

-- Make stepNumber NOT NULL after setting values
ALTER TABLE "learning_flow_steps" ALTER COLUMN "stepNumber" SET NOT NULL;
