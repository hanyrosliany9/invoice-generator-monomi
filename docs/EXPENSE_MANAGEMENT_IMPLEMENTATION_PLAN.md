# Expense Management Feature - Implementation Plan

**Project:** Invoice Generator (Monomi Business Management System)
**Feature:** Expense Tracking and Management Module
**Date:** 2025-10-16
**Status:** Planning Phase - DO NOT IMPLEMENT YET

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Codebase Analysis](#codebase-analysis)
3. [2025 Best Practices Research](#2025-best-practices-research)
4. [Feature Requirements](#feature-requirements)
5. [Database Schema Design](#database-schema-design)
6. [Backend API Design](#backend-api-design)
7. [Frontend Implementation](#frontend-implementation)
8. [Integration Points](#integration-points)
9. [Implementation Phases](#implementation-phases)
10. [Testing Strategy](#testing-strategy)
11. [Security Considerations](#security-considerations)
12. [Performance Optimization](#performance-optimization)

---

## Executive Summary

### Goal
Add a comprehensive expense management module to the existing Invoice Generator system to enable tracking of business expenses, categorization, approval workflows, and integration with the existing project/invoice workflow.

### Key Benefits
- **Complete Financial Picture**: Track both income (invoices) and expenses in one system
- **Project Profitability**: Link expenses to projects to calculate true project ROI
- **Indonesian Compliance**: Support for Indonesian tax regulations and receipts
- **Approval Workflows**: Multi-level expense approval system
- **Receipt Management**: Digital receipt storage and OCR scanning
- **Reporting**: Comprehensive expense reports and analytics

### Success Metrics
- Reduce expense entry time by 60% with receipt scanning
- Enable project-level profitability analysis
- Support 100+ expense categories
- Mobile-friendly expense submission
- Real-time expense approval notifications

---

## Codebase Analysis

### Current System Architecture

#### Technology Stack (Verified 2025)
- **Backend**: NestJS 11.1.3 + Prisma + PostgreSQL 15 + TypeScript
- **Frontend**: React 19 + Vite 6/7 + Ant Design 5.x + TypeScript
- **State Management**: Zustand + TanStack Query
- **PDF Generation**: Puppeteer (server-side)
- **Localization**: i18next (Indonesian/English)
- **Container**: Docker + docker-compose

#### Existing Database Models
```prisma
// Current models we'll integrate with:
- User (for expense submitters and approvers)
- Client (expenses may be client-related)
- Project (expenses linked to projects)
- Invoice (expenses may become billable items)
- Payment (track expense reimbursements)
- Document (attach receipts)
- AuditLog (track expense changes)
```

#### Current Routing Pattern
```typescript
// App.tsx follows this pattern for all entities:
/expenses                    // List page
/expenses/new               // Create page (lazy loaded)
/expenses/:id               // Detail page
/expenses/:id/edit          // Edit page (lazy loaded)
```

#### Existing Page Patterns

**List Pages** (e.g., InvoicesPage.tsx):
- Search and filter controls
- Status filters (Ant Design Select)
- Compact metric cards for statistics
- Ant Design Table with sorting/pagination
- Batch operations (select multiple, bulk actions)
- Keyboard shortcuts support
- Export functionality
- Theme-aware colors

**Create Pages** (e.g., InvoiceCreatePage.tsx):
- OptimizedFormLayout with hero card
- Progressive sections (collapsible)
- Auto-save functionality
- Form validation (Ant Design Form)
- Real-time preview
- Mobile optimization
- IDR currency inputs
- Entity relationships (select client/project)

**Detail Pages** (e.g., InvoiceDetailPage.tsx):
- Hero card with entity info
- Status badges and timelines
- Statistics cards (4-column grid)
- Tabbed interface (Details, History, Related)
- Document attachments
- Action buttons (Edit, PDF, Print)
- Floating action buttons
- Modal dialogs for actions

#### Backend Module Pattern

**Module Structure** (from invoices.module.ts):
```typescript
@Module({
  imports: [
    PrismaModule,
    forwardRef(() => QuotationsModule), // Related modules
    NotificationsModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
```

**Expected Files**:
- `expenses.module.ts` - Module definition
- `expenses.controller.ts` - REST API endpoints
- `expenses.service.ts` - Business logic
- `expenses.service.spec.ts` - Unit tests
- `dto/` - Data Transfer Objects
  - `create-expense.dto.ts`
  - `update-expense.dto.ts`
  - `expense-query.dto.ts`

#### Component Patterns

**Reusable Components** (found in codebase):
- `CompactMetricCard` - Statistics display
- `EntityHeroCard` - Page headers
- `FormStatistics` - Real-time form stats
- `ProgressiveSection` - Collapsible form sections
- `FileUpload` - Document attachments
- `IDRCurrencyInput` - Indonesian currency
- `MateraiCompliancePanel` - Tax compliance

---

## 2025 Best Practices Research

### Industry Standards for Expense Management

#### Core Features (from FreshBooks, Expensify, QuickBooks)
1. **Receipt Capture**
   - Mobile photo capture
   - Email forwarding
   - Drag-and-drop upload
   - OCR text extraction

2. **Smart Categorization**
   - AI-powered category suggestions
   - Custom category hierarchies
   - Tax-deductible marking
   - Project/client assignment

3. **Approval Workflows**
   - Multi-level approval chains
   - Approval policies (amount thresholds)
   - Email/push notifications
   - Bulk approval actions

4. **Expense Types**
   - Direct expenses (purchases)
   - Mileage/travel expenses
   - Per diem expenses
   - Recurring expenses
   - Employee reimbursements

5. **Reporting & Analytics**
   - Expense by category
   - Expense by project/client
   - Monthly/quarterly trends
   - Budget vs. actual
   - Tax reports
   - Export to Excel/PDF

6. **Integration Points**
   - Link to projects (profitability)
   - Convert to invoice items (billable)
   - Payment tracking (reimbursements)
   - Accounting export

#### Modern UX Patterns

**Progressive Disclosure**:
- Basic info first (amount, category, date)
- Advanced options hidden (tags, approvers, custom fields)
- Quick entry mode for repetitive expenses

**Mobile-First Design**:
- Large touch targets
- Camera integration
- Offline support with sync
- Voice input for descriptions

**Real-Time Collaboration**:
- Live status updates
- In-app notifications
- Comment threads
- Activity logs

#### Technical Best Practices

**API Design** (RESTful + Events):
```typescript
GET    /api/v1/expenses              // List with filters
POST   /api/v1/expenses              // Create
GET    /api/v1/expenses/:id          // Detail
PATCH  /api/v1/expenses/:id          // Update
DELETE /api/v1/expenses/:id          // Delete
POST   /api/v1/expenses/:id/approve  // Approve
POST   /api/v1/expenses/:id/reject   // Reject
POST   /api/v1/expenses/:id/submit   // Submit for approval
GET    /api/v1/expenses/stats        // Statistics
GET    /api/v1/expenses/export       // Export data
```

**State Management**:
- TanStack Query for server state
- Optimistic updates for better UX
- Infinite scroll for large lists
- Real-time subscriptions (optional)

**Performance**:
- Lazy load images (receipts)
- Virtual scrolling for lists
- Debounced search
- Cached analytics

---

## Feature Requirements

### Functional Requirements

#### FR1: Expense CRUD Operations
- **FR1.1**: Create new expense with amount, date, category, description
- **FR1.2**: Upload receipt images/PDFs (max 10MB per file)
- **FR1.3**: Edit expense details before submission
- **FR1.4**: Delete draft expenses
- **FR1.5**: Duplicate existing expenses for quick entry

#### FR2: Expense Categorization
- **FR2.1**: Predefined expense categories (Office, Travel, Marketing, etc.)
- **FR2.2**: Custom category creation (admin only)
- **FR2.3**: Subcategories support (Travel → Flights, Hotels, Meals)
- **FR2.4**: Tag expenses with custom labels
- **FR2.5**: Mark expenses as tax-deductible

#### FR3: Project & Client Association
- **FR3.1**: Link expense to project (optional)
- **FR3.2**: Link expense to client (optional)
- **FR3.3**: Mark expense as billable/non-billable
- **FR3.4**: Convert billable expenses to invoice line items
- **FR3.5**: View project expense totals

#### FR4: Approval Workflow
- **FR4.1**: Submit expense for approval
- **FR4.2**: Multi-level approval (submitter → manager → finance)
- **FR4.3**: Approve/reject with comments
- **FR4.4**: Email notifications on status changes
- **FR4.5**: Bulk approval for multiple expenses
- **FR4.6**: Approval policy rules (amount thresholds)

#### FR5: Payment & Reimbursement
- **FR5.1**: Track payment status (pending/paid)
- **FR5.2**: Record payment date and method
- **FR5.3**: Link to Payment model for reimbursements
- **FR5.4**: Generate reimbursement reports
- **FR5.5**: Payment summary by user

#### FR6: Reporting & Analytics
- **FR6.1**: Expense dashboard with key metrics
- **FR6.2**: Expense by category report
- **FR6.3**: Expense by project/client report
- **FR6.4**: Monthly expense trends
- **FR6.5**: Budget tracking and alerts
- **FR6.6**: Export to Excel/PDF
- **FR6.7**: Indonesian tax reports (PPN compliance)

#### FR7: Search & Filtering
- **FR7.1**: Search by description, amount, category
- **FR7.2**: Filter by date range
- **FR7.3**: Filter by status (draft, pending, approved, rejected, paid)
- **FR7.4**: Filter by project/client
- **FR7.5**: Filter by submitter/approver
- **FR7.6**: Saved filter presets

### Non-Functional Requirements

#### NFR1: Performance
- Page load time < 2 seconds
- Receipt upload < 5 seconds
- Support 10,000+ expense records
- Real-time search results

#### NFR2: Security
- Role-based access control (RBAC)
- Users can only see their own expenses
- Managers can see team expenses
- Admins can see all expenses
- Encrypted file storage for receipts
- Audit trail for all changes

#### NFR3: Usability
- Mobile-responsive design
- Keyboard shortcuts
- Accessibility (WCAG 2.1 AA)
- Indonesian language support
- Currency in IDR

#### NFR4: Reliability
- Data validation on client and server
- Graceful error handling
- Auto-save drafts
- Backup and recovery
- 99.9% uptime target

---

## Database Schema Design

### New Prisma Models

```prisma
// ============================================
// EXPENSE MANAGEMENT MODELS
// ============================================

// Main Expense Model
model Expense {
  id              String        @id @default(cuid())
  expenseNumber   String        @unique // Auto-generated: EXP-2025-0001

  // Basic Information
  description     String
  amount          Decimal       @db.Decimal(12, 2)
  currency        String        @default("IDR")
  expenseDate     DateTime

  // Categorization
  categoryId      String
  category        ExpenseCategory @relation(fields: [categoryId], references: [id])
  tags            String[]      // Array of custom tags
  isTaxDeductible Boolean       @default(false)
  taxAmount       Decimal?      @db.Decimal(12, 2)

  // Relationships
  userId          String        // Expense submitter
  user            User          @relation(fields: [userId], references: [id])

  projectId       String?
  project         Project?      @relation(fields: [projectId], references: [id])

  clientId        String?
  client          Client?       @relation(fields: [clientId], references: [id])

  // Billable tracking
  isBillable      Boolean       @default(false)
  billableAmount  Decimal?      @db.Decimal(12, 2)
  invoiceId       String?       // If converted to invoice item
  invoice         Invoice?      @relation(fields: [invoiceId], references: [id])

  // Approval workflow
  status          ExpenseStatus @default(DRAFT)
  submittedAt     DateTime?
  approvedAt      DateTime?
  approvedBy      String?
  approver        User?         @relation("ExpenseApprover", fields: [approvedBy], references: [id])
  rejectedAt      DateTime?
  rejectionReason String?

  // Payment tracking
  paymentStatus   ExpensePaymentStatus @default(UNPAID)
  paidAt          DateTime?
  paymentMethod   String?
  paymentReference String?
  paymentId       String?       // Link to Payment model
  payment         Payment?      @relation(fields: [paymentId], references: [id])

  // Notes and metadata
  notes           String?       @db.Text
  receiptNumber   String?       // Merchant receipt number
  merchantName    String?
  location        String?

  // Attachments
  documents       Document[]    // Receipt images/PDFs

  // Audit trail
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  approvalHistory ExpenseApprovalHistory[]
  comments        ExpenseComment[]

  @@index([expenseNumber])
  @@index([status])
  @@index([userId])
  @@index([projectId])
  @@index([clientId])
  @@index([categoryId])
  @@index([expenseDate])
  @@index([status, userId])
  @@index([projectId, status])
  @@index([paymentStatus])
  @@map("expenses")
}

// Expense Categories (hierarchical)
model ExpenseCategory {
  id          String    @id @default(cuid())
  code        String    @unique // TRAVEL, OFFICE, MARKETING
  name        String    // Travel, Office Supplies, Marketing
  description String?
  icon        String?   // Icon name for UI
  color       String    @default("#1890ff") // Display color

  // Hierarchy support
  parentId    String?
  parent      ExpenseCategory? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    ExpenseCategory[] @relation("CategoryHierarchy")

  // Settings
  isActive    Boolean   @default(true)
  isBillable  Boolean   @default(false) // Default billable setting
  requiresReceipt Boolean @default(true)
  approvalRequired Boolean @default(true)
  sortOrder   Int       @default(0)

  // Relations
  expenses    Expense[]
  budgets     ExpenseBudget[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([code])
  @@index([parentId])
  @@index([isActive])
  @@map("expense_categories")
}

// Expense Approval History
model ExpenseApprovalHistory {
  id          String    @id @default(cuid())
  expenseId   String
  expense     Expense   @relation(fields: [expenseId], references: [id], onDelete: Cascade)

  action      ExpenseApprovalAction // SUBMITTED, APPROVED, REJECTED, RECALLED
  actionBy    String
  user        User      @relation(fields: [actionBy], references: [id])

  previousStatus ExpenseStatus
  newStatus      ExpenseStatus

  comments    String?   @db.Text
  actionDate  DateTime  @default(now())

  @@index([expenseId])
  @@index([actionBy])
  @@index([actionDate])
  @@map("expense_approval_history")
}

// Expense Comments (for collaboration)
model ExpenseComment {
  id          String    @id @default(cuid())
  expenseId   String
  expense     Expense   @relation(fields: [expenseId], references: [id], onDelete: Cascade)

  userId      String
  user        User      @relation(fields: [userId], references: [id])

  comment     String    @db.Text
  isInternal  Boolean   @default(false) // Internal notes vs public comments

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([expenseId])
  @@index([userId])
  @@map("expense_comments")
}

// Expense Budgets (optional feature)
model ExpenseBudget {
  id          String    @id @default(cuid())
  name        String
  description String?

  // Budget scope
  categoryId  String?
  category    ExpenseCategory? @relation(fields: [categoryId], references: [id])

  projectId   String?
  project     Project?  @relation(fields: [projectId], references: [id])

  userId      String?   // User-specific budget
  user        User?     @relation(fields: [userId], references: [id])

  // Budget amounts
  amount      Decimal   @db.Decimal(12, 2)
  period      BudgetPeriod // MONTHLY, QUARTERLY, YEARLY, CUSTOM
  startDate   DateTime
  endDate     DateTime

  // Tracking
  spent       Decimal   @db.Decimal(12, 2) @default(0)
  remaining   Decimal   @db.Decimal(12, 2)

  // Alerts
  alertThreshold Int    @default(80) // Alert at 80% spent
  alertSent      Boolean @default(false)

  isActive    Boolean   @default(true)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([categoryId])
  @@index([projectId])
  @@index([userId])
  @@index([startDate, endDate])
  @@map("expense_budgets")
}

// ============================================
// ENUMS
// ============================================

enum ExpenseStatus {
  DRAFT           // Being created
  SUBMITTED       // Submitted for approval
  APPROVED        // Approved by manager
  REJECTED        // Rejected
  PAID            // Reimbursement paid
  CANCELLED       // Cancelled by submitter
}

enum ExpensePaymentStatus {
  UNPAID          // Not yet paid
  PENDING         // Payment in progress
  PAID            // Payment completed
  PARTIAL         // Partially paid
}

enum ExpenseApprovalAction {
  SUBMITTED
  APPROVED
  REJECTED
  RECALLED        // Submitter withdrew submission
  PAYMENT_REQUESTED
  PAYMENT_COMPLETED
}

enum BudgetPeriod {
  MONTHLY
  QUARTERLY
  YEARLY
  CUSTOM
}

// ============================================
// UPDATE EXISTING MODELS
// ============================================

// Add to User model:
// expenses            Expense[]
// approvedExpenses    Expense[]              @relation("ExpenseApprover")
// expenseApprovals    ExpenseApprovalHistory[]
// expenseComments     ExpenseComment[]
// expenseBudgets      ExpenseBudget[]

// Add to Project model:
// expenses            Expense[]
// expenseBudgets      ExpenseBudget[]

// Add to Client model:
// expenses            Expense[]

// Add to Invoice model:
// expenses            Expense[]  // Billable expenses converted to invoice items

// Add to Payment model:
// expenses            Expense[]  // Reimbursement payments

// Add to Document model - already supports multiple entity types:
// expenseId   String?
// expense     Expense?   @relation(fields: [expenseId], references: [id], onDelete: Cascade)
```

### Seed Data for Expense Categories

```typescript
// backend/prisma/seed-data/expense-categories.ts
export const expenseCategories = [
  {
    code: 'OFFICE',
    name: 'Office Expenses',
    description: 'Office supplies and equipment',
    icon: 'bank',
    color: '#1890ff',
    children: [
      { code: 'OFFICE_SUPPLIES', name: 'Office Supplies' },
      { code: 'OFFICE_EQUIPMENT', name: 'Office Equipment' },
      { code: 'OFFICE_FURNITURE', name: 'Furniture' },
    ]
  },
  {
    code: 'TRAVEL',
    name: 'Travel Expenses',
    description: 'Business travel costs',
    icon: 'car',
    color: '#52c41a',
    requiresReceipt: true,
    children: [
      { code: 'TRAVEL_FLIGHTS', name: 'Flights' },
      { code: 'TRAVEL_HOTELS', name: 'Hotels' },
      { code: 'TRAVEL_MEALS', name: 'Meals' },
      { code: 'TRAVEL_TRANSPORT', name: 'Transport' },
    ]
  },
  {
    code: 'MARKETING',
    name: 'Marketing',
    description: 'Marketing and advertising',
    icon: 'bulb',
    color: '#fa8c16',
    isBillable: true,
    children: [
      { code: 'MARKETING_ADS', name: 'Advertising' },
      { code: 'MARKETING_SOCIAL', name: 'Social Media' },
      { code: 'MARKETING_EVENTS', name: 'Events' },
    ]
  },
  {
    code: 'SOFTWARE',
    name: 'Software & Subscriptions',
    description: 'Software licenses and SaaS',
    icon: 'cloud',
    color: '#722ed1',
    children: [
      { code: 'SOFTWARE_SAAS', name: 'SaaS Subscriptions' },
      { code: 'SOFTWARE_LICENSE', name: 'Software Licenses' },
      { code: 'SOFTWARE_HOSTING', name: 'Hosting' },
    ]
  },
  {
    code: 'PROFESSIONAL',
    name: 'Professional Services',
    description: 'Consultants, legal, accounting',
    icon: 'team',
    color: '#13c2c2',
    isBillable: true,
    requiresReceipt: true,
  },
  {
    code: 'UTILITIES',
    name: 'Utilities',
    description: 'Internet, phone, electricity',
    icon: 'wifi',
    color: '#faad14',
  },
  {
    code: 'OTHER',
    name: 'Other Expenses',
    description: 'Miscellaneous expenses',
    icon: 'more',
    color: '#8c8c8c',
  }
]
```

---

## Backend API Design

### Module Structure

```
backend/src/modules/expenses/
├── expenses.module.ts
├── expenses.controller.ts
├── expenses.service.ts
├── expenses.service.spec.ts
├── dto/
│   ├── create-expense.dto.ts
│   ├── update-expense.dto.ts
│   ├── expense-query.dto.ts
│   ├── approve-expense.dto.ts
│   └── expense-stats.dto.ts
├── entities/
│   └── expense.entity.ts
└── guards/
    └── expense-access.guard.ts
```

### API Endpoints

```typescript
// expenses.controller.ts

@Controller('api/v1/expenses')
@UseGuards(AuthGuard, ExpenseAccessGuard)
export class ExpensesController {

  // ============================================
  // CRUD Operations
  // ============================================

  @Get()
  @ApiOperation({ summary: 'Get all expenses with filters' })
  async findAll(@Query() query: ExpenseQueryDto, @Request() req) {
    // Filters: status, categoryId, projectId, clientId, dateRange, userId
    // Pagination: page, limit
    // Sorting: sortBy, sortOrder
    return this.expensesService.findAll(query, req.user)
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get expense statistics' })
  async getStats(@Query() query: ExpenseQueryDto, @Request() req) {
    return this.expensesService.getStats(query, req.user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense by ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.expensesService.findOne(id, req.user)
  }

  @Post()
  @ApiOperation({ summary: 'Create new expense' })
  async create(@Body() createExpenseDto: CreateExpenseDto, @Request() req) {
    return this.expensesService.create(createExpenseDto, req.user)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update expense' })
  async update(
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @Request() req
  ) {
    return this.expensesService.update(id, updateExpenseDto, req.user)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete expense' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.expensesService.remove(id, req.user)
  }

  // ============================================
  // Workflow Actions
  // ============================================

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit expense for approval' })
  async submit(@Param('id') id: string, @Request() req) {
    return this.expensesService.submit(id, req.user)
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve expense' })
  async approve(
    @Param('id') id: string,
    @Body() approveDto: ApproveExpenseDto,
    @Request() req
  ) {
    return this.expensesService.approve(id, approveDto, req.user)
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject expense' })
  async reject(
    @Param('id') id: string,
    @Body() rejectDto: RejectExpenseDto,
    @Request() req
  ) {
    return this.expensesService.reject(id, rejectDto, req.user)
  }

  @Post(':id/recall')
  @ApiOperation({ summary: 'Recall submitted expense' })
  async recall(@Param('id') id: string, @Request() req) {
    return this.expensesService.recall(id, req.user)
  }

  @Post(':id/mark-paid')
  @ApiOperation({ summary: 'Mark expense as paid' })
  async markAsPaid(
    @Param('id') id: string,
    @Body() paymentDto: MarkPaidDto,
    @Request() req
  ) {
    return this.expensesService.markAsPaid(id, paymentDto, req.user)
  }

  // ============================================
  // Batch Operations
  // ============================================

  @Post('batch/approve')
  @ApiOperation({ summary: 'Approve multiple expenses' })
  async batchApprove(@Body() dto: BatchApproveDto, @Request() req) {
    return this.expensesService.batchApprove(dto.expenseIds, req.user)
  }

  @Post('batch/reject')
  @ApiOperation({ summary: 'Reject multiple expenses' })
  async batchReject(@Body() dto: BatchRejectDto, @Request() req) {
    return this.expensesService.batchReject(dto.expenseIds, dto.reason, req.user)
  }

  // ============================================
  // Reporting
  // ============================================

  @Get('reports/by-category')
  @ApiOperation({ summary: 'Expense report by category' })
  async reportByCategory(@Query() query: ReportQueryDto, @Request() req) {
    return this.expensesService.reportByCategory(query, req.user)
  }

  @Get('reports/by-project')
  @ApiOperation({ summary: 'Expense report by project' })
  async reportByProject(@Query() query: ReportQueryDto, @Request() req) {
    return this.expensesService.reportByProject(query, req.user)
  }

  @Get('reports/monthly-trend')
  @ApiOperation({ summary: 'Monthly expense trends' })
  async monthlyTrend(@Query() query: ReportQueryDto, @Request() req) {
    return this.expensesService.monthlyTrend(query, req.user)
  }

  @Get('export')
  @ApiOperation({ summary: 'Export expenses to Excel' })
  async export(@Query() query: ExpenseQueryDto, @Request() req, @Res() res) {
    const excelBuffer = await this.expensesService.exportToExcel(query, req.user)
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=expenses.xlsx'
    })
    res.send(excelBuffer)
  }
}
```

### Data Transfer Objects (DTOs)

```typescript
// dto/create-expense.dto.ts
export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  description: string

  @IsNumber()
  @Min(0)
  amount: number

  @IsString()
  @IsOptional()
  currency?: string = 'IDR'

  @IsDateString()
  expenseDate: string

  @IsString()
  @IsNotEmpty()
  categoryId: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[]

  @IsBoolean()
  @IsOptional()
  isTaxDeductible?: boolean

  @IsNumber()
  @IsOptional()
  taxAmount?: number

  @IsString()
  @IsOptional()
  projectId?: string

  @IsString()
  @IsOptional()
  clientId?: string

  @IsBoolean()
  @IsOptional()
  isBillable?: boolean

  @IsNumber()
  @IsOptional()
  billableAmount?: number

  @IsString()
  @IsOptional()
  notes?: string

  @IsString()
  @IsOptional()
  receiptNumber?: string

  @IsString()
  @IsOptional()
  merchantName?: string

  @IsString()
  @IsOptional()
  location?: string
}

// dto/expense-query.dto.ts
export class ExpenseQueryDto {
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus

  @IsOptional()
  @IsString()
  categoryId?: string

  @IsOptional()
  @IsString()
  projectId?: string

  @IsOptional()
  @IsString()
  clientId?: string

  @IsOptional()
  @IsString()
  userId?: string

  @IsOptional()
  @IsDateString()
  dateFrom?: string

  @IsOptional()
  @IsDateString()
  dateTo?: string

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20

  @IsOptional()
  @IsString()
  sortBy?: string = 'expenseDate'

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc'
}
```

### Service Layer

```typescript
// expenses.service.ts (key methods)

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateExpenseDto, user: User) {
    // Generate expense number
    const expenseNumber = await this.generateExpenseNumber()

    // Create expense
    const expense = await this.prisma.expense.create({
      data: {
        ...dto,
        expenseNumber,
        userId: user.id,
        status: ExpenseStatus.DRAFT,
      },
      include: this.includeRelations(),
    })

    // Create audit log
    await this.createAuditLog(expense, 'CREATE', user)

    return expense
  }

  async submit(id: string, user: User) {
    // Validate expense belongs to user
    const expense = await this.findOne(id, user)
    if (expense.userId !== user.id) {
      throw new ForbiddenException('Cannot submit expense')
    }

    // Check if expense can be submitted
    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new BadRequestException('Expense cannot be submitted')
    }

    // Update status
    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      include: this.includeRelations(),
    })

    // Create approval history
    await this.createApprovalHistory(
      id,
      user.id,
      ExpenseApprovalAction.SUBMITTED,
      ExpenseStatus.DRAFT,
      ExpenseStatus.SUBMITTED
    )

    // Send notification to approvers
    await this.notifyApprovers(updated)

    return updated
  }

  async approve(id: string, dto: ApproveExpenseDto, user: User) {
    // Check if user has approval rights
    await this.checkApprovalRights(id, user)

    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: user.id,
      },
      include: this.includeRelations(),
    })

    // Create approval history
    await this.createApprovalHistory(
      id,
      user.id,
      ExpenseApprovalAction.APPROVED,
      ExpenseStatus.SUBMITTED,
      ExpenseStatus.APPROVED,
      dto.comments
    )

    // Notify submitter
    await this.notificationsService.sendExpenseApproved(expense)

    return expense
  }

  async getStats(query: ExpenseQueryDto, user: User) {
    // Build where clause based on user role and filters
    const where = this.buildWhereClause(query, user)

    // Get aggregated stats
    const stats = await this.prisma.expense.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    })

    // Get stats by status
    const byStatus = await this.prisma.expense.groupBy({
      where,
      by: ['status'],
      _sum: { amount: true },
      _count: true,
    })

    // Get stats by category
    const byCategory = await this.prisma.expense.groupBy({
      where,
      by: ['categoryId'],
      _sum: { amount: true },
      _count: true,
    })

    return {
      total: {
        count: stats._count,
        amount: stats._sum.amount || 0,
      },
      byStatus,
      byCategory,
    }
  }

  private async generateExpenseNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const count = await this.prisma.expense.count({
      where: {
        expenseNumber: {
          startsWith: `EXP-${year}-`
        }
      }
    })
    return `EXP-${year}-${String(count + 1).padStart(4, '0')}`
  }

  private includeRelations() {
    return {
      category: true,
      user: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
      project: true,
      client: true,
      documents: true,
    }
  }
}
```

---

## Frontend Implementation

### Page Structure

```
frontend/src/pages/
├── ExpensesPage.tsx              // List page (similar to InvoicesPage)
├── ExpenseCreatePage.tsx         // Create page (lazy loaded)
├── ExpenseEditPage.tsx           // Edit page (lazy loaded)
└── ExpenseDetailPage.tsx         // Detail page

frontend/src/services/
└── expenses.ts                   // API service

frontend/src/types/
└── expense.ts                    // TypeScript types

frontend/src/components/expenses/
├── ExpenseForm.tsx               // Reusable form
├── ExpenseCategorySelect.tsx     // Category selector
├── ExpenseStatusBadge.tsx        // Status display
└── ExpenseReceiptUpload.tsx      // Receipt upload
```

### ExpensesPage.tsx (List Page)

```typescript
// frontend/src/pages/ExpensesPage.tsx

export const ExpensesPage: React.FC = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { message } = App.useApp()

  // State
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

  // Queries
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', { statusFilter, categoryFilter, dateRange, searchText }],
    queryFn: () => expenseService.getExpenses({
      status: statusFilter,
      categoryId: categoryFilter,
      dateFrom: dateRange?.[0]?.toISOString(),
      dateTo: dateRange?.[1]?.toISOString(),
      search: searchText,
    }),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseService.getCategories,
  })

  const { data: stats } = useQuery({
    queryKey: ['expenses', 'stats'],
    queryFn: expenseService.getStats,
  })

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: expenseService.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      message.success('Expense deleted')
    },
  })

  const submitMutation = useMutation({
    mutationFn: expenseService.submitExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      message.success('Expense submitted for approval')
    },
  })

  // Statistics Cards
  const statisticsCards = (
    <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
      <Col xs={24} sm={12} lg={6}>
        <CompactMetricCard
          icon={<DollarOutlined />}
          iconColor='#1890ff'
          iconBg='rgba(24, 144, 255, 0.15)'
          label='Total Expenses'
          value={formatIDR(stats?.total.amount || 0)}
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <CompactMetricCard
          icon={<ClockCircleOutlined />}
          iconColor='#faad14'
          iconBg='rgba(250, 173, 20, 0.15)'
          label='Pending Approval'
          value={stats?.byStatus?.SUBMITTED?.count || 0}
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <CompactMetricCard
          icon={<CheckCircleOutlined />}
          iconColor='#52c41a'
          iconBg='rgba(82, 196, 26, 0.15)'
          label='Approved'
          value={stats?.byStatus?.APPROVED?.count || 0}
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <CompactMetricCard
          icon={<BankOutlined />}
          iconColor='#722ed1'
          iconBg='rgba(114, 46, 209, 0.15)'
          label='Unpaid'
          value={stats?.byStatus?.APPROVED?.count - stats?.byStatus?.PAID?.count || 0}
        />
      </Col>
    </Row>
  )

  // Table columns
  const columns = [
    {
      title: 'Expense',
      key: 'expense',
      render: (_, expense: Expense) => (
        <div>
          <Button
            type='link'
            onClick={() => navigate(`/expenses/${expense.id}`)}
          >
            {expense.expenseNumber}
          </Button>
          <div className='text-xs text-gray-500'>
            {expense.description}
          </div>
        </div>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'expenseDate',
      key: 'expenseDate',
      render: (date: string) => formatDate(date),
      sorter: true,
    },
    {
      title: 'Category',
      key: 'category',
      render: (_, expense: Expense) => (
        <Tag color={expense.category?.color}>
          {expense.category?.name}
        </Tag>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => formatIDR(amount),
      sorter: true,
    },
    {
      title: 'Project',
      key: 'project',
      render: (_, expense: Expense) =>
        expense.project ? (
          <Button
            type='link'
            onClick={() => navigate(`/projects/${expense.project.id}`)}
          >
            {expense.project.number}
          </Button>
        ) : (
          <Text type='secondary'>-</Text>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: ExpenseStatus) => (
        <ExpenseStatusBadge status={status} />
      ),
      filters: [
        { text: 'Draft', value: 'DRAFT' },
        { text: 'Submitted', value: 'SUBMITTED' },
        { text: 'Approved', value: 'APPROVED' },
        { text: 'Rejected', value: 'REJECTED' },
        { text: 'Paid', value: 'PAID' },
      ],
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, expense: Expense) => (
        <Dropdown
          menu={{
            items: getActionMenuItems(expense),
          }}
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ]

  return (
    <div>
      <Title level={2}>{t('expenses.title')}</Title>

      {statisticsCards}

      {/* Filters */}
      <Space style={{ marginBottom: '16px' }}>
        <Input
          placeholder='Search expenses...'
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />
        <Select
          placeholder='Status'
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 150 }}
          allowClear
        >
          <Option value='DRAFT'>Draft</Option>
          <Option value='SUBMITTED'>Submitted</Option>
          <Option value='APPROVED'>Approved</Option>
          <Option value='REJECTED'>Rejected</Option>
        </Select>
        <Select
          placeholder='Category'
          value={categoryFilter}
          onChange={setCategoryFilter}
          style={{ width: 200 }}
          allowClear
        >
          {categories.map(cat => (
            <Option key={cat.id} value={cat.id}>
              {cat.name}
            </Option>
          ))}
        </Select>
        <RangePicker
          value={dateRange}
          onChange={setDateRange}
          style={{ width: 300 }}
        />
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => navigate('/expenses/new')}
        >
          New Expense
        </Button>
      </Space>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={expenses}
          loading={isLoading}
          rowKey='id'
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} expenses`,
          }}
        />
      </Card>
    </div>
  )
}
```

### ExpenseCreatePage.tsx (Create Page)

```typescript
// frontend/src/pages/ExpenseCreatePage.tsx

export const ExpenseCreatePage: React.FC = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { theme } = useTheme()

  // Queries
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseService.getCategories,
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getProjects,
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: expenseService.createExpense,
    onSuccess: (expense) => {
      message.success('Expense created successfully')
      navigate(`/expenses/${expense.id}`)
    },
    onError: () => {
      message.error('Failed to create expense')
    },
  })

  const handleSubmit = (values: any) => {
    createMutation.mutate({
      ...values,
      expenseDate: values.expenseDate.toISOString(),
    })
  }

  return (
    <OptimizedFormLayout
      hero={
        <EntityHeroCard
          title='Create New Expense'
          subtitle='Record business expenses and submit for approval'
          icon={<DollarOutlined />}
          breadcrumb={['Expenses', 'Create New']}
        />
      }
    >
      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
      >
        {/* Basic Information */}
        <ProgressiveSection
          title='Basic Information'
          subtitle='Expense details and amount'
          defaultOpen={true}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='description'
                label='Description'
                rules={[{ required: true, message: 'Please enter description' }]}
              >
                <Input
                  placeholder='What was this expense for?'
                  size='large'
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name='expenseDate'
                label='Expense Date'
                rules={[{ required: true, message: 'Please select date' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  size='large'
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name='categoryId'
                label='Category'
                rules={[{ required: true, message: 'Please select category' }]}
              >
                <ExpenseCategorySelect
                  categories={categories}
                  size='large'
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name='amount'
                label='Amount (IDR)'
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <IDRCurrencyInput
                  placeholder='Enter expense amount'
                />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Project & Client Association */}
        <ProgressiveSection
          title='Project & Client'
          subtitle='Link expense to project or client (optional)'
          defaultOpen={false}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='projectId'
                label='Project'
              >
                <Select
                  placeholder='Select project'
                  allowClear
                  showSearch
                  size='large'
                >
                  {projects.map(project => (
                    <Option key={project.id} value={project.id}>
                      {project.number} - {project.description}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name='clientId'
                label='Client'
              >
                <Select
                  placeholder='Select client'
                  allowClear
                  showSearch
                  size='large'
                >
                  {clients.map(client => (
                    <Option key={client.id} value={client.id}>
                      {client.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='isBillable'
                valuePropName='checked'
              >
                <Checkbox>Mark as billable to client</Checkbox>
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Receipt & Documentation */}
        <ProgressiveSection
          title='Receipt & Documentation'
          subtitle='Upload receipts and add notes'
          defaultOpen={false}
        >
          <Form.Item
            name='merchantName'
            label='Merchant Name'
          >
            <Input placeholder='e.g., Tokopedia, Grab, etc.' />
          </Form.Item>

          <Form.Item
            name='receiptNumber'
            label='Receipt Number'
          >
            <Input placeholder='Receipt or invoice number' />
          </Form.Item>

          <Form.Item
            name='notes'
            label='Notes'
          >
            <TextArea
              rows={4}
              placeholder='Additional details about this expense...'
            />
          </Form.Item>

          <ExpenseReceiptUpload />
        </ProgressiveSection>

        {/* Tax Information */}
        <ProgressiveSection
          title='Tax Information'
          subtitle='Indonesian tax details'
          defaultOpen={false}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='isTaxDeductible'
                valuePropName='checked'
              >
                <Checkbox>Tax deductible</Checkbox>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name='taxAmount'
                label='PPN Amount (if applicable)'
              >
                <IDRCurrencyInput placeholder='Tax amount' />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Action Buttons */}
        <Card style={{ marginTop: '24px', textAlign: 'center' }}>
          <Space size='large'>
            <Button
              size='large'
              onClick={() => navigate('/expenses')}
            >
              Cancel
            </Button>
            <Button
              type='default'
              size='large'
              icon={<SaveOutlined />}
              htmlType='submit'
              loading={createMutation.isPending}
            >
              Save as Draft
            </Button>
            <Button
              type='primary'
              size='large'
              icon={<SendOutlined />}
              onClick={() => {
                form.validateFields().then(values => {
                  // Create and submit in one action
                  createMutation.mutate(
                    { ...values, autoSubmit: true },
                    {
                      onSuccess: (expense) => {
                        expenseService.submitExpense(expense.id)
                        message.success('Expense created and submitted for approval')
                      },
                    }
                  )
                })
              }}
            >
              Submit for Approval
            </Button>
          </Space>
        </Card>
      </Form>
    </OptimizedFormLayout>
  )
}
```

### ExpenseDetailPage.tsx (Detail Page)

```typescript
// frontend/src/pages/ExpenseDetailPage.tsx

export const ExpenseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()

  // Query
  const { data: expense, isLoading } = useQuery({
    queryKey: ['expense', id],
    queryFn: () => expenseService.getExpense(id!),
    enabled: !!id,
  })

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (data: { comments?: string }) =>
      expenseService.approveExpense(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense', id] })
      message.success('Expense approved')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (reason: string) =>
      expenseService.rejectExpense(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense', id] })
      message.success('Expense rejected')
    },
  })

  const handleApprove = () => {
    modal.confirm({
      title: 'Approve Expense',
      content: (
        <TextArea
          placeholder='Add approval comments (optional)'
          rows={3}
        />
      ),
      onOk: (comments) => {
        approveMutation.mutate({ comments })
      },
    })
  }

  const handleReject = () => {
    modal.confirm({
      title: 'Reject Expense',
      content: (
        <Form.Item
          label='Rejection Reason'
          name='reason'
          rules={[{ required: true, message: 'Please provide a reason' }]}
        >
          <TextArea
            placeholder='Why is this expense being rejected?'
            rows={3}
          />
        </Form.Item>
      ),
      onOk: (reason) => {
        rejectMutation.mutate(reason)
      },
    })
  }

  if (isLoading) {
    return <Card loading />
  }

  if (!expense) {
    return (
      <Result
        status='404'
        title='Expense Not Found'
        extra={
          <Button type='primary' onClick={() => navigate('/expenses')}>
            Back to Expenses
          </Button>
        }
      />
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Hero Card */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align='middle'>
          <Col xs={24} lg={16}>
            <Space direction='vertical' size='small'>
              <Space align='center'>
                <Avatar
                  size={64}
                  icon={<DollarOutlined />}
                  style={{ backgroundColor: expense.category?.color }}
                />
                <div>
                  <Title level={3} style={{ margin: 0 }}>
                    {expense.expenseNumber}
                  </Title>
                  <Text type='secondary' style={{ fontSize: '16px' }}>
                    {formatIDR(expense.amount)}
                  </Text>
                  <div style={{ marginTop: '8px' }}>
                    <ExpenseStatusBadge status={expense.status} />
                    <Tag color={expense.category?.color}>
                      {expense.category?.name}
                    </Tag>
                    {expense.isBillable && (
                      <Tag color='blue'>Billable</Tag>
                    )}
                  </div>
                </div>
              </Space>
            </Space>
          </Col>

          <Col xs={24} lg={8} style={{ textAlign: 'right' }}>
            <Space direction='vertical' size='middle' style={{ width: '100%' }}>
              <Button
                type='primary'
                icon={<EditOutlined />}
                size='large'
                block
                onClick={() => navigate(`/expenses/${id}/edit`)}
                disabled={expense.status !== 'DRAFT'}
              >
                Edit Expense
              </Button>

              {expense.status === 'SUBMITTED' && (
                <>
                  <Button
                    icon={<CheckCircleOutlined />}
                    size='large'
                    block
                    onClick={handleApprove}
                    loading={approveMutation.isPending}
                    style={{
                      backgroundColor: '#52c41a',
                      borderColor: '#52c41a',
                      color: 'white',
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    icon={<CloseCircleOutlined />}
                    size='large'
                    block
                    danger
                    onClick={handleReject}
                    loading={rejectMutation.isPending}
                  >
                    Reject
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title='Amount'
              value={expense.amount}
              formatter={value => formatIDR(Number(value))}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title='Expense Date'
              value={formatDate(expense.expenseDate)}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title='Submitted'
              value={expense.submittedAt ? formatDate(expense.submittedAt) : '-'}
              prefix={<SendOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title='Status'
              value={expense.status}
              valueRender={() => (
                <ExpenseStatusBadge status={expense.status} />
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabbed Interface */}
      <Card>
        <Tabs
          items={[
            {
              key: 'details',
              label: 'Details',
              children: (
                <Descriptions bordered column={2}>
                  <Descriptions.Item label='Expense Number'>
                    {expense.expenseNumber}
                  </Descriptions.Item>
                  <Descriptions.Item label='Status'>
                    <ExpenseStatusBadge status={expense.status} />
                  </Descriptions.Item>
                  <Descriptions.Item label='Description' span={2}>
                    {expense.description}
                  </Descriptions.Item>
                  <Descriptions.Item label='Amount'>
                    {formatIDR(expense.amount)}
                  </Descriptions.Item>
                  <Descriptions.Item label='Category'>
                    <Tag color={expense.category?.color}>
                      {expense.category?.name}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label='Expense Date'>
                    {formatDate(expense.expenseDate)}
                  </Descriptions.Item>
                  <Descriptions.Item label='Submitted By'>
                    {expense.user?.name}
                  </Descriptions.Item>
                  {expense.project && (
                    <Descriptions.Item label='Project' span={2}>
                      <Button
                        type='link'
                        onClick={() => navigate(`/projects/${expense.project.id}`)}
                      >
                        {expense.project.number} - {expense.project.description}
                      </Button>
                    </Descriptions.Item>
                  )}
                  {expense.notes && (
                    <Descriptions.Item label='Notes' span={2}>
                      {expense.notes}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              ),
            },
            {
              key: 'receipts',
              label: 'Receipts',
              children: (
                <div>
                  <FileUpload
                    expenseId={id}
                    documents={expense.documents}
                  />
                </div>
              ),
            },
            {
              key: 'history',
              label: 'Approval History',
              children: (
                <Timeline
                  items={expense.approvalHistory?.map(history => ({
                    children: (
                      <div>
                        <Text strong>{history.action}</Text>
                        <br />
                        <Text type='secondary'>
                          {history.user?.name} • {formatDate(history.actionDate)}
                        </Text>
                        {history.comments && (
                          <div style={{ marginTop: '8px' }}>
                            <Text>{history.comments}</Text>
                          </div>
                        )}
                      </div>
                    ),
                    color: history.action === 'APPROVED' ? 'green' : 'default',
                  }))}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
```

### Service Layer

```typescript
// frontend/src/services/expenses.ts

import { api } from './api'
import type {
  Expense,
  ExpenseCategory,
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseQueryParams,
  ExpenseStats,
} from '../types/expense'

export const expenseService = {
  // List and search
  getExpenses: async (params?: ExpenseQueryParams): Promise<Expense[]> => {
    const response = await api.get('/expenses', { params })
    return response.data.data
  },

  // Get single expense
  getExpense: async (id: string): Promise<Expense> => {
    const response = await api.get(`/expenses/${id}`)
    return response.data.data
  },

  // Create expense
  createExpense: async (data: CreateExpenseDto): Promise<Expense> => {
    const response = await api.post('/expenses', data)
    return response.data.data
  },

  // Update expense
  updateExpense: async (id: string, data: UpdateExpenseDto): Promise<Expense> => {
    const response = await api.patch(`/expenses/${id}`, data)
    return response.data.data
  },

  // Delete expense
  deleteExpense: async (id: string): Promise<void> => {
    await api.delete(`/expenses/${id}`)
  },

  // Workflow actions
  submitExpense: async (id: string): Promise<Expense> => {
    const response = await api.post(`/expenses/${id}/submit`)
    return response.data.data
  },

  approveExpense: async (
    id: string,
    data: { comments?: string }
  ): Promise<Expense> => {
    const response = await api.post(`/expenses/${id}/approve`, data)
    return response.data.data
  },

  rejectExpense: async (id: string, reason: string): Promise<Expense> => {
    const response = await api.post(`/expenses/${id}/reject`, { reason })
    return response.data.data
  },

  recallExpense: async (id: string): Promise<Expense> => {
    const response = await api.post(`/expenses/${id}/recall`)
    return response.data.data
  },

  markAsPaid: async (
    id: string,
    data: { paymentMethod: string; paymentDate: string }
  ): Promise<Expense> => {
    const response = await api.post(`/expenses/${id}/mark-paid`, data)
    return response.data.data
  },

  // Statistics
  getStats: async (params?: ExpenseQueryParams): Promise<ExpenseStats> => {
    const response = await api.get('/expenses/stats', { params })
    return response.data.data
  },

  // Categories
  getCategories: async (): Promise<ExpenseCategory[]> => {
    const response = await api.get('/expense-categories')
    return response.data.data
  },

  // Export
  exportToExcel: async (params?: ExpenseQueryParams): Promise<Blob> => {
    const response = await api.get('/expenses/export', {
      params,
      responseType: 'blob',
    })
    return response.data
  },
}
```

---

## Integration Points

### 1. Project Integration

**Goal**: Link expenses to projects to calculate profitability

**Implementation**:
- Add `expenses` relation to Project model
- Show project expenses in ProjectDetailPage
- Calculate project profitability: `Revenue - Expenses`
- Project expense summary component

```typescript
// frontend/src/components/projects/ProjectExpenseSummary.tsx
export const ProjectExpenseSummary: React.FC<{ projectId: string }> = ({
  projectId,
}) => {
  const { data: expenses } = useQuery({
    queryKey: ['expenses', { projectId }],
    queryFn: () => expenseService.getExpenses({ projectId }),
  })

  const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0

  return (
    <Card title='Project Expenses'>
      <Statistic
        title='Total Expenses'
        value={totalExpenses}
        formatter={value => formatIDR(Number(value))}
      />
      <Button onClick={() => navigate(`/expenses?projectId=${projectId}`)}>
        View All Expenses
      </Button>
    </Card>
  )
}
```

### 2. Invoice Integration (Billable Expenses)

**Goal**: Convert billable expenses into invoice line items

**Implementation**:
- Add "Billable" checkbox to expense form
- Show billable expenses when creating invoices
- Bulk convert expenses to invoice items
- Link expenses to invoices

```typescript
// backend/src/modules/invoices/invoices.service.ts
async createFromExpenses(expenseIds: string[], invoiceDto: CreateInvoiceDto) {
  // Get billable expenses
  const expenses = await this.prisma.expense.findMany({
    where: {
      id: { in: expenseIds },
      isBillable: true,
      status: 'APPROVED',
      invoiceId: null, // Not already invoiced
    },
  })

  // Calculate total from expenses
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.billableAmount, 0)

  // Create invoice
  const invoice = await this.prisma.invoice.create({
    data: {
      ...invoiceDto,
      totalAmount,
    },
  })

  // Link expenses to invoice
  await this.prisma.expense.updateMany({
    where: { id: { in: expenseIds } },
    data: { invoiceId: invoice.id },
  })

  return invoice
}
```

### 3. Payment Integration (Reimbursements)

**Goal**: Track expense reimbursements through Payment model

**Implementation**:
- Link approved expenses to payments
- Reimbursement workflow
- Payment summary by user

```typescript
// backend/src/modules/expenses/expenses.service.ts
async createReimbursementPayment(expenseIds: string[]) {
  const expenses = await this.prisma.expense.findMany({
    where: {
      id: { in: expenseIds },
      status: 'APPROVED',
      paymentStatus: 'UNPAID',
    },
    include: { user: true },
  })

  // Group by user
  const byUser = expenses.reduce((acc, exp) => {
    if (!acc[exp.userId]) {
      acc[exp.userId] = []
    }
    acc[exp.userId].push(exp)
    return acc
  }, {})

  // Create payments
  const payments = []
  for (const [userId, userExpenses] of Object.entries(byUser)) {
    const total = userExpenses.reduce((sum, exp) => sum + exp.amount, 0)

    const payment = await this.prisma.payment.create({
      data: {
        amount: total,
        paymentMethod: 'BANK_TRANSFER',
        status: 'PENDING',
        // Link payment
      },
    })

    await this.prisma.expense.updateMany({
      where: { id: { in: userExpenses.map(e => e.id) } },
      data: { paymentId: payment.id, paymentStatus: 'PENDING' },
    })

    payments.push(payment)
  }

  return payments
}
```

### 4. Dashboard Integration

**Goal**: Show expense metrics on main dashboard

**Implementation**:
```typescript
// frontend/src/pages/DashboardPage.tsx - Add expense widgets

<Row gutter={[16, 16]}>
  {/* Existing invoice/quotation widgets */}

  {/* New expense widgets */}
  <Col xs={24} lg={8}>
    <ExpenseOverviewWidget />
  </Col>

  <Col xs={24} lg={8}>
    <PendingApprovalsWidget />
  </Col>

  <Col xs={24} lg={8}>
    <MonthlyExpenseTrendWidget />
  </Col>
</Row>
```

### 5. Reports Integration

**Goal**: Comprehensive expense reporting

**New Reports**:
1. Expense by Category Report
2. Expense by Project Report
3. Expense by User Report
4. Monthly Expense Trends
5. Budget vs. Actual Report
6. Tax-Deductible Expenses Report

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal**: Database, basic backend, and simple CRUD

**Tasks**:
1. ✅ Database schema design (Prisma migrations)
2. ✅ Seed expense categories
3. ✅ Backend module setup (NestJS)
4. ✅ Basic CRUD API endpoints
5. ✅ Unit tests for service layer
6. ✅ API documentation (Swagger)

**Deliverables**:
- Database models created
- API endpoints functional
- Postman/Swagger docs

### Phase 2: Core Frontend (Week 3-4)

**Goal**: Frontend pages and basic functionality

**Tasks**:
1. ✅ ExpensesPage (list page)
2. ✅ ExpenseCreatePage (create form)
3. ✅ ExpenseDetailPage (detail view)
4. ✅ ExpenseEditPage (edit form)
5. ✅ Expense service layer
6. ✅ Routing setup
7. ✅ Basic search and filters

**Deliverables**:
- All CRUD pages functional
- Navigation working
- Search/filter working

### Phase 3: Approval Workflow (Week 5)

**Goal**: Submission and approval system

**Tasks**:
1. ✅ Submit expense endpoint
2. ✅ Approve/reject endpoints
3. ✅ Approval history tracking
4. ✅ Email notifications
5. ✅ Approval UI in detail page
6. ✅ Bulk approval actions

**Deliverables**:
- Full approval workflow
- Email notifications
- History timeline

### Phase 4: Receipt Management (Week 6)

**Goal**: File upload and document management

**Tasks**:
1. ✅ File upload component
2. ✅ Receipt upload endpoint
3. ✅ Link to Document model
4. ✅ Receipt preview
5. ✅ Multi-file upload

**Deliverables**:
- Receipt upload working
- File preview/download

### Phase 5: Project Integration (Week 7)

**Goal**: Link expenses to projects

**Tasks**:
1. ✅ Project expense summary
2. ✅ Profitability calculation
3. ✅ Billable expense tracking
4. ✅ Convert to invoice items
5. ✅ Project detail page updates

**Deliverables**:
- Project-expense linking
- Profitability reports
- Invoice conversion

### Phase 6: Reporting & Analytics (Week 8)

**Goal**: Comprehensive reporting

**Tasks**:
1. ✅ Expense dashboard
2. ✅ Category reports
3. ✅ Project reports
4. ✅ Monthly trends
5. ✅ Excel export
6. ✅ Charts and visualizations

**Deliverables**:
- All reports functional
- Export features
- Dashboard widgets

### Phase 7: Advanced Features (Week 9-10)

**Goal**: Polish and advanced features

**Tasks**:
1. ✅ Budget tracking
2. ✅ Recurring expenses
3. ✅ Mobile optimization
4. ✅ Keyboard shortcuts
5. ✅ Performance optimization
6. ✅ Indonesian language support

**Deliverables**:
- All advanced features
- Mobile-friendly
- Fully localized

### Phase 8: Testing & Documentation (Week 11-12)

**Goal**: Quality assurance and docs

**Tasks**:
1. ✅ Integration tests
2. ✅ E2E tests (Cypress)
3. ✅ User documentation
4. ✅ API documentation
5. ✅ Performance testing
6. ✅ Security audit

**Deliverables**:
- Test coverage > 80%
- Complete documentation
- Production-ready

---

## Testing Strategy

### Unit Tests (Backend)

```typescript
// backend/src/modules/expenses/expenses.service.spec.ts

describe('ExpensesService', () => {
  let service: ExpensesService
  let prisma: PrismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExpensesService, PrismaService],
    }).compile()

    service = module.get<ExpensesService>(ExpensesService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  describe('create', () => {
    it('should create expense with generated number', async () => {
      const dto = {
        description: 'Test expense',
        amount: 100000,
        expenseDate: new Date(),
        categoryId: 'cat-id',
      }

      const result = await service.create(dto, mockUser)

      expect(result.expenseNumber).toMatch(/EXP-\d{4}-\d{4}/)
      expect(result.status).toBe('DRAFT')
    })
  })

  describe('submit', () => {
    it('should submit expense for approval', async () => {
      const expense = await service.submit('exp-id', mockUser)

      expect(expense.status).toBe('SUBMITTED')
      expect(expense.submittedAt).toBeDefined()
    })

    it('should throw error if not draft', async () => {
      await expect(
        service.submit('approved-expense-id', mockUser)
      ).rejects.toThrow('Expense cannot be submitted')
    })
  })

  describe('approve', () => {
    it('should approve expense', async () => {
      const result = await service.approve('exp-id', { comments: 'OK' }, mockApprover)

      expect(result.status).toBe('APPROVED')
      expect(result.approvedBy).toBe(mockApprover.id)
    })

    it('should create approval history', async () => {
      await service.approve('exp-id', {}, mockApprover)

      const history = await prisma.expenseApprovalHistory.findFirst({
        where: { expenseId: 'exp-id' },
      })

      expect(history.action).toBe('APPROVED')
    })
  })
})
```

### Integration Tests (API)

```typescript
// backend/test/expenses.e2e-spec.ts

describe('Expenses API (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  it('/api/v1/expenses (POST) - creates expense', () => {
    return request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        description: 'Test expense',
        amount: 100000,
        expenseDate: new Date().toISOString(),
        categoryId: 'cat-id',
      })
      .expect(201)
      .expect(res => {
        expect(res.body.data.expenseNumber).toBeDefined()
        expect(res.body.data.status).toBe('DRAFT')
      })
  })

  it('/api/v1/expenses/:id/submit (POST) - submits expense', () => {
    return request(app.getHttpServer())
      .post(`/api/v1/expenses/${expenseId}/submit`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect(res => {
        expect(res.body.data.status).toBe('SUBMITTED')
      })
  })
})
```

### Frontend Tests (React Testing Library)

```typescript
// frontend/src/pages/ExpensesPage.test.tsx

describe('ExpensesPage', () => {
  it('renders expense list', async () => {
    render(<ExpensesPage />)

    await waitFor(() => {
      expect(screen.getByText('EXP-2025-0001')).toBeInTheDocument()
    })
  })

  it('filters expenses by status', async () => {
    render(<ExpensesPage />)

    const statusFilter = screen.getByRole('combobox', { name: /status/i })
    userEvent.selectOptions(statusFilter, 'APPROVED')

    await waitFor(() => {
      expect(screen.queryByText('DRAFT')).not.toBeInTheDocument()
    })
  })

  it('navigates to create page', () => {
    render(<ExpensesPage />)

    const createButton = screen.getByRole('button', { name: /new expense/i })
    userEvent.click(createButton)

    expect(mockNavigate).toHaveBeenCalledWith('/expenses/new')
  })
})
```

### E2E Tests (Cypress)

```typescript
// cypress/e2e/expenses.cy.ts

describe('Expense Management', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/expenses')
  })

  it('creates new expense', () => {
    cy.get('[data-testid="create-expense-button"]').click()

    cy.get('input[name="description"]').type('Office supplies')
    cy.get('input[name="amount"]').type('150000')
    cy.get('select[name="categoryId"]').select('OFFICE')

    cy.get('button[type="submit"]').click()

    cy.url().should('include', '/expenses/')
    cy.contains('EXP-2025-').should('be.visible')
  })

  it('submits expense for approval', () => {
    cy.contains('EXP-2025-0001').click()

    cy.get('[data-testid="submit-button"]').click()
    cy.get('[data-testid="confirm-submit"]').click()

    cy.contains('SUBMITTED').should('be.visible')
  })

  it('approves expense as manager', () => {
    cy.loginAsManager()
    cy.visit('/expenses')

    cy.get('[data-testid="pending-tab"]').click()
    cy.contains('EXP-2025-0001').click()

    cy.get('[data-testid="approve-button"]').click()
    cy.get('textarea[name="comments"]').type('Approved')
    cy.get('[data-testid="confirm-approve"]').click()

    cy.contains('APPROVED').should('be.visible')
  })
})
```

---

## Security Considerations

### 1. Access Control

**Role-Based Permissions**:
```typescript
// backend/src/modules/expenses/guards/expense-access.guard.ts

@Injectable()
export class ExpenseAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user
    const expenseId = request.params.id

    // Users can only access their own expenses
    if (user.role === 'USER') {
      const expense = await this.expensesService.findOne(expenseId)
      return expense.userId === user.id
    }

    // Managers can see team expenses
    if (user.role === 'MANAGER') {
      // Check if user is in same team
      return this.checkTeamAccess(user, expenseId)
    }

    // Admins can see all
    return user.role === 'ADMIN'
  }
}
```

### 2. Input Validation

**DTO Validation**:
- Use class-validator for all DTOs
- Sanitize file uploads
- Validate amount ranges
- Check date validity
- SQL injection prevention (Prisma handles this)

### 3. File Upload Security

**Receipt Upload**:
- Max file size: 10MB
- Allowed types: JPG, PNG, PDF
- Virus scanning (optional)
- Secure storage path
- Access control for downloads

```typescript
// backend/src/modules/expenses/expenses.controller.ts

@Post(':id/receipts')
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
      return cb(new Error('Only image and PDF files are allowed'), false)
    }
    cb(null, true)
  },
}))
async uploadReceipt(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
) {
  return this.expensesService.uploadReceipt(id, file)
}
```

### 4. Audit Trail

**Log All Actions**:
- Who created/updated/deleted
- Status changes
- Approval actions
- Payment records
- IP addresses

### 5. Data Privacy

**PII Protection**:
- Encrypt sensitive fields
- GDPR compliance
- Data retention policy
- Right to deletion

---

## Performance Optimization

### 1. Database Optimization

**Indexes** (already in schema):
- Expense number (unique)
- Status (filter queries)
- User ID (user's expenses)
- Project/Client ID (relationships)
- Date (date range queries)
- Composite indexes for common queries

**Query Optimization**:
```typescript
// Use Prisma include carefully
const expenses = await prisma.expense.findMany({
  where,
  include: {
    category: true,
    user: { select: { id: true, name: true } }, // Only needed fields
    project: { select: { id: true, number: true } },
  },
})
```

### 2. Frontend Performance

**Code Splitting**:
- Lazy load create/edit pages (already in App.tsx)
- Dynamic imports for heavy components
- Route-based code splitting

**Data Fetching**:
- TanStack Query caching
- Optimistic updates
- Infinite scroll for large lists
- Debounced search

**Bundle Optimization**:
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'ant-design': ['antd'],
          'vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
```

### 3. Caching Strategy

**Backend Caching**:
```typescript
// Cache expense categories (rarely change)
@Cacheable({ ttl: 3600 }) // 1 hour
async getCategories() {
  return this.prisma.expenseCategory.findMany({
    where: { isActive: true },
  })
}
```

**Frontend Caching**:
```typescript
// TanStack Query cache
const { data: categories } = useQuery({
  queryKey: ['expense-categories'],
  queryFn: expenseService.getCategories,
  staleTime: 1000 * 60 * 60, // 1 hour
})
```

### 4. Image Optimization

**Receipt Images**:
- Resize large images on upload
- Generate thumbnails
- Lazy load images in list
- Use WebP format
- CDN for static assets

---

## Next Steps

### Before Implementation

1. **Review Plan**: Team review of this document
2. **Feedback**: Gather feedback from stakeholders
3. **Approval**: Get sign-off from product owner
4. **Timeline**: Finalize implementation timeline

### Implementation Kickoff

1. **Database Migration**: Create Prisma migration
2. **Branch Creation**: Create feature branch
3. **Backend Setup**: Scaffold NestJS module
4. **Frontend Setup**: Create page components

### During Implementation

1. **Daily Standups**: Track progress
2. **Code Reviews**: PR reviews required
3. **Testing**: Write tests alongside code
4. **Documentation**: Update docs as you go

### After Implementation

1. **QA Testing**: Full QA pass
2. **User Acceptance**: Stakeholder testing
3. **Documentation**: User guides
4. **Training**: Team training sessions
5. **Deployment**: Staged rollout

---

## Questions & Clarifications

Before implementation, clarify:

1. **Approval Workflow**: Single-level or multi-level approval?
2. **Budget System**: Implement budget tracking in Phase 1 or later?
3. **Recurring Expenses**: Priority for this feature?
4. **Mobile App**: Web-only or native mobile app needed?
5. **Integration**: Any external expense systems to integrate?
6. **Reporting**: Any specific report formats required?
7. **Notifications**: Email only or push notifications too?
8. **Currency**: Support multi-currency or IDR only?
9. **Permissions**: Detailed role permissions matrix?
10. **Compliance**: Any specific Indonesian regulations?

---

## Appendix

### A. Expense Category Hierarchy

```
Office Expenses
├── Office Supplies
├── Office Equipment
└── Furniture

Travel Expenses
├── Flights
├── Hotels
├── Meals
└── Local Transport

Marketing
├── Advertising
├── Social Media
└── Events

Software & Subscriptions
├── SaaS Tools
├── Licenses
└── Hosting

Professional Services
├── Consultants
├── Legal
└── Accounting

Utilities
├── Internet
├── Phone
└── Electricity

Other
```

### B. Status Flow Diagram

```
┌─────────┐
│  DRAFT  │ ←──── Create expense
└────┬────┘
     │ submit()
     ▼
┌───────────┐
│ SUBMITTED │
└─────┬─────┘
      │
      ├─ approve() ──→ ┌──────────┐
      │                │ APPROVED │
      │                └────┬─────┘
      │                     │ markPaid()
      │                     ▼
      │                ┌────────┐
      │                │  PAID  │
      │                └────────┘
      │
      └─ reject() ───→ ┌──────────┐
                       │ REJECTED │
                       └──────────┘
```

### C. API Response Formats

```json
// Success Response
{
  "success": true,
  "data": {
    "id": "exp_clx...",
    "expenseNumber": "EXP-2025-0001",
    "description": "Office supplies",
    "amount": 150000,
    "status": "DRAFT",
    // ... other fields
  },
  "meta": {
    "timestamp": "2025-10-16T10:00:00Z"
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "EXPENSE_NOT_FOUND",
    "message": "Expense with ID xyz not found",
    "details": {}
  },
  "meta": {
    "timestamp": "2025-10-16T10:00:00Z"
  }
}
```

### D. Sample Seed Data

```typescript
// Sample expenses for development
const sampleExpenses = [
  {
    description: 'Office printer paper',
    amount: 250000,
    categoryId: 'office-supplies',
    expenseDate: '2025-10-01',
    status: 'PAID',
  },
  {
    description: 'Client meeting lunch',
    amount: 500000,
    categoryId: 'meals',
    expenseDate: '2025-10-05',
    status: 'APPROVED',
    isBillable: true,
  },
  {
    description: 'Facebook Ads campaign',
    amount: 2000000,
    categoryId: 'advertising',
    expenseDate: '2025-10-10',
    status: 'SUBMITTED',
  },
]
```

---

## Document Metadata

- **Version**: 1.0
- **Last Updated**: 2025-10-16
- **Author**: AI Assistant (Claude Code)
- **Reviewers**: [To be filled]
- **Status**: Planning Phase
- **Estimated Effort**: 12 weeks (3 developers)
- **Priority**: High
- **Dependencies**: None

---

**END OF IMPLEMENTATION PLAN**

This comprehensive plan should serve as the blueprint for implementing the expense management feature. Please review, provide feedback, and get stakeholder approval before beginning implementation.
