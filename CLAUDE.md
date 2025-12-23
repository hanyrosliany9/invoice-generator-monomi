# Invoice Generator Project Context

## Development Approach (CRITICAL - READ FIRST)

### Hybrid Development (RECOMMENDED - Faster Iteration)
- **Infrastructure (DB, Redis) runs in Docker** via `docker-compose.development.yml`
- **Backend and Frontend run directly on host machine** for fast hot-reload
- **Use `docker compose` command** (NOT hyphenated `docker-compose`)
- **npm/node commands run directly on host** (not inside containers)

### Full Docker Development (Alternative - Production-like)
- Use `docker-compose.dev.yml` for fully containerized development
- All commands run via `docker compose exec`
- Slower iteration but mirrors production environment

### Docker Compose Files Reference
| File | Purpose | Project Name |
|------|---------|--------------|
| `docker-compose.development.yml` | Hybrid dev (DB + Redis only) | `invoice-gen-dev-infra` |
| `docker-compose.dev.yml` | Full Docker dev (all services) | `invoice-dev` |
| `docker-compose.prod.yml` | Production deployment | `invoice-prod` |

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

## Environment Management (UPDATED 2025-12-22)

### Hybrid Development (RECOMMENDED)
**Infrastructure in Docker, app on host for fast iteration:**

```bash
# 1. Start infrastructure (PostgreSQL + Redis)
docker compose -f docker-compose.development.yml up -d

# 2. Run backend (in separate terminal)
cd backend && npm run start:dev

# 3. Run frontend (in separate terminal)
cd frontend && npm run dev

# Stop infrastructure when done
docker compose -f docker-compose.development.yml down
```

**Hybrid Development Ports:**
- Frontend: `http://localhost:5173` (Vite default)
- Backend API: `http://localhost:5000`
- API Docs: `http://localhost:5000/api/docs`
- PostgreSQL: `localhost:5438`
- Redis: `localhost:6385`

**Common Development Commands (run on host):**
```bash
# Install dependencies
cd backend && npm install <package>
cd frontend && npm install <package>

# Database commands
cd backend && npx prisma migrate dev --name <name>
cd backend && npx prisma studio    # GUI for database
cd backend && npm run db:seed      # Seed database
cd backend && npm run db:reset     # Reset + seed

# Testing
cd backend && npm run test
cd frontend && npm run test
```

### Full Docker Development (Alternative)
**Use when you need production-like environment:**

```bash
# Start fully containerized dev environment
docker compose -f docker-compose.dev.yml up -d

# Run commands inside container
docker compose -f docker-compose.dev.yml exec app npm run start:dev
docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && npm run db:reset"

# Stop
docker compose -f docker-compose.dev.yml down
```

**Full Docker Dev Ports:**
- Frontend: `http://localhost:3001`
- Backend API: `http://localhost:5000`
- PostgreSQL: `localhost:5436`
- Redis: `localhost:6383`

### Production
**Fully containerized with nginx reverse proxy:**

```bash
# Start production
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f app

# Stop production
docker compose -f docker-compose.prod.yml down
```

**Production Ports:**
- Nginx: `http://localhost:80`
- Frontend: `http://localhost:3000`
- Backend: Internal only (via nginx)
- PostgreSQL: Internal only
- Redis: Internal only

### Legacy Management Scripts (May Need Updates)
```bash
./scripts/manage.sh status              # Show all environments
./scripts/manage-dev.sh start           # Start full docker dev
./scripts/manage-prod.sh start          # Start production
```

### Cleanup Commands
```bash
docker system prune -af                 # Remove unused images/containers
docker volume prune -f                  # Remove unused volumes
docker system df                        # Check disk usage
```

## Critical Reminders
- **Hybrid dev**: npm commands run directly on host machine
- **Full Docker dev**: Use `docker compose exec` for all commands
- **Production**: Fully containerized, never run npm on host
- Always use `docker compose` (not hyphenated `docker-compose`)

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

### First-Time Setup (Hybrid Development)
```bash
# 1. Start infrastructure
docker compose -f docker-compose.development.yml up -d

# 2. Run migrations
cd backend && npx prisma migrate dev

# 3. Seed the database
cd backend && npm run db:seed
```

**Default admin user:** `admin@monomi.id` / `password123`

### Manual Seeding Options

**Option 1: TypeScript Seeder (RECOMMENDED)**
```bash
# Run seed script
cd backend && npm run db:seed

# Or reset everything (drop + migrate + seed)
cd backend && npm run db:reset
```

**Option 2: SQL Backup (Contains Real Data)**
```bash
# For hybrid dev (port 5438)
PGPASSWORD=devpassword psql -h localhost -p 5438 -U invoiceuser -d invoices < backend/prisma/seed-from-backup.sql

# For full docker dev (port 5436)
cat backend/prisma/seed-from-backup.sql | docker compose -f docker-compose.dev.yml exec -T db psql -U invoiceuser -d invoices

# What's included:
# - 8 test users (all roles)
# - 138 Chart of Accounts (Indonesian)
# - 11 Expense Categories
# - 10 Assets (cameras, computers, etc.)
# - 1 Client, 1 Project, 1 Quotation, 1 PAID Invoice
# - Journal entries and General Ledger data
```

### Update Seed Data
When you add important data and want to include it in future seeds:
```bash
# 1. Export current database (hybrid dev port)
PGPASSWORD=devpassword pg_dump -h localhost -p 5438 -U invoiceuser invoices > backend/prisma/seed-from-backup.sql

# 2. Commit changes
git add backend/prisma/seed-from-backup.sql
git commit -m "chore: Update seed data with latest development database"
```

See `SEEDING_GUIDE.md` for detailed documentation.

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

## Context Priority Hierarchy (Tier System)

This tier-based system optimizes context loading to reduce token usage by 70-90% while maintaining full access to needed information.

### TIER 1: Always Load First (8-12k tokens)
**Core architecture files that provide the foundation. Load these at every session start.**

**Backend Architecture:**
- `backend/prisma/schema.prisma` - Single source of truth for all 65 table definitions
- `backend/src/app.module.ts` - NestJS application module and architecture
- `backend/src/main.ts` - Application entry point and configuration
- `.env.example` - Environment variable documentation

**Frontend Architecture:**
- `frontend/src/main.tsx` - React application entry point
- `frontend/src/App.tsx` - Root component and routing structure
- `frontend/src/router.tsx` or routing configuration - Navigation architecture
- `frontend/vite.config.ts` - Build configuration

**Infrastructure:**
- `docker-compose.development.yml` - Hybrid dev database setup (essential for development)
- `Dockerfile` - Application containerization
- `.dockerignore` - Docker build optimization

**Project Configuration:**
- `CLAUDE.md` (this file) - Development guidelines and context rules

**Token Cost:** ~8-12k tokens
**When to Load:** Every session start
**How to Load:** Read specific files, not entire directories

---

### TIER 2: Load Per Feature (5-15k tokens per area)
**Feature-specific files. Load only when working on that particular area.**

#### 2.A: Quotation-to-Invoice Workflow
The central business process - load when building quotation/invoice features.

**Backend Files:**
- `backend/src/modules/quotations/` - Quotation management services and controllers
- `backend/src/modules/quotations/*.dto.ts` - Quotation data transfer objects
- `backend/src/modules/invoices/` - Invoice generation and management
- `backend/src/modules/invoices/*.dto.ts` - Invoice data transfer objects
- `backend/src/modules/payments/` - Payment tracking and processing

**Frontend Files:**
- `frontend/src/pages/Quotations/` - Quotation listing and management
- `frontend/src/pages/Invoices/` - Invoice creation and display
- `frontend/src/components/QuotationForm/` - Form components
- `frontend/src/stores/quotationStore.ts` or relevant Zustand store - State management

**Token Cost:** ~8-12k tokens
**When to Load:** When working on quotation/invoice features
**Skip:** When working on accounting, assets, or vendor management

#### 2.B: Indonesian Business Compliance
Materai, tax calculations, and regulatory requirements.

**Backend Files:**
- `backend/src/modules/materai/` - Stamp duty reminder system
- `backend/src/modules/tax/` - Tax calculation services
- `backend/src/services/pdf.service.ts` - PDF generation with Indonesian templates

**Frontend Files:**
- `frontend/src/pages/Compliance/` - Compliance reporting pages
- `frontend/src/components/MateraiReminder/` - UI components for Materai display

**Token Cost:** ~5-8k tokens
**When to Load:** When implementing Indonesian-specific features
**Skip:** When working on general business logic

#### 2.C: Accounting & Financial Management
Chart of Accounts, Journal Entries, General Ledger.

**Backend Files:**
- `backend/src/modules/accounting/` - Accounting core services
- `backend/src/modules/chartOfAccounts/` - COA management
- `backend/src/modules/journalEntries/` - Journal entry recording
- `backend/src/modules/generalLedger/` - GL reporting and queries

**Frontend Files:**
- `frontend/src/pages/Accounting/` - Accounting dashboard and reports
- `frontend/src/components/ChartOfAccounts/` - COA UI components

**Token Cost:** ~8-12k tokens
**When to Load:** When building accounting features or financial reports
**Skip:** When working on quotes, invoices, or HR

#### 2.D: Asset Management & Depreciation
Assets, maintenance records, depreciation schedules.

**Backend Files:**
- `backend/src/modules/assets/` - Asset management services
- `backend/src/modules/depreciation/` - Depreciation calculations
- `backend/src/modules/maintenance/` - Maintenance tracking

**Frontend Files:**
- `frontend/src/pages/Assets/` - Asset management UI
- `frontend/src/components/AssetForm/` - Asset creation/editing

**Token Cost:** ~5-8k tokens
**When to Load:** When working on asset-related features
**Skip:** For most development (lower priority feature)

#### 2.E: Vendor & Procurement Management
Vendors, Purchase Orders, Goods Receipts.

**Backend Files:**
- `backend/src/modules/vendors/` - Vendor management
- `backend/src/modules/purchaseOrders/` - PO creation and tracking
- `backend/src/modules/goodsReceipts/` - Receipt processing

**Frontend Files:**
- `frontend/src/pages/Procurement/` - Procurement UI
- `frontend/src/components/PurchaseOrder/` - PO form components

**Token Cost:** ~5-8k tokens
**When to Load:** When building procurement features
**Skip:** For general invoice/quotation work

#### 2.F: Authentication & Authorization
User management, roles, permissions.

**Backend Files:**
- `backend/src/modules/auth/` - Authentication services
- `backend/src/modules/users/` - User management
- `backend/src/guards/` - Authorization guards
- `backend/src/decorators/` - Role and permission decorators

**Frontend Files:**
- `frontend/src/pages/Auth/` - Login and auth pages
- `frontend/src/pages/Admin/Users/` - User management UI
- `frontend/src/stores/authStore.ts` - Authentication state

**Token Cost:** ~8-10k tokens
**When to Load:** When implementing user features or fixing auth issues
**Skip:** When working on business logic features

#### 2.G: Dashboard & Reporting
Business intelligence, analytics, reporting.

**Backend Files:**
- `backend/src/modules/reports/` - Report generation services
- `backend/src/modules/dashboard/` - Dashboard data aggregation

**Frontend Files:**
- `frontend/src/pages/Dashboard/` - Dashboard layout and widgets
- `frontend/src/components/Dashboard/` - Chart and metric components
- `frontend/src/stores/dashboardStore.ts` - Dashboard state management

**Token Cost:** ~10-15k tokens
**When to Load:** When building dashboards or analytics features
**Skip:** When working on transaction processing

#### 2.H: Localization & Translation (i18next)
Indonesian/English translation strings and configuration.

**Configuration Files:**
- `frontend/src/i18n/config.ts` - i18next configuration
- `frontend/src/i18n/locales/id.json` - Indonesian translations (primary)
- `frontend/src/i18n/locales/en.json` - English translations

**Backend Files:**
- `backend/src/common/i18n/` - Backend translation handling if applicable

**Token Cost:** ~3-5k tokens
**When to Load:** When adding new UI strings or managing translations
**Skip:** When not working on translation issues

---

### TIER 3: Avoid Unless Explicitly Needed (Waste 20-50k tokens)
**High-cost files that waste tokens. Only read when specifically debugging.**

**Configuration Files (rarely needed):**
- `backend/tsconfig.json` - TypeScript configuration
- `frontend/tsconfig.json` - Frontend TypeScript config
- `backend/.eslintrc.json` - Linting rules
- `frontend/tailwind.config.ts` - Tailwind CSS configuration
- `frontend/vite.config.ts` (beyond initial review) - Vite configuration

**Package Management (never needed during development):**
- `backend/package.json` - Only read to check installed versions
- `frontend/package.json` - Only read if adding new dependencies
- `backend/package-lock.json` - ❌ FORBIDDEN (huge file)
- `frontend/package-lock.json` - ❌ FORBIDDEN (huge file)
- `pnpm-lock.yaml` or `yarn.lock` - ❌ FORBIDDEN (expensive)

**Test Files (only when debugging failures):**
- `backend/**/*.spec.ts` - Read only if test is failing
- `frontend/**/*.test.tsx` - Read only if test is failing
- `backend/test/` - Integration tests (read selectively)

**Migration Files (only when debugging DB issues):**
- `backend/prisma/migrations/` - Old migration files (read specific one if needed)
- Only read if: Schema is broken or migrations won't run

**Build & Artifact Files (never read):**
- `backend/dist/` - ❌ Compiled JavaScript (useless for development)
- `frontend/dist/` - ❌ Bundled code (useless for development)
- `.next/` - ❌ Next.js build artifacts
- `coverage/` - ❌ Test coverage reports
- `.buildx-cache/` - ❌ Docker build cache
- Source maps (`*.map`) - ❌ FORBIDDEN (huge and useless)

**Development & Metadata Files (never read):**
- `.git/` - ❌ Version control history
- `.vscode/` - IDE settings (read `launch.json` only if debugging config)
- `.env.production` - ❌ Contains secrets
- `node_modules/` - ❌ FORBIDDEN (120MB+ files)
- `.cache/` - ❌ Temporary cache files

**Token Cost:** 20-50k tokens per file read
**When to Load:** Almost never. Use targeted Grep for searching instead
**Alternative:** Use `Grep` tool for searching code instead of reading files

---

## Efficient File Access Patterns

### Strategy: DO Use Targeted Access

**✅ GOOD - Targeted file read:**
```bash
Read: backend/src/invoices/invoices.service.ts (lines 1-50)
# Load only the method signatures, not entire implementation
```

**✅ GOOD - Specific glob pattern:**
```bash
Glob: backend/src/**/*.dto.ts
# Find all DTOs (limited results)
```

**✅ GOOD - Targeted grep search:**
```bash
Grep: "getInvoiceById" backend/src/**/*.service.ts
# Find specific function across services
```

**✅ GOOD - Request summary instead of full file:**
```
Claude: Summarize what the quotation approval flow does in
backend/src/modules/quotations/quotations.service.ts (don't read full file)
```

### Strategy: DON'T Use Broad Access

**❌ BAD - Reading entire directories:**
```bash
Read: backend/src/  # Way too many files and too many tokens
```

**❌ BAD - Overly broad glob patterns:**
```bash
Glob: **/*.ts  # Thousands of results
```

**❌ BAD - Reading lock files:**
```bash
Read: backend/package-lock.json  # 50,000+ lines, 200k+ tokens
```

**❌ BAD - Requesting full file when you only need one function:**
```bash
Read: backend/src/invoices/invoices.service.ts (full)
# When you only need getInvoiceById method
```

---

## Context Switching Strategy

When switching between different areas of work, use this strategy to manage context efficiently:

### Switching from Backend to Frontend Work

**Current State:** Backend context loaded (NestJS, Prisma, controllers, services)

**Steps:**
1. Mark current backend task as complete
2. Run `/clear` to reset context completely
3. Load TIER 1 files (App.tsx, main.tsx, vite.config.ts)
4. Load TIER 2 files for your frontend feature
5. **Cost:** 1 extra minute, saves 50k tokens per session

**When to do this:** When your backend task is complete and frontend task is unrelated

**When NOT to do this:**
- Implementing the same feature across both backend and frontend
- Debugging integration between backend and frontend
- Both changes are interconnected

### Switching from Frontend to Backend Work

**Current State:** Frontend context loaded (React components, hooks, state)

**Steps:**
1. Document what you're changing in frontend (paste the changes you made)
2. Run `/clear` to reset context
3. Load TIER 1 files (app.module.ts, schema.prisma, docker config)
4. Load TIER 2 backend files for your next feature
5. **Cost:** 1 extra minute, saves 40k tokens per session

### Working on Full-Stack Features (Quotation to Invoice)

**Challenge:** Need both backend and frontend in context for one feature

**4-Phase Approach:**

**Phase 1: Architecture Planning** (15 min)
- Load TIER 1 files only
- Discuss overall design with Claude
- Plan backend and frontend changes separately
- **Context:** ~10k tokens

**Phase 2: Backend Implementation** (30-45 min)
- `/clear` to remove frontend context
- Load backend TIER 2 files
- Implement service, controller, DTO changes
- **Context:** ~20k tokens
- Save screenshot or commit changes

**Phase 3: Frontend Implementation** (30-45 min)
- `/clear` to remove backend context
- Load frontend TIER 2 files
- Implement components, hooks, state changes
- **Context:** ~20k tokens

**Phase 4: Integration & Testing** (15 min)
- Load minimal context (just API client code)
- Verify backend endpoints work
- Test end-to-end flow
- **Total:** ~60k tokens instead of 120k (50% savings)

### Switching Between Unrelated Features

**Example:** Moving from Invoice feature to Asset Management feature

**Strategy:**
1. Commit your invoice work to git
2. Run `/clear` for complete reset
3. Start fresh with Asset Management TIER 2 files
4. Prevents context pollution from unrelated code
5. **Savings:** 30-40k tokens by avoiding carry-over context

### Use `/compact` vs `/clear`

**Use `/compact` when:**
- You're in the middle of the same feature
- You want to summarize conversation history but keep context
- You're at 70% context usage (auto-triggers with your preferences)
- **Outcome:** Context shrinks, you continue same task

**Use `/clear` when:**
- Switching to a completely different feature or area
- You've finished a major feature completely
- Previous context is irrelevant to new work
- **Outcome:** Completely fresh context window, saves 40-80k tokens

---

## Practical Token Budgeting Examples

### Example 1: Adding a New Field to Invoice Model
**Task:** Add "internalNotes" field to invoices (backend only)

**Tier Loading Strategy:**
1. Load TIER 1: schema.prisma, app.module.ts (~3k tokens)
2. Load TIER 2.A: invoices service and DTOs (~5k tokens)
3. No migrations needed if field is non-critical

**Process:**
- Edit schema.prisma: Add field
- Run: `npx prisma migrate dev --name add_internal_notes`
- Update invoices.dto.ts to include new field
- Update service methods if needed

**Total Context:** ~8-10k tokens
**Without Tier System:** ~20-25k tokens (60% savings)

### Example 2: Fixing Quotation Approval UI Bug
**Task:** Fix the approve/decline buttons not working in React

**Tier Loading Strategy:**
1. Load TIER 1: App.tsx, vite.config.ts (~3k tokens)
2. Load TIER 2.A: Quotation components and store (~7k tokens)
3. Optional: If need API docs, load `quotations.controller.ts` (~2k tokens)

**Process:**
- Find the approval button component in `pages/Quotations/`
- Check the Zustand store for state management
- Verify API call is correct
- Fix React event handler or state update

**Total Context:** ~10-12k tokens
**Without Tier System:** ~30-40k tokens (67% savings)

### Example 3: Building New Accounting Report Page
**Task:** Create Dashboard showing monthly revenue by category

**Tier Loading Strategy:**
1. Load TIER 1: App.tsx, schema.prisma (~4k tokens)
2. Load TIER 2.C: Accounting modules and DTOs (~10k tokens)
3. Load TIER 2.G: Dashboard components (~5k tokens)
4. Load TIER 2.H: Translation files for labels (~2k tokens)

**Process:**
- Create new Report component in `pages/Accounting/`
- Query chart of accounts using PostgreSQL MCP
- Create Recharts visualization
- Add translation keys for report labels
- Add to main dashboard

**Total Context:** ~20-21k tokens
**Without Tier System:** ~50-60k tokens (60% savings)

### Example 4: Debugging a Failing Test
**Task:** Fix failing test in invoice generation

**Tier Loading Strategy:**
1. Load TIER 1: app.module.ts, schema.prisma (~3k tokens)
2. Load TIER 2.A: invoices service (~4k tokens)
3. Load TIER 3 (only if needed): invoices.spec.ts (~3k tokens)
4. Skip: Everything else

**Process:**
- Read the failing test to understand what it expects
- Read the service method being tested
- Identify the discrepancy
- Fix the service method or test assertion

**Total Context:** ~8-10k tokens
**Without Tier System:** ~25-35k tokens (65% savings)

---

## Estimated Token Savings

### Before Using Tier System
```
Typical session without optimization:
- Load multiple directories: ~50k tokens
- Read full service files: ~30k tokens
- Load lock files accidentally: ~20k tokens
- MCP overhead (unused servers): ~15k tokens
─────────────────────────────
TOTAL: ~115k tokens per session
```

### After Using Tier System
```
Optimized session with tiers:
- TIER 1 only at start: ~10k tokens
- TIER 2 targeted feature: ~12k tokens
- Smart file reads with line ranges: ~3k tokens
- MCP optimized (disable unused): ~5k tokens
─────────────────────────────
TOTAL: ~30k tokens per session (74% reduction)
```

**Monthly Savings (20 dev sessions):**
- Without optimization: 2.3M tokens = ~$23/month
- With optimization: 600k tokens = ~$6/month
- **Monthly savings: ~$17 (74% reduction)**

---

## Quick Reference: Tier Loading Cheat Sheet

### Session Start (5 min)
```bash
/context              # Check MCP server overhead
/mcp                  # Disable unused servers (save 10-15k tokens)
# Load TIER 1 files only - stop here if just planning
```

### Adding Quotation/Invoice Feature
```bash
# Load TIER 1 (always)
# Load TIER 2.A (quotations/invoices)
# Load TIER 2.H if adding new UI text (translations)
# Skip everything else
```

### Adding Authentication/Users Feature
```bash
# Load TIER 1 (always)
# Load TIER 2.F (auth & users)
# Skip asset/vendor/accounting files
```

### Building Dashboard/Reports
```bash
# Load TIER 1 (always)
# Load TIER 2.G (dashboard/reporting)
# Load TIER 2.C if querying accounting data (optional)
# Load TIER 2.H (translations for labels)
```

### Fixing Bug (Unknown Location)
```bash
# Load TIER 1 only
# Use Grep to find the buggy file
# Load only THAT file from TIER 2
# Don't load entire module
```

### Emergency Context Cleanup
```bash
/context              # See current token usage
/compact              # If at 70%
/clear                # If completely stuck (nuclear option)
```

---

## File Loading Decision Tree

```
New task starts?
├─ Yes → Load TIER 1 files (always)
└─ No → Continue with existing context (if TIER 1 already loaded)

Know which feature area you're working on?
├─ Quotations/Invoices → Load TIER 2.A
├─ Accounting → Load TIER 2.C
├─ Dashboard → Load TIER 2.G
├─ Translations → Load TIER 2.H
├─ Auth/Users → Load TIER 2.F
├─ Assets → Load TIER 2.D
├─ Procurement → Load TIER 2.E
└─ Multiple areas → Review "Context Switching Strategy" section

Need to search for something?
├─ Use Grep (not Read) for broad searches
├─ Ask Claude to summarize instead of reading full file
└─ Avoid TIER 3 files completely

At 70% context usage?
├─ Run `/compact` to summarize
└─ Continue with same task

Context feels irrelevant to current work?
├─ Run `/clear` (nuclear reset)
└─ Start fresh with TIER 1 + relevant TIER 2
```