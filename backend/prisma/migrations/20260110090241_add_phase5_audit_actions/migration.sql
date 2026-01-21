-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'BLOCKED_ACCESS';
ALTER TYPE "AuditAction" ADD VALUE 'STEP_SKIP_ATTEMPT';
ALTER TYPE "AuditAction" ADD VALUE 'FORCED_API_CALL';
ALTER TYPE "AuditAction" ADD VALUE 'FLOW_MODIFIED';
ALTER TYPE "AuditAction" ADD VALUE 'STEP_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'INVALID_COMPLETION';
