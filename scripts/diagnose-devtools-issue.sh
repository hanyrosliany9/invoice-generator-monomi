#!/bin/bash

# Diagnostic script for Chrome DevTools auto-opening issue
# This checks if the issue is in your code or caused by browser extensions

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Chrome DevTools Auto-Opening Diagnostic                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")/.." || exit 1

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}[1/6]${NC} Checking for debugger statements..."
if grep -r "debugger" frontend/src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules"; then
    echo -e "${RED}❌ Found debugger statements!${NC}"
    echo "   This could cause dev tools to open."
else
    echo -e "${GREEN}✅ No debugger statements found${NC}"
fi

echo ""
echo -e "${BLUE}[2/6]${NC} Checking for window.open in useEffect..."
if grep -r "useEffect.*window\.open\|window\.open.*useEffect" frontend/src/ --include="*.tsx" 2>/dev/null | grep -v "node_modules"; then
    echo -e "${RED}❌ Found window.open in useEffect!${NC}"
    echo "   This could cause infinite loops."
else
    echo -e "${GREEN}✅ No window.open in useEffect${NC}"
fi

echo ""
echo -e "${BLUE}[3/6]${NC} Checking Zustand devtools configuration..."
if grep -q "VITE_ENABLE_REDUX_DEVTOOLS === 'true'" frontend/src/store/builder.ts; then
    echo -e "${GREEN}✅ Zustand devtools is conditional (disabled by default)${NC}"
else
    echo -e "${YELLOW}⚠️  Zustand devtools might be always enabled${NC}"
fi

echo ""
echo -e "${BLUE}[4/6]${NC} Checking React StrictMode..."
if grep -q "AppWrapper.*Fragment.*StrictMode" frontend/src/main.tsx; then
    echo -e "${GREEN}✅ StrictMode is disabled in development${NC}"
else
    echo -e "${YELLOW}⚠️  StrictMode might be enabled (could cause double-renders)${NC}"
fi

echo ""
echo -e "${BLUE}[5/6]${NC} Checking for infinite redirect loops..."
REDIRECT_COUNT=$(grep -r "window\.location\.href\|navigate(" frontend/src/ --include="*.tsx" 2>/dev/null | wc -l)
if [ "$REDIRECT_COUNT" -gt 50 ]; then
    echo -e "${YELLOW}⚠️  Found ${REDIRECT_COUNT} navigation calls (check for loops)${NC}"
else
    echo -e "${GREEN}✅ Navigation calls look normal (${REDIRECT_COUNT} total)${NC}"
fi

echo ""
echo -e "${BLUE}[6/6]${NC} Checking container status..."
if docker compose -f docker-compose.dev.yml ps app 2>/dev/null | grep -q "Up"; then
    echo -e "${GREEN}✅ Development containers are running${NC}"

    # Check for errors in logs
    ERROR_COUNT=$(docker compose -f docker-compose.dev.yml logs app --tail=100 2>&1 | grep -i "error" | wc -l)
    if [ "$ERROR_COUNT" -gt 5 ]; then
        echo -e "${YELLOW}⚠️  Found ${ERROR_COUNT} errors in recent logs${NC}"
        echo "   Run: docker compose -f docker-compose.dev.yml logs app | grep -i error"
    else
        echo -e "${GREEN}✅ No significant errors in logs${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Development containers are not running${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}📊 DIAGNOSIS SUMMARY:${NC}"
echo ""

# Count issues
ISSUES=0

if grep -q "debugger" frontend/src/ --include="*.ts" --include="*.tsx" 2>/dev/null; then
    ISSUES=$((ISSUES + 1))
fi

if grep -q "useEffect.*window\.open\|window\.open.*useEffect" frontend/src/ --include="*.tsx" 2>/dev/null; then
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ NO CODE ISSUES FOUND${NC}"
    echo ""
    echo "The auto-opening dev tools issue is most likely caused by:"
    echo ""
    echo -e "${YELLOW}👉 Chrome Browser Extension${NC}"
    echo ""
    echo "Common culprits:"
    echo "  • Redux DevTools Extension"
    echo "  • React Developer Tools (old version)"
    echo "  • Other debugging extensions"
    echo ""
    echo -e "${BLUE}RECOMMENDED ACTIONS:${NC}"
    echo ""
    echo "1. Open Chrome and go to: chrome://extensions"
    echo "2. Disable these extensions:"
    echo "   - Redux DevTools"
    echo "   - React Developer Tools"
    echo "   - Any recently installed extensions"
    echo ""
    echo "3. OR test in incognito mode:"
    echo "   - Press Ctrl+Shift+N (Chrome)"
    echo "   - Navigate to http://localhost:3001"
    echo "   - If issue is gone → It's an extension"
    echo ""
    echo "4. For detailed guide, see:"
    echo "   CHROME_DEVTOOLS_FIX.md"
else
    echo -e "${RED}❌ FOUND ${ISSUES} POTENTIAL CODE ISSUES${NC}"
    echo ""
    echo "Review the checks above and fix any issues."
    echo ""
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
