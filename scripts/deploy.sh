#!/bin/bash

# Production deployment script for Indonesian Business Management System

set -e

echo "🚀 Starting production deployment..."
echo "================================================"

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | xargs)
fi

# Check required environment variables
REQUIRED_VARS=(
    "DB_PASSWORD"
    "JWT_SECRET"
    "SMTP_HOST"
    "SMTP_PORT"
    "SMTP_USER"
    "SMTP_PASSWORD"
    "FROM_EMAIL"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: Environment variable $var is not set"
        exit 1
    fi
done

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads storage logs backup ssl nginx/conf.d

# Set permissions
echo "🔐 Setting permissions..."
chmod 755 uploads storage logs backup
chmod 600 .env.production

# Check Docker and Docker Compose
echo "🐳 Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

# Pull latest images
echo "📦 Pulling Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Build and start production services
echo "🏗️ Building and starting production services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
RETRIES=0
MAX_RETRIES=30

while [ $RETRIES -lt $MAX_RETRIES ]; do
    if docker-compose -f docker-compose.prod.yml exec app curl -f http://localhost:5000/health > /dev/null 2>&1; then
        echo "✅ Application is healthy"
        break
    fi
    
    echo "Waiting for application to be ready... (attempt $((RETRIES + 1))/$MAX_RETRIES)"
    sleep 10
    RETRIES=$((RETRIES + 1))
done

if [ $RETRIES -eq $MAX_RETRIES ]; then
    echo "❌ Application failed to start within expected time"
    echo "📋 Container logs:"
    docker-compose -f docker-compose.prod.yml logs app
    exit 1
fi

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.prod.yml exec app sh -c "cd backend && npx prisma db push"

# Run database seeding (optional)
read -p "🌱 Do you want to seed the database with sample data? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."
    docker-compose -f docker-compose.prod.yml exec app sh -c "cd backend && npm run db:seed"
fi

# Show deployment status
echo ""
echo "✅ Production deployment completed successfully!"
echo ""
echo "🌐 Service URLs:"
echo "   - Application: https://your-domain.com"
echo "   - Health Check: https://your-domain.com/health"
echo "   - API Documentation: https://your-domain.com/api/docs"
echo ""
echo "📊 Container Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "📋 Useful Commands:"
echo "   - View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   - Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "   - Stop services: docker-compose -f docker-compose.prod.yml down"
echo "   - Database backup: docker-compose -f docker-compose.prod.yml exec backup sh -c 'pg_dump -h db -U invoiceuser invoices > /backup/manual_backup_\$(date +%Y%m%d_%H%M%S).sql'"
echo ""
echo "🎉 Indonesian Business Management System is now live!"