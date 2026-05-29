#!/bin/bash
# Backup يومي لقاعدة بيانات hn-db.fun
# الاستخدام: ./backup.sh  أو في crontab: 0 3 * * * /root/hn-db/scripts/backup.sh

set -e

BACKUP_DIR="/root/backups"
RETENTION_DAYS=14
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="hn-db_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

cd "$(dirname "$0")/.."

echo "📦 جاري النسخ الاحتياطي → $BACKUP_DIR/$FILENAME"
docker compose exec -T postgres pg_dump -U app appdb | gzip > "$BACKUP_DIR/$FILENAME"

SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "✓ تم — الحجم: $SIZE"

# حذف النسخ الأقدم من RETENTION_DAYS يوم
find "$BACKUP_DIR" -name "hn-db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "🗑  حُذفت النسخ الأقدم من $RETENTION_DAYS يوم"
