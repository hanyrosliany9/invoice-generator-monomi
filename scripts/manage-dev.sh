#!/bin/bash
# Development Environment Management Script
# Ensures proper isolation from production environment

set -e

PROJECT_NAME="invoice-dev"
COMPOSE_FILE="docker-compose.dev.yml"
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
    echo -e "${BLUE}  Development Environment${NC}"
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
  start       Start development environment
  stop        Stop development environment
  restart     Restart development environment
  rebuild     Rebuild and restart development environment
  logs        Show logs (use -f to follow)
  status      Show container status
  clean       Stop and remove containers, networks, volumes
  shell       Open shell in app container
  db-shell    Open PostgreSQL shell
  redis-cli   Open Redis CLI
  help        Show this help message

Examples:
  $0 start
  $0 logs -f
  $0 rebuild
  $0 shell
EOF
}

start_dev() {
    print_header
    echo "Starting development environment..."

    # Check if production is running and warn
    if docker ps --format '{{.Names}}' | grep -q "invoice-prod"; then
        print_warning "Production containers are running. Both can run simultaneously."
        echo "Press ENTER to continue or Ctrl+C to cancel..."
        read
    fi

    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d
    print_success "Development environment started"

    echo ""
    echo "Access URLs:"
    echo "  Frontend: http://localhost:3001"
    echo "  Backend:  http://localhost:5000"
    echo "  API Docs: http://localhost:5000/api/docs"
    echo "  Database: localhost:5436 (user: invoiceuser, db: invoices)"
    echo "  Redis:    localhost:6383"
}

stop_dev() {
    print_header
    echo "Stopping development environment..."
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down
    print_success "Development environment stopped"
}

restart_dev() {
    print_header
    echo "Restarting development environment..."
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" restart
    print_success "Development environment restarted"
}

rebuild_dev() {
    print_header
    echo "Rebuilding development environment..."
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" build --no-cache
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d
    print_success "Development environment rebuilt and started"
}

show_logs() {
    shift # Remove 'logs' from arguments
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" logs "$@"
}

show_status() {
    print_header
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" ps
    echo ""
    echo "Ports in use:"
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" ps --format json | jq -r '.[].Publishers[]? | "  \(.PublishedPort) -> \(.TargetPort)"' 2>/dev/null || echo "  (jq not installed, cannot show port mappings)"
}

clean_dev() {
    print_header
    print_warning "This will remove all development containers, networks, and volumes!"
    echo "Press ENTER to continue or Ctrl+C to cancel..."
    read

    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down -v --remove-orphans
    print_success "Development environment cleaned"
}

open_shell() {
    print_header
    echo "Opening shell in app container..."
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" exec app sh
}

open_db_shell() {
    print_header
    echo "Opening PostgreSQL shell..."
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" exec db psql -U invoiceuser -d invoices
}

open_redis_cli() {
    print_header
    echo "Opening Redis CLI..."
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" exec redis redis-cli
}

# Main command handler
case "${1:-help}" in
    start)
        start_dev
        ;;
    stop)
        stop_dev
        ;;
    restart)
        restart_dev
        ;;
    rebuild)
        rebuild_dev
        ;;
    logs)
        show_logs "$@"
        ;;
    status)
        show_status
        ;;
    clean)
        clean_dev
        ;;
    shell)
        open_shell
        ;;
    db-shell)
        open_db_shell
        ;;
    redis-cli)
        open_redis_cli
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
