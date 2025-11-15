#!/bin/bash

# Fix Accounting Synchronization Issues
# This script backfills missing journal entries to sync:
# - Laporan Piutang (AR Report)
# - Laporan Laba Rugi (Income Statement)

set -e

echo "🔧 Invoice Generator - Accounting Sync Fix"
echo "=========================================="
echo ""

# Check if jq is installed for JSON parsing
if ! command -v jq &> /dev/null; then
    echo "⚠️  Warning: jq not installed. Output will not be formatted."
    echo "   Install with: sudo apt-get install jq"
    USE_JQ=false
else
    USE_JQ=true
fi

# Get credentials
echo "Please enter your admin credentials:"
read -p "Email: " EMAIL
read -sp "Password: " PASSWORD
echo ""
echo ""

# Login to get JWT token
echo "🔑 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Extract token
if [ "$USE_JQ" = true ]; then
    TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken // empty')
else
    TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
    echo "❌ Login failed. Please check your credentials."
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Login successful"
echo ""

# Run backfill
echo "🔄 Running accounting data backfill..."
echo "This will:"
echo "  1. Find all SENT/OVERDUE/PAID invoices without journal entries"
echo "  2. Create and post missing SENT journal entries"
echo "  3. Post any unposted journal entries to General Ledger"
echo ""

BACKFILL_RESPONSE=$(curl -s -X POST http://localhost:5000/api/accounting/admin/backfill-invoice-journals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo ""
echo "📊 Backfill Results:"
echo "===================="

if [ "$USE_JQ" = true ]; then
    echo $BACKFILL_RESPONSE | jq '.'

    FIXED=$(echo $BACKFILL_RESPONSE | jq -r '.fixed // 0')
    POSTED=$(echo $BACKFILL_RESPONSE | jq -r '.posted // 0')
    ERRORS=$(echo $BACKFILL_RESPONSE | jq -r '.errors | length')

    echo ""
    echo "✅ Summary:"
    echo "  - Invoices fixed: $FIXED"
    echo "  - Journal entries posted: $POSTED"
    echo "  - Errors: $ERRORS"

    if [ "$ERRORS" -gt 0 ]; then
        echo ""
        echo "⚠️  Some errors occurred. Check the details above."
    fi
else
    echo $BACKFILL_RESPONSE
fi

echo ""
echo "✅ Accounting sync fix complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Check Laporan Piutang (AR Report) - should show all 3 invoices"
echo "  2. Check Laporan Laba Rugi (Income Statement) - should show revenue"
echo "  3. Verify General Ledger for account 1-2010 (AR)"
echo "  4. Verify General Ledger for account 4-1010 (Revenue)"
echo ""
