#!/bin/bash

# Invoice Generator Database Backup Script - PRODUCTION

set -e

BACKUP_DIR="./backups/prod"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="prod_backup_${TIMESTAMP}.sql"
CONTAINER_NAME="invoice-db-prod"

echo "🗄️ Creating PRODUCTION database backup..."

# Ensure backup directory exists
mkdir -p $BACKUP_DIR

# Check if database container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ Database container '$CONTAINER_NAME' is not running."
    echo "   Start it with: ./scripts/manage-prod.sh start"
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

    # Clean up old backups (keep last 30 days for production)
    find $BACKUP_DIR -name "prod_backup_*.sql.gz" -mtime +30 -delete 2>/dev/null || true
    echo "🧹 Old backups cleaned up (kept last 30 days)"

    # Show backup size
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}.gz" | cut -f1)
    echo "📊 Backup size: $BACKUP_SIZE"

    # List recent backups
    echo ""
    echo "📋 Recent PRODUCTION backups:"
    ls -lht $BACKUP_DIR/*.gz 2>/dev/null | head -5 | awk '{print "   "$9" ("$5")"}'

    # Show total backup storage
    TOTAL_SIZE=$(du -sh $BACKUP_DIR 2>/dev/null | cut -f1)
    echo ""
    echo "💾 Total backup storage: $TOTAL_SIZE"
else
    echo "❌ Backup failed!"
    exit 1
fi
