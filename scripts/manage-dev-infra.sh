#!/bin/bash
# Hybrid Development Infrastructure Management Script
# Manages ONLY PostgreSQL and Redis for local development
# Backend and frontend run directly on host machine for fast iteration
#
# Usage: ./scripts/manage-dev-infra.sh [COMMAND]

set -e

PROJECT_NAME="invoice-gen-dev-infra"
COMPOSE_FILE="docker-compose.development.yml"
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
    echo -e "${BLUE}  Hybrid Dev Infrastructure${NC}"
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

This script manages ONLY the infrastructure containers (PostgreSQL + Redis).
The backend and frontend run directly on your host machine.

Commands:
  start       Start database and cache services
  stop        Stop database and cache services
  restart     Restart database and cache services
  logs        Show infrastructure logs (use -f to follow)
  status      Show container status
  clean       Stop and remove containers, volumes
  db-shell    Open PostgreSQL shell
  redis-cli   Open Redis CLI
  help        Show this help message

Environment Setup:
  1. Copy environment: cp .env.development .env
  2. Start infrastructure: $0 start
  3. Install deps: cd backend && npm install && cd ../frontend && npm install
  4. Setup database: cd backend && npx prisma migrate deploy && npm run db:seed
  5. Start backend: cd backend && npm run start:dev
  6. Start frontend: cd frontend && npm run dev (in another terminal)

Examples:
  $0 start
  $0 logs -f
  $0 status
  $0 db-shell
EOF
}

start_infra() {
    print_header
    echo "Starting infrastructure services (PostgreSQL + Redis)..."
    echo ""

    docker compose -f "$COMPOSE_FILE" up -d

    # Wait for services to be healthy
    echo "Waiting for services to be healthy..."
    sleep 3

    docker compose -f "$COMPOSE_FILE" ps

    print_success "Infrastructure started"
    echo ""
    echo -e "${GREEN}Connection details:${NC}"
    echo "  PostgreSQL: postgresql://invoiceuser:devpassword@localhost:5438/invoices"
    echo "  Redis:      redis://localhost:6385"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. cp .env.development .env"
    echo "  2. cd backend && npm install"
    echo "  3. cd backend && npx prisma migrate deploy"
    echo "  4. cd backend && npm run start:dev"
    echo "  (in another terminal) cd frontend && npm run dev"
}

stop_infra() {
    print_header
    echo "Stopping infrastructure services..."
    docker compose -f "$COMPOSE_FILE" down
    print_success "Infrastructure stopped"
}

restart_infra() {
    print_header
    echo "Restarting infrastructure services..."
    docker compose -f "$COMPOSE_FILE" restart
    print_success "Infrastructure restarted"
    echo ""
    docker compose -f "$COMPOSE_FILE" ps
}

show_logs() {
    shift # Remove 'logs' from arguments
    docker compose -f "$COMPOSE_FILE" logs "$@"
}

show_status() {
    print_header
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    echo "Network: invoice-gen-dev-network"
    echo ""
    echo "Connection strings:"
    echo "  PostgreSQL: postgresql://invoiceuser:devpassword@localhost:5438/invoices"
    echo "  Redis:      redis://localhost:6385"
}

clean_infra() {
    print_header
    print_warning "This will remove infrastructure containers and volumes!"
    echo "You will lose database data. Press ENTER to continue or Ctrl+C to cancel..."
    read

    docker compose -f "$COMPOSE_FILE" down -v --remove-orphans
    print_success "Infrastructure cleaned"
}

open_db_shell() {
    print_header
    echo "Opening PostgreSQL shell..."
    docker compose -f "$COMPOSE_FILE" exec db psql -U invoiceuser -d invoices
}

open_redis_cli() {
    print_header
    echo "Opening Redis CLI..."
    docker compose -f "$COMPOSE_FILE" exec redis redis-cli
}

# Main command handler
case "${1:-help}" in
    start)
        start_infra
        ;;
    stop)
        stop_infra
        ;;
    restart)
        restart_infra
        ;;
    logs)
        show_logs "$@"
        ;;
    status)
        show_status
        ;;
    clean)
        clean_infra
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
