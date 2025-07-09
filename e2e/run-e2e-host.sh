#!/bin/bash

# Host-Based Docker-First E2E Testing Script
# Tests run from host against Docker services - fastest approach

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Host-Based Docker-First E2E Testing${NC}"
echo -e "${BLUE}======================================${NC}"

# Step 1: Start only the essential services (no frontend/backend builds)
echo -e "${YELLOW}📦 Starting essential Docker services...${NC}"
docker compose -f docker-compose.services-only.yml up -d

# Step 2: Wait for services
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Step 3: Check that database is ready
echo -e "${YELLOW}🔍 Checking database connection...${NC}"
until docker exec invoice-db-test pg_isready -U invoiceuser -d invoices_test; do
  echo "Waiting for database..."
  sleep 2
done

# Step 4: Seed the database
echo -e "${YELLOW}🌱 Seeding test database...${NC}"
cd ../backend
DATABASE_URL="postgresql://invoiceuser:invoicepass@localhost:5433/invoices_test" npx prisma db push
DATABASE_URL="postgresql://invoiceuser:invoicepass@localhost:5433/invoices_test" npx prisma db seed
cd ../e2e

# Step 5: Start the application services locally
echo -e "${YELLOW}🚀 Starting backend locally...${NC}"
cd ../backend
NODE_ENV=test \
DATABASE_URL="postgresql://invoiceuser:invoicepass@localhost:5433/invoices_test" \
REDIS_URL="redis://localhost:6380" \
JWT_SECRET="test-jwt-secret-key-for-e2e-testing" \
PORT=5001 \
npm run start:dev &
BACKEND_PID=$!

echo -e "${YELLOW}🎨 Starting frontend locally...${NC}"
cd ../frontend
NODE_ENV=test \
VITE_API_URL="http://localhost:5001/api/v1" \
npm run dev -- --port 8080 --host 0.0.0.0 &
FRONTEND_PID=$!

# Step 6: Wait for apps to start
echo -e "${YELLOW}⏳ Waiting for applications to start...${NC}"
sleep 15

# Step 7: Run e2e tests from host
echo -e "${GREEN}🧪 Running e2e tests from host...${NC}"
cd ../e2e

# Set environment for host-based testing
export BASE_URL="http://localhost:8080"
export API_URL="http://localhost:5001/api/v1"
export DATABASE_URL="postgresql://invoiceuser:invoicepass@localhost:5433/invoices_test"
export HEADLESS=true
export NODE_ENV=test

# Run quick validation test first
echo -e "${YELLOW}🔬 Running quick validation tests...${NC}"
npx playwright test tests/quick-validation.test.ts --reporter=line

E2E_EXIT_CODE=$?

if [ $E2E_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Quick validation passed! Running full test suite...${NC}"
    npx playwright test --reporter=html
    E2E_EXIT_CODE=$?
else
    echo -e "${RED}❌ Quick validation failed!${NC}"
fi

# Step 8: Show results
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo -e "${BLUE}=====================${NC}"

if [ $E2E_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All e2e tests passed successfully!${NC}"
else
    echo -e "${RED}❌ Some e2e tests failed. Check the logs above.${NC}"
fi

# Step 9: Cleanup
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up processes...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    docker compose -f docker-compose.services-only.yml down
}

# Register cleanup function
trap cleanup EXIT

# Clean up if requested
if [ "$1" = "--cleanup" ]; then
    cleanup
fi

echo -e "${BLUE}🎯 Host-Based E2E Testing completed!${NC}"
echo -e "${GREEN}📈 Benefits: No container builds, instant startup, full host performance${NC}"
exit $E2E_EXIT_CODE