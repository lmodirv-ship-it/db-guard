#!/bin/bash
# نسخة احتياطية يومية لقاعدة بيانات hn-db
# الاستخدام: ./scripts/backup.sh
# للجدولة: crontab -e ثم أضف:
#   0 3 * * * /root/hn-bd-selfhosted/scripts/backup.sh >> /var/log/hn-backup.log 2>&1

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/root/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
COMPOSE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATE=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/appdb-$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] بدء النسخ الاحتياطي → $OUT"

cd "$COMPOSE_DIR"
docker compose exec -T postgres pg_dump -U app -d appdb --no-owner --clean --if-exists \
  | gzip -9 > "$OUT"

SIZE=$(du -h "$OUT" | cut -f1)
echo "[$(date)] اكتمل: $OUT ($SIZE)"

# حذف النسخ الأقدم من RETENTION_DAYS يوماً
find "$BACKUP_DIR" -name "appdb-*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] تم تنظيف النسخ الأقدم من $RETENTION_DAYS يوماً"

# للاستعادة:
#   gunzip < /root/backups/appdb-XXXX.sql.gz | docker compose exec -T postgres psql -U app -d appdb
