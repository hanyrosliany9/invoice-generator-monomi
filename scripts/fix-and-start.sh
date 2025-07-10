#!/bin/bash

# Monomi Finance - Fix and Start Development Environment
# Senior Developer Quality Script for Docker-First Development

set -e

echo "🔧 Monomi Finance - Production-Ready Development Startup"
echo "=================================================="

# Function to cleanup on exit
cleanup() {
    echo "🧹 Cleaning up containers..."
    docker compose -f docker-compose.dev.yml down 2>/dev/null || true
}

# Trap cleanup on script exit
trap cleanup EXIT

# Clear any existing containers
echo "🗑️ Stopping existing containers..."
docker compose -f docker-compose.dev.yml down 2>/dev/null || true

# Clean Docker cache for fresh build
echo "🧽 Cleaning Docker cache..."
docker system prune -f 2>/dev/null || true

# Remove old images for this project
echo "🗑️ Removing old project images..."
docker images | grep invoice | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

# Check Docker system status
echo "💿 Docker system status:"
docker system df

# Build and start services
echo "🏗️ Building and starting services..."
docker compose -f docker-compose.dev.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to initialize..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker compose -f docker-compose.dev.yml ps

# Check frontend logs for errors
echo "📋 Frontend startup logs:"
docker compose -f docker-compose.dev.yml logs app | tail -20

# Show URLs
echo ""
echo "✅ Development environment ready!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000"
echo "🐘 Database: localhost:5436"
echo ""
echo "🔍 To monitor logs: docker compose -f docker-compose.dev.yml logs -f app"
echo "🛑 To stop: docker compose -f docker-compose.dev.yml down"