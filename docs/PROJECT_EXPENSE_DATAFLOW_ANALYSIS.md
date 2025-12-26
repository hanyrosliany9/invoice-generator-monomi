# Project Expense Dataflow Analysis

## Overview

This document provides a comprehensive analysis of the dataflow for adding expenses to project entries in the Monomi Invoice Generator system.

**Feature**: Link expenses to specific projects for tracking billable costs and project profitability.

**Current Status**: ✅ **ALREADY IMPLEMENTED** - The system fully supports linking expenses to projects!

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [Backend API Flow](#backend-api-flow)
3. [Frontend UI Flow](#frontend-ui-flow)
4. [Complete Dataflow Diagram](#complete-dataflow-diagram)
5. [Code Examples](#code-examples)
6. [Query & Filter Examples](#query--filter-examples)
7. [Best Practices](#best-practices)
8. [Future Enhancements](#future-enhancements)

---

## Database Schema

### Project Model
**File**: `backend/prisma/schema.prisma`

```prisma
model Project {
  id                  String   @id @default(cuid())
  number              String   @unique
  description         String

  // ... other fields

  // ⭐ RELATIONSHIP TO EXPENSES
  expenses            Expense[]  // One-to-many: Project can have many expenses

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

### Expense Model
**File**: `backend/prisma/schema.prisma` (Lines 1023-1465)

```prisma
model Expense {
  id                     String   @id @default(cuid())
  expenseNumber          String   @unique  // EXP-2025-00001
  buktiPengeluaranNumber String   @unique  // BKK-2025-00001

  // PSAK Chart of Accounts
  accountCode            String   // 6-1010, 6-2050, 8-1010
  expenseClass           ExpenseClass

  // Category
  categoryId             String
  category               ExpenseCategory @relation(fields: [categoryId], references: [id])

  // Description
  description            String
  vendorName             String

  // Amounts
  grossAmount            Decimal  @db.Decimal(12, 2)
  ppnAmount              Decimal  @db.Decimal(12, 2)
  withholdingAmount      Decimal? @db.Decimal(12, 2)
  netAmount              Decimal  @db.Decimal(12, 2)
  totalAmount            Decimal  @db.Decimal(12, 2)

  // Indonesian Tax Compliance
  ppnRate                Decimal  @db.Decimal(5, 4)
  ppnCategory            PPNCategory
  eFakturNSFP            String?  // e-Faktur Serial Number
  withholdingTaxType     WithholdingTaxType?

  // ⭐ PROJECT RELATIONSHIP (OPTIONAL)
  projectId              String?  // Can be null (not all expenses are project-related)
  project                Project? @relation(fields: [projectId], references: [id])

  // Client Relationship (Optional)
  clientId               String?
  client                 Client?  @relation(fields: [clientId], references: [id])

  // Billable Tracking
  isBillable             Boolean  @default(false)

  // Workflow Status
  status                 ExpenseStatus         @default(DRAFT)
  paymentStatus          ExpensePaymentStatus  @default(UNPAID)

  // Approval
  userId                 String
  approvedBy             String?

  // Dates
  expenseDate            DateTime
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  @@index([projectId])  // Indexed for fast queries
  @@index([status])
  @@index([expenseDate])
}
```

### Key Schema Insights

1. **Optional Relationship**: `projectId` is **optional** (`String?`) - expenses don't have to be linked to projects
2. **Indexed for Performance**: `projectId` has a database index for fast filtering
3. **Billable Flag**: `isBillable` boolean tracks if expense can be billed to client
4. **Dual Tracking**: Can link to both `project` AND `client` independently

---

## Backend API Flow

### ExpensesController
**File**: `backend/src/modules/expenses/expenses.controller.ts`

#### 1. Create Expense with Project Link

```typescript
@Post()
async create(@Request() req, @Body() createExpenseDto: CreateExpenseDto) {
  // CreateExpenseDto includes optional projectId field
  return this.expensesService.create(req.user.id, createExpenseDto);
}
```

**Request Body Example**:
```json
{
  "description": "Cloud Server Costs - January 2025",
  "categoryId": "cat_cloud_hosting",
  "accountCode": "6-2030",
  "expenseClass": "GENERAL_ADMIN",
  "vendorName": "AWS Indonesia",
  "grossAmount": 5000000,
  "ppnAmount": 550000,
  "netAmount": 5000000,
  "totalAmount": 5550000,
  "ppnRate": 0.11,
  "ppnCategory": "CREDITABLE",
  "isLuxuryGoods": false,
  "withholdingTaxType": "NONE",
  "isBillable": true,
  "projectId": "cmgzipmni0000yz52659g959z",  // ⭐ LINK TO PROJECT
  "clientId": "client_acme_corp",
  "expenseDate": "2025-01-15T00:00:00.000Z"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "exp_xyz123",
    "expenseNumber": "EXP-2025-00042",
    "projectId": "cmgzipmni0000yz52659g959z",
    "project": {
      "id": "cmgzipmni0000yz52659g959z",
      "number": "PH-2025-0001",
      "description": "Website Development for Acme Corp"
    },
    "status": "DRAFT",
    "totalAmount": "5550000.00"
  }
}
```

#### 2. Get All Expenses (with Project Filter)

```typescript
@Get()
async findAll(@Request() req, @Query() query: ExpenseQueryDto) {
  // ExpenseQueryDto supports projectId filter
  return this.expensesService.findAll(req.user.id, query, req.user.role);
}
```

**Query Parameters**:
```
GET /api/v1/expenses?projectId=cmgzipmni0000yz52659g959z&status=APPROVED
```

**Response**:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "exp_1",
        "expenseNumber": "EXP-2025-00042",
        "description": "Cloud Server Costs",
        "projectId": "cmgzipmni0000yz52659g959z",
        "totalAmount": "5550000.00",
        "status": "APPROVED"
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

#### 3. Get Single Expense (with Project Data)

```typescript
@Get(':id')
async findOne(@Param('id') id: string) {
  // Automatically includes related project data
  return this.expensesService.findOne(id);
}
```

**Response** (includes project relation):
```json
{
  "success": true,
  "data": {
    "id": "exp_xyz123",
    "expenseNumber": "EXP-2025-00042",
    "description": "Cloud Server Costs - January 2025",
    "totalAmount": "5550000.00",
    "projectId": "cmgzipmni0000yz52659g959z",
    "project": {
      "id": "cmgzipmni0000yz52659g959z",
      "number": "PH-2025-0001",
      "description": "Website Development for Acme Corp",
      "clientId": "client_acme"
    },
    "isBillable": true,
    "status": "APPROVED",
    "paymentStatus": "PAID"
  }
}
```

#### 4. Update Expense (can modify projectId)

```typescript
@Patch(':id')
async update(
  @Param('id') id: string,
  @Body() updateExpenseDto: UpdateExpenseDto
) {
  // Can update projectId only if status is DRAFT
  return this.expensesService.update(id, updateExpenseDto);
}
```

**Update Request**:
```json
{
  "projectId": "new_project_id",  // Change project link
  "isBillable": false             // Mark as non-billable
}
```

#### 5. Approval Workflow

Expenses linked to projects go through approval workflow:

1. **DRAFT** → **SUBMITTED** (via `/expenses/:id/submit`)
2. **SUBMITTED** → **APPROVED** (via `/expenses/:id/approve`) - Requires FINANCE_MANAGER
3. **APPROVED** → **PAID** (via `/expenses/:id/mark-paid`)

Once approved and linked to a project, the expense counts toward project costs.

---

## Frontend UI Flow

### 1. Service Layer
**File**: `frontend/src/services/expenses.ts`

```typescript
export const expenseService = {
  // Create expense with project link
  createExpense: async (data: CreateExpenseFormData): Promise<Expense> => {
    const response = await apiClient.post('/expenses', data);
    return response.data.data;
  },

  // Get expenses filtered by project
  getExpenses: async (params?: ExpenseQueryParams): Promise<PaginatedExpenseResponse> => {
    // params can include: { projectId: 'xyz' }
    const queryString = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryString.append(key, String(value));
        }
      });
    }
    const response = await apiClient.get(`/expenses?${queryString}`);
    return response.data.data;
  }
};
```

### 2. Type Definitions
**File**: `frontend/src/types/expense.ts`

```typescript
// Expense interface includes project relationship
export interface Expense {
  id: string;
  expenseNumber: string;
  description: string;
  totalAmount: string;

  // ⭐ PROJECT RELATIONSHIP
  projectId?: string;
  project?: {
    id: string;
    number: string;
    description: string;
    clientId: string;
  };

  // Client relationship
  clientId?: string;
  client?: {
    id: string;
    name: string;
    company: string;
  };

  // Billable tracking
  isBillable: boolean;

  status: ExpenseStatus;
  paymentStatus: ExpensePaymentStatus;
  // ... other fields
}

// Form data for creating expense
export interface CreateExpenseFormData {
  description: string;
  categoryId: string;
  grossAmount: number;
  // ... other fields

  // ⭐ OPTIONAL PROJECT LINK
  projectId?: string;
  clientId?: string;
  isBillable: boolean;
}

// Query params for filtering
export interface ExpenseQueryParams {
  search?: string;
  status?: ExpenseStatus;
  categoryId?: string;

  // ⭐ FILTER BY PROJECT
  projectId?: string;
  clientId?: string;

  page?: number;
  limit?: number;
}
```

### 3. Create Expense Page
**File**: `frontend/src/pages/ExpenseCreatePage.tsx` (Lines 455-496)

```typescript
export const ExpenseCreatePage: React.FC = () => {
  const [form] = Form.useForm();

  // Fetch available projects for dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getProjects,
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  });

  return (
    <Form form={form} onFinish={handleSubmit}>
      {/* ... other fields ... */}

      {/* ⭐ PROJECT & CLIENT LINKING SECTION */}
      <Card title='Project & Client (Opsional)'>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Form.Item name='isBillable' label='Dapat Ditagih?' valuePropName='checked'>
              <Switch checkedChildren='Ya' unCheckedChildren='Tidak' />
            </Form.Item>
          </Col>

          <Col xs={24} sm={8}>
            {/* ⭐ PROJECT DROPDOWN */}
            <Form.Item name='projectId' label='Project'>
              <Select placeholder='Pilih project' allowClear>
                {projects.map(p => (
                  <Option key={p.id} value={p.id}>
                    {p.number} - {p.description}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={8}>
            {/* CLIENT DROPDOWN */}
            <Form.Item name='clientId' label='Client'>
              <Select placeholder='Pilih client' allowClear>
                {clients.map(c => (
                  <Option key={c.id} value={c.id}>
                    {c.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </Form>
  );
};
```

### 4. Expenses List Page (with Project Filter)
**File**: `frontend/src/pages/ExpensesPage.tsx`

```typescript
export const ExpensesPage: React.FC = () => {
  const [filters, setFilters] = useState<ExpenseQueryParams>({
    page: 1,
    limit: 20,
  });

  // Fetch expenses with filters (including projectId)
  const { data, isLoading } = useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => expenseService.getExpenses(filters),
  });

  return (
    <>
      {/* Filter section */}
      <Space>
        {/* ⭐ PROJECT FILTER */}
        <Select
          placeholder="Filter by Project"
          allowClear
          onChange={(projectId) => setFilters({ ...filters, projectId })}
        >
          {projects.map(p => (
            <Option key={p.id} value={p.id}>
              {p.number} - {p.description}
            </Option>
          ))}
        </Select>
      </Space>

      {/* Expense table */}
      <Table
        dataSource={data?.data}
        columns={[
          { title: 'Expense Number', dataIndex: 'expenseNumber' },
          { title: 'Description', dataIndex: 'description' },
          {
            title: 'Project',
            dataIndex: ['project', 'number'],
            render: (_, record) => record.project?.number || '-'
          },
          { title: 'Amount', dataIndex: 'totalAmount' },
          { title: 'Status', dataIndex: 'status' },
        ]}
      />
    </>
  );
};
```

---

## Complete Dataflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
│                   (Frontend - React + Ant Design)                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ User creates expense
                                  │ and selects project
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EXPENSE CREATE PAGE                              │
│                 (ExpenseCreatePage.tsx)                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │ Form Fields:                                              │     │
│  │ • Category: "Cloud Hosting"                               │     │
│  │ • Vendor: "AWS Indonesia"                                 │     │
│  │ • Amount: Rp 5,000,000                                    │     │
│  │ • PPN: Rp 550,000 (auto-calculated)                       │     │
│  │ • Is Billable: ✓ Yes                                      │     │
│  │ • Project: [PH-2025-0001] Website Dev  ← PROJECT LINK     │     │
│  │ • Client: Acme Corporation                                │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                     │
│  [Save as Draft]  [Save & Submit]                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Form submission
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND SERVICE LAYER                           │
│                    (expenseService.ts)                              │
│                                                                     │
│  expenseService.createExpense({                                     │
│    description: "Cloud Server Costs - January 2025",               │
│    categoryId: "cat_cloud_hosting",                                │
│    grossAmount: 5000000,                                            │
│    ppnAmount: 550000,                                               │
│    totalAmount: 5550000,                                            │
│    isBillable: true,                                                │
│    projectId: "cmgzipmni0000yz52659g959z",  ← PROJECT ID            │
│    clientId: "client_acme_corp"                                     │
│  })                                                                 │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTP POST Request
                                  │ /api/v1/expenses
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND API LAYER                                │
│              (ExpensesController - NestJS)                          │
│                                                                     │
│  @Post()                                                            │
│  async create(@Body() createExpenseDto: CreateExpenseDto) {        │
│    return this.expensesService.create(userId, createExpenseDto);   │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ DTO Validation
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DTO VALIDATION LAYER                             │
│                 (CreateExpenseDto)                                  │
│                                                                     │
│  class CreateExpenseDto {                                           │
│    @IsString() categoryId: string;           ✓ Required             │
│    @IsString() description: string;          ✓ Required             │
│    @IsNumber() grossAmount: number;          ✓ Required             │
│    @IsNumber() ppnAmount: number;            ✓ Required             │
│                                                                     │
│    @IsOptional()                                                    │
│    @IsString()                                                      │
│    projectId?: string;  ← PROJECT ID OPTIONAL ✓ Valid               │
│                                                                     │
│    @IsOptional()                                                    │
│    @IsString()                                                      │
│    clientId?: string;   ← CLIENT ID OPTIONAL  ✓ Valid               │
│                                                                     │
│    @IsBoolean() isBillable: boolean;         ✓ Valid                │
│  }                                                                  │
│                                                                     │
│  ✓ All validations passed!                                          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Pass to service layer
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                                    │
│                  (ExpensesService)                                  │
│                                                                     │
│  async create(userId: string, dto: CreateExpenseDto) {             │
│    // 1. Generate expense number                                   │
│    const expenseNumber = await this.generateExpenseNumber();       │
│    //    → "EXP-2025-00042"                                         │
│                                                                     │
│    // 2. Generate Bukti Pengeluaran number                         │
│    const bkkNumber = await this.generateBKKNumber();               │
│    //    → "BKK-2025-00042"                                         │
│                                                                     │
│    // 3. Create expense in database with project link              │
│    return await this.prisma.expense.create({                       │
│      data: {                                                        │
│        expenseNumber,                                               │
│        buktiPengeluaranNumber: bkkNumber,                           │
│        description: dto.description,                                │
│        grossAmount: dto.grossAmount,                                │
│        ppnAmount: dto.ppnAmount,                                    │
│        totalAmount: dto.totalAmount,                                │
│        isBillable: dto.isBillable,                                  │
│        projectId: dto.projectId,  ← LINK TO PROJECT                 │
│        clientId: dto.clientId,                                      │
│        userId,                                                      │
│        status: 'DRAFT',                                             │
│        paymentStatus: 'UNPAID',                                     │
│        // ... other fields                                          │
│      },                                                             │
│      include: {                                                     │
│        project: true,  ← INCLUDE PROJECT DATA IN RESPONSE           │
│        client: true,                                                │
│        category: true,                                              │
│      }                                                              │
│    });                                                              │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Database operation
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                                   │
│                   (PostgreSQL + Prisma)                             │
│                                                                     │
│  INSERT INTO "Expense" (                                            │
│    id,                                                              │
│    expenseNumber,                 → 'EXP-2025-00042'                │
│    buktiPengeluaranNumber,        → 'BKK-2025-00042'                │
│    description,                   → 'Cloud Server Costs...'         │
│    categoryId,                    → 'cat_cloud_hosting'             │
│    accountCode,                   → '6-2030'                        │
│    grossAmount,                   → 5000000.00                      │
│    ppnAmount,                     → 550000.00                       │
│    totalAmount,                   → 5550000.00                      │
│    isBillable,                    → true                            │
│    projectId,                     → 'cmgzipmni0000yz52659g959z'  ⭐ │
│    clientId,                      → 'client_acme_corp'              │
│    userId,                        → 'user_john_doe'                 │
│    status,                        → 'DRAFT'                         │
│    paymentStatus,                 → 'UNPAID'                        │
│    createdAt,                     → '2025-10-21T14:30:00.000Z'      │
│    updatedAt                      → '2025-10-21T14:30:00.000Z'      │
│  ) VALUES (...);                                                    │
│                                                                     │
│  ✓ Expense created!                                                 │
│  ✓ Linked to Project via foreign key constraint                    │
│  ✓ Index on projectId enables fast queries                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Return created expense
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    RESPONSE DATA                                    │
│                                                                     │
│  {                                                                  │
│    "success": true,                                                 │
│    "data": {                                                        │
│      "id": "exp_xyz123",                                            │
│      "expenseNumber": "EXP-2025-00042",                             │
│      "buktiPengeluaranNumber": "BKK-2025-00042",                    │
│      "description": "Cloud Server Costs - January 2025",            │
│      "totalAmount": "5550000.00",                                   │
│      "isBillable": true,                                            │
│      "projectId": "cmgzipmni0000yz52659g959z",                      │
│      "project": {  ← RELATED PROJECT DATA INCLUDED                  │
│        "id": "cmgzipmni0000yz52659g959z",                           │
│        "number": "PH-2025-0001",                                    │
│        "description": "Website Development for Acme Corp",          │
│        "clientId": "client_acme_corp"                               │
│      },                                                             │
│      "clientId": "client_acme_corp",                                │
│      "client": {                                                    │
│        "id": "client_acme_corp",                                    │
│        "name": "Acme Corporation",                                  │
│        "company": "PT Acme Indonesia"                               │
│      },                                                             │
│      "status": "DRAFT",                                             │
│      "paymentStatus": "UNPAID",                                     │
│      "createdAt": "2025-10-21T14:30:00.000Z"                        │
│    }                                                                │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTP 201 Created
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND MUTATION HANDLER                        │
│                                                                     │
│  createMutation.onSuccess((expense) => {                            │
│    // 1. Invalidate queries to refresh lists                       │
│    queryClient.invalidateQueries(['expenses']);                    │
│    queryClient.invalidateQueries(['projects']);                    │
│                                                                     │
│    // 2. Show success message                                      │
│    message.success('Expense berhasil dibuat');                     │
│                                                                     │
│    // 3. Navigate to expense detail page                           │
│    navigate(`/expenses/${expense.id}`);                            │
│  });                                                                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Navigate
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EXPENSE DETAIL PAGE                              │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │ Expense: EXP-2025-00042                                   │     │
│  │ Status: Draft                                             │     │
│  │                                                            │     │
│  │ Description: Cloud Server Costs - January 2025            │     │
│  │                                                            │     │
│  │ ⭐ Project: PH-2025-0001 - Website Development             │     │
│  │    Client: Acme Corporation                               │     │
│  │    Billable: Yes                                          │     │
│  │                                                            │     │
│  │ Amount:                                                    │     │
│  │   Gross:      Rp 5,000,000                                │     │
│  │   PPN (11%):  Rp   550,000                                │     │
│  │   Total:      Rp 5,550,000                                │     │
│  │                                                            │     │
│  │ [Submit for Approval] [Edit] [Delete]                     │     │
│  └──────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Code Examples

### Example 1: Create Expense Linked to Project

```typescript
// frontend/src/pages/ExpenseCreatePage.tsx
const handleSubmit = (values: any) => {
  const expenseData: CreateExpenseFormData = {
    // Basic info
    description: "Cloud hosting costs for January 2025",
    categoryId: "cat_cloud_hosting",
    accountCode: "6-2030",
    accountName: "Biaya Hosting & Server",
    expenseClass: "GENERAL_ADMIN",

    // Vendor
    vendorName: "AWS Indonesia",
    vendorNPWP: "01.234.567.8-901.000",

    // Amounts
    grossAmount: 5000000,
    ppnAmount: 550000,
    withholdingAmount: 0,
    netAmount: 5000000,
    totalAmount: 5550000,

    // Tax
    ppnRate: 0.11,
    ppnCategory: "CREDITABLE",
    isLuxuryGoods: false,
    withholdingTaxType: "NONE",

    // e-Faktur (optional)
    eFakturStatus: "NOT_REQUIRED",

    // ⭐ PROJECT LINKING
    isBillable: true,
    projectId: "cmgzipmni0000yz52659g959z",  // Selected from dropdown
    clientId: "client_acme_corp",             // Auto-filled from project

    // Date
    expenseDate: "2025-01-15T00:00:00.000Z"
  };

  createMutation.mutate(expenseData);
};
```

### Example 2: Filter Expenses by Project

```typescript
// frontend/src/pages/ExpensesPage.tsx
const ProjectExpensesTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['expenses', { projectId }],
    queryFn: () => expenseService.getExpenses({
      projectId,
      status: 'APPROVED'  // Only show approved expenses
    })
  });

  return (
    <Table
      dataSource={data?.data}
      columns={[
        { title: 'Date', dataIndex: 'expenseDate' },
        { title: 'Description', dataIndex: 'description' },
        { title: 'Vendor', dataIndex: 'vendorName' },
        {
          title: 'Amount',
          dataIndex: 'totalAmount',
          render: (amount) => formatIDR(amount)
        },
        { title: 'Status', dataIndex: 'paymentStatus' },
      ]}
    />
  );
};
```

### Example 3: Calculate Total Project Expenses

```typescript
// Get all approved expenses for a project
const calculateProjectExpenses = async (projectId: string) => {
  const expenses = await expenseService.getExpenses({
    projectId,
    status: 'APPROVED',
    paymentStatus: 'PAID'
  });

  const totalExpenses = expenses.data.reduce((sum, expense) => {
    return sum + parseFloat(expense.totalAmount);
  }, 0);

  return {
    count: expenses.data.length,
    total: totalExpenses,
    formatted: formatIDR(totalExpenses)
  };
};
```

### Example 4: Backend - Get Project with All Expenses

```typescript
// backend/src/modules/projects/projects.service.ts
async findOneWithExpenses(id: string) {
  return await this.prisma.project.findUnique({
    where: { id },
    include: {
      expenses: {
        where: {
          status: 'APPROVED',
          paymentStatus: 'PAID'
        },
        orderBy: {
          expenseDate: 'desc'
        },
        include: {
          category: true,
          user: {
            select: { name: true, email: true }
          }
        }
      }
    }
  });
}
```

---

## Query & Filter Examples

### 1. Get All Expenses for a Specific Project

**API Request**:
```
GET /api/v1/expenses?projectId=cmgzipmni0000yz52659g959z
```

**Frontend Code**:
```typescript
const { data } = useQuery({
  queryKey: ['project-expenses', projectId],
  queryFn: () => expenseService.getExpenses({ projectId })
});
```

### 2. Get Approved & Paid Expenses for Project

**API Request**:
```
GET /api/v1/expenses?projectId=xyz&status=APPROVED&paymentStatus=PAID
```

**Frontend Code**:
```typescript
const { data } = useQuery({
  queryKey: ['project-paid-expenses', projectId],
  queryFn: () => expenseService.getExpenses({
    projectId,
    status: 'APPROVED',
    paymentStatus: 'PAID'
  })
});
```

### 3. Get Billable Expenses for Client

**API Request**:
```
GET /api/v1/expenses?clientId=client_acme&isBillable=true
```

### 4. Get Expenses by Date Range for Project

**API Request**:
```
GET /api/v1/expenses?projectId=xyz&startDate=2025-01-01&endDate=2025-01-31
```

### 5. Search Expenses within Project

**API Request**:
```
GET /api/v1/expenses?projectId=xyz&search=cloud+hosting
```

---

## Best Practices

### 1. Always Set `isBillable` Flag

When linking expense to project:
```typescript
{
  projectId: "project_xyz",
  isBillable: true,  // ✅ Explicitly mark as billable
  clientId: "client_abc"  // Link to client for invoicing
}
```

### 2. Use Approval Workflow

Don't mark expenses as project costs until approved:
```typescript
// Only include approved expenses in project cost calculations
const projectExpenses = await getExpenses({
  projectId,
  status: 'APPROVED'  // ✅ Only approved expenses
});
```

### 3. Track Payment Status

Differentiate between committed and paid expenses:
```typescript
// Get committed costs (approved but not paid)
const committed = await getExpenses({
  projectId,
  status: 'APPROVED',
  paymentStatus: 'UNPAID'
});

// Get actual costs (paid)
const actual = await getExpenses({
  projectId,
  status: 'APPROVED',
  paymentStatus: 'PAID'
});
```

### 4. Category-based Project Expenses

Track different types of project expenses:
```typescript
// Direct costs (6-1xxx: Selling expenses)
const directCosts = await getExpenses({
  projectId,
  expenseClass: 'SELLING',
  status: 'APPROVED'
});

// Indirect costs (6-2xxx: Admin expenses)
const indirectCosts = await getExpenses({
  projectId,
  expenseClass: 'GENERAL_ADMIN',
  status: 'APPROVED'
});
```

### 5. Indonesian Tax Compliance

Ensure proper tax tracking for project expenses:
```typescript
{
  // PPN tracking
  ppnCategory: 'CREDITABLE',  // Can claim credit
  eFakturNSFP: '010.123-25.12345678',  // e-Faktur number

  // Withholding tax
  withholdingTaxType: 'PPH23',
  buktiPotongNumber: 'BP-2025-00042',

  // Link to project
  projectId: 'xyz',
  isBillable: true
}
```

---

## Future Enhancements

### 1. Add Expense Section to Project Detail Page

**Current State**: Project detail page shows estimated expenses, not actual expenses

**Enhancement**: Add a new "Actual Expenses" section

```typescript
// frontend/src/pages/ProjectDetailPage.tsx
const ActualExpensesSection: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: expenses } = useQuery({
    queryKey: ['project-actual-expenses', projectId],
    queryFn: () => expenseService.getExpenses({
      projectId,
      status: 'APPROVED'
    })
  });

  const totalExpenses = expenses?.data.reduce((sum, exp) =>
    sum + parseFloat(exp.totalAmount), 0
  ) || 0;

  return (
    <Card title="Actual Expenses">
      <Statistic
        title="Total Approved Expenses"
        value={totalExpenses}
        formatter={(value) => formatIDR(value)}
      />

      <Table
        dataSource={expenses?.data}
        columns={[
          { title: 'Date', dataIndex: 'expenseDate' },
          { title: 'Expense #', dataIndex: 'expenseNumber' },
          { title: 'Description', dataIndex: 'description' },
          { title: 'Category', dataIndex: ['category', 'nameId'] },
          { title: 'Amount', dataIndex: 'totalAmount' },
          { title: 'Payment', dataIndex: 'paymentStatus' },
        ]}
      />
    </Card>
  );
};
```

### 2. Budget vs Actual Comparison

Show estimated vs actual expenses side-by-side:

```typescript
const BudgetVsActual: React.FC<{ project: Project }> = ({ project }) => {
  // Parse estimated expenses from project
  const estimated = parseEstimatedExpenses(project.estimatedExpenses);

  // Get actual expenses
  const { data: actual } = useQuery({
    queryKey: ['project-expenses', project.id],
    queryFn: () => getExpenses({ projectId: project.id, status: 'APPROVED' })
  });

  return (
    <Row gutter={[16, 16]}>
      <Col span={8}>
        <Statistic
          title="Estimated Budget"
          value={estimated.total}
          prefix="Rp"
        />
      </Col>
      <Col span={8}>
        <Statistic
          title="Actual Expenses"
          value={actual.total}
          prefix="Rp"
        />
      </Col>
      <Col span={8}>
        <Statistic
          title="Variance"
          value={actual.total - estimated.total}
          prefix="Rp"
          valueStyle={{ color: actual.total > estimated.total ? 'red' : 'green' }}
        />
      </Col>
    </Row>
  );
};
```

### 3. Quick Expense Entry from Project Page

Add "Add Expense" button on project detail page:

```typescript
const QuickExpenseButton: React.FC<{ project: Project }> = ({ project }) => {
  const navigate = useNavigate();

  const handleQuickExpense = () => {
    // Navigate to expense create page with project pre-selected
    navigate('/expenses/create', {
      state: {
        projectId: project.id,
        clientId: project.clientId,
        isBillable: true
      }
    });
  };

  return (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      onClick={handleQuickExpense}
    >
      Add Expense to This Project
    </Button>
  );
};
```

### 4. Expense Timeline Visualization

Show expense timeline for project:

```typescript
import { Timeline } from 'antd';

const ExpenseTimeline: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: expenses } = useQuery({
    queryKey: ['project-expense-timeline', projectId],
    queryFn: () => getExpenses({
      projectId,
      sortBy: 'expenseDate',
      sortOrder: 'asc'
    })
  });

  return (
    <Timeline>
      {expenses?.data.map(expense => (
        <Timeline.Item key={expense.id} color="blue">
          <p><strong>{dayjs(expense.expenseDate).format('DD MMM YYYY')}</strong></p>
          <p>{expense.description}</p>
          <p>Amount: {formatIDR(expense.totalAmount)}</p>
          <Tag color={getExpenseStatusColor(expense.status)}>
            {expense.status}
          </Tag>
        </Timeline.Item>
      ))}
    </Timeline>
  );
};
```

### 5. Project Profitability Report

Calculate actual profit based on revenue and expenses:

```typescript
const ProjectProfitability: React.FC<{ project: Project }> = ({ project }) => {
  const { data: expenses } = useQuery({
    queryKey: ['project-paid-expenses', project.id],
    queryFn: () => getExpenses({
      projectId: project.id,
      status: 'APPROVED',
      paymentStatus: 'PAID'
    })
  });

  const revenue = parseFloat(project.totalRevenue || '0');
  const actualCosts = expenses?.data.reduce((sum, exp) =>
    sum + parseFloat(exp.totalAmount), 0
  ) || 0;

  const profit = revenue - actualCosts;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return (
    <Card title="Actual Profitability">
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Statistic
            title="Total Revenue"
            value={revenue}
            formatter={(v) => formatIDR(v)}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Actual Costs (Paid)"
            value={actualCosts}
            formatter={(v) => formatIDR(v)}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Actual Profit"
            value={profit}
            formatter={(v) => formatIDR(v)}
            valueStyle={{ color: profit > 0 ? 'green' : 'red' }}
          />
        </Col>
        <Col span={24}>
          <Progress
            percent={margin}
            format={(percent) => `${percent?.toFixed(2)}% Margin`}
            status={margin > 20 ? 'success' : margin > 10 ? 'normal' : 'exception'}
          />
        </Col>
      </Row>
    </Card>
  );
};
```

### 6. Bulk Link Expenses to Project

Allow linking multiple existing expenses to a project:

```typescript
const BulkLinkExpenses: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);

  const { data: unlinkdExpenses } = useQuery({
    queryKey: ['unlinked-expenses'],
    queryFn: () => getExpenses({ projectId: null, status: 'DRAFT' })
  });

  const linkMutation = useMutation({
    mutationFn: async (expenseIds: string[]) => {
      return Promise.all(
        expenseIds.map(id =>
          expenseService.updateExpense(id, {
            projectId,
            isBillable: true
          })
        )
      );
    },
    onSuccess: () => {
      message.success(`${selectedExpenseIds.length} expenses linked to project`);
      queryClient.invalidateQueries(['expenses']);
    }
  });

  return (
    <Modal title="Link Existing Expenses to Project">
      <Table
        rowSelection={{
          selectedRowKeys: selectedExpenseIds,
          onChange: setSelectedExpenseIds
        }}
        dataSource={unlinkdExpenses?.data}
        columns={[
          { title: 'Expense #', dataIndex: 'expenseNumber' },
          { title: 'Description', dataIndex: 'description' },
          { title: 'Amount', dataIndex: 'totalAmount' },
        ]}
      />

      <Button
        type="primary"
        onClick={() => linkMutation.mutate(selectedExpenseIds)}
        disabled={selectedExpenseIds.length === 0}
      >
        Link {selectedExpenseIds.length} Expenses
      </Button>
    </Modal>
  );
};
```

---

## Summary

### ✅ What's Already Implemented

1. **Database Schema** - Full support for project-expense relationship
2. **Backend API** - Complete CRUD operations with project filtering
3. **Frontend UI** - Expense create form with project dropdown
4. **Type Safety** - TypeScript types for all data structures
5. **Indonesian Compliance** - Full tax tracking (PPN, PPh, e-Faktur)
6. **Approval Workflow** - DRAFT → SUBMITTED → APPROVED → PAID
7. **Billable Tracking** - Flag expenses as billable to clients

### 🎯 Current Capabilities

- ✅ Create expense and link to project
- ✅ Filter expenses by projectId
- ✅ Get project with all related expenses
- ✅ Update expense's project link (DRAFT only)
- ✅ Track billable vs non-billable expenses
- ✅ Indonesian tax calculations
- ✅ Approval workflow
- ✅ Payment tracking

### 🚀 Recommended Next Steps

1. **Add "Actual Expenses" section to Project Detail Page** - Show real expenses vs estimates
2. **Budget vs Actual Comparison** - Variance analysis
3. **Quick Expense Entry** - Add expense button on project page
4. **Profitability Report** - Revenue vs actual costs
5. **Expense Timeline** - Visual timeline of project expenses
6. **Export Project Report** - Include actual expenses in PDF export

---

*Generated: October 21, 2025*
*Document Type: Technical Dataflow Analysis*
*Status: Complete Implementation Review*
*Purpose: Understanding expense-project integration for future enhancements*
