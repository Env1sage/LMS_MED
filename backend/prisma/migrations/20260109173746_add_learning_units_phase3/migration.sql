-- CreateEnum
CREATE TYPE "LearningUnitType" AS ENUM ('BOOK', 'VIDEO', 'MCQ', 'NOTES');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('REDIRECT', 'EMBED', 'STREAM');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "LearningUnitStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LEARNING_UNIT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'LEARNING_UNIT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'LEARNING_UNIT_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'LEARNING_UNIT_SUSPENDED';
ALTER TYPE "AuditAction" ADD VALUE 'LEARNING_UNIT_ACCESSED';
ALTER TYPE "AuditAction" ADD VALUE 'ACCESS_TOKEN_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'SECURITY_VIOLATION_DETECTED';

-- CreateTable
CREATE TABLE "learning_units" (
    "id" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "type" "LearningUnitType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "subTopic" TEXT,
    "difficultyLevel" "DifficultyLevel" NOT NULL,
    "estimatedDuration" INTEGER NOT NULL,
    "competencyIds" TEXT[],
    "secureAccessUrl" TEXT NOT NULL,
    "deliveryType" "DeliveryType" NOT NULL,
    "watermarkEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sessionExpiryMinutes" INTEGER NOT NULL DEFAULT 30,
    "maxAttempts" INTEGER,
    "timeLimit" INTEGER,
    "status" "LearningUnitStatus" NOT NULL DEFAULT 'ACTIVE',
    "thumbnailUrl" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_unit_access_logs" (
    "id" TEXT NOT NULL,
    "learningUnitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collegeId" TEXT,
    "accessToken" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "sessionStarted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionEnded" TIMESTAMP(3),
    "duration" INTEGER,
    "watermarkPayload" JSONB,
    "violationDetected" BOOLEAN NOT NULL DEFAULT false,
    "violationType" TEXT,

    CONSTRAINT "learning_unit_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_units_publisherId_idx" ON "learning_units"("publisherId");

-- CreateIndex
CREATE INDEX "learning_units_type_idx" ON "learning_units"("type");

-- CreateIndex
CREATE INDEX "learning_units_subject_idx" ON "learning_units"("subject");

-- CreateIndex
CREATE INDEX "learning_units_status_idx" ON "learning_units"("status");

-- CreateIndex
CREATE INDEX "learning_units_difficultyLevel_idx" ON "learning_units"("difficultyLevel");

-- CreateIndex
CREATE INDEX "learning_unit_access_logs_learningUnitId_idx" ON "learning_unit_access_logs"("learningUnitId");

-- CreateIndex
CREATE INDEX "learning_unit_access_logs_userId_idx" ON "learning_unit_access_logs"("userId");

-- CreateIndex
CREATE INDEX "learning_unit_access_logs_sessionStarted_idx" ON "learning_unit_access_logs"("sessionStarted");

-- AddForeignKey
ALTER TABLE "learning_units" ADD CONSTRAINT "learning_units_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "publishers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_unit_access_logs" ADD CONSTRAINT "learning_unit_access_logs_learningUnitId_fkey" FOREIGN KEY ("learningUnitId") REFERENCES "learning_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
