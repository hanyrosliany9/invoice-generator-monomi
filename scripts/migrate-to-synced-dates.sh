#!/bin/bash
# Script to migrate all components to use synchronized date/time

set -e

FRONTEND_DIR="/home/jeff-pc/Project/invoice-generator-monomi/frontend/src"

echo "🔍 Starting date/time migration..."
echo "=================================="

# Files to process (excluding the dateTimeSync service itself and utils/date.ts)
FILES=$(grep -rl "new Date()" "$FRONTEND_DIR" \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude="dateTimeSync.ts" \
  --exclude="date.ts" \
  2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "✅ No files to migrate!"
  exit 0
fi

echo "📋 Files to process:"
echo "$FILES" | while read -r file; do
  echo "  - ${file#$FRONTEND_DIR/}"
done
echo ""

# Count total files
TOTAL=$(echo "$FILES" | wc -l)
CURRENT=0

echo "🔄 Processing $TOTAL files..."
echo ""

for file in $FILES; do
  CURRENT=$((CURRENT + 1))
  RELATIVE_PATH="${file#$FRONTEND_DIR/}"

  echo "[$CURRENT/$TOTAL] Processing: $RELATIVE_PATH"

  # Check if file already imports from utils/date
  if grep -q "from.*['\"].*utils/date['\"]" "$file" || grep -q "from.*['\"]@/utils/date['\"]" "$file"; then
    echo "  ℹ️  Already has date import, skipping..."
    continue
  fi

  # Count occurrences
  COUNT=$(grep -o "new Date()" "$file" | wc -l)

  if [ "$COUNT" -eq 0 ]; then
    echo "  ℹ️  No new Date() found, skipping..."
    continue
  fi

  echo "  📝 Found $COUNT occurrence(s) of new Date()"

  # Create backup
  cp "$file" "$file.backup"

  # Determine the correct import path based on file location
  FILE_DIR=$(dirname "$file")
  DEPTH=$(echo "$RELATIVE_PATH" | tr -cd '/' | wc -c)

  # Calculate relative path to utils
  if [ "$DEPTH" -eq 0 ]; then
    IMPORT_PATH="./utils/date"
  elif [ "$DEPTH" -eq 1 ]; then
    IMPORT_PATH="../utils/date"
  elif [ "$DEPTH" -eq 2 ]; then
    IMPORT_PATH="../../utils/date"
  else
    IMPORT_PATH="../../../utils/date"
  fi

  # Check if it's a TypeScript or TSX file to determine import style
  if [[ "$file" == *.tsx ]]; then
    # Add import after the last import statement
    if grep -q "^import" "$file"; then
      # Find last import line and add after it
      LAST_IMPORT_LINE=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
      sed -i "${LAST_IMPORT_LINE}a\\import { now } from '$IMPORT_PATH'" "$file"
    else
      # No imports, add at the beginning after any comments
      sed -i "1i\\import { now } from '$IMPORT_PATH'" "$file"
    fi
  else
    # Same for .ts files
    if grep -q "^import" "$file"; then
      LAST_IMPORT_LINE=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
      sed -i "${LAST_IMPORT_LINE}a\\import { now } from '$IMPORT_PATH'" "$file"
    else
      sed -i "1i\\import { now } from '$IMPORT_PATH'" "$file"
    fi
  fi

  # Replace new Date() with now()
  sed -i 's/new Date()/now()/g' "$file"

  echo "  ✅ Updated: Added import and replaced $COUNT occurrence(s)"
done

echo ""
echo "=================================="
echo "✅ Migration complete!"
echo ""
echo "📊 Summary:"
echo "  - Processed: $TOTAL files"
echo "  - Backups created: *.backup"
echo ""
echo "🧪 Next steps:"
echo "  1. Review changes: git diff frontend/src"
echo "  2. Test the app: docker compose -f docker-compose.dev.yml exec app sh -c 'cd frontend && npm run build'"
echo "  3. If all good, remove backups: find frontend/src -name '*.backup' -delete"
echo "  4. If issues, restore: find frontend/src -name '*.backup' -exec bash -c 'mv \"\$0\" \"\${0%.backup}\"' {} \;"
echo ""
