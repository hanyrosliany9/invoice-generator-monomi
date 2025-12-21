#!/bin/bash

# Backup Docker Database
# Creates a compressed backup of the development or production database.
#
# Usage:
#   ./backup-docker-databases.sh              # Backup dev database (default)
#   ./backup-docker-databases.sh dev          # Backup dev database
#   ./backup-docker-databases.sh prod         # Backup prod database
#   ./backup-docker-databases.sh dev custom   # Backup with custom name suffix
#
# Output:
#   backups/dev/dev_backup_YYYYMMDD_HHMMSS.sql.gz
#   backups/prod/prod_backup_YYYYMMDD_HHMMSS.sql.gz

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Determine environment
ENV="${1:-dev}"
CUSTOM_SUFFIX="$2"

case "$ENV" in
    dev|development)
        ENV="dev"
        COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.development.yml"
        BACKUP_DIR="${SCRIPT_DIR}/backups/dev"
        DB_USER="invoiceuser"
        DB_NAME="invoices"
        DB_SERVICE="db"
        ;;
    prod|production)
        ENV="prod"
        COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.yml"
        BACKUP_DIR="${SCRIPT_DIR}/backups/prod"
        DB_USER="invoiceuser"
        DB_NAME="invoices"
        DB_SERVICE="db"
        ;;
    *)
        print_error "Unknown environment: $ENV"
        echo "Usage: $0 [dev|prod] [custom_suffix]"
        exit 1
        ;;
esac

# Build backup filename
if [[ -n "$CUSTOM_SUFFIX" ]]; then
    BACKUP_FILE="${BACKUP_DIR}/${ENV}_backup_${TIMESTAMP}_${CUSTOM_SUFFIX}.sql.gz"
else
    BACKUP_FILE="${BACKUP_DIR}/${ENV}_backup_${TIMESTAMP}.sql.gz"
fi

# Check if compose file exists
if [[ ! -f "$COMPOSE_FILE" ]]; then
    print_error "Compose file not found: $COMPOSE_FILE"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Database Backup Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Environment:  $ENV"
echo "  Compose file: $(basename "$COMPOSE_FILE")"
echo "  Database:     $DB_NAME"
echo "  Output:       $(basename "$BACKUP_FILE")"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if database container is running
print_step "Checking database container..."
if ! docker compose -f "$COMPOSE_FILE" ps --status running | grep -q "$DB_SERVICE"; then
    print_error "Database container is not running"
    echo "Start it with: docker compose -f $(basename "$COMPOSE_FILE") up -d"
    exit 1
fi
print_success "Database container is running"

# Check database connectivity
print_step "Checking database connectivity..."
if ! docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" pg_isready -U "$DB_USER" -d "$DB_NAME" &>/dev/null; then
    print_error "Cannot connect to database"
    exit 1
fi
print_success "Database is accessible"

# Get database size
DB_SIZE=$(docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | tr -d ' ')
print_step "Database size: $DB_SIZE"

# Create backup
print_step "Creating backup (this may take a moment)..."
docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl | gzip > "$BACKUP_FILE"

# Verify backup
if [[ ! -f "$BACKUP_FILE" ]] || [[ ! -s "$BACKUP_FILE" ]]; then
    print_error "Backup file is empty or was not created"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
print_success "Backup created: $BACKUP_SIZE"

# Show table counts in backup
print_step "Backup contents summary:"
docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'clients', COUNT(*) FROM clients
UNION ALL SELECT 'projects', COUNT(*) FROM projects
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'quotations', COUNT(*) FROM quotations
UNION ALL SELECT 'media_projects', COUNT(*) FROM media_projects
UNION ALL SELECT 'media_assets', COUNT(*) FROM media_assets
ORDER BY table_name;
" | grep -v "^$"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Backup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  File: $BACKUP_FILE"
echo "  Size: $BACKUP_SIZE"
echo ""

# List recent backups
print_step "Recent backups in ${BACKUP_DIR}:"
ls -lht "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -5 | while read line; do
    echo "  $line"
done

echo ""
print_success "To restore: ./restore-docker-databases.sh $BACKUP_FILE"
