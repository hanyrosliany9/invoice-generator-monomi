#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "======================================"
echo "Deploying Media Worker to Cloudflare"
echo "======================================"
echo ""

# Check if wrangler is installed
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Please install Node.js"
    exit 1
fi

# Upgrade Node.js version check
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Error: Node.js v20+ required (current: v$(node -v))"
    echo ""
    echo "Please upgrade Node.js:"
    echo "  nvm install 20"
    echo "  nvm use 20"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Deploy worker
echo "Deploying worker..."
npx wrangler deploy

echo ""
echo "======================================"
echo "✅ Worker Deployed Successfully!"
echo "======================================"
echo ""
echo "Worker URL: https://media.monomiagency.com"
echo ""
echo "Next steps:"
echo "1. Test media loading on public share page"
echo "2. Check Worker logs: npx wrangler tail"
echo "3. Verify token validation in browser DevTools"
