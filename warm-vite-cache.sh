#!/bin/bash
# Warm up Vite dependency cache by pre-loading all pages

echo "🔥 Warming up Vite cache..."

# Wait for Vite to start
sleep 5

# Load main pages to trigger dependency optimization
echo "Loading main page..."
curl -s http://localhost:3000/ > /dev/null

echo "Loading calendar page..."
curl -s http://localhost:3000/calendar > /dev/null

sleep 2

# Pre-load common dependencies
echo "Pre-loading dependencies..."
for dep in react react-dom_client react_jsx-dev-runtime antd @ant-design_v5-patch-for-react-19 react-router-dom @tanstack_react-query @tanstack_react-query-devtools; do
  curl -s "http://localhost:3000/node_modules/.vite/deps/${dep}.js" > /dev/null 2>&1
  echo "  ✓ $dep"
done

echo "✅ Vite cache warmed up!"
