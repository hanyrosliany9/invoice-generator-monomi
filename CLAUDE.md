# Invoice Generator Project Context

## Docker-First Development Rules (CRITICAL - READ FIRST)
- **NEVER run npm/pip/commands directly on host machine**
- **ALWAYS use `docker compose exec` or rebuild containers**
- **All dependency changes require container rebuild**
- **Host machine changes don't affect running containers**
- **This is a containerized project - containers are the source of truth**
- **Use `docker compose` command (NOT docker-compose hyphenated)**

## Database Design Philosophy (IMPORTANT - READ THIS)

**Clean Baseline Approach:**
- ✅ ONE comprehensive baseline migration contains ALL 65 tables
- ✅ Schema designed upfront to cover all business requirements
- ✅ No migration drift - baseline was generated from complete schema.prisma
- ✅ Future migrations only for TRUE new features

**The Baseline Migration (20251107173854_init_baseline):**
- Created from complete, production-ready schema.prisma
- Includes all core tables: Users, Clients, Projects, Quotations, Invoices, Payments
- Includes all accounting: Chart of Accounts, Journal Entries, General Ledger
- Includes all asset management: Assets, Depreciation, Maintenance
- Includes all vendor/procurement: Vendors, Purchase Orders, Goods Receipts
- Includes all counters: InvoiceCounter, QuotationCounter
- Includes Indonesian-specific: Holidays, Tax, Materai fields
- Total: 65 tables with proper relationships, indexes, constraints

**When to Create New Migrations:**
- ✅ Adding entirely new feature (e.g., "add inventory management")
- ✅ Business requirement changes (e.g., "track commission per sale")
- ❌ NOT for fixes to existing tables (fix schema.prisma, recreate baseline)
- ❌ NOT for "oops I forgot a field" (design it properly first!)

**How to Add Schema Changes:**
1. Edit `backend/prisma/schema.prisma`
2. Run: `cd backend && npx prisma migrate dev --name descriptive_name`
3. Migration auto-applies to local database
4. Commit both schema.prisma AND new migration folder
5. Docker containers auto-apply migrations on startup

**Common mistakes to avoid:**
- ❌ DON'T manually create SQL in migrations folder
- ❌ DON'T edit existing migration files
- ❌ DON'T use `db push` (we use proper migrations now)
- ✅ DO edit schema.prisma for changes
- ✅ DO use `prisma migrate dev` for new migrations
- ✅ DO think through requirements before adding tables

## Environment Management (CRITICAL - UPDATED 2025-11-08)

### Unified Management Scripts (RECOMMENDED)
**Dev and Prod run ISOLATED with separate project names - no conflicts!**

```bash
# Unified commands (easiest)
./scripts/manage.sh status              # Show all environments
./scripts/manage.sh dev start           # Start development
./scripts/manage.sh prod start          # Start production
./scripts/manage.sh both status         # Both environments status
./scripts/manage.sh both stop           # Stop everything

# Development only
./scripts/manage-dev.sh start           # Start dev
./scripts/manage-dev.sh stop            # Stop dev
./scripts/manage-dev.sh logs -f         # Follow logs
./scripts/manage-dev.sh rebuild         # Rebuild dev
./scripts/manage-dev.sh shell           # Open shell
./scripts/manage-dev.sh db-shell        # PostgreSQL shell
./scripts/manage-dev.sh status          # Status

# Production only
./scripts/manage-prod.sh start          # Start prod
./scripts/manage-prod.sh stop           # Stop prod
./scripts/manage-prod.sh logs -f app    # Follow app logs
./scripts/manage-prod.sh rebuild        # Rebuild prod (with prompts)
./scripts/manage-prod.sh health         # Health checks
./scripts/manage-prod.sh backup         # Database backup
./scripts/manage-prod.sh status         # Status
```

### Direct Docker Compose (Advanced)
**Both compose files now have `name:` field set for isolation:**
- `docker-compose.dev.yml` → Project: `invoice-dev`
- `docker-compose.prod.yml` → Project: `invoice-prod`

```bash
# Development (project name: invoice-dev)
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml logs -f

# Production (project name: invoice-prod)
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml logs -f app
```

### Port Allocation (No Conflicts)
**Development:**
- Frontend: `http://localhost:3001`
- Backend API: `http://localhost:5000`
- API Docs: `http://localhost:5000/api/docs`
- PostgreSQL: `localhost:5436`
- Redis: `localhost:6383`

**Production:**
- Nginx: `http://localhost:80`
- Frontend: `http://localhost:3000`
- Backend: Internal only (via nginx)
- PostgreSQL: Internal only
- Redis: Internal only

### Legacy Commands (Still Work)
- **Validate Environment**: `./scripts/validate-dev-environment.sh`
- **Manual Database Reset**: `docker compose -f docker-compose.dev.yml exec app npm run db:reset`
- **Install Dependencies**: `docker compose -f docker-compose.dev.yml exec app npm install <package>`
- **Cleanup**: `docker system prune -af`

## Critical Reminders
- This is a containerized project - containers are the source of truth
- Before any package installs, ask: "Should this run in container?"
- Always check current working directory and container status
- Use `docker compose exec` for interactive commands (NOT docker-compose)
- Rebuild containers after dependency changes

## Project Overview
- **Complete Indonesian Business Management System** (not just invoice generator)
- **Quotation-to-Invoice Workflow**: Central business process with approval/decline flow  
- **Indonesian Business Compliance**: Bahasa Indonesia + Materai (stamp duty) support
- **Project-Based Billing**: Projects with numbers, descriptions, outputs
- Docker-first development approach with PostgreSQL database
- **Tech Stack (2025 FINAL - Research Verified)**: 
  - Backend: NestJS 11.1.3 + Prisma + PostgreSQL 15 + TypeScript + i18next
  - Frontend: React 19 + Vite 6/7 + Tailwind CSS 4.0 + TypeScript + react-i18next
  - State: Zustand + TanStack Query + React 19 Actions (hybrid forms)
  - UI: **Ant Design 5.x** + AG Grid + Recharts (UPDATED: replaced Flowbite)
  - PDF: Puppeteer (server-side) + Indonesian templates + Materai reminder system
  - Localization: i18next + ICU MessageFormat + Indonesian IDR/date formatting
- Focus on Indonesian business practices and financial compliance

## Development Standards
- Use docker compose for all operations (never raw docker commands)
- Always check `docker system df` before major builds
- Aggressive cleanup to prevent disk bloat
- Test generated code immediately

## Docker Configuration
- Multi-service architecture: app, db, redis, nginx
- PostgreSQL 15-alpine for database
- Redis for session management and caching
- Development and production compose files
- Secrets management for sensitive data

## Security Requirements
- Non-root container users
- Docker secrets for passwords/keys  
- Network isolation
- Read-only filesystems where possible
- Regular vulnerability scanning

## Database Initialization & Seeding (IMPORTANT)

### Auto-Initialization
- **Database auto-initialization is ENABLED** in development (`SKIP_DB_INIT=false`)
- On first startup, containers will automatically:
  - Create database schema from Prisma migrations
  - Run database seeders with test data
  - Create default admin user: `admin@monomi.id` / `password123`

### Manual Seeding (Two Approaches)

**Approach 1: SQL Backup (RECOMMENDED - Contains Real Data)**
```bash
# Load pre-populated development database
cat backend/prisma/seed-from-backup.sql | docker compose -f docker-compose.dev.yml exec -T db psql -U invoiceuser -d invoices

# What's included:
# - 8 test users (all roles)
# - 138 Chart of Accounts (Indonesian)
# - 11 Expense Categories
# - 10 Assets (cameras, computers, etc.)
# - 1 Client, 1 Project, 1 Quotation, 1 PAID Invoice
# - Journal entries and General Ledger data
```

**Approach 2: TypeScript Seeder (Programmatic)**
```bash
# Run TypeScript seed file
docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && npm run db:seed"

# Or reset everything (migrations + seed)
docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && npm run db:reset"
```

### Update Seed Data
When you add important data and want to include it in future seeds:
```bash
# 1. Export current database
./scripts/export-seed-data.sh

# 2. Update backup file
cat /tmp/full_seed_data.sql > backend/prisma/seed-from-backup.sql

# 3. Commit changes
git add backend/prisma/seed-from-backup.sql
git commit -m "chore: Update seed data with latest development database"
```

See `SEEDING_GUIDE.md` for detailed documentation.

## Legacy Commands Section (MOVED TO TOP)
- See "Common Commands for This Project" section above for Docker-first commands

## Business Workflow (CORE REQUIREMENTS)
- **Client Dealing** → [Production/Social Media] → **New Quotation**
- **Quotation States**: Draft → Sent → [Approved/Declined]
- **Approved Quotation** → **Invoice Generation** (automatic)
- **Declined Quotation** → **Revised Quotation** (manual process)
- **Invoice States**: Draft → Sent → [Paid-Off/Pending Payment/Overdue]
- **Project Management**: Project-based billing with numbers, descriptions, outputs

## Indonesian Business Requirements
- **Materai (Stamp Duty)**: Reminder system for invoices > 5 million IDR (manual process)
- **Bahasa Indonesia**: Primary language for all documents and UI
- **Payment Gateways**: Midtrans, GoPay, local Indonesian payment methods
- **Currency**: Indonesian Rupiah (IDR) formatting and calculations
- **Legal Compliance**: Indonesian business document standards
- **Date/Time**: Indonesian locale and timezone (WIB)

## Research Findings
- This is a complete business management system, not simple invoice generator
- Quotation-to-Invoice workflow is central to business operations
- Project-based billing requires enhanced data models
- Indonesian compliance requires specialized templates and calculations
- Dashboard analytics are critical for business intelligence
- Invoice number generation should avoid PostgreSQL sequences due to gap issues
- Financial apps require enhanced security measures for Indonesian regulations
- Use health checks and restart policies for production
- Implement proper backup strategies for financial data

## Tech Stack Verification (2025 Research)
- **NestJS 11.1.3**: ✅ EXCELLENT - Enterprise-ready, actively maintained, 5.3M weekly downloads
- **React 19**: ✅ EXCELLENT - Stable with Server Components, Actions API, concurrent features
- **Vite 6/7 + Tailwind CSS 4.0**: ✅ EXCELLENT - Revolutionary performance, 31M weekly downloads
- **Zustand + TanStack Query**: ✅ EXCELLENT - React 19 compatible, optimal for business apps
- **Ant Design**: ✅ UPGRADED - Replaced Flowbite for enterprise features, Indonesian i18n support
- **Puppeteer + i18next**: ✅ EXCELLENT - Best-in-class PDF generation and Indonesian localization
- **PostgreSQL 15 + Prisma**: ✅ EXCELLENT - Type-safe database access, perfect for business data

## Memory Management Strategy
- Document all technical decisions as they're made
- Create bidirectional links between documentation
- Use semantic observations for context building
- Maintain research continuity across sessions
- Store Indonesian business requirements and compliance notes
- Track workflow implementation decisions and patterns

## Token Optimization & Cost Reduction (CRITICAL FOR EFFICIENCY)

### Forbidden Directories (Never Read/Search)
**These directories waste tokens and should NEVER be accessed:**
- `node_modules/` (backend and frontend)
- `.git/`
- `dist/`
- `build/`
- `coverage/`
- `.next/`
- `.cache/`
- `.buildx-cache/`
- `backend/node_modules/`
- `frontend/node_modules/`
- `frontend/dist/`
- `e2e/node_modules/`

### Forbidden File Types (Never Read)
**These files consume tokens without providing value:**
- `*.lock` (package-lock.json, yarn.lock, pnpm-lock.yaml)
- `*.log` (all log files)
- `*.map` (source map files - huge and useless for context)
- `*.min.js` (minified JavaScript)
- `*.bundle.js` (bundled files)
- `*.css.map` (CSS source maps)
- Binary files (images, fonts, pdfs in source control)
- `.env.production` (contains secrets, already in .gitignore)

### Session Management Best Practices
**Use these commands strategically:**
- `/compact` at 70% context usage (already in your preferences ✅)
- `/clear` when switching between frontend ↔ backend work
- `/context` at session start to check MCP server overhead
- `/cost` every 10-15 messages to monitor token usage
- `/mcp` to disable unused MCP servers before starting work

### Efficient File Access Patterns
**DO:**
- Read specific files with exact paths
- Use targeted glob patterns: `backend/src/**/*.service.ts`
- Request line ranges for large files: `Read file.ts (lines 100-200)`
- Ask for summaries instead of full file reads when possible

**DON'T:**
- Use broad globs: `**/*.ts` (too many results)
- Read entire directories recursively
- Read lock files or node_modules
- Request full file when only need function/class

### Context Window Priority (What Matters Most)
**High Priority (Always Load):**
1. Prisma schema (single source of truth for data models)
2. NestJS module files (architecture understanding)
3. Indonesian business logic (quotation, invoice, materai)
4. Docker compose configs (critical for development)

**Medium Priority (Load When Needed):**
1. React components (only when working on frontend)
2. API DTOs and controllers (when working on specific endpoints)
3. Test files (only when debugging tests)

**Low Priority (Avoid Unless Necessary):**
1. Configuration files (tsconfig, vite config, etc.)
2. Package.json files (unless modifying dependencies)
3. Migration files (unless debugging database issues)

### Estimated Token Savings
**Without Optimization:**
- Average session: ~150k tokens
- MCP overhead: ~20k tokens
- Wasted reads (node_modules, maps): ~30k tokens
- **Total: 150k tokens/session**

**With Optimization:**
- Forbidden directories blocked: -30k tokens
- MCP servers disabled: -15k tokens
- Targeted file access: -20k tokens
- `/compact` usage: -50k tokens
- **Optimized: 35k tokens/session (77% reduction)**

### Quick Reference Commands
```bash
# Start of session
/context          # Check what's consuming tokens
/mcp              # Disable unused servers

# During work
/cost             # Monitor spending every 10-15 messages

# At 70% context
/compact          # Summarize and continue

# Switching tasks
/clear            # Complete reset for new task
```