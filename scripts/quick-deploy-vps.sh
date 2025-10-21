#!/bin/bash

# Quick VPS Deployment Script
# Run this on your LOCAL machine to deploy to Biznet Gio VPS

set -e

echo "======================================"
echo "🚀 Quick Deploy to Biznet Gio VPS"
echo "======================================"
echo ""

# Check if VPS IP is provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/quick-deploy-vps.sh VPS_IP [SSH_USER]"
    echo ""
    echo "Example:"
    echo "  ./scripts/quick-deploy-vps.sh 103.xxx.xxx.xxx"
    echo "  ./scripts/quick-deploy-vps.sh 103.xxx.xxx.xxx root"
    echo ""
    exit 1
fi

VPS_IP=$1
SSH_USER=${2:-root}
REMOTE_DIR="/opt/invoice-generator"

echo "📍 Target VPS: $VPS_IP"
echo "👤 SSH User: $SSH_USER"
echo "📁 Remote Directory: $REMOTE_DIR"
echo ""

# Test SSH connection
echo "🔌 Testing SSH connection..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes "$SSH_USER@$VPS_IP" exit 2>/dev/null; then
    echo "✅ SSH connection successful"
else
    echo "❌ Cannot connect to VPS. Please check:"
    echo "   - VPS IP address is correct"
    echo "   - SSH is running on the VPS"
    echo "   - Firewall allows SSH (port 22)"
    echo "   - SSH credentials are correct"
    exit 1
fi
echo ""

# Create tarball
echo "📦 Creating deployment package..."
tar -czf /tmp/invoice-generator-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='postgres_*_data' \
    --exclude='redis_*_data' \
    .

echo "✅ Package created ($(du -h /tmp/invoice-generator-deploy.tar.gz | cut -f1))"
echo ""

# Transfer to VPS
echo "📤 Transferring files to VPS..."
scp /tmp/invoice-generator-deploy.tar.gz "$SSH_USER@$VPS_IP:/tmp/"
echo "✅ Files transferred"
echo ""

# Extract on VPS
echo "📂 Extracting files on VPS..."
ssh "$SSH_USER@$VPS_IP" << 'ENDSSH'
    mkdir -p /opt/invoice-generator
    cd /opt/invoice-generator
    tar -xzf /tmp/invoice-generator-deploy.tar.gz
    rm /tmp/invoice-generator-deploy.tar.gz
    chmod +x scripts/*.sh
    echo "✅ Files extracted"
ENDSSH
echo ""

# Clean up local tarball
rm /tmp/invoice-generator-deploy.tar.gz

echo "======================================"
echo "✅ Deployment Package Transferred!"
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
echo "   nano .env.production"
echo "   (See BIZNET_GIO_DEPLOYMENT_GUIDE.md for template)"
echo ""
echo "4. Run deployment:"
echo "   ./scripts/deploy.sh"
echo ""
echo "5. Access your application:"
echo "   http://$VPS_IP"
echo ""
echo "======================================"
echo "📖 For detailed instructions, see:"
echo "   BIZNET_GIO_DEPLOYMENT_GUIDE.md"
echo "======================================"
