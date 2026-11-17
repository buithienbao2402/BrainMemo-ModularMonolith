#!/usr/bin/env bash
# ==============================================================================
# BrainMemo LMS - Automated Daily MySQL Backup & Retention Script (T-S12-OPS-01)
# Schedule: Run daily via crontab (e.g., 02:00 AM UTC)
# Retention: 7 days
# ==============================================================================

set -euo pipefail

# 1. Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/mysql}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=7

# Docker / Database parameters
CONTAINER_NAME="${MYSQL_CONTAINER:-brainmemo-prod-mysql-1}"
DB_NAME="${MYSQL_DATABASE:-brainmemo_lms}"
DB_USER="${MYSQL_USER:-root}"
DB_PASSWORD="${MYSQL_ROOT_PASSWORD:-brainmemo_root_pw}"

# Webhook for failure alerts (Optional: Telegram, Slack, or Discord webhook URL)
ALERT_WEBHOOK_URL="${BACKUP_ALERT_WEBHOOK:-}"

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

BACKUP_FILE="${BACKUP_DIR}/brainmemo_${DB_NAME}_${TIMESTAMP}.sql.gz"
LOG_PREFIX="[$(date +'%Y-%m-%d %H:%M:%S')] [BrainMemo-Backup]"

echo "${LOG_PREFIX} Starting automated MySQL backup for database '${DB_NAME}'..."

# 2. Execute mysqldump with single-transaction for zero-downtime consistency
if docker exec "${CONTAINER_NAME}" mysqldump \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --events \
    --hex-blob \
    -u"${DB_USER}" \
    -p"${DB_PASSWORD}" \
    "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"; then

    FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "${LOG_PREFIX} Backup successful: ${BACKUP_FILE} (Size: ${FILE_SIZE})"

    # Verify gzip integrity
    if gzip -t "${BACKUP_FILE}"; then
        echo "${LOG_PREFIX} Gzip archive integrity check: PASSED"
    else
        echo "${LOG_PREFIX} ERROR: Gzip integrity check FAILED for ${BACKUP_FILE}" >&2
        exit 1
    fi

else
    echo "${LOG_PREFIX} ERROR: MySQL backup failed for database '${DB_NAME}'!" >&2

    # Send alert if webhook configured
    if [ -n "${ALERT_WEBHOOK_URL}" ]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"[ALERT] BrainMemo MySQL backup failed on $(hostname) at ${TIMESTAMP}!\"}" \
            "${ALERT_WEBHOOK_URL}" || true
    fi
    exit 1
fi

# 3. Clean up backups older than RETENTION_DAYS (7 days)
echo "${LOG_PREFIX} Cleaning up backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR}..."
DELETED_COUNT=$(find "${BACKUP_DIR}" -name "brainmemo_${DB_NAME}_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -print -delete | wc -l)
echo "${LOG_PREFIX} Removed ${DELETED_COUNT} expired backup file(s)."

echo "${LOG_PREFIX} Backup process completed successfully."
exit 0
