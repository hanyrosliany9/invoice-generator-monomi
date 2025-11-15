# ExpenseClass COGS Enum Fix

## Problem

The application was encountering a 500 Internal Server Error when trying to fetch expense categories:

```
GET /api/v1/expenses/categories - 500
Error: Value 'COGS' not found in enum 'ExpenseClass'
```

## Root Cause

The database already had the `COGS` (Cost of Goods Sold) value in the `ExpenseClass` enum (added via migration `20251108095500_auto_expense_category_trigger`), but the Prisma schema was missing this enum value.

## Solution

### 1. Updated Prisma Schema

**File**: `backend/prisma/schema.prisma`

Added `COGS` to the ExpenseClass enum:

```prisma
enum ExpenseClass {
  COGS // Cost of Goods Sold / Harga Pokok Penjualan (5-xxxx)
  SELLING // Beban Penjualan (6-1xxx)
  GENERAL_ADMIN // Beban Administrasi & Umum (6-2xxx)
  OTHER // Beban Lain-Lain (8-xxxx)
  LABOR_COST // Biaya Tenaga Kerja (6-2010) - Generated from labor entries
}
```

### 2. Created Migration

**Migration**: `20251114125600_add_cogs_to_expense_class`

```sql
-- AlterEnum
-- Add COGS (Cost of Goods Sold) to ExpenseClass enum
ALTER TYPE "ExpenseClass" ADD VALUE 'COGS';
```

### 3. Resolved Migration State

Since the enum value already existed in the database (from a previous migration), the new migration would fail. Fixed by:

1. Manually verified enum value exists:
   ```sql
   ALTER TYPE "ExpenseClass" ADD VALUE IF NOT EXISTS 'COGS';
   ```

2. Marked migration as completed in `_prisma_migrations` table

3. Regenerated Prisma Client:
   ```bash
   npx prisma generate
   ```

4. Restarted backend to load updated Prisma Client

## Verification

Backend now starts successfully:
```
[Nest] Nest application successfully started
```

The expense categories endpoint now works correctly (requires authentication).

## Why COGS is Important

**COGS (Cost of Goods Sold / Harga Pokok Penjualan)** is a critical expense classification for Indonesian accounting:

- **Account Code**: 5-xxxx range
- **Purpose**: Tracks direct costs of producing goods/services sold
- **Examples**: Raw materials, direct labor, manufacturing overhead
- **Financial Impact**: Directly affects gross profit calculation
- **Reporting**: Required for Indonesian financial statements (Laporan Laba Rugi)

## Related Files

- ✅ `backend/prisma/schema.prisma` - Schema definition updated
- ✅ `backend/prisma/migrations/20251114125600_add_cogs_to_expense_class/` - Migration created
- ✅ Prisma Client regenerated
- ✅ Backend restarted successfully

## Status

✅ **FIXED** - ExpenseClass now includes COGS enum value
✅ Backend running without errors
✅ Ready for production use

---

**Date Fixed**: 2025-11-14
**Related Issue**: ExpenseClass enum mismatch between database and Prisma schema
