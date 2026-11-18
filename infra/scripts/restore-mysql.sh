#!/usr/bin/env bash
# ==============================================================================
# BrainMemo LMS - MySQL Disaster Recovery & Restore Rehearsal Script (T-S12-OPS-01)
# Usage: ./restore-mysql.sh <backup_file.sql.gz> [target_database]
# ==============================================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <path_to_backup.sql.gz> [target_database_name]"
    echo "Example: $0 /backups/mysql/brainmemo_brainmemo_lms_20261118_020000.sql.gz brainmemo_lms_rehearsal"
    exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="${MYSQL_CONTAINER:-brainmemo-prod-mysql-1}"
TARGET_DB="${2:-brainmemo_lms_rehearsal}"
DB_USER="${MYSQL_USER:-root}"
DB_PASSWORD="${MYSQL_ROOT_PASSWORD:-brainmemo_root_pw}"

LOG_PREFIX="[$(date +'%Y-%m-%d %H:%M:%S')] [BrainMemo-Restore]"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "${LOG_PREFIX} ERROR: File ${BACKUP_FILE} does not exist!" >&2
    exit 1
fi

echo "${LOG_PREFIX} Validating archive integrity of ${BACKUP_FILE}..."
if ! gzip -t "${BACKUP_FILE}"; then
    echo "${LOG_PREFIX} ERROR: Archive ${BACKUP_FILE} is corrupted!" >&2
    exit 1
fi
echo "${LOG_PREFIX} Archive integrity check passed."

echo "${LOG_PREFIX} Creating database '${TARGET_DB}' if not exists on MySQL container '${CONTAINER_NAME}'..."
docker exec "${CONTAINER_NAME}" mysql -u"${DB_USER}" -p"${DB_PASSWORD}" \
    -e "CREATE DATABASE IF NOT EXISTS \`${TARGET_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"

echo "${LOG_PREFIX} Restoring data into '${TARGET_DB}'..."
gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" mysql \
    -u"${DB_USER}" -p"${DB_PASSWORD}" "${TARGET_DB}"

echo "${LOG_PREFIX} Verifying restored database tables..."
TABLE_COUNT=$(docker exec "${CONTAINER_NAME}" mysql -u"${DB_USER}" -p"${DB_PASSWORD}" -N -s \
    -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${TARGET_DB}';")

echo "${LOG_PREFIX} Restore rehearsal completed successfully! Total tables restored in '${TARGET_DB}': ${TABLE_COUNT}"
exit 0
