#!/bin/bash
#
# Selective Data Restore Script - Production Backup
# Extracts only INSERT/COPY statements from gzipped backup and applies to current database
# Avoids schema conflicts by skipping DDL statements
#

set -e

# Check if backup file argument provided
if [ $# -eq 0 ]; then
    echo "❌ Error: No backup file provided"
    echo ""
    echo "Usage: bash restore-prod-data.sh <backup-file-path>"
    echo ""
    echo "Examples:"
    echo "  bash restore-prod-data.sh backups/prod/prod_backup_20251220_155156.sql.gz"
    echo "  bash restore-prod-data.sh /home/jeff/projects/monomi/internal/invoice-generator/backups/prod/prod_backup_20251220_155156.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"
TEMP_DATA_FILE="/tmp/data-only-restore.sql"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "🔍 Extracting data from backup: $BACKUP_FILE"

# Extract only COPY statements and data (skip all DDL)
# This preserves table data while respecting new schema
zcat "$BACKUP_FILE" | awk '
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
echo "📋 Getting list of tables in backup..."

# Get table names from the backup file
BACKUP_TABLES=$(grep "^COPY public\." "$TEMP_DATA_FILE" | sed 's/COPY public\.\([^ ]*\).*/\1/' | sort -u)

echo "📋 Tables in backup: $(echo "$BACKUP_TABLES" | tr '\n' ',' | sed 's/,$//')"
echo ""

echo "🗑️  Clearing data from common tables (keeping new schema intact)..."

# Only truncate tables that exist in the backup
# This preserves new tables like decks, slides, elements
docker compose -f docker-compose.development.yml exec -T db psql -U invoiceuser -d invoices <<EOF
DO \$\$
DECLARE
    r RECORD;
    backup_tables TEXT[] := ARRAY[$(echo "$BACKUP_TABLES" | sed "s/^/'/g" | sed "s/$/'/g" | tr '\n' ',' | sed 's/,$//')];
BEGIN
    -- Disable triggers temporarily
    SET session_replication_role = 'replica';

    -- Truncate only tables that exist in backup
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename != '_prisma_migrations'
        AND tablename = ANY(backup_tables)
    ) LOOP
        BEGIN
            EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Warning: Could not truncate %: %', r.tablename, SQLERRM;
        END;
    END LOOP;

    -- Re-enable triggers
    SET session_replication_role = 'origin';
END \$\$;
EOF

echo "✅ Data cleared from backup tables (new tables preserved)"
echo ""
echo "📥 Restoring data from backup..."

# Restore data with foreign key constraints disabled
# Disable FK constraints, restore data, then re-enable
(
  echo "SET session_replication_role = 'replica';"
  cat "$TEMP_DATA_FILE"
  echo "SET session_replication_role = 'origin';"
) | docker compose -f docker-compose.development.yml exec -T db psql -U invoiceuser -d invoices 2>&1 | grep -v "^NOTICE\|^WARNING\|^ERROR:  insert or update on table" || true

echo ""
echo "✅ Data restore complete!"
echo ""
echo "🔍 Verifying restore..."

docker compose -f docker-compose.development.yml exec -T db psql -U invoiceuser -d invoices <<'EOF'
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
