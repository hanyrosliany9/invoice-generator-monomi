# Environment Management Guide

**Last Updated:** 2025-11-08
**Status:** ✅ Production Ready

## Overview

This project supports **simultaneous development and production environments** with complete isolation:
- Separate Docker networks
- Separate volumes (no data conflicts)
- Non-overlapping ports
- Independent project names

## Quick Start

```bash
# Show status of all environments
./scripts/manage.sh status

# Start development
./scripts/manage-dev.sh start

# Start production
./scripts/manage-prod.sh start

# Check for conflicts
./scripts/check-conflicts.sh
```

## Architecture

### Development Environment (`invoice-dev`)
- **Project Name:** `invoice-dev`
- **Network:** `invoice-network-dev`
- **Containers:** 3 (app, db, redis)
- **Ports:**
  - `3001` → Frontend (with HMR)
  - `5000` → Backend API
  - `5436` → PostgreSQL
  - `6383` → Redis
  - `9229` → Node.js debugger

### Production Environment (`invoice-prod`)
- **Project Name:** `invoice-prod`
- **Network:** `invoice-prod_invoice-network`
- **Containers:** 7 (app, frontend, db, redis, nginx, cloudflared, backup)
- **Ports:**
  - `80` → Nginx (reverse proxy)
  - `3000` → Frontend (production build)
  - Internal: backend, db, redis (not exposed)

## Management Scripts

### Unified Management (`./scripts/manage.sh`)

```bash
# Status commands
./scripts/manage.sh status          # All environments
./scripts/manage.sh dev status      # Dev only
./scripts/manage.sh prod status     # Prod only

# Control both environments
./scripts/manage.sh both start      # Start both
./scripts/manage.sh both stop       # Stop both
```

### Development (`./scripts/manage-dev.sh`)

```bash
# Lifecycle
./scripts/manage-dev.sh start       # Start dev environment
./scripts/manage-dev.sh stop        # Stop dev environment
./scripts/manage-dev.sh restart     # Restart dev environment
./scripts/manage-dev.sh rebuild     # Full rebuild (no cache)

# Monitoring
./scripts/manage-dev.sh logs        # Show logs
./scripts/manage-dev.sh logs -f     # Follow logs
./scripts/manage-dev.sh status      # Container status

# Interactive
./scripts/manage-dev.sh shell       # Open shell in app container
./scripts/manage-dev.sh db-shell    # Open PostgreSQL shell
./scripts/manage-dev.sh redis-cli   # Open Redis CLI

# Cleanup
./scripts/manage-dev.sh clean       # Remove containers, networks, volumes
```

### Production (`./scripts/manage-prod.sh`)

```bash
# Lifecycle (with safety prompts)
./scripts/manage-prod.sh start      # Start prod environment
./scripts/manage-prod.sh stop       # Stop prod environment (with prompt)
./scripts/manage-prod.sh restart    # Restart prod environment (with prompt)
./scripts/manage-prod.sh rebuild    # Full rebuild (with prompt)

# Monitoring
./scripts/manage-prod.sh logs -f app    # Follow app logs
./scripts/manage-prod.sh status         # Container status
./scripts/manage-prod.sh health         # Health check status

# Maintenance
./scripts/manage-prod.sh backup         # Create database backup
./scripts/manage-prod.sh shell          # Open shell in app container
./scripts/manage-prod.sh db-shell       # Open PostgreSQL shell

# Cleanup
./scripts/manage-prod.sh clean      # Remove containers (preserves volumes)
```

### Conflict Checker (`./scripts/check-conflicts.sh`)

Validates environment isolation:
```bash
./scripts/check-conflicts.sh
```

Checks:
1. ✅ Project names are different
2. ✅ No port conflicts
3. ✅ Networks are isolated
4. ✅ No running container conflicts
5. ✅ Volumes are properly namespaced

## Direct Docker Compose Usage

Both compose files have `name:` field set for automatic isolation.

### Development

```bash
# Simple commands (uses name: invoice-dev from compose file)
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml logs -f

# Explicit project name (extra safety)
docker compose -p invoice-dev -f docker-compose.dev.yml up -d
```

### Production

```bash
# Simple commands (uses name: invoice-prod from compose file)
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml logs -f app

# Explicit project name (extra safety)
docker compose -p invoice-prod -f docker-compose.prod.yml up -d
```

## Access URLs

### Development
- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:5000
- **API Docs:** http://localhost:5000/api/docs
- **Health Check:** http://localhost:5000/api/v1/health

### Production
- **Main Site:** http://localhost (via Nginx)
- **Frontend Direct:** http://localhost:3000
- **Health Check:** http://localhost/health

## Common Workflows

### Start Both Environments

```bash
./scripts/manage.sh both start

# Or separately:
./scripts/manage-dev.sh start
./scripts/manage-prod.sh start
```

### Development Workflow

```bash
# Start dev environment
./scripts/manage-dev.sh start

# Follow logs
./scripts/manage-dev.sh logs -f

# Make code changes (hot-reload active)
# ...

# Access shell if needed
./scripts/manage-dev.sh shell

# Stop when done
./scripts/manage-dev.sh stop
```

### Production Deployment

```bash
# Rebuild production images
./scripts/manage-prod.sh rebuild

# Check health
./scripts/manage-prod.sh health

# Create backup before changes
./scripts/manage-prod.sh backup

# View logs
./scripts/manage-prod.sh logs -f app
```

### Troubleshooting

```bash
# Check for conflicts
./scripts/check-conflicts.sh

# View all containers
./scripts/manage.sh status

# Check individual environment
./scripts/manage-dev.sh status
./scripts/manage-prod.sh status

# Inspect logs
./scripts/manage-dev.sh logs
./scripts/manage-prod.sh logs -f nginx
```

## Important Notes

### ✅ DO
- Use management scripts for ease of use
- Run conflict checker after major changes
- Create backups before production changes
- Use `logs -f` to monitor startup issues
- Check health status in production

### ❌ DON'T
- **Don't** use the same project name for both environments
- **Don't** modify `name:` fields in compose files
- **Don't** expose production databases to host ports
- **Don't** skip safety prompts in production scripts
- **Don't** run `docker compose` without specifying `-f` file

## Migration from Old Setup

If you have containers from before this setup:

```bash
# Stop old containers
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.prod.yml down

# Remove orphan containers
docker ps -a | grep invoice | awk '{print $1}' | xargs docker rm -f

# Start with new setup
./scripts/manage-dev.sh start
./scripts/manage-prod.sh start

# Verify isolation
./scripts/check-conflicts.sh
```

## Technical Details

### Project Names
- Set via `name:` field in compose files
- Dev: `invoice-dev`
- Prod: `invoice-prod`
- Ensures container/network/volume isolation

### Container Naming
- Dev: `invoice-<service>-dev` (e.g., `invoice-app-dev`)
- Prod: `invoice-<service>-prod` (e.g., `invoice-app-prod`)

### Network Names
- Dev: `invoice-network-dev`
- Prod: `invoice-prod_invoice-network`

### Volume Names
- Dev: `invoice-dev_<volume>` (e.g., `invoice-dev_postgres_dev_data`)
- Prod: `invoice-prod_<volume>` (e.g., `invoice-prod_postgres_prod_data`)

## Support

For issues or questions:
1. Run `./scripts/check-conflicts.sh` to diagnose
2. Check logs: `./scripts/manage-dev.sh logs` or `./scripts/manage-prod.sh logs -f`
3. Review CLAUDE.md for additional context
4. Check container status: `./scripts/manage.sh status`
