# Invoice Generator Project Context

## Docker-First Development Rules (CRITICAL - READ FIRST)
- **NEVER run npm/pip/commands directly on host machine**
- **ALWAYS use `docker compose exec` or rebuild containers**
- **All dependency changes require container rebuild**
- **Host machine changes don't affect running containers**
- **This is a containerized project - containers are the source of truth**
- **Use `docker compose` command (NOT docker-compose hyphenated)**

## Common Commands for This Project
- **Quick Start**: `docker compose -f docker-compose.dev.yml up` (auto-seeds database)
- **Validate Environment**: `./scripts/validate-dev-environment.sh`
- **Manual Database Reset**: `docker compose -f docker-compose.dev.yml exec app npm run db:reset`
- **Manual Seeding**: `docker compose -f docker-compose.dev.yml exec app npm run db:seed`
- Install dependencies: `docker compose -f docker-compose.dev.yml exec app npm install <package>`
- Rebuild after changes: `docker compose -f docker-compose.dev.yml build`
- Production: `docker compose -f docker-compose.prod.yml up`
- Build: `docker compose build`
- Cleanup: `docker system prune -af`
- Backup: `./scripts/backup.sh`

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

## Database Initialization (IMPORTANT)
- **Database auto-initialization is ENABLED** in development (`SKIP_DB_INIT=false`)
- On first startup, containers will automatically:
  - Create database schema from Prisma
  - Run database seeders with test data
  - Create default admin user: `admin@monomi.id` / `password123`
- This ensures consistent setup for all developers

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