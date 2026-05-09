-- CreateTable
CREATE TABLE "mcqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "questionImage" TEXT,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "optionE" TEXT,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "explanationImage" TEXT,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "difficultyLevel" TEXT NOT NULL,
    "bloomsLevel" TEXT NOT NULL DEFAULT 'REMEMBER',
    "competencyIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "year" INTEGER,
    "source" TEXT,
    "publisherId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "correctRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcqs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mcqs_publisherId_idx" ON "mcqs"("publisherId");
CREATE INDEX "mcqs_subject_idx" ON "mcqs"("subject");
CREATE INDEX "mcqs_status_idx" ON "mcqs"("status");
CREATE INDEX "mcqs_createdBy_idx" ON "mcqs"("createdBy");
CREATE INDEX "mcqs_competencyIds_idx" ON "mcqs" USING GIN ("competencyIds");

-- AddForeignKey
ALTER TABLE "mcqs" ADD CONSTRAINT "mcqs_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "publishers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcqs" ADD CONSTRAINT "mcqs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
