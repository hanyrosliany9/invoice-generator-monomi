#!/bin/bash

# Invoice Generator Development Setup Script

set -e

echo "🚀 Setting up Invoice Generator development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install docker-compose."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please update with your configuration."
fi

# Create secrets directory and files if they don't exist
echo "🔐 Setting up secrets..."
mkdir -p secrets

if [ ! -f secrets/db_password.txt ]; then
    echo "devpassword" > secrets/db_password.txt
    echo "✅ Database password secret created (development only)"
fi

if [ ! -f secrets/jwt_secret.txt ]; then
    openssl rand -base64 32 > secrets/jwt_secret.txt
    echo "✅ JWT secret generated"
fi

if [ ! -f secrets/stripe_secret.txt ]; then
    echo "sk_test_your_stripe_secret_key_here" > secrets/stripe_secret.txt
    echo "✅ Stripe secret placeholder created"
fi

# Set proper permissions on secrets
chmod 600 secrets/*

# Create database initialization script
echo "🗄️ Setting up database initialization..."
cat > database/init/01-init.sql << 'EOF'
-- Invoice Generator Database Initialization

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Insert demo data for development
INSERT INTO users (email, password_hash, first_name, last_name, company_name) 
VALUES ('demo@example.com', '$2a$10$example_password_hash', 'Demo', 'User', 'Demo Company')
ON CONFLICT (email) DO NOTHING;

EOF

echo "✅ Database initialization script created"

# Pull required Docker images
echo "🐳 Pulling Docker images..."
docker-compose -f docker-compose.dev.yml pull

# Build the application
echo "🔨 Building application..."
docker-compose -f docker-compose.dev.yml build

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "To start the development environment:"
echo "  docker-compose -f docker-compose.dev.yml up"
echo ""
echo "Services will be available at:"
echo "  📱 Application: http://localhost:3000"
echo "  🗄️ Database: localhost:5432"
echo "  🚀 Redis: localhost:6379"
echo ""
echo "Don't forget to:"
echo "  1. Update your .env file with proper configuration"
echo "  2. Update secrets/stripe_secret.txt with your Stripe key"
echo "  3. Run 'docker system df' to check disk usage periodically"