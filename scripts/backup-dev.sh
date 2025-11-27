#!/bin/bash

# Invoice Generator Database Backup Script - DEVELOPMENT

set -e

BACKUP_DIR="./backups/dev"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="dev_backup_${TIMESTAMP}.sql"
CONTAINER_NAME="invoice-db-dev"

echo "🗄️ Creating DEV database backup..."

# Ensure backup directory exists
mkdir -p $BACKUP_DIR

# Check if database container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ Database container '$CONTAINER_NAME' is not running."
    echo "   Start it with: ./scripts/manage-dev.sh start"
    exit 1
fi

# Create backup
echo "📦 Dumping database from $CONTAINER_NAME..."
docker exec $CONTAINER_NAME pg_dump -U invoiceuser -d invoices > "${BACKUP_DIR}/${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: ${BACKUP_DIR}/${BACKUP_FILE}"

    # Compress the backup
    gzip "${BACKUP_DIR}/${BACKUP_FILE}"
    echo "✅ Backup compressed: ${BACKUP_DIR}/${BACKUP_FILE}.gz"

    # Clean up old backups (keep last 7 days)
    find $BACKUP_DIR -name "dev_backup_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
    echo "🧹 Old backups cleaned up (kept last 7 days)"

    # Show backup size
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}.gz" | cut -f1)
    echo "📊 Backup size: $BACKUP_SIZE"

    # List recent backups
    echo ""
    echo "📋 Recent DEV backups:"
    ls -lht $BACKUP_DIR/*.gz 2>/dev/null | head -5 | awk '{print "   "$9" ("$5")"}'
else
    echo "❌ Backup failed!"
    exit 1
fi
