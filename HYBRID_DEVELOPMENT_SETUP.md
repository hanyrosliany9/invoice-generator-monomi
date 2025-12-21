# Hybrid Development Setup Guide

This guide explains how to run the Invoice Generator application with **infrastructure in Docker** (PostgreSQL + Redis) and **backend/frontend on your host machine** for faster development iteration.

## Why Hybrid Development?

| Aspect | Full Docker | Hybrid (Recommended) |
|--------|-------------|---------------------|
| Hot reload | Slower (rebuild container) | Instant (native node) |
| Debugging | Complex (container debug) | Native IDE debugging |
| Iteration speed | 30-60s per change | 1-3s per change |
| IDE integration | Limited | Full IDE support |
| System resources | Heavy (~2GB RAM) | Light (~500MB) |

## Prerequisites

- **Node.js 20+** (check: `node --version`)
- **npm/pnpm** (comes with Node)
- **Docker & Docker Compose** (for PostgreSQL + Redis only)
- **Git** (already have it)

## Quick Start

### 1. Start Infrastructure Services

```bash
# Start only PostgreSQL and Redis (no app container)
docker compose -f docker-compose.development.yml up -d

# Verify services are running
docker compose -f docker-compose.development.yml ps
```

Expected output:
```
STATUS: Up (healthy)
- Container invoice-gen-db-dev (PostgreSQL)
- Container invoice-gen-redis-dev (Redis)
```

### 2. Setup Environment

```bash
# Copy development environment file
cp .env.development .env

# Verify connection strings point to localhost
grep DATABASE_URL .env
grep REDIS_URL .env
```

### 3. Install Dependencies & Setup Database

```bash
# Backend setup
cd backend
npm install
npx prisma migrate deploy      # Run migrations
npx prisma generate            # Generate Prisma client
npm run db:seed                # Seed test data (optional)

# Frontend setup (new terminal)
cd frontend
npm install
```

### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```
Output:
```
[Nest] 12345  - 12/21/2025, 10:30:00 AM     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 12/21/2025, 10:30:02 AM     LOG [InstanceLoader] AppModule dependencies initialized
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Output:
```
  ➜  Local:   http://localhost:3000/
  ➜  press h to show help
```

## Service Ports

| Service | Host | Docker | Connection |
|---------|------|--------|-----------|
| **Frontend** | `localhost:3000` | N/A | Direct (React dev server) |
| **Backend API** | `localhost:5000` | N/A | Direct (NestJS dev server) |
| **PostgreSQL** | `localhost:5437` | `5432` | Via Docker network |
| **Redis** | `localhost:6384` | `6379` | Via Docker network |

## Development Workflows

### Making Database Changes

```bash
cd backend

# Create a new migration
npx prisma migrate dev --name add_new_feature

# This will:
# 1. Create migration file
# 2. Apply it to local database
# 3. Regenerate Prisma client

# Backend will auto-reload with new types
```

### Running Database Commands

```bash
cd backend

# Open database shell
npx prisma studio        # Visual database browser on localhost:5555

# Or use psql directly
psql -h localhost -p 5437 -U invoiceuser -d invoices

# Run database seed
npm run db:seed

# Reset database (deletes all data!)
npm run db:reset
```

### Testing

```bash
cd backend
npm run test              # Run all tests
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report

cd frontend
npm run test              # Vitest
npm run test:ui          # UI viewer
npm run test:coverage    # Coverage report
```

### Linting & Formatting

```bash
# Backend
cd backend
npm run lint             # Check for issues
npm run format           # Format with Prettier

# Frontend
cd frontend
npm run lint             # Check for issues
```

## Troubleshooting

### "Connection refused" to PostgreSQL

```bash
# Check if Docker containers are running
docker compose -f docker-compose.development.yml ps

# If not running, start them
docker compose -f docker-compose.development.yml up -d

# Check logs
docker compose -f docker-compose.development.yml logs db
docker compose -f docker-compose.development.yml logs redis
```

### "Port already in use"

```bash
# Find what's using port 5000 (backend)
lsof -i :5000

# Or for port 3000 (frontend)
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Puppeteer not found / Chromium missing

```bash
# On first npm install, Puppeteer will auto-download Chromium
# This happens automatically when you run:
cd backend && npm install

# If it fails, manually download:
npm run postinstall

# Or clear cache and reinstall
rm -rf node_modules
npm cache clean --force
npm install
```

### Database migrations fail

```bash
# Ensure migrations are up to date
cd backend
npx prisma migrate deploy

# If that fails, reset (WARNING: DELETES DATA)
npm run db:reset

# Then reseed
npm run db:seed
```

### Frontend won't hot-reload

```bash
# Clear Vite cache
rm -rf frontend/node_modules/.vite

# Restart dev server
cd frontend
npm run dev
```

## File Structure

```
invoice-generator/
├── docker-compose.dev.yml          # Full containerization (alternative)
├── docker-compose.development.yml  # Infrastructure only (recommended)
├── .env.development                # Local dev environment vars
├── .env.example                    # Reference only
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema
│   │   ├── migrations/             # Migration files
│   │   └── seed.ts                 # Database seeder
│   └── dist/                       # Compiled output (gitignored)
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   └── dist/                       # Build output (gitignored)
└── shared/                         # Shared types/utilities
```

## Switching Between Development Modes

### To Hybrid Development (Recommended)

```bash
# You're already here! Just use docker-compose.development.yml
docker compose -f docker-compose.development.yml up -d
npm install (in backend and frontend)
npm run start:dev (in backend)
npm run dev (in frontend)
```

### To Full Docker Development (docker-compose.dev.yml)

```bash
# Stop hybrid services
docker compose -f docker-compose.development.yml down

# Start full containerization
docker compose -f docker-compose.dev.yml up -d

# This runs everything in Docker, slower iteration but exact prod environment
```

## Performance Tips

1. **Disable debug logging** when not debugging
   ```bash
   # In .env
   LOG_LEVEL=log
   ENABLE_REQUEST_LOGGING=false
   ```

2. **Use npm ci instead of npm install** for reproducible installs
   ```bash
   npm ci  # Install exact versions from package-lock.json
   ```

3. **Clear caches periodically**
   ```bash
   docker compose -f docker-compose.development.yml exec db psql -U invoiceuser -d invoices -c "VACUUM ANALYZE;"
   ```

4. **Monitor resource usage**
   ```bash
   docker stats
   ```

## CI/CD & Production

For production and CI/CD, use the full Docker setup:
- `docker-compose.prod.yml` - Production (nginx, all services)
- `docker-compose.dev.yml` - Full Docker development (original)

Hybrid development is **dev-only** - production always uses full containerization.

## Common Commands Cheatsheet

```bash
# Infrastructure
docker compose -f docker-compose.development.yml up -d     # Start
docker compose -f docker-compose.development.yml down      # Stop
docker compose -f docker-compose.development.yml logs -f   # Watch logs

# Database
cd backend
npx prisma migrate dev --name description      # Create migration
npx prisma migrate deploy                      # Apply migrations
npx prisma db seed                             # Seed data
npx prisma studio                              # GUI browser
npm run db:reset                               # Full reset

# Development
npm run start:dev                              # Backend with hot reload
npm run dev                                    # Frontend with hot reload
npm run test:watch                             # Tests with watch

# Code Quality
npm run lint                                   # Check lint issues
npm run format                                 # Format code
```

## Next Steps

- Review existing documentation in the project root
- Check the main README for project-specific guidelines
- Review database schema in `backend/prisma/schema.prisma`
