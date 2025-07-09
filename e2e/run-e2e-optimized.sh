#!/bin/bash

# Optimized Docker-First E2E Testing Script
# Uses Microsoft's pre-built Playwright image with volume mounting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Optimized Docker-First E2E Testing${NC}"
echo -e "${BLUE}=============================================${NC}"

# Step 1: Start application stack
echo -e "${YELLOW}📦 Starting application services...${NC}"
docker compose -f docker-compose.app.yml up -d db-test redis-test backend-test frontend-test

# Step 2: Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 20

# Step 3: Check service health
echo -e "${YELLOW}🔍 Checking service health...${NC}"
docker compose -f docker-compose.app.yml ps

# Step 4: Run e2e tests using pre-built Playwright image
echo -e "${GREEN}🧪 Running e2e tests with Microsoft Playwright image...${NC}"

# Ensure test results directory exists
mkdir -p test-results
mkdir -p playwright-report

# Run tests using volume mounting (no build required!)
docker run --rm \
  --name invoice-e2e-tests \
  --network e2e_e2e-network \
  -v "$(pwd):/workspace" \
  -v "$(pwd)/test-results:/workspace/test-results" \
  -v "$(pwd)/playwright-report:/workspace/playwright-report" \
  -w /workspace \
  -e BASE_URL=http://frontend-test:3000 \
  -e API_URL=http://backend-test:5000/api/v1 \
  -e DATABASE_URL=postgresql://invoiceuser:invoicepass@db-test:5432/invoices_test \
  -e ADMIN_EMAIL=admin@bisnis.co.id \
  -e ADMIN_PASSWORD=password123 \
  -e USER_EMAIL=user@bisnis.co.id \
  -e USER_PASSWORD=password123 \
  -e HEADLESS=true \
  -e NODE_ENV=test \
  mcr.microsoft.com/playwright:v1.48.0-focal \
  bash -c "
    echo 'Installing dependencies...' &&
    npm install &&
    echo 'Running Playwright tests...' &&
    npx playwright test --reporter=html
  "

# Check the exit code
E2E_EXIT_CODE=$?

# Step 5: Show test results
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo -e "${BLUE}=====================${NC}"

if [ $E2E_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All e2e tests passed successfully!${NC}"
else
    echo -e "${RED}❌ Some e2e tests failed. Check the logs above.${NC}"
fi

# Step 6: Display results
if [ -f "test-results/button-clicks-summary.txt" ]; then
    echo -e "${YELLOW}📋 Button Test Results:${NC}"
    cat test-results/button-clicks-summary.txt
fi

if [ -f "test-results/final-test-summary.txt" ]; then
    echo -e "${YELLOW}📋 Final Test Summary:${NC}"
    cat test-results/final-test-summary.txt
fi

# Show available services
echo -e "${YELLOW}🌐 Available Services:${NC}"
echo -e "${YELLOW}- Frontend: http://localhost:8080${NC}"
echo -e "${YELLOW}- Backend API: http://localhost:5001${NC}"
echo -e "${YELLOW}- Database: postgresql://localhost:5433/invoices_test${NC}"

# Clean up if requested
if [ "$1" = "--cleanup" ]; then
    echo -e "${YELLOW}🧹 Cleaning up containers...${NC}"
    docker compose -f docker-compose.app.yml down --volumes --remove-orphans
fi

echo -e "${BLUE}🎯 Optimized E2E Testing completed!${NC}"
echo -e "${GREEN}📈 Benefits: No container builds, faster execution, pre-installed browsers${NC}"
exit $E2E_EXIT_CODE