#!/bin/bash

# Development startup script for Indonesian Business Management System

echo "🚀 Starting Indonesian Business Management System - Development"
echo "================================================"

# Build and start containers
echo "📦 Building Docker containers..."
docker compose -f docker-compose.dev.yml build

echo "🛠️ Starting services..."
docker compose -f docker-compose.dev.yml up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🗄️ Setting up database..."
docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && npx prisma db push"
docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && npx prisma generate"

# Start development servers
echo "🎯 Starting development servers..."
docker compose -f docker-compose.dev.yml exec -d app sh -c "cd backend && npm run start:dev"
docker compose -f docker-compose.dev.yml exec -d app sh -c "cd frontend && npm run dev -- --host 0.0.0.0"

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🚀 Backend API: http://localhost:5000"
echo "📚 API Docs: http://localhost:5000/api/docs"
echo "🗄️ Database: localhost:5432"
echo "📁 Redis: localhost:6379"
echo ""
echo "🔍 View logs:"
echo "  docker compose -f docker-compose.dev.yml logs -f"
echo ""
echo "🛑 Stop all services:"
echo "  docker compose -f docker-compose.dev.yml down"