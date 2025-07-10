# Invoice Generator Project Context

## Docker-First Development Rules (CRITICAL - READ FIRST)
- **NEVER run npm/pip/commands directly on host machine**
- **ALWAYS use `docker compose exec` or rebuild containers**
- **All dependency changes require container rebuild**
- **Host machine changes don't affect running containers**
- **This is a containerized project - containers are the source of truth**
- **Use `docker compose` command (NOT docker-compose hyphenated)**

## Common Commands for This Project
- Install dependencies: `docker compose -f docker-compose.dev.yml exec app npm install <package>`
- Rebuild after changes: `docker compose -f docker-compose.dev.yml build`
- Development: `docker compose -f docker-compose.dev.yml up`
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