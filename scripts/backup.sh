#!/bin/bash

# Invoice Generator Database Backup Script

set -e

# Determine environment (default to dev)
ENV=${1:-dev}

if [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ]; then
    echo "❌ Invalid environment. Use: ./scripts/backup.sh [dev|prod]"
    echo "   Example: ./scripts/backup.sh dev"
    exit 1
fi

BACKUP_DIR="./backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="invoice_db_backup_${ENV}_${TIMESTAMP}.sql"
CONTAINER_NAME="invoice-db-${ENV}"

echo "🗄️ Creating ${ENV} database backup..."

# Ensure backup directory exists with correct permissions
mkdir -p $BACKUP_DIR
chmod 755 $BACKUP_DIR 2>/dev/null || true

# Check if database container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ Database container '$CONTAINER_NAME' is not running."
    echo "   Available containers:"
    docker ps --format "   - {{.Names}}" | grep invoice
    exit 1
fi

# Create backup using docker exec with output redirect
docker exec $CONTAINER_NAME pg_dump -U invoiceuser -d invoices > "${BACKUP_DIR}/${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: ${BACKUP_DIR}/${BACKUP_FILE}"
    
    # Compress the backup
    gzip "${BACKUP_DIR}/${BACKUP_FILE}"
    echo "✅ Backup compressed: ${BACKUP_DIR}/${BACKUP_FILE}.gz"
    
    # Clean up old backups (keep last 7 days)
    find $BACKUP_DIR -name "invoice_db_backup_*.sql.gz" -mtime +7 -delete
    echo "🧹 Old backups cleaned up"
    
    # Show backup size
    echo "📊 Backup size: $(du -h "${BACKUP_DIR}/${BACKUP_FILE}.gz" | cut -f1)"
else
    echo "❌ Backup failed!"
    exit 1
fi