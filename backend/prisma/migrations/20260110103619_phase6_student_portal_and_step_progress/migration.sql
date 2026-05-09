/*
  Warnings:

  - You are about to drop the column `attempts` on the `student_progress` table. All the data in the column will be lost.
  - You are about to drop the column `completionPercent` on the `student_progress` table. All the data in the column will be lost.
  - You are about to drop the column `lastAccessedAt` on the `student_progress` table. All the data in the column will be lost.
  - You are about to drop the column `learningFlowStepId` on the `student_progress` table. All the data in the column will be lost.
  - You are about to drop the column `timeSpentSeconds` on the `student_progress` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[studentId,courseId]` on the table `student_progress` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "student_progress" DROP CONSTRAINT "student_progress_learningFlowStepId_fkey";

-- DropIndex
DROP INDEX "student_progress_learningFlowStepId_idx";

-- DropIndex
DROP INDEX "student_progress_studentId_learningFlowStepId_key";

-- AlterTable
ALTER TABLE "student_progress" DROP COLUMN "attempts",
DROP COLUMN "completionPercent",
DROP COLUMN "lastAccessedAt",
DROP COLUMN "learningFlowStepId",
DROP COLUMN "timeSpentSeconds",
ADD COLUMN     "completedSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "currentStepId" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "step_progress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "step_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "step_progress_studentId_idx" ON "step_progress"("studentId");

-- CreateIndex
CREATE INDEX "step_progress_stepId_idx" ON "step_progress"("stepId");

-- CreateIndex
CREATE INDEX "step_progress_courseId_idx" ON "step_progress"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "step_progress_studentId_stepId_key" ON "step_progress"("studentId", "stepId");

-- CreateIndex
CREATE UNIQUE INDEX "student_progress_studentId_courseId_key" ON "student_progress"("studentId", "courseId");

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_progress" ADD CONSTRAINT "step_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_progress" ADD CONSTRAINT "step_progress_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "learning_flow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_progress" ADD CONSTRAINT "step_progress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
