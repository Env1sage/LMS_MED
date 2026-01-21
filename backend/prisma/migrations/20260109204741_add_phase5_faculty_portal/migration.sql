-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('INDIVIDUAL', 'BATCH');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'COURSE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'COURSE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'COURSE_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'COURSE_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'FLOW_STEP_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'BLOCKED_ACCESS_ATTEMPT';

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "academicYear" "AcademicYear" NOT NULL,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_flow_steps" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "learningUnitId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "stepType" "LearningUnitType" NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "completionCriteria" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_flow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_competencies" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_assignments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignmentType" "AssignmentType" NOT NULL DEFAULT 'INDIVIDUAL',
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "dueDate" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "course_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_progress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "learningFlowStepId" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courses_facultyId_idx" ON "courses"("facultyId");

-- CreateIndex
CREATE INDEX "courses_collegeId_idx" ON "courses"("collegeId");

-- CreateIndex
CREATE INDEX "courses_status_idx" ON "courses"("status");

-- CreateIndex
CREATE INDEX "courses_academicYear_idx" ON "courses"("academicYear");

-- CreateIndex
CREATE INDEX "learning_flow_steps_courseId_idx" ON "learning_flow_steps"("courseId");

-- CreateIndex
CREATE INDEX "learning_flow_steps_learningUnitId_idx" ON "learning_flow_steps"("learningUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "learning_flow_steps_courseId_stepOrder_key" ON "learning_flow_steps"("courseId", "stepOrder");

-- CreateIndex
CREATE INDEX "course_competencies_courseId_idx" ON "course_competencies"("courseId");

-- CreateIndex
CREATE INDEX "course_competencies_competencyId_idx" ON "course_competencies"("competencyId");

-- CreateIndex
CREATE UNIQUE INDEX "course_competencies_courseId_competencyId_key" ON "course_competencies"("courseId", "competencyId");

-- CreateIndex
CREATE INDEX "course_assignments_courseId_idx" ON "course_assignments"("courseId");

-- CreateIndex
CREATE INDEX "course_assignments_studentId_idx" ON "course_assignments"("studentId");

-- CreateIndex
CREATE INDEX "course_assignments_assignedBy_idx" ON "course_assignments"("assignedBy");

-- CreateIndex
CREATE INDEX "course_assignments_status_idx" ON "course_assignments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "course_assignments_courseId_studentId_key" ON "course_assignments"("courseId", "studentId");

-- CreateIndex
CREATE INDEX "student_progress_studentId_idx" ON "student_progress"("studentId");

-- CreateIndex
CREATE INDEX "student_progress_courseId_idx" ON "student_progress"("courseId");

-- CreateIndex
CREATE INDEX "student_progress_learningFlowStepId_idx" ON "student_progress"("learningFlowStepId");

-- CreateIndex
CREATE INDEX "student_progress_status_idx" ON "student_progress"("status");

-- CreateIndex
CREATE UNIQUE INDEX "student_progress_studentId_learningFlowStepId_key" ON "student_progress"("studentId", "learningFlowStepId");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_flow_steps" ADD CONSTRAINT "learning_flow_steps_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_flow_steps" ADD CONSTRAINT "learning_flow_steps_learningUnitId_fkey" FOREIGN KEY ("learningUnitId") REFERENCES "learning_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_competencies" ADD CONSTRAINT "course_competencies_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_competencies" ADD CONSTRAINT "course_competencies_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "competencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_learningFlowStepId_fkey" FOREIGN KEY ("learningFlowStepId") REFERENCES "learning_flow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
