#!/bin/bash

# Start public access via VPS tunnel
# This script does everything needed to expose your local app

set -e

VPS_IP="103.150.226.171"

echo "======================================"
echo "🚀 Starting Public Access"
echo "======================================"
echo ""

# Check if local app is running
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "⚠️  Local application not detected on port 3000"
    echo ""
    read -p "Start local development server now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Starting local development server..."
        docker compose -f docker-compose.dev.yml up -d
        echo "⏳ Waiting for app to be ready..."
        sleep 10
    else
        echo "❌ Please start your app first: docker compose -f docker-compose.dev.yml up"
        exit 1
    fi
fi

echo "✅ Local app is running on port 3000"
echo ""

# Check if VPS is configured
echo "🔌 Testing VPS connection..."
if ! ssh -o ConnectTimeout=5 root@$VPS_IP "test -f /etc/nginx/sites-available/tunnel-proxy" 2>/dev/null; then
    echo "⚠️  VPS not configured yet"
    echo ""
    echo "Setting up VPS (you'll need root password)..."
    echo ""

    # Transfer setup script
    scp scripts/setup-vps-proxy.sh root@$VPS_IP:/tmp/

    # Run setup on VPS
    ssh root@$VPS_IP "bash /tmp/setup-vps-proxy.sh"

    echo ""
    echo "✅ VPS configured"
else
    echo "✅ VPS already configured"
fi

echo ""
echo "======================================"
echo "🌐 Your app is now PUBLIC!"
echo "======================================"
echo ""
echo "Access your app at:"
echo "  http://$VPS_IP"
echo ""
echo "Press Ctrl+C to stop public access"
echo "======================================"
echo ""

# Start tunnel
./scripts/tunnel-to-vps.sh
