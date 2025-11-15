#!/bin/bash

# Export Seed Data Script
# This script exports current database data to create a seed backup

set -e

echo "========================================="
echo "📦 Exporting Database Seed Data"
echo "========================================="
echo ""

# Check if docker compose is running
if ! docker compose -f docker-compose.dev.yml ps db | grep -q "Up"; then
    echo "❌ Error: Database container is not running"
    echo "   Start it with: docker compose -f docker-compose.dev.yml up -d"
    exit 1
fi

echo "📊 Exporting data from database 'invoices'..."
echo ""

# Export data
docker compose -f docker-compose.dev.yml exec -T db sh -c "pg_dump -U invoiceuser -d invoices \
  --data-only \
  --column-inserts \
  --no-owner \
  --no-acl \
  --table=users \
  --table=clients \
  --table=projects \
  --table=quotations \
  --table=quotation_counters \
  --table=invoices \
  --table=invoice_counters \
  --table=payments \
  --table=chart_of_accounts \
  --table=journal_entries \
  --table=general_ledger \
  --table=expense_categories \
  --table=expenses \
  --table=assets \
  --table=company_settings \
  --table=social_media_reports \
  --table=report_sections \
  2>&1" > /tmp/full_seed_data.sql

# Check if export was successful
if [ $? -eq 0 ] && [ -s /tmp/full_seed_data.sql ]; then
    lines=$(wc -l < /tmp/full_seed_data.sql)
    records=$(grep -c "INSERT INTO" /tmp/full_seed_data.sql || echo "0")

    echo "✅ Export successful!"
    echo ""
    echo "📈 Statistics:"
    echo "   Total lines: $lines"
    echo "   Total records: $records"
    echo ""
    echo "📁 File location: /tmp/full_seed_data.sql"
    echo ""
    echo "📋 Records per table:"
    grep "INSERT INTO" /tmp/full_seed_data.sql | cut -d' ' -f3 | sort | uniq -c | sed 's/^/   /'
    echo ""
    echo "🔄 To update the seed backup, run:"
    echo "   cat /tmp/full_seed_data.sql > backend/prisma/seed-from-backup.sql"
    echo "   git add backend/prisma/seed-from-backup.sql"
    echo "   git commit -m 'chore: Update seed data'"
    echo ""
else
    echo "❌ Export failed!"
    echo "   Check the database connection and try again"
    exit 1
fi
