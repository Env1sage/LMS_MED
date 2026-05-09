#!/bin/bash
# ============================================================
#  Database Backup Script
# ============================================================
#  Usage: ./deploy/backup-db.sh
#  Cron:  0 2 * * * /opt/bitflow-lms/deploy/backup-db.sh
# ============================================================

set -euo pipefail

BACKUP_DIR="/opt/bitflow-lms/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/bitflow_lms_${TIMESTAMP}.sql.gz"
KEEP_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."

# Dump from the running postgres container
docker exec bitflow-postgres pg_dump \
    -U "${DB_USER:-bitflow_user}" \
    -d "${DB_NAME:-bitflow_lms}" \
    --no-owner \
    --no-privileges \
    | gzip > "$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup complete: $BACKUP_FILE ($FILESIZE)"

# Clean old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +${KEEP_DAYS} -delete
echo "[$(date)] Cleaned backups older than ${KEEP_DAYS} days"

# ─── Optional: Upload to S3 ───
# Uncomment and configure if you want off-site backups
# aws s3 cp "$BACKUP_FILE" "s3://your-backup-bucket/bitflow-lms/" --storage-class STANDARD_IA
# echo "[$(date)] Uploaded to S3"
