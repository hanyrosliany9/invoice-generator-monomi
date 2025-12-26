# Production Database Auto-Restore Guide

## Overview
The production Docker environment is now configured to automatically restore the latest backup when the database container is rebuilt with a fresh volume.

## How It Works

### Automatic Restore Process
1. When you rebuild the production database with a **fresh volume** (no existing data)
2. PostgreSQL's `docker-entrypoint-initdb.d` mechanism runs init scripts
3. The `restore-latest-backup.sh` script automatically:
   - Searches for the latest `backup_prod_*.sql` file in `/backup` directory
   - Restores it to the database
   - If no backup found, allows normal Prisma migration initialization

### Important Notes
- **Only runs on FRESH database initialization** (when `/var/lib/postgresql/data` is empty)
- **Does NOT run on container restart** (data persists in named volume)
- **Does NOT run if database already has data** (volume exists)

## When Auto-Restore Triggers

### ✅ Will Auto-Restore (Fresh Database)
```bash
# Complete teardown and rebuild
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d

# Remove volume and rebuild
docker volume rm invoice-prod_postgres_prod_data
docker compose -f docker-compose.prod.yml up -d

# Using management script
./scripts/manage-prod.sh rebuild --fresh
```

### ❌ Will NOT Auto-Restore (Existing Database)
```bash
# Simple restart (volume persists)
docker compose -f docker-compose.prod.yml restart

# Stop and start (volume persists)
docker compose -f docker-compose.prod.yml stop
docker compose -f docker-compose.prod.yml start

# Rebuild without volume removal (data persists)
docker compose -f docker-compose.prod.yml up -d --build
```

## Manual Backup and Restore

### Create Manual Backup
```bash
# Using management script (recommended)
./scripts/manage-prod.sh backup

# Direct command
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U invoiceuser -d invoices --clean --if-exists \
  > backup/backup_prod_$(date +%Y%m%d_%H%M%S).sql
```

### Manual Restore (Without Rebuild)
```bash
# Restore specific backup to running database
cat backup/backup_prod_20251119_175727.sql | \
  docker compose -f docker-compose.prod.yml exec -T db \
  psql -U invoiceuser -d invoices

# Restore latest backup
LATEST=$(ls -t backup/backup_prod_*.sql | head -1)
cat "$LATEST" | \
  docker compose -f docker-compose.prod.yml exec -T db \
  psql -U invoiceuser -d invoices
```

## Configuration Details

### Docker Compose Setup
**File:** `docker-compose.prod.yml`
```yaml
db:
  volumes:
    - postgres_prod_data:/var/lib/postgresql/data
    - ./database/init:/docker-entrypoint-initdb.d:ro
    - ./backup:/backup:rw
```

### Init Script Location
**File:** `database/init/restore-latest-backup.sh`
- Automatically executed by PostgreSQL on fresh initialization
- Executable permission: `755` (required)
- Searches for: `backup/backup_prod_*.sql` files
- Selects: Most recent file by timestamp

## Testing the Auto-Restore

### Test Procedure
```bash
# 1. Create a fresh backup
./scripts/manage-prod.sh backup

# 2. Completely remove database
docker compose -f docker-compose.prod.yml down -v

# 3. Start fresh (will auto-restore)
docker compose -f docker-compose.prod.yml up -d

# 4. Monitor logs to see restore
docker compose -f docker-compose.prod.yml logs db
```

### Expected Log Output
```
==========================================
Database Init: Checking for backups to restore
==========================================
Found latest backup: /backup/backup_prod_20251119_175727.sql
Backup size: 377K
Backup date: 2025-11-19 17:57:27

==========================================
Restoring backup to database: invoices
==========================================
[... PostgreSQL restore output ...]

==========================================
✓ Backup restored successfully!
==========================================
Database 'invoices' has been restored from:
  /backup/backup_prod_20251119_175727.sql
```

## Backup Strategy

### Automated Backups
The `backup` service in docker-compose creates daily backups:
```yaml
backup:
  command: |
    sh -c "
      while true; do
        pg_dump -h db -U invoiceuser -d invoices > /backup/backup_$(date +%Y%m%d_%H%M%S).sql
        sleep 86400
      done
    "
```

### Backup Retention
- Backups accumulate in `backup/` directory
- No automatic cleanup (manual management required)
- Recommendation: Keep last 7 days, monthly archives

### Backup Naming Convention
```
backup_prod_YYYYMMDD_HHMMSS.sql
Example: backup_prod_20251119_175727.sql
```

## Troubleshooting

### Restore Script Not Running
**Problem:** Database initializes without restore
**Solutions:**
1. Check volume is truly empty: `docker volume ls`
2. Verify script exists: `ls -l database/init/restore-latest-backup.sh`
3. Check execute permission: `chmod +x database/init/restore-latest-backup.sh`
4. Verify backup files exist: `ls -lh backup/backup_prod_*.sql`

### No Backups Found
**Problem:** Script reports "No production backup found"
**Solutions:**
1. Create a backup first: `./scripts/manage-prod.sh backup`
2. Check backup directory mounted: `docker compose -f docker-compose.prod.yml exec db ls /backup`
3. Verify file naming matches: `backup_prod_*.sql` pattern

### Restore Fails
**Problem:** Restore script exits with error
**Solutions:**
1. Check database logs: `docker compose -f docker-compose.prod.yml logs db`
2. Verify backup file integrity: Check file size is not 0 bytes
3. Test manual restore to identify SQL errors
4. Check PostgreSQL version compatibility

## Production Workflow

### Standard Deployment with Restore
```bash
# 1. Backup current production data
./scripts/manage-prod.sh backup

# 2. Stop production
docker compose -f docker-compose.prod.yml down

# 3. Pull latest code
git pull origin master

# 4. Rebuild (keeps volume = keeps data)
docker compose -f docker-compose.prod.yml up -d --build

# Database will NOT restore (volume exists)
```

### Fresh Installation with Restore
```bash
# 1. Ensure backup exists
ls -lh backup/backup_prod_*.sql

# 2. Complete teardown
docker compose -f docker-compose.prod.yml down -v

# 3. Fresh start (auto-restores latest backup)
docker compose -f docker-compose.prod.yml up -d

# 4. Verify restore
docker compose -f docker-compose.prod.yml logs db | grep "Backup restored"
```

## Security Considerations

### Backup Permissions
- Backup directory: `backup/` (mode 777 for container write access)
- Backup files: Contain sensitive data, protect access
- Production backups: Should be encrypted for long-term storage

### Database Credentials
- Stored in `.env` file (not committed to git)
- Use strong passwords for production
- Rotate credentials periodically

## Related Files
- `docker-compose.prod.yml` - Production compose configuration
- `database/init/restore-latest-backup.sh` - Auto-restore script
- `backup/` - Backup storage directory
- `scripts/manage-prod.sh` - Production management commands
- `.env` - Production secrets (DB_PASSWORD, etc.)

## Quick Reference

| Action | Command |
|--------|---------|
| Create backup | `./scripts/manage-prod.sh backup` |
| Fresh rebuild with restore | `docker compose -f docker-compose.prod.yml down -v && docker compose -f docker-compose.prod.yml up -d` |
| View restore logs | `docker compose -f docker-compose.prod.yml logs db` |
| Manual restore | `cat backup/backup_prod_YYYYMMDD_HHMMSS.sql \| docker compose -f docker-compose.prod.yml exec -T db psql -U invoiceuser -d invoices` |
| List backups | `ls -lth backup/backup_prod_*.sql` |
| Check if auto-restore triggered | `docker compose -f docker-compose.prod.yml logs db \| grep "Backup restored"` |

---

**Last Updated:** 2025-11-19
**Docker Compose Version:** 2.x (using `docker compose` not `docker-compose`)
