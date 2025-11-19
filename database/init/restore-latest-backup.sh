#!/bin/bash
# Automatically restore the latest backup on database initialization
# This script only runs when PostgreSQL initializes a fresh database

set -e

echo "=========================================="
echo "Database Init: Checking for backups to restore"
echo "=========================================="

# Find the latest backup file in /backup directory
LATEST_BACKUP=$(ls -t /backup/backup_prod_*.sql 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "No production backup found in /backup directory"
    echo "Database will be initialized with Prisma migrations"
    exit 0
fi

echo "Found latest backup: $LATEST_BACKUP"
echo "Backup size: $(du -h "$LATEST_BACKUP" | cut -f1)"
echo "Backup date: $(stat -c %y "$LATEST_BACKUP" | cut -d'.' -f1)"

echo ""
echo "=========================================="
echo "Restoring backup to database: $POSTGRES_DB"
echo "=========================================="

# Wait a moment for PostgreSQL to be fully ready
sleep 2

# Restore the backup
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$LATEST_BACKUP"

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ Backup restored successfully!"
    echo "=========================================="
    echo "Database '$POSTGRES_DB' has been restored from:"
    echo "  $LATEST_BACKUP"
    echo ""
else
    echo ""
    echo "=========================================="
    echo "✗ Backup restoration failed!"
    echo "=========================================="
    echo "Database will proceed with normal initialization"
    exit 1
fi
