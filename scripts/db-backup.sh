#!/bin/sh
# Simple Postgres backup script
# Usage: DB_BACKUP_DIR=/backups ./scripts/db-backup.sh

set -e
DB_URL=${DATABASE_URL}
OUT_DIR=${DB_BACKUP_DIR:-/backups}
mkdir -p "$OUT_DIR"

if [ -z "$DB_URL" ]; then
  echo "DATABASE_URL not set"
  exit 1
fi

FILENAME="$OUT_DIR/backup-$(date +%Y%m%d-%H%M%S).sql.gz"

pg_dump "$DB_URL" | gzip > "$FILENAME"

echo "Backup written to $FILENAME"
