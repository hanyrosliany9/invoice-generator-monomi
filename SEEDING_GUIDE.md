# Database Seeding Guide

## Overview

This project has TWO seeding approaches:

1. **TypeScript Seeder** (`backend/prisma/seed.ts`) - Programmatic seeding with TypeScript
2. **SQL Backup Seeder** (`backend/prisma/seed-from-backup.sql`) - SQL dump from real development data

## Quick Start - Reset Database with Real Data

```bash
# Method 1: Using SQL backup (FASTEST - contains real data)
docker compose -f docker-compose.dev.yml exec db psql -U invoiceuser -d invoices -f /app/backend/prisma/seed-from-backup.sql

# Method 2: Using TypeScript seeder (uses current seed.ts)
docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && npm run db:seed"

# Method 3: Complete reset (migrations + TypeScript seed)
docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && npm run db:reset"
```

## SQL Backup Seeder (Recommended)

### What's Included

The `seed-from-backup.sql` file contains **real data** from your development database:

- **8 Users** - All test users with proper roles and permissions
- **138 Chart of Accounts** - Complete Indonesian accounting structure
- **11 Expense Categories** - Real expense categories (COGS, Marketing, Admin, etc.)
- **10 Assets** - Camera equipment, lenses, computers, etc.
- **1 Client** - PT Maju Jaya Sentosa
- **1 Project** - Social Media Content Management
- **1 Quotation** - Approved quotation with counter
- **1 Invoice** - PAID invoice with journal entries
- **1 Payment** - Payment record linked to invoice
- **3 Journal Entries** - INVOICE_SENT and PAYMENT_RECEIVED
- **6 General Ledger** - Posted GL entries for revenue and AR

### When to Use

✅ **Use SQL backup when:**
- You want to start with realistic business data
- You're testing accounting features (Trial Balance, Income Statement, etc.)
- You want invoices that are already PAID with proper journal entries
- You need the exact state of the dev database

❌ **Don't use when:**
- You want a completely clean slate
- You need different test data structure

### How to Update the Backup

When you add new important data to your development database and want to include it in future seeds:

```bash
# 1. Export current database to SQL
./scripts/export-seed-data.sh

# This will create /tmp/full_seed_data.sql

# 2. Replace the backup file
cat /tmp/full_seed_data.sql > backend/prisma/seed-from-backup.sql

# 3. Commit the changes
git add backend/prisma/seed-from-backup.sql
git commit -m "chore: Update seed data with latest development database"
```

## TypeScript Seeder

### What's Included

The `backend/prisma/seed.ts` file programmatically creates:

- Users (legacy and RBAC test users)
- Chart of Accounts (Indonesian accounting structure)
- Expense Categories
- Fiscal Periods
- Sample clients, projects, quotations, invoices (basic demo data)

### When to Use

✅ **Use TypeScript seeder when:**
- You want to customize seed data programmatically
- You're developing new features that need specific test data
- You want to ensure consistent test data across environments

### How to Modify

Edit `backend/prisma/seed.ts` and run:

```bash
docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && npm run db:seed"
```

## Export Script

A convenience script is provided to export your current database:

```bash
./scripts/export-seed-data.sh
```

This creates `/tmp/full_seed_data.sql` with data from these tables:
- users
- clients
- projects
- quotations, quotation_counters
- invoices, invoice_counters
- payments
- chart_of_accounts
- journal_entries
- general_ledger
- expense_categories
- expenses
- assets
- company_settings

## Common Scenarios

### Scenario 1: Clean Development Start

```bash
# Reset everything and seed with TypeScript
docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && npm run db:reset"
```

### Scenario 2: Restore to Known Good State

```bash
# Reset migrations, then load SQL backup
docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && npx prisma migrate reset --force && psql -U invoiceuser -d invoices -f prisma/seed-from-backup.sql"
```

### Scenario 3: Update Seed Data After Adding New Features

```bash
# 1. Add your test data through the UI or API
# 2. Export the database
./scripts/export-seed-data.sh

# 3. Update the backup
cat /tmp/full_seed_data.sql > backend/prisma/seed-from-backup.sql

# 4. Commit
git add backend/prisma/seed-from-backup.sql
git commit -m "chore: Update seed data"
```

## Production Considerations

⚠️ **NEVER use seed data in production!**

The seed files contain:
- Test passwords (`password123`, `Test1234`)
- Demo data
- Insecure configurations

For production:
1. Use proper database migrations only
2. Create real users through proper signup
3. Never commit production credentials

## Troubleshooting

### Error: circular foreign-key constraints

```
pg_dump: warning: there are circular foreign-key constraints on this table
```

This is normal for chart_of_accounts (parent/child relationships). The SQL dump handles this correctly.

### Error: database "invoices" does not exist

Check your DATABASE_URL in `.env`:
```bash
docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && cat .env | grep DATABASE_URL"
```

Should be: `postgresql://invoiceuser:devpassword@db:5432/invoices`

### Seeding is slow

The TypeScript seeder can be slow for large datasets. Use the SQL backup instead:
```bash
docker compose -f docker-compose.dev.yml exec db psql -U invoiceuser -d invoices -f /app/backend/prisma/seed-from-backup.sql
```

## Files

- `backend/prisma/seed.ts` - TypeScript seeder (programmatic)
- `backend/prisma/seed-from-backup.sql` - SQL backup (real data)
- `backend/prisma/seed.ts.backup` - Backup of original seed.ts
- `scripts/export-seed-data.sh` - Export script
- `SEEDING_GUIDE.md` - This file
