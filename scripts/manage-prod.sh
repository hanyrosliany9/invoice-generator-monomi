#!/bin/bash
# Production Environment Management Script
# Ensures proper isolation from development environment

set -e

PROJECT_NAME="invoice-prod"
COMPOSE_FILE="docker-compose.prod.yml"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Production Environment${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

show_usage() {
    cat << EOF
Usage: $0 [COMMAND]

Commands:
  start       Start production environment
  stop        Stop production environment
  restart     Restart production environment
  rebuild     Rebuild and restart production environment
  logs        Show logs (use -f to follow, add service name for specific service)
  status      Show container status
  health      Show health status of all services
  clean       Stop and remove containers (preserves volumes)
  shell       Open shell in app container
  db-shell    Open PostgreSQL shell
  backup      Create database backup
  help        Show this help message

Examples:
  $0 start
  $0 logs -f app
  $0 rebuild
  $0 health
  $0 backup

WARNING: This manages PRODUCTION environment. Use with caution!
EOF
}

check_env_file() {
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        print_error ".env file not found!"
        echo "Create .env file with required variables:"
        echo "  DB_PASSWORD, JWT_SECRET, REDIS_PASSWORD, etc."
        exit 1
    fi
}

start_prod() {
    print_header
    print_warning "Starting PRODUCTION environment"
    check_env_file

    # Check if dev is running and warn
    if docker ps --format '{{.Names}}' | grep -q "invoice-dev"; then
        print_warning "Development containers are running. Both can run simultaneously."
    fi

    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d
    print_success "Production environment started"

    echo ""
    echo "Production URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Nginx:    http://localhost:80"
    echo "  Health:   http://localhost:80/health"
    echo ""
    echo "Waiting for services to be healthy..."
    sleep 10
    show_health
}

stop_prod() {
    print_header
    print_warning "Stopping PRODUCTION environment"
    echo "Press ENTER to continue or Ctrl+C to cancel..."
    read

    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down
    print_success "Production environment stopped"
}

restart_prod() {
    print_header
    print_warning "Restarting PRODUCTION environment"
    echo "Press ENTER to continue or Ctrl+C to cancel..."
    read

    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" restart
    print_success "Production environment restarted"
}

rebuild_prod() {
    print_header
    print_warning "Rebuilding PRODUCTION environment (with downtime)"
    echo "This will:"
    echo "  1. Stop all production containers"
    echo "  2. Rebuild images from scratch"
    echo "  3. Start containers with new images"
    echo ""
    echo "Press ENTER to continue or Ctrl+C to cancel..."
    read

    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" build --no-cache
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d
    print_success "Production environment rebuilt and started"
}

show_logs() {
    shift # Remove 'logs' from arguments
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" logs "$@"
}

show_status() {
    print_header
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" ps
}

show_health() {
    print_header
    echo "Health Status:"
    echo ""

    containers=$(docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" ps --format json 2>/dev/null)

    if command -v jq &> /dev/null; then
        echo "$containers" | jq -r '.[] | "  \(.Name): \(.Health // "no health check")"'
    else
        docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}"
    fi

    echo ""

    # Check nginx endpoint
    if curl -sf http://localhost/health > /dev/null 2>&1; then
        print_success "Nginx health check: PASSING"
    else
        print_error "Nginx health check: FAILING"
    fi
}

clean_prod() {
    print_header
    print_warning "This will remove production containers and networks (volumes preserved)"
    echo "Press ENTER to continue or Ctrl+C to cancel..."
    read

    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down --remove-orphans
    print_success "Production environment cleaned (volumes preserved)"
}

open_shell() {
    print_header
    echo "Opening shell in production app container..."
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" exec app sh
}

open_db_shell() {
    print_header
    echo "Opening PostgreSQL shell in production..."
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" exec db psql -U invoiceuser -d invoices
}

backup_database() {
    print_header
    echo "Creating production database backup..."

    backup_dir="$PROJECT_ROOT/backup"
    mkdir -p "$backup_dir"

    backup_file="$backup_dir/prod_backup_$(date +%Y%m%d_%H%M%S).sql"

    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" exec -T db \
        pg_dump -U invoiceuser -d invoices > "$backup_file"

    print_success "Backup created: $backup_file"

    # Compress backup
    gzip "$backup_file"
    print_success "Backup compressed: ${backup_file}.gz"
}

# Main command handler
case "${1:-help}" in
    start)
        start_prod
        ;;
    stop)
        stop_prod
        ;;
    restart)
        restart_prod
        ;;
    rebuild)
        rebuild_prod
        ;;
    logs)
        show_logs "$@"
        ;;
    status)
        show_status
        ;;
    health)
        show_health
        ;;
    clean)
        clean_prod
        ;;
    shell)
        open_shell
        ;;
    db-shell)
        open_db_shell
        ;;
    backup)
        backup_database
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
