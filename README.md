# 🇮🇩 Indonesian Business Management System
## Complete Enterprise Financial Platform with Quotation-to-Invoice Workflow

A world-class, comprehensive business management system specifically designed for Indonesian businesses, featuring complete quotation-to-invoice workflows, full accounting integration, Indonesian compliance (Materai, PSAK, PPN/PPh), project profit tracking, asset management, and purchase-to-pay automation.

> **This is NOT just an invoice generator** - it's a complete enterprise financial management platform with 26 backend modules, 60+ frontend pages, and 67 database entities.

---

## 📋 Quick Links

- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[Implementation Documentation](./docs/implementation-summary.md)** - Technical implementation details
- **[Indonesian Compliance Guide](./INDONESIAN_COMPLIANCE_ANALYSIS.md)** - Materai, PSAK, tax compliance
- **[API Documentation](http://localhost:5000/api/docs)** - Interactive Swagger API docs

---

## ✨ Core Business Features

### 🔄 Complete Quotation-to-Invoice Workflow
```
Client Dealing → Project Creation → Quotation (DRAFT → SENT → APPROVED/DECLINED)
                                        ↓                      ↓
                                   Invoice Generation    Revised Quotation
                                        ↓
                            Invoice (DRAFT → SENT → PAID/OVERDUE)
                                        ↓
                                Payment Tracking & Reconciliation
```

**Key Capabilities:**
- **Payment Milestones**: Multi-phase payment terms (30% DP, 40% Phase 1, 30% Final)
- **Price Inheritance**: Automatic cascade from Project → Quotation → Invoice
- **Scope of Work Tracking**: Narrative descriptions flow through entire workflow
- **Approval Workflow**: RBAC-based approval/rejection with complete audit trail
- **Materai Automation**: Auto-detect invoices ≥ Rp 5,000,000 requiring stamp duty

### 💰 Project-Based Billing with Profit Tracking

**Real-time Profit Analysis:**
- Project estimation vs actual cost tracking
- Direct and indirect cost allocation
- Gross and net profit margin calculation
- Budget variance analysis
- Revenue recognition (PSAK 72 compliant)
- PDF export with comprehensive profit analysis

**Project Metrics:**
- Total Direct Costs (materials, labor, direct expenses)
- Total Indirect Costs (allocated overhead)
- Total Invoiced Amount (sum of all invoices)
- Gross Profit & Net Profit with percentage margins
- Budget Variance tracking

### 📊 Full Accounting System (16 Services)

**Double-Entry Bookkeeping:**
- Chart of Accounts (Indonesian standard)
- Journal Entries with posting controls
- General Ledger management
- Trial Balance reporting
- Financial Statements (Income Statement, Balance Sheet, Cash Flow)

**Advanced Accounting:**
- Revenue Recognition (PSAK 72 compliance)
- Expected Credit Loss provisions (PSAK 71)
- Project Costing & Work-in-Progress
- Asset Depreciation (straight-line, declining balance)
- Bank Reconciliation
- Tax Reconciliation (PPN/PPh)
- Accounts Receivable & Payable management
- AR/AP Aging analysis
- Cash Transaction management

**Indonesian GAAP Compliance:**
- PSAK 72: Revenue recognition from contracts
- PSAK 71: Expected Credit Loss (ECL)
- PSAK 57: Work in Progress & Cost Allocation
- Indonesian Chart of Accounts structure

### 💳 Expense Management

**Complete Expense Workflow:**
- Expense categorization linked to Chart of Accounts
- Multi-status workflow: DRAFT → SUBMITTED → APPROVED/REJECTED → PAID
- Approval workflow with comments and history
- Budget tracking per project/category
- Indonesian tax compliance (PPN/PPh calculations)
- e-Faktur integration for VAT validation
- Document attachment support
- Project allocation and cost tracking

### 🏢 Asset Management

**Comprehensive Asset Tracking:**
- Asset master data with depreciation
- Asset kits for grouped equipment
- Reservation system for project allocation
- Maintenance schedules (DAILY/WEEKLY/MONTHLY/QUARTERLY/ANNUAL)
- Maintenance records with cost tracking
- Project equipment usage tracking
- Asset status management (AVAILABLE/IN_USE/MAINTENANCE/RETIRED)

### 🛒 Purchase-to-Pay Integration

**Complete Vendor Management:**
```
Vendor → Purchase Order → Goods Receipt → Vendor Invoice → AP Entry → Payment
```

**Features:**
- Vendor master data with PKP (VAT registered) status
- Purchase Order creation and approval workflow
- Goods Receipt with quality inspection
- Vendor Invoice processing with 3-way matching
- Accounts Payable ledger management
- Vendor Payment processing with allocation

---

## 🇮🇩 Indonesian Business Compliance

### Materai (Stamp Duty) System

**Automated Compliance:**
- Auto-detection: Invoices ≥ Rp 5,000,000 require materai
- Smart suggestions with AI-powered confidence scoring
- Legal compliance tracking (UU No. 13 Tahun 1985)
- Urgency levels: LOW/MEDIUM/HIGH/CRITICAL based on due dates
- Bulk operations for multiple invoices
- Statistics dashboard with compliance rate monitoring
- Audit trail for who applied materai and when

**Configuration:**
```typescript
{
  threshold: 5000000,      // Rp 5 million
  stampDutyAmount: 10000,  // Rp 10,000
  enforceCompliance: true,
  reminderDays: [30, 14, 7, 3, 1],
  autoApply: false
}
```

### Indonesian Tax Features

**PPN (VAT) Calculator:**
- Indonesian VAT calculation service
- e-Faktur validation integration
- Tax reconciliation reports

**PPh (Withholding Tax):**
- Multiple PPh types support
- Automatic withholding calculation
- Tax compliance reporting

### Cultural Localization

**Bahasa Indonesia:**
- 713-line comprehensive translation file
- Indonesian date/time formatting (WIB timezone)
- IDR currency formatting throughout
- Indonesian business document templates

**Cultural Features:**
- Honorifics system (Bapak/Ibu addressing)
- Regional business styles (Jakarta, Surabaya, Yogyakarta)
- Business etiquette compliance
- Professional Indonesian communication standards

---

## 🚀 Tech Stack (2025)

### Backend (NestJS 10.4.4)
```
NestJS 10.4.4      - Enterprise TypeScript framework
PostgreSQL 15      - Robust relational database
Prisma ORM 5.20    - Type-safe database access
Passport JWT       - Authentication & authorization
Puppeteer 23.5     - Server-side PDF generation
i18next 24.0       - Backend localization
nodemailer 6.9     - Email notifications
ExcelJS 4.4        - Excel report exports
```

**26 Backend Modules:**
- auth, users, clients, projects, quotations, invoices
- payments, payment-milestones, expenses, expense-categories
- accounting (16 services), assets, vendors, purchase-orders
- goods-receipts, vendor-invoices, materai, localization
- pdf, reports, settings, notifications, documents
- project-types, business-journey, prisma, health, metrics

### Frontend (React 19)
```
React 19               - Latest React with Server Components
Vite 5.4              - Ultra-fast build tool
TypeScript 5.6        - Full type safety
Ant Design 5.26       - Enterprise UI framework
Tailwind CSS 3.4      - Utility-first styling
Zustand 5.0           - Global state management
TanStack Query 5.59   - Server state management
React Hook Form 7.53  - Form handling
AG Grid 32.2          - Advanced data tables
Recharts 2.12         - Chart visualization
i18next 24.0          - Frontend localization
```

**60+ Frontend Pages:**
- Dashboard, Quotations (4 pages), Invoices (4 pages)
- Clients, Projects (with profit analysis), Users
- Expenses, Expense Categories, Assets, Vendors
- 19 Accounting pages (Journal, Ledger, Financial Statements, AR/AP, etc.)
- Calendar, Reports, Settings

### DevOps & Infrastructure
```
Docker              - Multi-stage containerization
Docker Compose      - Multi-service orchestration
PostgreSQL 15       - Database with optimization
Redis 7             - Session & caching
Nginx               - Reverse proxy
Cloudflared         - Cloudflare Tunnel for HTTPS
GitHub Actions      - CI/CD automation (planned)
```

---

## 📁 Project Structure

```
invoice-generator-monomi/
├── backend/                           # NestJS API (26 modules)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/                 # JWT authentication with RBAC
│   │   │   ├── users/                # User management (7 roles)
│   │   │   ├── clients/              # Client management
│   │   │   ├── projects/             # Project-based billing with profit tracking
│   │   │   ├── quotations/           # Quotation management
│   │   │   │   └── services/
│   │   │   │       └── payment-milestones.service.ts  # Milestone payments
│   │   │   ├── invoices/             # Invoice generation with Materai
│   │   │   ├── payments/             # Payment tracking
│   │   │   ├── expenses/             # Expense management
│   │   │   │   ├── efaktur-validator.service.ts
│   │   │   │   ├── ppn-calculator.service.ts
│   │   │   │   └── withholding-tax-calculator.service.ts
│   │   │   ├── accounting/           # Full accounting system
│   │   │   │   └── services/         # 16 specialized services
│   │   │   │       ├── journal.service.ts           # Double-entry bookkeeping
│   │   │   │       ├── ledger.service.ts
│   │   │   │       ├── financial-statements.service.ts
│   │   │   │       ├── revenue-recognition.service.ts  # PSAK 72
│   │   │   │       ├── ecl.service.ts                  # PSAK 71
│   │   │   │       ├── depreciation.service.ts
│   │   │   │       ├── bank-reconciliation.service.ts
│   │   │   │       └── ... (16 services total)
│   │   │   ├── assets/               # Asset management
│   │   │   ├── vendors/              # Vendor management
│   │   │   ├── purchase-orders/      # Purchase order tracking
│   │   │   ├── goods-receipts/       # Goods receipt management
│   │   │   ├── vendor-invoices/      # Vendor invoice processing
│   │   │   ├── materai/              # Indonesian stamp duty compliance
│   │   │   │   └── materai.service.ts  (674 lines)
│   │   │   ├── pdf/                  # Puppeteer PDF generation
│   │   │   ├── localization/         # i18next backend
│   │   │   ├── reports/              # Business intelligence
│   │   │   ├── business-journey/     # Event tracking
│   │   │   └── ... (26 modules total)
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma            # 67 models, 60+ enums
│   │   ├── seed.ts                  # Auto-seeding with 7 test users
│   │   └── migrations/
│   └── package.json
│
├── frontend/                         # React 19 SPA (60+ pages)
│   ├── src/
│   │   ├── pages/                   # 60+ page components
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── Quotations*.tsx      # 4 quotation pages
│   │   │   ├── Invoices*.tsx        # 4 invoice pages
│   │   │   ├── ProjectDetailPage.tsx  # With profit analysis
│   │   │   └── accounting/          # 19 accounting pages
│   │   ├── components/              # 24 component categories
│   │   │   ├── accessibility/       # WCAG 2.1 AA compliance
│   │   │   ├── accounting/          # Accounting UI components
│   │   │   ├── business/            # Business journey timeline
│   │   │   ├── forms/               # Form components with validation
│   │   │   ├── invoices/            # Invoice-specific components
│   │   │   ├── quotations/          # Quotation components
│   │   │   │   ├── MilestonePaymentTerms.tsx      (18,132 bytes)
│   │   │   │   ├── MilestoneProgressTracker.tsx   (14,409 bytes)
│   │   │   │   └── PaymentMilestoneForm.tsx       (14,226 bytes)
│   │   │   ├── mobile/              # Mobile optimization
│   │   │   └── ui/                  # Shared UI components
│   │   ├── services/                # 23 API service files
│   │   │   ├── invoices.ts
│   │   │   ├── quotations.ts
│   │   │   ├── payment-milestones.ts
│   │   │   └── ...
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── usePaymentMilestones.ts
│   │   │   └── usePriceInheritance.ts
│   │   ├── store/                   # Zustand state
│   │   │   └── auth.ts
│   │   ├── i18n/                    # Internationalization
│   │   │   └── locales/
│   │   │       ├── id.json          # 713 lines Indonesian
│   │   │       └── en.json
│   │   ├── theme/                   # Ant Design theming
│   │   ├── types/                   # TypeScript definitions
│   │   └── utils/
│   ├── vite.config.ts
│   └── package.json
│
├── scripts/                          # 19 deployment & maintenance scripts
│   ├── backup.sh                    # Database backup automation
│   ├── build-production.sh
│   ├── deploy.sh
│   ├── setup-dev.sh
│   ├── start-dev.sh
│   ├── validate-dev-environment.sh
│   └── ... (19 scripts total)
│
├── e2e/                             # End-to-end tests
├── nginx/                           # Reverse proxy configuration
├── database/                        # Database initialization
├── docs/                            # Comprehensive documentation
│   ├── implementation-summary.md
│   ├── testing-matrix.md
│   └── ...
│
├── docker-compose.dev.yml           # Development environment
├── docker-compose.prod.yml          # Production environment
├── Dockerfile                       # Multi-stage Docker build
├── DEPLOYMENT_GUIDE.md              # 25,032 bytes deployment guide
├── INDONESIAN_COMPLIANCE_ANALYSIS.md  # 46,766 bytes compliance docs
├── PDF_MODE_FIX.md                  # Recent bug fix documentation
└── README.md                        # This file
```

---

## 🛠️ Quick Start

### Prerequisites
- **Docker & Docker Compose** (required)
- **Node.js 18+** (for local development)
- **Git**

### Development Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd invoice-generator-monomi

# 2. Start development environment (auto-seeds database)
docker compose -f docker-compose.dev.yml up

# This will:
# ✓ Start PostgreSQL 15 database
# ✓ Start Redis for caching
# ✓ Run database migrations
# ✓ Seed test data (7 users, clients, projects, etc.)
# ✓ Start backend API on port 5000
# ✓ Start frontend dev server on port 3000
```

**Access the application:**
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **API Docs:** http://localhost:5000/api/docs
- **Database:** localhost:5436 (PostgreSQL)
- **Redis:** localhost:6383

### Default Test Accounts

```
Super Admin:       super.admin@monomi.id        / Test1234
Finance Manager:   finance.manager@monomi.id    / Test1234
Project Manager:   project.manager@monomi.id    / Test1234
Accountant:        accountant@monomi.id         / Test1234
Staff:             staff@monomi.id              / Test1234

Legacy Accounts:
Admin:             admin@monomi.id              / password123
User:              user@bisnis.co.id            / password123
```

### Manual Database Operations

```bash
# Manual database reset (if needed)
docker compose -f docker-compose.dev.yml exec app npm run db:reset

# Manual seeding (if needed)
docker compose -f docker-compose.dev.yml exec app npm run db:seed

# Install new backend dependency
docker compose -f docker-compose.dev.yml exec app npm install <package>

# Rebuild containers after dependency changes
docker compose -f docker-compose.dev.yml build

# View logs
docker compose -f docker-compose.dev.yml logs -f app
```

### Production Deployment

```bash
# 1. Configure production environment
cp .env.example .env.production
# Edit .env.production with your production settings

# 2. Build and start production services
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# 3. Check service health
docker compose -f docker-compose.prod.yml ps

# 4. Run database migrations (production)
docker compose -f docker-compose.prod.yml exec app npm run prisma:migrate:deploy

# 5. Create backup
./scripts/backup.sh
```

**Production Services:**
- **Frontend:** Port 3000 (static build)
- **Backend API:** Port 5000 (internal)
- **Database:** PostgreSQL 15 (optimized)
- **Redis:** With persistence & password
- **Nginx:** Port 80 (reverse proxy)
- **Cloudflared:** Automatic HTTPS tunnel

---

## 📊 Database Schema

### Core Entities (67 Models)

**Business Workflow:**
- User (7 roles: SUPER_ADMIN, ADMIN, FINANCE_MANAGER, PROJECT_MANAGER, ACCOUNTANT, FINANCE_STAFF, STAFF)
- Client
- Project (with profit margin tracking)
- Quotation (DRAFT → SENT → APPROVED/DECLINED)
- PaymentMilestone (milestone-based payment terms)
- Invoice (DRAFT → SENT → PAID/OVERDUE)
- Payment

**Accounting (14 models):**
- ChartOfAccounts (Indonesian standard)
- JournalEntry, JournalLineItem
- GeneralLedger, AccountBalance
- FiscalPeriod, FinancialStatement
- ExchangeRate, CashTransaction
- BankTransfer, BankReconciliation, BankReconciliationItem
- DepreciationSchedule, DepreciationEntry

**Expense Management (6 models):**
- Expense, ExpenseCategory
- ExpenseApprovalHistory, ExpenseComment
- ExpenseBudget, ExpenseDocument

**Asset Management (7 models):**
- Asset, AssetReservation
- MaintenanceSchedule, MaintenanceRecord
- AssetKit, AssetKitItem
- ProjectEquipmentUsage

**Purchase-to-Pay (8 models):**
- Vendor, PurchaseOrder, PurchaseOrderItem
- GoodsReceipt, GoodsReceiptItem
- VendorInvoice, VendorInvoiceItem
- AccountsPayable, VendorPayment

**Project Accounting (4 models):**
- WorkInProgress, ProjectCostAllocation
- ProjectTeamMember, LaborEntry

**Configuration (9 models):**
- ProjectTypeConfig, UserPreferences
- CompanySettings, SystemSettings
- FeatureFlag, Document, AuditLog

### Key Relationships

```
Client → Projects → Quotations → PaymentMilestones → Invoices → Payments
                  ↓
            Project Expenses → ExpenseCategories → ChartOfAccounts
                  ↓
          Project Profit Tracking (auto-calculated)
                  ↓
        ProjectCostAllocation → WorkInProgress → Revenue Recognition
```

---

## 🔑 Key Features in Detail

### Payment Milestones

**Create milestone-based payment terms:**
```typescript
// Example: 3-phase payment
Milestone 1: 30% - Down Payment (DP)        - Due: Contract signing
Milestone 2: 40% - Phase 1 Completion       - Due: 30 days
Milestone 3: 30% - Final Payment (Pelunasan) - Due: Project completion
```

**Features:**
- Percentage-based payment allocation
- Deliverables tracking per milestone
- Automatic invoice generation per milestone
- Progress visualization with calendar
- Dependency management
- Indonesian labels (DP, Tahap 1, Pelunasan)

### Price Inheritance Flow

**Automatic data flow:**
```
Project:
  basePrice: Rp 100,000,000
  scopeOfWork: "Complete website development"
  priceBreakdown: {products: [...]}
        ↓ (inherits automatically)
Quotation:
  totalAmount: Rp 100,000,000
  scopeOfWork: "Complete website development"
  priceBreakdown: {products: [...]}
        ↓ (inherits on approval)
Invoice:
  totalAmount: Rp 100,000,000
  scopeOfWork: "Complete website development"
  priceBreakdown: {products: [...]}
```

**Visual indicators** show inheritance path and allow overrides at each level.

### Materai Compliance

**Automatic detection workflow:**
```typescript
Invoice Amount: Rp 5,500,000
    ↓
System detects: amount >= Rp 5,000,000
    ↓
Set flags:
  - materaiRequired: true
  - materaiApplied: false
    ↓
Smart suggestion:
  - Confidence: 98%
  - Urgency: HIGH (due in 7 days)
  - Legal reference: UU No. 13 Tahun 1985
    ↓
User applies materai
    ↓
Audit trail:
  - Applied by: finance.manager@monomi.id
  - Applied at: 2025-11-06 14:30:00
  - Amount: Rp 10,000
```

### Project Profit Tracking

**Auto-calculated metrics:**
```typescript
Project Estimation:
  estimatedExpenses: Rp 70,000,000
  projectedGrossMargin: 30%
  projectedProfit: Rp 30,000,000

Actual Tracking (auto-calculated):
  totalDirectCosts: Rp 65,000,000    // From expenses
  totalIndirectCosts: Rp 8,000,000   // Allocated overhead
  totalInvoicedAmount: Rp 100,000,000 // From invoices

  grossProfit: Rp 35,000,000         // Revenue - Direct
  netProfit: Rp 27,000,000           // Revenue - Total
  grossMarginPercent: 35%
  netMarginPercent: 27%

  budgetVariance: -Rp 3,000,000      // Better than estimated
  budgetVariancePercent: -4.3%       // 4.3% under budget ✓
```

### Indonesian Tax Integration

**PPN (VAT) Calculation:**
```typescript
Expense Amount: Rp 10,000,000
PPN Rate: 11%
PPN Amount: Rp 1,100,000
Total: Rp 11,100,000

// With e-Faktur validation
e-Faktur Number: 010.000-25.12345678
Validation: VALID ✓
```

**PPh (Withholding Tax):**
```typescript
Invoice Amount: Rp 50,000,000
PPh Type: PPh 23 (2%)
PPh Amount: Rp 1,000,000
Net Payment: Rp 49,000,000
```

---

## 🧪 Testing

### Backend Testing
```bash
# Unit tests
docker compose -f docker-compose.dev.yml exec app npm test

# E2E tests
docker compose -f docker-compose.dev.yml exec app npm run test:e2e

# Coverage
docker compose -f docker-compose.dev.yml exec app npm run test:cov
```

### Frontend Testing
```bash
# Component tests
cd frontend
npm test

# Coverage
npm run test:coverage
```

### End-to-End Testing
```bash
cd e2e
npm test
```

---

## 📚 API Documentation

### Interactive API Docs
Access Swagger UI at: **http://localhost:5000/api/docs**

### Key Endpoints

**Authentication:**
```
POST   /api/v1/auth/login          # JWT login
POST   /api/v1/auth/logout         # Logout
GET    /api/v1/auth/me             # Current user
```

**Quotations:**
```
GET    /api/v1/quotations          # List quotations
POST   /api/v1/quotations          # Create quotation
GET    /api/v1/quotations/:id      # Get quotation
PUT    /api/v1/quotations/:id      # Update quotation
POST   /api/v1/quotations/:id/approve    # Approve
POST   /api/v1/quotations/:id/decline    # Decline
```

**Payment Milestones:**
```
POST   /api/v1/quotations/:id/payment-milestones           # Add milestone
GET    /api/v1/quotations/:id/payment-milestones           # List milestones
PUT    /api/v1/quotations/:qId/payment-milestones/:id      # Update
DELETE /api/v1/quotations/:qId/payment-milestones/:id      # Delete
```

**Invoices:**
```
GET    /api/v1/invoices            # List invoices
POST   /api/v1/invoices            # Create invoice
POST   /api/v1/invoices/from-quotation/:quotationId    # Generate from quotation
POST   /api/v1/invoices/from-milestone/:milestoneId    # Generate from milestone
GET    /api/v1/invoices/:id        # Get invoice
PUT    /api/v1/invoices/:id        # Update invoice
POST   /api/v1/invoices/:id/mark-paid    # Mark as paid
GET    /api/v1/invoices/:id/pdf    # Generate PDF
```

**Materai:**
```
GET    /api/v1/materai/check/:invoiceId           # Check requirement
POST   /api/v1/materai/apply/:invoiceId           # Apply materai
POST   /api/v1/materai/smart-detection/:invoiceId # Smart detection
GET    /api/v1/materai/stats                      # Statistics
```

**Accounting:**
```
GET    /api/v1/accounting/chart-of-accounts       # Chart of accounts
POST   /api/v1/accounting/journal-entries         # Create journal entry
GET    /api/v1/accounting/general-ledger          # General ledger
GET    /api/v1/accounting/trial-balance           # Trial balance
GET    /api/v1/accounting/income-statement        # Income statement
GET    /api/v1/accounting/balance-sheet           # Balance sheet
GET    /api/v1/accounting/ar-aging                # AR aging
GET    /api/v1/accounting/ap-aging                # AP aging
```

---

## 🔒 Security & RBAC

### User Roles (7 Levels)

1. **SUPER_ADMIN** - Full system access, user management
2. **ADMIN** - Administrative access to all modules
3. **FINANCE_MANAGER** - Financial management, accounting, reports
4. **PROJECT_MANAGER** - Project management, quotations, invoices
5. **ACCOUNTANT** - Accounting operations, journal entries
6. **FINANCE_STAFF** - Financial data entry, invoice creation
7. **STAFF** - Basic access to view data

### Authentication
- JWT-based authentication
- Passport.js integration
- Token expiration and refresh
- Role-based access control (RBAC)
- Audit logging for sensitive operations

---

## 🐳 Docker Configuration

### Development Environment
```yaml
services:
  app:          # Combined frontend + backend
  db:           # PostgreSQL 15-alpine
  redis:        # Redis 7-alpine for sessions
```

**Features:**
- Auto-seeding enabled (`SKIP_DB_INIT=false`)
- Hot reload with volume mounts
- Health checks for all services
- Port mapping for local access

### Production Environment
```yaml
services:
  frontend:     # Production React build (Node.js server)
  app:          # Production NestJS API
  db:           # PostgreSQL 15 (optimized)
  redis:        # Redis with persistence & password
  nginx:        # Reverse proxy
  cloudflared:  # Cloudflare Tunnel for HTTPS
  backup:       # Automated database backups
```

**Optimizations:**
- Resource limits (frontend: 512MB, app: 2GB, db: 1GB)
- Non-root containers
- Layer caching for faster builds
- Health checks and auto-restart
- Automated backup service

---

## 📖 Documentation

### Complete Documentation Suite

- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** (25,032 bytes) - Complete deployment instructions
- **[INDONESIAN_COMPLIANCE_ANALYSIS.md](./INDONESIAN_COMPLIANCE_ANALYSIS.md)** (46,766 bytes) - Materai, PSAK, tax compliance
- **[PAYMENT_MILESTONE_INVOICE_INTEGRATION_PLAN_REVISED.md](./PAYMENT_MILESTONE_INVOICE_INTEGRATION_PLAN_REVISED.md)** (58,685 bytes) - Milestone implementation
- **[COMPREHENSIVE_ACCOUNTING_INTEGRATION_PLAN.md](./COMPREHENSIVE_ACCOUNTING_INTEGRATION_PLAN.md)** (42,573 bytes) - Accounting system
- **[BAGAN_AKUNTANSI.md](./BAGAN_AKUNTANSI.md)** (52,218 bytes) - Indonesian Chart of Accounts
- **[PDF_MODE_FIX.md](./PDF_MODE_FIX.md)** - Recent bug fix documentation
- **[UX_ANALYSIS_2025_UPGRADED.md](./UX_ANALYSIS_2025_UPGRADED.md)** (58,262 bytes) - UX analysis
- **100+ markdown files** with implementation plans and guides

---

## 🚀 Deployment to Production

### VPS Deployment (Recommended)

**Requirements:**
- Ubuntu 20.04+ or Debian 11+
- 4GB RAM minimum (8GB recommended)
- 40GB disk space
- Docker & Docker Compose installed

**Quick Deploy:**
```bash
# 1. Configure environment
cp .env.example .env.production
# Edit with production settings:
# - Database credentials
# - JWT secret
# - Domain name
# - Cloudflare Tunnel token (optional)

# 2. Build and deploy
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# 3. Run migrations
docker compose -f docker-compose.prod.yml exec app npm run prisma:migrate:deploy

# 4. Check status
docker compose -f docker-compose.prod.yml ps
```

### Cloudflare Tunnel Setup (HTTPS)

**No port forwarding needed!**

1. Get Cloudflare Tunnel token from Cloudflare dashboard
2. Add to `.env.production`: `CLOUDFLARE_TUNNEL_TOKEN=your_token`
3. Deploy with `docker-compose.prod.yml`
4. Access via your Cloudflare domain with automatic HTTPS

---

## 🔧 Maintenance & Operations

### Backup Database
```bash
# Automated daily backups (production)
# Backups stored in /backup volume

# Manual backup
./scripts/backup.sh
```

### Monitor Services
```bash
# Check service status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f frontend

# Restart services
docker compose -f docker-compose.prod.yml restart app
```

### Database Maintenance
```bash
# Access database
docker compose -f docker-compose.prod.yml exec db psql -U invoiceuser -d invoices

# View database size
docker compose -f docker-compose.prod.yml exec db psql -U invoiceuser -d invoices -c "\l+"

# Vacuum database
docker compose -f docker-compose.prod.yml exec db psql -U invoiceuser -d invoices -c "VACUUM ANALYZE;"
```

### Clean Docker
```bash
# Remove unused containers, images, volumes
docker system prune -af

# Remove specific volumes (careful!)
docker volume rm invoice-generator-monomi_postgres_data
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention
```
feat: New feature
fix: Bug fix
docs: Documentation changes
style: Code style changes (formatting)
refactor: Code refactoring
test: Add or update tests
chore: Maintenance tasks
```

---

## 📊 System Statistics

**Codebase Size:**
- Backend: 26 modules, 76 DTOs, 16 accounting services
- Frontend: 60+ pages, 24 component categories, 23 API services
- Database: 67 models, 60+ enums, comprehensive relationships
- Documentation: 100+ markdown files
- Scripts: 19 deployment and maintenance scripts
- Localization: 713-line Indonesian translation file

**Feature Completeness:**
- ✅ Quotation-to-Invoice workflow (100%)
- ✅ Payment Milestones (100%)
- ✅ Project Profit Tracking (100%)
- ✅ Full Accounting System (100%)
- ✅ Expense Management (100%)
- ✅ Asset Management (100%)
- ✅ Purchase-to-Pay (100%)
- ✅ Materai Compliance (100%)
- ✅ Indonesian Tax (PPN/PPh) (100%)
- ✅ Mobile Optimization (100%)
- ✅ WCAG 2.1 AA Accessibility (100%)

---

## 📞 Support & Community

- **Issues:** Create GitHub issues for bugs or feature requests
- **Email:** support@monomi.id (update with actual email)
- **Documentation:** Check the `/docs` directory
- **API Docs:** http://localhost:5000/api/docs (when running)

---

## 📜 License

[Add your license here - e.g., MIT License]

---

## 🎉 Acknowledgments

Built with ❤️ for Indonesian businesses by the Indonesian developer community.

**Special Focus:**
- Indonesian business practices and workflows
- Materai (stamp duty) compliance automation
- Indonesian GAAP (PSAK) accounting standards
- Cultural localization and business etiquette
- Indonesian tax regulations (PPN, PPh, e-Faktur)
- Mobile-first design for Indonesian networks

---

## 🔄 Recent Updates

### Latest Changes (2025-11-06)
- ✅ Fixed PDF mode toggle bug (MouseEvent type guard)
- ✅ Enhanced project PDF export with profit margin analysis
- ✅ Implemented CASCADE sync between Chart of Accounts and Expense Categories
- ✅ Added project status management
- ✅ Enhanced quotation creation UX
- ✅ Mobile table view optimization
- ✅ Comprehensive mobile UX improvements

### Recent Commits
- `348f6e1` - fix: Resolve PDF mode toggle bug with MouseEvent type guard
- `215edea` - fix: Add missing "Estimasi Biaya & Proyeksi Profit" section to project PDF export
- `f8ce2cb` - feat: Implement CASCADE sync between Chart of Accounts and Expense Categories
- `9cc5fb0` - feat: Add project status management and enhance quotation creation UX
- `4382511` - feat: Add Create Quotation floating action button to project detail page

---

**This is a complete, production-ready, enterprise-grade Indonesian Business Management System.**

**Not just an invoice generator - it's a comprehensive financial platform for Indonesian businesses.**
