#!/bin/bash

set -e

echo "🚀 Starting Monomi Invoice Generator Development Environment"
echo "================================================="

# Function to handle errors
handle_error() {
    echo "❌ Error occurred in script at line: $1"
    echo "🧹 Cleaning up..."
    docker compose -f docker-compose.dev.yml down
    exit 1
}

# Set error trap
trap 'handle_error $LINENO' ERR

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

echo "📋 Stopping any existing containers..."
docker compose -f docker-compose.dev.yml down

echo "🧹 Cleaning up Docker resources..."
docker system prune -f

echo "🔧 Building containers..."
docker compose -f docker-compose.dev.yml build --no-cache

echo "📦 Starting database and Redis..."
docker compose -f docker-compose.dev.yml up -d db redis

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "📊 Checking database health..."
docker compose -f docker-compose.dev.yml exec -T db pg_isready -U invoiceuser -d invoices

echo "🗄️ Setting up database schema..."
docker compose -f docker-compose.dev.yml exec -T app sh -c "cd /app/backend && npm run db:push"

echo "🌱 Generating Prisma client..."
docker compose -f docker-compose.dev.yml exec -T app sh -c "cd /app/backend && npm run db:generate"

echo "🚀 Starting full application..."
docker compose -f docker-compose.dev.yml up

echo "✅ Development environment started successfully!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:5000"
echo "📚 API Docs: http://localhost:5000/api/docs"
echo "🏥 Health Check: http://localhost:5000/api/v1/health"