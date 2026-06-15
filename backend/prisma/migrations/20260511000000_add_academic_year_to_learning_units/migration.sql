-- AddColumn: academicYear to learning_units
ALTER TABLE "learning_units" ADD COLUMN "academicYear" "AcademicYear";

-- CreateIndex
CREATE INDEX "learning_units_academicYear_idx" ON "learning_units"("academicYear");
