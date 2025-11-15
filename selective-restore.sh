#!/bin/bash
#
# Selective Data Restore Script
# Extracts only INSERT/COPY statements from backup and applies to current database
# Avoids schema conflicts by skipping DDL statements
#

set -e

BACKUP_FILE="backups/dev-backup-20251110-002928.sql"
TEMP_DATA_FILE="/tmp/data-only-restore.sql"

echo "🔍 Extracting data from backup: $BACKUP_FILE"

# Extract only COPY statements and data (skip all DDL)
# This preserves table data while respecting new schema
cat "$BACKUP_FILE" | awk '
BEGIN { in_copy = 0; in_data = 0; }

# Start of COPY block
/^COPY public\./ {
    in_copy = 1;
    in_data = 1;
    print;
    next;
}

# End of data block
/^\\.$/ {
    if (in_data) {
        print;
        in_data = 0;
    }
    next;
}

# Print data rows
in_data {
    print;
}

# Handle SELECT setval for sequences
/^SELECT pg_catalog\.setval/ {
    print;
}
' > "$TEMP_DATA_FILE"

echo "✅ Data extracted to: $TEMP_DATA_FILE"
echo ""
echo "📊 Data summary:"
grep "^COPY public\." "$TEMP_DATA_FILE" | wc -l | xargs echo "  - Tables with data:"
echo ""
echo "⚠️  WARNING: This will overwrite existing data in the database!"
echo ""
read -p "Do you want to proceed with restore? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

echo ""
echo "🗑️  Clearing existing data (keeping schema)..."

# Truncate all tables except _prisma_migrations
docker compose -f docker-compose.dev.yml exec -T db psql -U invoiceuser -d invoices <<'EOF'
DO \$\$
DECLARE
    r RECORD;
BEGIN
    -- Disable triggers temporarily
    SET session_replication_role = 'replica';

    -- Truncate all tables except migrations
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename != '_prisma_migrations'
    ) LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;

    -- Re-enable triggers
    SET session_replication_role = 'origin';
END \$\$;
EOF

echo "✅ Tables truncated (schema preserved)"
echo ""
echo "📥 Restoring data from backup..."

# Restore data
cat "$TEMP_DATA_FILE" | docker compose -f docker-compose.dev.yml exec -T db psql -U invoiceuser -d invoices

echo ""
echo "✅ Data restore complete!"
echo ""
echo "🔍 Verifying restore..."

docker compose -f docker-compose.dev.yml exec -T db psql -U invoiceuser -d invoices <<'EOF'
SELECT
    schemaname,
    tablename,
    (
        SELECT COUNT(*)
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = schemaname
        AND c.relname = tablename
    ) as row_count
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN ('_prisma_migrations')
ORDER BY tablename;
EOF

echo ""
echo "✅ Restore verification complete!"
echo ""
echo "📁 Temporary file: $TEMP_DATA_FILE (you can delete this)"
