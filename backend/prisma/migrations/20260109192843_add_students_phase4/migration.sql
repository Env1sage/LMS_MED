-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'GRADUATED', 'DROPPED_OUT');

-- CreateEnum
CREATE TYPE "AcademicYear" AS ENUM ('FIRST_YEAR', 'SECOND_YEAR', 'THIRD_YEAR', 'FOURTH_YEAR', 'FIFTH_YEAR', 'INTERNSHIP');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'STUDENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'STUDENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'STUDENT_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'STUDENT_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'STUDENT_PROMOTED';
ALTER TYPE "AuditAction" ADD VALUE 'STUDENT_BULK_PROMOTED';
ALTER TYPE "AuditAction" ADD VALUE 'STUDENT_CREDENTIALS_RESET';

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "yearOfAdmission" INTEGER NOT NULL,
    "expectedPassingYear" INTEGER NOT NULL,
    "currentAcademicYear" "AcademicYear" NOT NULL,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_userId_key" ON "students"("userId");

-- CreateIndex
CREATE INDEX "students_collegeId_idx" ON "students"("collegeId");

-- CreateIndex
CREATE INDEX "students_userId_idx" ON "students"("userId");

-- CreateIndex
CREATE INDEX "students_status_idx" ON "students"("status");

-- CreateIndex
CREATE INDEX "students_currentAcademicYear_idx" ON "students"("currentAcademicYear");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
