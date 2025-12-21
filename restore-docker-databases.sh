#!/bin/bash

# Restore Docker Database from Backup
# This script restores a production backup to the development database
# and applies any pending Prisma migrations.
#
# Usage:
#   ./restore-docker-databases.sh                     # Interactive mode
#   ./restore-docker-databases.sh <backup_file>       # Specify backup file
#   ./restore-docker-databases.sh --latest            # Use latest backup
#
# Example:
#   ./restore-docker-databases.sh backups/prod/prod_backup_20251220_155156.sql.gz

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.development.yml"
BACKUP_DIR="${SCRIPT_DIR}/backups/prod"
VOLUME_NAME="invoice-gen-dev-infra_postgres_dev_data"
DB_USER="invoiceuser"
DB_NAME="invoices"

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

# Check if compose file exists
if [[ ! -f "$COMPOSE_FILE" ]]; then
    print_error "Compose file not found: $COMPOSE_FILE"
    exit 1
fi

# Determine backup file
BACKUP_FILE=""

if [[ "$1" == "--latest" ]]; then
    # Find the latest backup file
    BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/prod_backup_*.sql.gz 2>/dev/null | head -1)
    if [[ -z "$BACKUP_FILE" ]]; then
        print_error "No backup files found in ${BACKUP_DIR}"
        exit 1
    fi
    print_step "Using latest backup: $(basename "$BACKUP_FILE")"
elif [[ -n "$1" ]]; then
    # Use specified backup file
    if [[ -f "$1" ]]; then
        BACKUP_FILE="$1"
    elif [[ -f "${SCRIPT_DIR}/$1" ]]; then
        BACKUP_FILE="${SCRIPT_DIR}/$1"
    else
        print_error "Backup file not found: $1"
        exit 1
    fi
else
    # Interactive mode - list available backups
    echo ""
    echo "Available backups:"
    echo "─────────────────────────────────────────────────────"

    BACKUPS=($(ls -t "${BACKUP_DIR}"/prod_backup_*.sql.gz 2>/dev/null))

    if [[ ${#BACKUPS[@]} -eq 0 ]]; then
        print_error "No backup files found in ${BACKUP_DIR}"
        exit 1
    fi

    for i in "${!BACKUPS[@]}"; do
        FILENAME=$(basename "${BACKUPS[$i]}")
        SIZE=$(du -h "${BACKUPS[$i]}" | cut -f1)
        DATE=$(stat -c %y "${BACKUPS[$i]}" | cut -d' ' -f1)
        echo "  [$((i+1))] $FILENAME ($SIZE, $DATE)"
    done

    echo ""
    read -p "Select backup [1]: " SELECTION
    SELECTION=${SELECTION:-1}

    if [[ ! "$SELECTION" =~ ^[0-9]+$ ]] || [[ "$SELECTION" -lt 1 ]] || [[ "$SELECTION" -gt ${#BACKUPS[@]} ]]; then
        print_error "Invalid selection"
        exit 1
    fi

    BACKUP_FILE="${BACKUPS[$((SELECTION-1))]}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Database Restore Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Backup file:  $(basename "$BACKUP_FILE")"
echo "  Compose file: $(basename "$COMPOSE_FILE")"
echo "  Volume:       $VOLUME_NAME"
echo "  Database:     $DB_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_warning "This will DESTROY all data in the development database!"
read -p "Continue? [y/N]: " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""

# Step 1: Stop containers
print_step "Stopping containers..."
docker compose -f "$COMPOSE_FILE" down
print_success "Containers stopped"

# Step 2: Remove volume
print_step "Removing database volume..."
if docker volume inspect "$VOLUME_NAME" &>/dev/null; then
    docker volume rm "$VOLUME_NAME"
    print_success "Volume removed"
else
    print_warning "Volume did not exist, skipping"
fi

# Step 3: Start fresh database
print_step "Starting fresh database..."
docker compose -f "$COMPOSE_FILE" up -d
print_success "Containers started"

# Step 4: Wait for database to be healthy
print_step "Waiting for database to be healthy..."
ATTEMPTS=0
MAX_ATTEMPTS=30
while ! docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -U "$DB_USER" -d "$DB_NAME" &>/dev/null; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [[ $ATTEMPTS -ge $MAX_ATTEMPTS ]]; then
        print_error "Database failed to become healthy after ${MAX_ATTEMPTS} attempts"
        exit 1
    fi
    echo -n "."
    sleep 1
done
echo ""
print_success "Database is ready"

# Step 5: Restore backup
print_step "Restoring backup (this may take a moment)..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T db psql -U "$DB_USER" -d "$DB_NAME" -q
else
    docker compose -f "$COMPOSE_FILE" exec -T db psql -U "$DB_USER" -d "$DB_NAME" -q < "$BACKUP_FILE"
fi
print_success "Backup restored"

# Step 6: Run Prisma migrations
print_step "Applying Prisma migrations..."
cd "${SCRIPT_DIR}/backend"
npx prisma migrate deploy
print_success "Migrations applied"

# Step 7: Show summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Restore Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Show data counts
echo ""
print_step "Database summary:"
docker compose -f "$COMPOSE_FILE" exec -T db psql -U "$DB_USER" -d "$DB_NAME" -t -c "
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
print_success "You can now start your backend: cd backend && npm run start:dev"
