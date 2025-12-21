#!/bin/bash
set -e

echo "🧹 Stopping any existing Node processes..."
pkill -f "npm run start:dev" || true
pkill -f "npm run dev" || true
sleep 2

echo "🧹 Clearing Vite and npm caches..."
rm -rf frontend/node_modules/.vite 2>/dev/null || true
rm -rf /tmp/.vite 2>/dev/null || true
rm -rf frontend/dist 2>/dev/null || true
rm -rf /tmp/.npm 2>/dev/null || true

echo "✅ Cache cleared"
echo ""
echo "📋 Environment check:"
echo "VITE_WS_URL=$(grep VITE_WS_URL .env.development)"
echo ""
echo "🚀 Ready to start dev servers!"
echo ""
echo "Run in Terminal 1:"
echo "  cd backend && npm run start:dev"
echo ""
echo "Run in Terminal 2:"
echo "  cd frontend && npm run dev"
echo ""
echo "Then visit: http://localhost:3000"
echo "Check console for: 'Connected to collaboration server'"
