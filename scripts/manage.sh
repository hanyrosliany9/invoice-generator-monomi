#!/bin/bash
# Unified Environment Management Script
# Prevents conflicts between dev and prod environments

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   Invoice Generator - Environment Mgr  ║${NC}"
    echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
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
Usage: $0 [ENVIRONMENT] [COMMAND] [OPTIONS]

Environments:
  dev         Development environment (ports: 3001, 5000, 5436, 6383)
  prod        Production environment (ports: 80, 3000)
  both        Manage both environments
  status      Show status of all environments

Commands depend on environment selected. Run:
  $0 dev help        - See development commands
  $0 prod help       - See production commands

Quick Commands:
  $0 dev start       - Start development
  $0 prod start      - Start production
  $0 both status     - Show status of all containers
  $0 both stop       - Stop both environments

Examples:
  $0 dev start
  $0 prod logs -f app
  $0 both status
  $0 status
EOF
}

show_all_status() {
    print_header
    echo ""
    echo -e "${BLUE}=== Development Environment ===${NC}"
    "$SCRIPT_DIR/manage-dev.sh" status 2>/dev/null || echo "  Not running"

    echo ""
    echo -e "${BLUE}=== Production Environment ===${NC}"
    "$SCRIPT_DIR/manage-prod.sh" status 2>/dev/null || echo "  Not running"

    echo ""
    echo -e "${BLUE}=== Port Usage ===${NC}"
    echo "Development:"
    echo "  3001 - Frontend (http://localhost:3001)"
    echo "  5000 - Backend API (http://localhost:5000)"
    echo "  5436 - PostgreSQL"
    echo "  6383 - Redis"
    echo ""
    echo "Production:"
    echo "  80   - Nginx (http://localhost)"
    echo "  3000 - Frontend (http://localhost:3000)"
    echo ""

    # Check for conflicts
    echo -e "${BLUE}=== Conflict Check ===${NC}"
    dev_running=$(docker ps --filter "name=invoice-dev" --format "{{.Names}}" | wc -l)
    prod_running=$(docker ps --filter "name=invoice-prod" --format "{{.Names}}" | wc -l)

    if [ "$dev_running" -gt 0 ] && [ "$prod_running" -gt 0 ]; then
        print_success "Both environments running - No conflicts detected"
    elif [ "$dev_running" -gt 0 ]; then
        print_success "Only development environment running"
    elif [ "$prod_running" -gt 0 ]; then
        print_success "Only production environment running"
    else
        print_warning "No environments running"
    fi
}

stop_both() {
    print_header
    print_warning "Stopping ALL environments"
    echo "Press ENTER to continue or Ctrl+C to cancel..."
    read

    echo ""
    echo "Stopping development..."
    "$SCRIPT_DIR/manage-dev.sh" stop 2>/dev/null || echo "Dev not running"

    echo ""
    echo "Stopping production..."
    "$SCRIPT_DIR/manage-prod.sh" stop 2>/dev/null || echo "Prod not running"

    print_success "All environments stopped"
}

start_both() {
    print_header
    echo "Starting both environments..."

    echo ""
    echo "Starting development..."
    "$SCRIPT_DIR/manage-dev.sh" start

    echo ""
    echo "Starting production..."
    "$SCRIPT_DIR/manage-prod.sh" start

    print_success "Both environments started"
}

# Main command handler
ENV="${1:-status}"

case "$ENV" in
    dev)
        shift
        exec "$SCRIPT_DIR/manage-dev.sh" "$@"
        ;;
    prod)
        shift
        exec "$SCRIPT_DIR/manage-prod.sh" "$@"
        ;;
    both)
        case "${2:-status}" in
            status)
                show_all_status
                ;;
            stop)
                stop_both
                ;;
            start)
                start_both
                ;;
            *)
                print_error "Unknown command for 'both': $2"
                echo "Available: status, start, stop"
                exit 1
                ;;
        esac
        ;;
    status)
        show_all_status
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Unknown environment: $ENV"
        echo ""
        show_usage
        exit 1
        ;;
esac
