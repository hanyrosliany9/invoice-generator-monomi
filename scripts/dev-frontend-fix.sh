#!/bin/bash

# Development Frontend Fix Script
# Comprehensive solution for frontend development issues

echo "🚀 Invoice Generator - Frontend Development Fix"
echo "=============================================="

# Stop existing containers
echo "📦 Stopping existing containers..."
docker compose -f docker-compose.dev.yml down --volumes --remove-orphans

# Clean Docker cache
echo "🧹 Cleaning Docker cache..."
docker system prune -f
docker volume prune -f

# Clean local caches
echo "🧹 Cleaning local caches..."
rm -rf frontend/node_modules/.vite
rm -rf frontend/.vite
rm -rf frontend/dist
rm -rf backend/.tmp

# Rebuild containers with no cache
echo "🔨 Building containers (no cache)..."
docker compose -f docker-compose.dev.yml build --no-cache

# Start services
echo "🚀 Starting development services..."
docker compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
docker compose -f docker-compose.dev.yml ps

# Show logs
echo "📝 Showing startup logs..."
docker compose -f docker-compose.dev.yml logs --tail=50

echo ""
echo "✅ Development environment ready!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000"
echo "📊 Database: localhost:5436"
echo ""
echo "📋 To follow logs:"
echo "   docker compose -f docker-compose.dev.yml logs -f"
echo ""
echo "🛠️ To restart frontend only:"
echo "   docker compose -f docker-compose.dev.yml exec app sh -c 'cd /app/frontend && npm run dev'"