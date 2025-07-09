#!/bin/bash

# Invoice Generator Database Backup Script

set -e

BACKUP_DIR="./backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="invoice_db_backup_${TIMESTAMP}.sql"

echo "🗄️ Creating database backup..."

# Ensure backup directory exists
mkdir -p $BACKUP_DIR

# Check if database container is running
if ! docker ps | grep -q "invoice-db"; then
    echo "❌ Database container is not running. Please start the database first."
    exit 1
fi

# Create backup
docker exec invoice-db pg_dump -U invoiceuser -d invoices > "${BACKUP_DIR}/${BACKUP_FILE}"

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