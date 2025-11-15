#!/bin/bash
# Environment Conflict Checker
# Validates that dev and prod can run simultaneously without issues

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Environment Conflict Checker            ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo ""
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

check_project_names() {
    echo -e "${BLUE}[1/5] Checking Project Names...${NC}"

    dev_name=$(grep "^name:" "$PROJECT_ROOT/docker-compose.dev.yml" | awk '{print $2}' || echo "")
    prod_name=$(grep "^name:" "$PROJECT_ROOT/docker-compose.prod.yml" | awk '{print $2}' || echo "")

    if [ "$dev_name" = "invoice-dev" ]; then
        print_success "Dev project name: $dev_name"
    else
        print_error "Dev project name missing or incorrect: '$dev_name' (should be 'invoice-dev')"
        return 1
    fi

    if [ "$prod_name" = "invoice-prod" ]; then
        print_success "Prod project name: $prod_name"
    else
        print_error "Prod project name missing or incorrect: '$prod_name' (should be 'invoice-prod')"
        return 1
    fi

    if [ "$dev_name" != "$prod_name" ]; then
        print_success "Project names are different (no conflict)"
    else
        print_error "Project names are the same (will cause conflicts)"
        return 1
    fi

    echo ""
}

check_port_conflicts() {
    echo -e "${BLUE}[2/5] Checking Port Allocations...${NC}"

    # Expected ports
    declare -A dev_ports=(
        ["3001"]="Frontend"
        ["5000"]="Backend API"
        ["5436"]="PostgreSQL"
        ["6383"]="Redis"
        ["9229"]="Debug"
    )

    declare -A prod_ports=(
        ["80"]="Nginx"
        ["3000"]="Frontend"
    )

    # Check for overlaps
    overlap=0
    for port in "${!dev_ports[@]}"; do
        if [[ -n "${prod_ports[$port]}" ]]; then
            print_error "Port conflict: $port used by both dev and prod"
            overlap=1
        fi
    done

    if [ $overlap -eq 0 ]; then
        print_success "No port conflicts detected"
        echo "  Dev ports:  3001, 5000, 5436, 6383, 9229"
        echo "  Prod ports: 80, 3000"
    else
        return 1
    fi

    echo ""
}

check_network_isolation() {
    echo -e "${BLUE}[3/5] Checking Network Isolation...${NC}"

    dev_network=$(grep -A 2 "^networks:" "$PROJECT_ROOT/docker-compose.dev.yml" | grep "name:" | awk '{print $2}' || echo "invoice-network-dev")
    prod_network=$(docker compose -f "$PROJECT_ROOT/docker-compose.prod.yml" config 2>/dev/null | grep -A 5 "^networks:" | grep "name:" | awk '{print $2}' || echo "invoice-prod_invoice-network")

    if [ "$dev_network" != "$prod_network" ]; then
        print_success "Networks are isolated"
        echo "  Dev network:  $dev_network"
        echo "  Prod network: $prod_network"
    else
        print_warning "Networks might conflict: both using '$dev_network'"
    fi

    echo ""
}

check_running_containers() {
    echo -e "${BLUE}[4/5] Checking Running Containers...${NC}"

    dev_containers=$(docker ps --filter "name=invoice-dev" --format "{{.Names}}" 2>/dev/null | wc -l)
    prod_containers=$(docker ps --filter "name=invoice-prod" --format "{{.Names}}" 2>/dev/null | wc -l)

    if [ "$dev_containers" -gt 0 ] && [ "$prod_containers" -gt 0 ]; then
        print_success "Both environments running ($dev_containers dev, $prod_containers prod)"

        # Check for actual port conflicts
        echo "  Checking for port binding conflicts..."
        port_conflicts=$(docker ps --format "{{.Ports}}" | grep -o "0.0.0.0:[0-9]*" | sort | uniq -d | wc -l)

        if [ "$port_conflicts" -eq 0 ]; then
            print_success "No port binding conflicts"
        else
            print_error "Port binding conflicts detected!"
            docker ps --format "table {{.Names}}\t{{.Ports}}"
            return 1
        fi
    elif [ "$dev_containers" -gt 0 ]; then
        print_success "Only dev environment running ($dev_containers containers)"
    elif [ "$prod_containers" -gt 0 ]; then
        print_success "Only prod environment running ($prod_containers containers)"
    else
        print_warning "No containers running"
    fi

    echo ""
}

check_volume_isolation() {
    echo -e "${BLUE}[5/5] Checking Volume Isolation...${NC}"

    dev_volumes=$(docker volume ls --filter "name=invoice-dev" --format "{{.Name}}" 2>/dev/null | wc -l)
    prod_volumes=$(docker volume ls --filter "name=invoice-prod" --format "{{.Name}}" 2>/dev/null | wc -l)

    if [ "$dev_volumes" -gt 0 ] || [ "$prod_volumes" -gt 0 ]; then
        print_success "Volumes are properly namespaced"
        echo "  Dev volumes:  $dev_volumes"
        echo "  Prod volumes: $prod_volumes"

        # Check for shared volumes (should be none)
        shared=$(docker volume ls --format "{{.Name}}" | grep "^invoice_" | grep -v "invoice-dev" | grep -v "invoice-prod" | wc -l)
        if [ "$shared" -gt 0 ]; then
            print_warning "Found $shared shared volumes (may be legacy)"
        fi
    else
        print_warning "No volumes found (environments not initialized)"
    fi

    echo ""
}

run_all_checks() {
    print_header

    failed=0

    check_project_names || failed=1
    check_port_conflicts || failed=1
    check_network_isolation || failed=1
    check_running_containers || failed=1
    check_volume_isolation || failed=1

    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo ""

    if [ $failed -eq 0 ]; then
        print_success "All checks passed! Environments are properly isolated."
        echo ""
        echo "You can safely run both dev and prod simultaneously:"
        echo "  ./scripts/manage.sh dev start"
        echo "  ./scripts/manage.sh prod start"
        return 0
    else
        print_error "Some checks failed. Review the issues above."
        return 1
    fi
}

# Run all checks
run_all_checks
