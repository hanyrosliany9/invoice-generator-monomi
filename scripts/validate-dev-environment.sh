#!/bin/bash
# Development Environment Validation Script
# This script ensures the development environment is properly set up

set -e

echo "🔍 Validating Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if containers are running
echo "📦 Checking Docker containers..."
if ! docker compose -f docker-compose.dev.yml ps | grep -q "Up"; then
    echo -e "${RED}❌ Containers are not running. Run: docker compose -f docker-compose.dev.yml up -d${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Containers are running${NC}"

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check backend health
echo "🏥 Checking backend health..."
if ! curl -s -f http://localhost:5000/api/v1/health > /dev/null; then
    echo -e "${RED}❌ Backend is not healthy${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend is healthy${NC}"

# Check frontend accessibility
echo "🌐 Checking frontend accessibility..."
if ! curl -s -f http://localhost:3000 > /dev/null; then
    echo -e "${RED}❌ Frontend is not accessible${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend is accessible${NC}"

# Check database data
echo "🗄️ Checking database data..."
USER_COUNT=$(docker compose -f docker-compose.dev.yml exec -T db psql -U invoiceuser -d invoices -t -c "SELECT COUNT(*) FROM users;" | tr -d ' \n')
QUOTATION_COUNT=$(docker compose -f docker-compose.dev.yml exec -T db psql -U invoiceuser -d invoices -t -c "SELECT COUNT(*) FROM quotations;" | tr -d ' \n')
INVOICE_COUNT=$(docker compose -f docker-compose.dev.yml exec -T db psql -U invoiceuser -d invoices -t -c "SELECT COUNT(*) FROM invoices;" | tr -d ' \n')

echo "📊 Data Summary:"
echo "   Users: $USER_COUNT"
echo "   Quotations: $QUOTATION_COUNT"
echo "   Invoices: $INVOICE_COUNT"

if [ "$USER_COUNT" -lt 2 ] || [ "$QUOTATION_COUNT" -lt 3 ] || [ "$INVOICE_COUNT" -lt 3 ]; then
    echo -e "${YELLOW}⚠️  Insufficient demo data detected. Running seeding...${NC}"
    docker compose -f docker-compose.dev.yml exec -T app sh -c "cd backend && npx prisma db seed"
    echo -e "${GREEN}✅ Database seeding completed${NC}"
else
    echo -e "${GREEN}✅ Database has sufficient demo data${NC}"
fi

# Test authentication
echo "🔐 Testing authentication..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@bisnis.co.id","password":"password123"}')

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✅ Authentication is working${NC}"
else
    echo -e "${RED}❌ Authentication failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Development environment is fully operational!${NC}"
echo ""
echo "🔗 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo "   API Documentation: http://localhost:5000/api/docs"
echo ""
echo "🔑 Login Credentials:"
echo "   Admin: admin@bisnis.co.id / password123"
echo "   User: user@bisnis.co.id / password123"