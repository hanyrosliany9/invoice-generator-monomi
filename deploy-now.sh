#!/bin/bash

# Quick Deploy Script for Biznet Gio VPS
# VPS IP: 103.150.226.171

set -e

VPS_IP="103.150.226.171"
SSH_USER="root"
REMOTE_DIR="/opt/invoice-generator"

echo "======================================"
echo "🚀 Deploying to Biznet Gio VPS"
echo "======================================"
echo "VPS IP: $VPS_IP"
echo "Remote Directory: $REMOTE_DIR"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: docker-compose.prod.yml not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Test SSH connection
echo "🔌 Testing SSH connection to $VPS_IP..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_USER@$VPS_IP" exit 2>/dev/null; then
    echo "⚠️  Cannot connect via SSH key. You'll be prompted for password."
    echo ""
    read -p "Press Enter to continue or Ctrl+C to cancel..."
fi

# Create tarball
echo ""
echo "📦 Creating deployment package..."
tar -czf /tmp/invoice-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='postgres_*_data' \
    --exclude='redis_*_data' \
    .

echo "✅ Package created: $(du -h /tmp/invoice-deploy.tar.gz | cut -f1)"

# Transfer to VPS
echo ""
echo "📤 Transferring files to VPS..."
echo "Note: You may be prompted for your VPS password"
echo ""

scp /tmp/invoice-deploy.tar.gz "$SSH_USER@$VPS_IP:/tmp/"

echo "✅ Files transferred"

# Extract on VPS
echo ""
echo "📂 Extracting files on VPS..."

ssh "$SSH_USER@$VPS_IP" << 'ENDSSH'
    set -e

    echo "Creating directory..."
    mkdir -p /opt/invoice-generator

    echo "Extracting files..."
    cd /opt/invoice-generator
    tar -xzf /tmp/invoice-deploy.tar.gz

    echo "Setting permissions..."
    chmod +x scripts/*.sh
    chmod 600 .env.production 2>/dev/null || true

    echo "Cleaning up..."
    rm /tmp/invoice-deploy.tar.gz

    echo "✅ Files extracted successfully"
ENDSSH

# Clean up local tarball
rm /tmp/invoice-deploy.tar.gz

echo ""
echo "======================================"
echo "✅ Files Deployed to VPS!"
echo "======================================"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. SSH into your VPS:"
echo "   ssh $SSH_USER@$VPS_IP"
echo ""
echo "2. Navigate to application directory:"
echo "   cd $REMOTE_DIR"
echo ""
echo "3. Create environment file:"
echo "   cp .env.production.template .env.production"
echo "   nano .env.production"
echo ""
echo "   Generate secrets with:"
echo "   openssl rand -base64 32  # DB_PASSWORD"
echo "   openssl rand -base64 32  # REDIS_PASSWORD"
echo "   openssl rand -hex 32     # JWT_SECRET"
echo ""
echo "   Update these in .env.production:"
echo "   - DB_PASSWORD=<generated>"
echo "   - REDIS_PASSWORD=<generated>"
echo "   - JWT_SECRET=<generated>"
echo "   - FRONTEND_URL=http://$VPS_IP"
echo "   - CORS_ORIGIN=http://$VPS_IP"
echo ""
echo "4. Set permissions:"
echo "   chmod 600 .env.production"
echo ""
echo "5. Run deployment:"
echo "   ./scripts/deploy.sh"
echo ""
echo "6. Access your application:"
echo "   http://$VPS_IP"
echo ""
echo "======================================"
echo "📖 For detailed instructions, see:"
echo "   DEPLOY_TO_103.150.226.171.md"
echo "======================================"
