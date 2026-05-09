-- CreateEnum
CREATE TYPE "CompetencyDomain" AS ENUM ('COGNITIVE', 'CLINICAL', 'PRACTICAL');

-- CreateEnum
CREATE TYPE "AcademicLevel" AS ENUM ('UG', 'PG', 'SPECIALIZATION');

-- CreateEnum
CREATE TYPE "CompetencyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'COMPETENCY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPETENCY_REVIEWED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPETENCY_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPETENCY_DEPRECATED';

-- CreateTable
CREATE TABLE "competencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "domain" "CompetencyDomain" NOT NULL,
    "academicLevel" "AcademicLevel" NOT NULL,
    "status" "CompetencyStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "deprecatedAt" TIMESTAMP(3),
    "replacedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "competencies_code_key" ON "competencies"("code");

-- CreateIndex
CREATE INDEX "competencies_code_idx" ON "competencies"("code");

-- CreateIndex
CREATE INDEX "competencies_status_idx" ON "competencies"("status");

-- CreateIndex
CREATE INDEX "competencies_subject_idx" ON "competencies"("subject");

-- CreateIndex
CREATE INDEX "competencies_domain_idx" ON "competencies"("domain");

-- CreateIndex
CREATE INDEX "competencies_academicLevel_idx" ON "competencies"("academicLevel");
