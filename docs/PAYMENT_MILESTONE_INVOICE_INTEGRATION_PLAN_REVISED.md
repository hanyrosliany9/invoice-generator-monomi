# Payment Milestone Invoice Integration Plan (REVISED)

**Date**: 2025-11-03
**Status**: Ready for Implementation
**Priority**: High
**Estimated Effort**: 40-50 hours (2 weeks for 1 developer)
**Original Plan**: PAYMENT_MILESTONE_INVOICE_INTEGRATION_PLAN.md
**Revision Reason**: Audit revealed significant existing implementation; plan revised to focus on actual gaps

---

## 📊 **EXECUTIVE SUMMARY**

### **What Changed from Original Plan**
- **Timeline**: Reduced from 4 weeks to 2 weeks (50% faster)
- **Effort**: Reduced from 80-100 hours to 40-50 hours
- **Reason**: Database schema and core backend logic **already exist**
- **Focus**: Frontend integration + API path unification + business rules

### **Critical Insight**
The milestone invoice system is **70% built**. The database supports it, and `generateMilestoneInvoice()` fully works. The gaps are:
1. Frontend UI for milestone selection
2. Unifying the two divergent API paths
3. Adding validation to prevent misuse
4. Business rules enforcement

---

## 🔍 **CURRENT STATE AUDIT (Verified 2025-11-03)**

### ✅ **ALREADY IMPLEMENTED (DO NOT REBUILD)**

#### **1. Database Schema - COMPLETE**
```prisma
// backend/prisma/schema.prisma
model Invoice {
  paymentMilestoneId String?
  paymentMilestone   PaymentMilestone? @relation(...)
  @@index([paymentMilestoneId]) // Optimized for queries
}

model PaymentMilestone {
  isInvoiced Boolean @default(false)
  invoices   Invoice[] @relation("PaymentMilestoneInvoices")
}
```
**Status**: ✅ Production-ready, indexed, with proper foreign keys

---

#### **2. Backend Core Logic - COMPLETE**
**File**: `backend/src/modules/quotations/services/payment-milestones.service.ts`

**Method**: `generateMilestoneInvoice(paymentMilestoneId, userId)` (lines 243-328)

**What it does**:
- ✅ Validates milestone exists
- ✅ Prevents duplicate invoices (`if (milestone.isInvoiced)`)
- ✅ Creates invoice with `paymentMilestoneId` linkage
- ✅ Marks `milestone.isInvoiced = true`
- ✅ Auto-calculates materai requirement
- ✅ Handles due date logic (from milestone or calculated)
- ✅ Returns fully populated invoice object

**Status**: ✅ Fully functional, well-tested logic

---

#### **3. Backend API Endpoint - COMPLETE**
**File**: `backend/src/modules/quotations/controllers/payment-milestones.controller.ts`

**Endpoint**:
```
POST /api/quotations/:quotationId/payment-milestones/:id/generate-invoice
```

**Status**: ✅ Working endpoint with authentication

---

#### **4. Frontend Service & Hooks - COMPLETE**
**Files**:
- `frontend/src/services/payment-milestones.ts` (API client methods)
- `frontend/src/hooks/usePaymentMilestones.ts` (React Query hooks)

**Available Hooks**:
- `usePaymentMilestones(quotationId)` - Fetch milestones
- `useGenerateMilestoneInvoice()` - Generate invoice mutation

**Status**: ✅ Production-ready, with React Query caching

---

#### **5. Quotation Creation with Milestones - COMPLETE**
**File**: `frontend/src/components/quotations/MilestonePaymentTerms.tsx`

**Features**:
- ✅ Templates: 50-50, 30-40-30, 20-30-30-20
- ✅ Indonesian payment term names
- ✅ Validation for 100% total percentage
- ✅ Dynamic milestone creation

**Status**: ✅ Working in production

---

### ❌ **CRITICAL GAPS (MUST BUILD)**

#### **Gap #1: Frontend Invoice Creation UI**
**Missing**:
- `MilestoneSelector` component for invoice creation page
- Milestone selection logic in `InvoiceCreatePage.tsx`
- Auto-population of amounts from selected milestone
- Visual progress indicator for milestone invoicing status

**Impact**: Users cannot create milestone invoices from the UI (only via direct API calls)

---

#### **Gap #2: Divergent API Paths (Architectural Issue)**
**Current State**:
```typescript
// Path A: Milestone-specific (WORKS) ✅
POST /api/quotations/:id/payment-milestones/:milestoneId/generate-invoice
→ Uses generateMilestoneInvoice()

// Path B: General invoice creation (BROKEN for milestones) ❌
POST /api/invoices
→ Uses InvoicesService.create()
→ CreateInvoiceDto missing paymentMilestoneId field
→ Doesn't mark milestone as invoiced
```

**Problem**: Frontend developers don't know which endpoint to use. Path B ignores milestones entirely.

**Impact**: Inconsistent invoice creation behavior

---

#### **Gap #3: Missing Validation in createFromQuotation()**
**File**: `backend/src/modules/invoices/invoices.service.ts:143-262`

**Current Behavior**:
- Creates single invoice for full quotation amount
- **Ignores** payment milestones entirely
- No check for `quotation.paymentType === 'MILESTONE_BASED'`

**Risk**: Users can accidentally bypass milestone system by clicking "Create Invoice from Quotation"

**Impact**: Data integrity issues, incorrect financial tracking

---

#### **Gap #4: Missing Business Rules**
**Undefined Rules**:
1. Can milestones be invoiced out of sequence? (e.g., Milestone 3 before Milestone 1)
2. What happens if quotation total changes after first milestone invoice?
3. Can milestone invoices be deleted/cancelled?
4. Who has permission to create milestone invoices?
5. Should all users see "Generate All Invoices" button?

**Impact**: Ambiguous behavior, potential accounting errors

---

## 📋 **REVISED IMPLEMENTATION PLAN**

---

## **PHASE 1: Backend API Unification (3 days)**

### **Goal**: Single, consistent invoice creation path for all invoice types

---

### **Task 1.1: Add paymentMilestoneId to CreateInvoiceDto**
**Priority**: CRITICAL
**Effort**: 1 hour
**File**: `backend/src/modules/invoices/dto/create-invoice.dto.ts`

**Add after line 40**:
```typescript
@ApiProperty({
  description: "ID payment milestone (untuk invoice berbasis termin)",
  example: "clx123456789",
  required: false,
})
@IsOptional()
@IsString({ message: "ID payment milestone harus berupa string yang valid" })
paymentMilestoneId?: string;
```

**Validation Rule**:
```typescript
// Add custom validator to ensure mutual exclusivity
@ValidateIf(o => o.paymentMilestoneId)
@IsEmpty({ message: "Tidak dapat mengubah totalAmount jika paymentMilestoneId diset" })
manualAmountOverride?: any;
```

---

### **Task 1.2: Enhance InvoicesService.create() with Milestone Support**
**Priority**: CRITICAL
**Effort**: 4 hours
**File**: `backend/src/modules/invoices/invoices.service.ts:35-141`

**Changes**:

**1. Add milestone validation (before line 70)**:
```typescript
// If paymentMilestoneId provided, validate and inherit data
let paymentMilestone = null;
if (createInvoiceDto.paymentMilestoneId) {
  paymentMilestone = await this.prisma.paymentMilestone.findUnique({
    where: { id: createInvoiceDto.paymentMilestoneId },
    include: {
      quotation: true,
      invoices: true, // Check for existing invoices
    },
  });

  if (!paymentMilestone) {
    throw new NotFoundException(
      'Payment milestone tidak ditemukan'
    );
  }

  // CRITICAL: Prevent duplicate milestone invoices
  if (paymentMilestone.isInvoiced) {
    const existingInvoice = paymentMilestone.invoices[0];
    throw new ConflictException({
      message: 'Milestone ini sudah memiliki invoice',
      existingInvoiceId: existingInvoice.id,
      existingInvoiceNumber: existingInvoice.invoiceNumber,
      createdAt: existingInvoice.creationDate,
    });
  }

  // Validate milestone belongs to quotation (if quotationId provided)
  if (createInvoiceDto.quotationId &&
      paymentMilestone.quotationId !== createInvoiceDto.quotationId) {
    throw new BadRequestException(
      'Payment milestone tidak sesuai dengan quotation'
    );
  }

  // Override amounts with milestone data (prevent manual tampering)
  createInvoiceDto.totalAmount = Number(paymentMilestone.paymentAmount);
  createInvoiceDto.amountPerProject = Number(paymentMilestone.paymentAmount);
  createInvoiceDto.quotationId = paymentMilestone.quotationId;
}
```

**2. Update invoice creation (inside transaction at line 102)**:
```typescript
const invoice = await prisma.invoice.create({
  data: {
    ...sanitizedData,
    invoiceNumber,
    materaiRequired,
    materaiApplied: createInvoiceDto.materaiApplied || false,
    priceBreakdown: priceBreakdown,
    paymentMilestoneId: createInvoiceDto.paymentMilestoneId, // ADD THIS
    createdBy: userId,
  },
  include: {
    client: true,
    project: true,
    paymentMilestone: true, // Include milestone in response
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  },
});
```

**3. CRITICAL: Mark milestone as invoiced (INSIDE transaction)**:
```typescript
// MUST be inside transaction for atomicity
if (paymentMilestone) {
  await prisma.paymentMilestone.update({
    where: { id: paymentMilestone.id },
    data: { isInvoiced: true },
  });
}
```

**Why this is critical**: If invoice creation succeeds but milestone update fails, you get duplicate invoices. Transaction ensures atomicity.

---

### **Task 1.3: Add Validation to createFromQuotation()**
**Priority**: HIGH
**Effort**: 2 hours
**File**: `backend/src/modules/invoices/invoices.service.ts:143-262`

**Add after line 146** (after fetching quotation):
```typescript
const quotation = await this.quotationsService.findOne(quotationId);

// BLOCK: Check if quotation is milestone-based
if (quotation.paymentType === 'MILESTONE_BASED') {
  const milestones = await this.prisma.paymentMilestone.findMany({
    where: { quotationId },
    orderBy: { milestoneNumber: 'asc' },
  });

  if (milestones.length > 0) {
    throw new BadRequestException({
      message: 'Quotation ini menggunakan termin pembayaran. ' +
               'Silakan buat invoice untuk setiap milestone secara terpisah.',
      code: 'MILESTONE_BASED_QUOTATION',
      quotationId,
      milestones: milestones.map(m => ({
        id: m.id,
        number: m.milestoneNumber,
        name: m.nameId || m.name,
        amount: m.paymentAmount,
        isInvoiced: m.isInvoiced,
      })),
    });
  }
}
```

**Frontend Handling**:
```typescript
// When catching this error, show user-friendly message
if (error.code === 'MILESTONE_BASED_QUOTATION') {
  message.error({
    content: 'Quotation ini menggunakan termin pembayaran. Pilih milestone terlebih dahulu.',
    duration: 5,
  });
  // Optionally redirect to invoice create page with milestone selector
}
```

---

### **Task 1.4: Refactor generateMilestoneInvoice() to Use Unified Path**
**Priority**: MEDIUM (Optimization)
**Effort**: 2 hours
**File**: `backend/src/modules/quotations/services/payment-milestones.service.ts:243-328`

**Current**: `generateMilestoneInvoice()` has duplicate invoice creation logic

**Better**: Make it call `InvoicesService.create()`

**Refactor**:
```typescript
async generateMilestoneInvoice(
  paymentMilestoneId: string,
  userId: string,
): Promise<any> {
  // Validate milestone exists
  const milestone = await this.prisma.paymentMilestone.findUnique({
    where: { id: paymentMilestoneId },
    include: {
      quotation: {
        include: { client: true, project: true },
      },
    },
  });

  if (!milestone) {
    throw new NotFoundException('Payment milestone tidak ditemukan');
  }

  if (milestone.isInvoiced) {
    throw new BadRequestException('Milestone sudah memiliki invoice');
  }

  const quotation = milestone.quotation;

  // Calculate due date
  let dueDate = milestone.dueDate || this.calculateMilestoneDueDate(milestone);

  // Get company settings for payment info
  const companySettings = await this.getCompanySettings();
  const paymentInfo = this.generateSmartPaymentInfo(companySettings);

  // UNIFIED PATH: Call InvoicesService.create() with paymentMilestoneId
  const invoice = await this.invoicesService.create({
    paymentMilestoneId: paymentMilestoneId, // This triggers milestone logic
    quotationId: quotation.id,
    clientId: quotation.clientId,
    projectId: quotation.projectId,
    amountPerProject: Number(milestone.paymentAmount),
    totalAmount: Number(milestone.paymentAmount),
    dueDate: dueDate.toISOString(),
    paymentInfo,
    terms: quotation.terms,
    scopeOfWork: quotation.scopeOfWork,
    priceBreakdown: quotation.priceBreakdown as any,
  }, userId);

  return invoice;
}
```

**Benefits**:
- Single source of truth for invoice creation
- Consistent validation logic
- Easier to maintain
- Audit logging happens in one place

---

### **Task 1.5: Add Concurrent Invoice Creation Protection**
**Priority**: HIGH (Data Integrity)
**Effort**: 3 hours
**File**: `backend/src/modules/invoices/invoices.service.ts`

**Problem**: Two users clicking "Create Invoice" for same milestone simultaneously

**Solution**: Database-level unique constraint + optimistic locking

**1. Add unique partial index to Prisma schema**:
```prisma
// backend/prisma/schema.prisma
model Invoice {
  // ... existing fields

  @@unique([paymentMilestoneId],
    where: { paymentMilestoneId: { not: null } },
    name: "unique_milestone_invoice"
  )
}
```

**2. Handle constraint violation**:
```typescript
try {
  const invoice = await prisma.invoice.create({...});
} catch (error) {
  if (error.code === 'P2002' && error.meta?.target?.includes('paymentMilestoneId')) {
    throw new ConflictException(
      'Invoice untuk milestone ini sedang dibuat oleh user lain. Silakan refresh halaman.'
    );
  }
  throw error;
}
```

**3. Create migration**:
```bash
npx prisma migrate dev --name add_unique_milestone_invoice_constraint
```

---

## **PHASE 2: Frontend UI Components (5 days)**

### **Goal**: Intuitive UI for milestone-based invoice creation

---

### **Task 2.1: Create MilestoneSelector Component**
**Priority**: CRITICAL
**Effort**: 2 days
**New File**: `frontend/src/components/invoices/MilestoneSelector.tsx`

**Component Requirements**:

```typescript
import { Radio, Card, Tag, Space, Typography, Tooltip } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { PaymentMilestone } from '@/types/quotation';
import { formatIDR } from '@/utils/currency';

const { Text } = Typography;

interface MilestoneSelectorProps {
  quotationId: string;
  selectedMilestoneId: string | null;
  onSelect: (milestoneId: string, milestone: PaymentMilestone) => void;
  disabled?: boolean;
}

export const MilestoneSelector: React.FC<MilestoneSelectorProps> = ({
  quotationId,
  selectedMilestoneId,
  onSelect,
  disabled = false,
}) => {
  const { data: milestones = [], isLoading } = usePaymentMilestones(quotationId);

  if (isLoading) {
    return <Skeleton active />;
  }

  if (milestones.length === 0) {
    return (
      <Alert
        type="warning"
        message="Quotation ini tidak memiliki payment milestone"
        description="Quotation harus memiliki payment milestone untuk membuat invoice termin"
      />
    );
  }

  // Check for out-of-sequence selection
  const firstUnInvoiced = milestones.find(m => !m.isInvoiced);

  const isOutOfSequence = (milestone: PaymentMilestone) => {
    return firstUnInvoiced &&
           milestone.id !== firstUnInvoiced.id &&
           !milestone.isInvoiced;
  };

  return (
    <div className="milestone-selector">
      <Radio.Group
        value={selectedMilestoneId}
        onChange={(e) => {
          const milestone = milestones.find(m => m.id === e.target.value);
          if (milestone) onSelect(milestone.id, milestone);
        }}
        style={{ width: '100%' }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {milestones.map((milestone) => {
            const isInvoiced = milestone.isInvoiced;
            const outOfSequence = isOutOfSequence(milestone);

            return (
              <Card
                key={milestone.id}
                size="small"
                className={`milestone-card ${isInvoiced ? 'invoiced' : ''} ${outOfSequence ? 'out-of-sequence' : ''}`}
                style={{
                  opacity: isInvoiced ? 0.6 : 1,
                  borderColor: outOfSequence ? '#faad14' : undefined,
                }}
              >
                <Radio
                  value={milestone.id}
                  disabled={disabled || isInvoiced}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {/* Header */}
                    <Space>
                      <Text strong>
                        Milestone {milestone.milestoneNumber}
                      </Text>
                      <Text type="secondary">•</Text>
                      <Text>
                        {milestone.nameId || milestone.name}
                      </Text>
                      {isInvoiced && (
                        <Tag icon={<CheckCircleOutlined />} color="success">
                          Sudah di-invoice
                        </Tag>
                      )}
                      {outOfSequence && (
                        <Tooltip title="Anda melewati milestone sebelumnya">
                          <Tag icon={<WarningOutlined />} color="warning">
                            Tidak berurutan
                          </Tag>
                        </Tooltip>
                      )}
                    </Space>

                    {/* Amount */}
                    <Space>
                      <Text strong style={{ fontSize: '18px' }}>
                        {formatIDR(milestone.paymentAmount)}
                      </Text>
                      <Tag color="blue">{milestone.paymentPercentage}%</Tag>
                    </Space>

                    {/* Due Date */}
                    {milestone.dueDate && (
                      <Space>
                        <ClockCircleOutlined />
                        <Text type="secondary">
                          Jatuh tempo: {new Date(milestone.dueDate).toLocaleDateString('id-ID')}
                        </Text>
                      </Space>
                    )}

                    {/* Description */}
                    {milestone.descriptionId && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {milestone.descriptionId}
                      </Text>
                    )}
                  </Space>
                </Radio>
              </Card>
            );
          })}
        </Space>
      </Radio.Group>
    </div>
  );
};
```

**CSS Styling**:
```css
/* Add to global styles or component styles */
.milestone-card {
  transition: all 0.3s ease;
}

.milestone-card:hover:not(.invoiced) {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

.milestone-card.invoiced {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.milestone-card.out-of-sequence {
  border-width: 2px;
  border-style: dashed;
}
```

---

### **Task 2.2: Create MilestoneProgress Component**
**Priority**: MEDIUM
**Effort**: 1 day
**New File**: `frontend/src/components/invoices/MilestoneProgress.tsx`

```typescript
import { Card, Progress, Space, Typography, List, Tag } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useMilestoneProgress } from '@/hooks/usePaymentMilestones';
import { formatIDR } from '@/utils/currency';

const { Text, Title } = Typography;

interface MilestoneProgressProps {
  quotationId: string;
}

export const MilestoneProgress: React.FC<MilestoneProgressProps> = ({
  quotationId,
}) => {
  const { data: milestones = [], isLoading } = usePaymentMilestones(quotationId);

  if (isLoading || milestones.length === 0) {
    return null;
  }

  const invoicedCount = milestones.filter(m => m.isInvoiced).length;
  const totalCount = milestones.length;
  const percentage = Math.round((invoicedCount / totalCount) * 100);

  const totalAmount = milestones.reduce((sum, m) => sum + Number(m.paymentAmount), 0);
  const invoicedAmount = milestones
    .filter(m => m.isInvoiced)
    .reduce((sum, m) => sum + Number(m.paymentAmount), 0);

  return (
    <Card size="small">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Progress Header */}
        <div>
          <Title level={5}>Progress Invoice Termin</Title>
          <Progress
            percent={percentage}
            status={percentage === 100 ? 'success' : 'active'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
          <Space>
            <Text strong>
              {invoicedCount} dari {totalCount} milestone sudah di-invoice
            </Text>
            <Text type="secondary">
              ({formatIDR(invoicedAmount)} / {formatIDR(totalAmount)})
            </Text>
          </Space>
        </div>

        {/* Milestone List */}
        <List
          size="small"
          dataSource={milestones}
          renderItem={(milestone) => (
            <List.Item>
              <Space>
                {milestone.isInvoiced ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <ClockCircleOutlined style={{ color: '#faad14' }} />
                )}
                <Text>
                  Milestone {milestone.milestoneNumber}: {milestone.nameId || milestone.name}
                </Text>
                <Text type="secondary">
                  {formatIDR(milestone.paymentAmount)}
                </Text>
                {milestone.isInvoiced ? (
                  <Tag color="success">Invoiced</Tag>
                ) : (
                  <Tag color="default">Pending</Tag>
                )}
              </Space>
            </List.Item>
          )}
        />
      </Space>
    </Card>
  );
};
```

---

### **Task 2.3: Integrate MilestoneSelector into InvoiceCreatePage**
**Priority**: CRITICAL
**Effort**: 2 days
**File**: `frontend/src/pages/InvoiceCreatePage.tsx`

**Changes Required**:

**1. Add state for milestone selection (after line 77)**:
```typescript
const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
const [selectedQuotationPaymentType, setSelectedQuotationPaymentType] = useState<string | null>(null);
```

**2. Fetch milestones when quotation is selected**:
```typescript
// Add to existing queries (around line 117)
const { data: quotationMilestones = [], isLoading: milestonesLoading } = useQuery({
  queryKey: ['paymentMilestones', 'quotation', prefilledQuotationId],
  queryFn: () => paymentMilestonesService.getQuotationMilestones(prefilledQuotationId!),
  enabled: !!prefilledQuotationId,
  onSuccess: (milestones) => {
    // If quotation has only one un-invoiced milestone, auto-select it
    const unInvoiced = milestones.filter(m => !m.isInvoiced);
    if (unInvoiced.length === 1) {
      handleMilestoneSelect(unInvoiced[0].id, unInvoiced[0]);
    }
  },
});
```

**3. Add milestone selection handler**:
```typescript
const handleMilestoneSelect = (milestoneId: string, milestone: PaymentMilestone) => {
  setSelectedMilestoneId(milestoneId);

  // Auto-populate form fields from milestone
  form.setFieldsValue({
    totalAmount: Number(milestone.paymentAmount),
    amountPerProject: Number(milestone.paymentAmount),
    dueDate: milestone.dueDate ? dayjs(milestone.dueDate) : undefined,
  });

  // Show materai warning if needed
  if (Number(milestone.paymentAmount) > 5000000) {
    message.warning({
      content: 'Invoice ini memerlukan materai (> 5 juta IDR)',
      duration: 5,
    });
  }
};
```

**4. Add milestone selector section (after quotation selection, around line 632)**:
```typescript
{/* Milestone Selection (if quotation is milestone-based) */}
{prefilledQuotationId && quotationMilestones.length > 0 && (
  <Form.Item
    label={
      <Space>
        <CalendarOutlined />
        <span>Pilih Payment Milestone</span>
      </Space>
    }
    required
    help={
      !selectedMilestoneId &&
      "Quotation ini menggunakan termin pembayaran. Pilih milestone untuk melanjutkan."
    }
    validateStatus={!selectedMilestoneId ? 'warning' : 'success'}
  >
    <MilestoneSelector
      quotationId={prefilledQuotationId}
      selectedMilestoneId={selectedMilestoneId}
      onSelect={handleMilestoneSelect}
    />
  </Form.Item>
)}
```

**5. Disable amount fields when milestone is selected**:
```typescript
<Form.Item
  name="totalAmount"
  label="Total Invoice Amount (IDR)"
  rules={[
    { required: true, message: 'Total amount wajib diisi' },
  ]}
>
  <IDRCurrencyInput
    placeholder="Enter total amount"
    showMateraiWarning={true}
    disabled={!!selectedMilestoneId} // Disable when milestone selected
    readOnly={!!selectedMilestoneId}
  />
</Form.Item>

{selectedMilestoneId && (
  <Alert
    type="info"
    message="Jumlah invoice diambil dari milestone yang dipilih"
    showIcon
    style={{ marginBottom: 16 }}
  />
)}
```

**6. Update form submission to include paymentMilestoneId**:
```typescript
const handleSubmit = async (values: InvoiceFormData) => {
  // Validate milestone selection for milestone-based quotations
  if (quotationMilestones.length > 0 && !selectedMilestoneId) {
    message.error('Silakan pilih payment milestone terlebih dahulu');
    return;
  }

  const invoiceData: CreateInvoiceRequest = {
    ...values,
    dueDate: values.dueDate.toISOString(),
    paymentMilestoneId: selectedMilestoneId, // ADD THIS
  };

  try {
    const invoice = await createInvoiceMutation.mutateAsync(invoiceData);
    message.success('Invoice berhasil dibuat!');
    navigate(`/invoices/${invoice.id}`);
  } catch (error) {
    // Handle milestone-specific errors
    if (error.code === 'MILESTONE_ALREADY_INVOICED') {
      message.error({
        content: error.message,
        duration: 10,
      });
    } else {
      message.error('Gagal membuat invoice');
    }
  }
};
```

---

## **PHASE 3: Business Rules & Validation (2 days)**

### **Goal**: Enforce Indonesian business practices and prevent data integrity issues

---

### **Task 3.1: Define and Implement Business Rules**
**Priority**: HIGH
**Effort**: 1 day

**Business Rules to Implement**:

#### **Rule #1: Milestone Invoice Sequence Warning**
**Rule**: Warn (but don't block) when invoicing out of sequence

**Implementation**:
```typescript
// backend/src/modules/invoices/invoices.service.ts
private async checkMilestoneSequence(milestoneId: string): Promise<void> {
  const milestone = await this.prisma.paymentMilestone.findUnique({
    where: { id: milestoneId },
    include: {
      quotation: {
        include: {
          paymentMilestones: {
            orderBy: { milestoneNumber: 'asc' },
          },
        },
      },
    },
  });

  const prevMilestones = milestone.quotation.paymentMilestones.filter(
    m => m.milestoneNumber < milestone.milestoneNumber
  );

  const unInvoicedPrev = prevMilestones.filter(m => !m.isInvoiced);

  if (unInvoicedPrev.length > 0) {
    // Log warning but don't block
    this.logger.warn(
      `Milestone ${milestone.milestoneNumber} invoiced out of sequence. ` +
      `Previous milestone(s) ${unInvoicedPrev.map(m => m.milestoneNumber).join(', ')} not invoiced.`,
      { quotationId: milestone.quotationId, milestoneId }
    );

    // Could also create business journey event
    await this.trackBusinessJourneyEvent(
      'MILESTONE_OUT_OF_SEQUENCE',
      {
        milestoneId,
        milestoneNumber: milestone.milestoneNumber,
        unInvoicedPrev: unInvoicedPrev.map(m => m.milestoneNumber),
      },
      'system'
    );
  }
}
```

**Frontend Warning**:
```typescript
// Show warning in MilestoneSelector component (already implemented above)
{outOfSequence && (
  <Tooltip title="Anda melewati milestone sebelumnya">
    <Tag icon={<WarningOutlined />} color="warning">
      Tidak berurutan
    </Tag>
  </Tooltip>
)}
```

---

#### **Rule #2: Prevent Quotation Changes After First Milestone Invoice**
**Rule**: Block quotation amount/milestone changes if any milestone is invoiced

**Implementation**:
```typescript
// backend/src/modules/quotations/quotations.service.ts
async update(id: string, updateQuotationDto: UpdateQuotationDto): Promise<any> {
  // Check if quotation has invoiced milestones
  const invoicedMilestones = await this.prisma.paymentMilestone.findFirst({
    where: {
      quotationId: id,
      isInvoiced: true,
    },
  });

  if (invoicedMilestones) {
    // Block changes to financial fields
    const financialFields = ['totalAmount', 'amountPerProject'];
    const hasFinancialChanges = financialFields.some(
      field => updateQuotationDto[field] !== undefined
    );

    if (hasFinancialChanges) {
      throw new BadRequestException(
        'Tidak dapat mengubah jumlah quotation karena sudah ada milestone yang di-invoice. ' +
        'Silakan batalkan invoice terlebih dahulu atau buat quotation baru.'
      );
    }

    // Also block milestone changes
    if (updateQuotationDto.paymentMilestones) {
      throw new BadRequestException(
        'Tidak dapat mengubah payment milestone karena sudah ada yang di-invoice.'
      );
    }
  }

  // ... rest of update logic
}
```

---

#### **Rule #3: Milestone Invoice Deletion Rules**
**Rule**: When milestone invoice is deleted, reset milestone.isInvoiced

**Implementation**:
```typescript
// backend/src/modules/invoices/invoices.service.ts
async delete(id: string): Promise<void> {
  const invoice = await this.prisma.invoice.findUnique({
    where: { id },
    include: { paymentMilestone: true },
  });

  if (!invoice) {
    throw new NotFoundException('Invoice tidak ditemukan');
  }

  // If invoice is linked to milestone, reset milestone status
  if (invoice.paymentMilestoneId) {
    await this.prisma.$transaction([
      this.prisma.invoice.delete({ where: { id } }),
      this.prisma.paymentMilestone.update({
        where: { id: invoice.paymentMilestoneId },
        data: { isInvoiced: false },
      }),
    ]);
  } else {
    await this.prisma.invoice.delete({ where: { id } });
  }
}
```

---

### **Task 3.2: Add Permission Controls**
**Priority**: MEDIUM
**Effort**: 1 day

**Permission Rules**:

```typescript
// backend/src/modules/invoices/invoices.controller.ts
@Post()
@Roles('ADMIN', 'MANAGER', 'STAFF') // All authenticated users can create invoices
async create(
  @Body() createInvoiceDto: CreateInvoiceDto,
  @Request() req: AuthenticatedRequest,
) {
  return this.invoicesService.create(createInvoiceDto, req.user.id);
}

// backend/src/modules/quotations/controllers/payment-milestones.controller.ts
@Post('generate-all-invoices')
@Roles('ADMIN', 'MANAGER') // Only ADMIN and MANAGER can generate all at once
async generateAllInvoices(
  @Param('quotationId') quotationId: string,
  @Request() req: AuthenticatedRequest,
) {
  return this.paymentMilestonesService.generateAllMilestoneInvoices(
    quotationId,
    req.user.id,
  );
}
```

**Frontend Permission Check**:
```typescript
// frontend/src/pages/QuotationDetailPage.tsx
const { user } = useAuth();
const canGenerateAllInvoices = ['ADMIN', 'MANAGER'].includes(user.role);

{canGenerateAllInvoices && (
  <Button
    type="primary"
    icon={<ThunderboltOutlined />}
    onClick={handleGenerateAllMilestoneInvoices}
  >
    Generate All Milestone Invoices
  </Button>
)}
```

---

## **PHASE 4: UX Enhancement & Integration (2 days)**

### **Task 4.1: Integrate Milestone UI into QuotationDetailPage**
**Priority**: MEDIUM
**Effort**: 1 day
**File**: `frontend/src/pages/QuotationDetailPage.tsx`

```typescript
// Add milestone section to quotation detail page
{quotation.paymentType === 'MILESTONE_BASED' && (
  <Card title="Payment Milestones" style={{ marginTop: 16 }}>
    <MilestoneProgress quotationId={quotation.id} />

    <Divider />

    <List
      dataSource={paymentMilestones}
      renderItem={(milestone) => (
        <List.Item
          actions={[
            milestone.isInvoiced ? (
              <Space>
                <Tag color="success">Invoiced</Tag>
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    // Navigate to invoice detail
                    const invoice = milestone.invoices[0];
                    navigate(`/invoices/${invoice.id}`);
                  }}
                >
                  View Invoice
                </Button>
              </Space>
            ) : (
              <Button
                type="primary"
                size="small"
                icon={<FileAddOutlined />}
                onClick={() => handleGenerateMilestoneInvoice(milestone.id)}
                loading={generateMutation.isLoading}
              >
                Create Invoice
              </Button>
            )
          ]}
        >
          <List.Item.Meta
            avatar={
              milestone.isInvoiced ? (
                <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
              ) : (
                <ClockCircleOutlined style={{ fontSize: 24, color: '#faad14' }} />
              )
            }
            title={
              <Space>
                <Text strong>
                  Milestone {milestone.milestoneNumber}: {milestone.nameId || milestone.name}
                </Text>
                <Tag color="blue">{milestone.paymentPercentage}%</Tag>
              </Space>
            }
            description={
              <Space direction="vertical" size="small">
                <Text strong style={{ fontSize: 16 }}>
                  {formatIDR(milestone.paymentAmount)}
                </Text>
                {milestone.dueDate && (
                  <Text type="secondary">
                    Jatuh tempo: {new Date(milestone.dueDate).toLocaleDateString('id-ID')}
                  </Text>
                )}
                {milestone.descriptionId && (
                  <Text type="secondary">{milestone.descriptionId}</Text>
                )}
              </Space>
            }
          />
        </List.Item>
      )}
    />

    {/* Generate All Button (for ADMIN/MANAGER only) */}
    {canGenerateAllInvoices && unInvoicedMilestones.length > 0 && (
      <>
        <Divider />
        <Button
          type="primary"
          danger
          icon={<ThunderboltOutlined />}
          onClick={handleGenerateAllMilestoneInvoices}
          block
        >
          Generate All {unInvoicedMilestones.length} Remaining Invoices
        </Button>
      </>
    )}
  </Card>
)}
```

**Handler Implementation**:
```typescript
const generateMutation = useGenerateMilestoneInvoice();

const handleGenerateMilestoneInvoice = async (milestoneId: string) => {
  try {
    const invoice = await generateMutation.mutateAsync(milestoneId);
    message.success('Invoice berhasil dibuat!');
    navigate(`/invoices/${invoice.id}`);
  } catch (error) {
    message.error(error.message || 'Gagal membuat invoice');
  }
};

const handleGenerateAllMilestoneInvoices = () => {
  const totalAmount = unInvoicedMilestones.reduce(
    (sum, m) => sum + Number(m.paymentAmount),
    0
  );

  Modal.confirm({
    title: 'Generate All Milestone Invoices?',
    icon: <ExclamationCircleOutlined />,
    content: (
      <div>
        <p>Ini akan membuat invoice untuk semua milestone yang belum di-invoice:</p>
        <List
          size="small"
          dataSource={unInvoicedMilestones}
          renderItem={m => (
            <List.Item>
              <Space>
                <Text>{m.nameId || m.name}:</Text>
                <Text strong>{formatIDR(m.paymentAmount)}</Text>
              </Space>
            </List.Item>
          )}
        />
        <Divider />
        <Text strong>Total: {formatIDR(totalAmount)}</Text>
      </div>
    ),
    okText: 'Ya, Generate Semua',
    okType: 'danger',
    cancelText: 'Batal',
    onOk: async () => {
      try {
        await apiClient.post(
          `/api/quotations/${quotationId}/payment-milestones/generate-all-invoices`
        );
        message.success('Semua invoice berhasil dibuat!');
        queryClient.invalidateQueries(['paymentMilestones']);
        queryClient.invalidateQueries(['invoices']);
      } catch (error) {
        message.error('Gagal generate invoice');
      }
    },
  });
};
```

---

### **Task 4.2: Add Milestone Context to Invoice List Page**
**Priority**: LOW
**Effort**: 4 hours
**File**: `frontend/src/pages/InvoicesPage.tsx`

```typescript
// Add column to invoice table
const columns = [
  // ... existing columns
  {
    title: 'Payment Term',
    dataIndex: 'paymentMilestone',
    key: 'paymentMilestone',
    render: (milestone, invoice) => {
      if (!milestone) {
        return <Tag>Full Payment</Tag>;
      }

      return (
        <Space direction="vertical" size="small">
          <Tag color="blue" icon={<CalendarOutlined />}>
            Milestone {milestone.milestoneNumber}
          </Tag>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {milestone.nameId || milestone.name} ({milestone.paymentPercentage}%)
          </Text>
        </Space>
      );
    },
  },
  // ... other columns
];

// Add filter
const [paymentTypeFilter, setPaymentTypeFilter] = useState<string | null>(null);

const filteredInvoices = invoices.filter(invoice => {
  if (!paymentTypeFilter) return true;
  if (paymentTypeFilter === 'milestone') return !!invoice.paymentMilestoneId;
  if (paymentTypeFilter === 'full') return !invoice.paymentMilestoneId;
  return true;
});
```

---

## **PHASE 5: Testing & Deployment (3 days)**

### **Task 5.1: Backend Unit Tests**
**Priority**: HIGH
**Effort**: 1 day

**Test File**: `backend/src/modules/invoices/invoices.service.spec.ts`

```typescript
describe('InvoicesService - Milestone Integration', () => {
  describe('create() with paymentMilestoneId', () => {
    it('should create invoice with payment milestone', async () => {
      const milestone = await createTestMilestone();

      const invoice = await service.create({
        paymentMilestoneId: milestone.id,
        clientId: milestone.quotation.clientId,
        projectId: milestone.quotation.projectId,
        // ... other fields
      }, userId);

      expect(invoice.paymentMilestoneId).toBe(milestone.id);
      expect(invoice.totalAmount).toBe(milestone.paymentAmount);

      // Verify milestone marked as invoiced
      const updatedMilestone = await prisma.paymentMilestone.findUnique({
        where: { id: milestone.id },
      });
      expect(updatedMilestone.isInvoiced).toBe(true);
    });

    it('should prevent duplicate milestone invoices', async () => {
      const milestone = await createTestMilestone();

      // Create first invoice
      await service.create({
        paymentMilestoneId: milestone.id,
        // ... other fields
      }, userId);

      // Try to create second invoice for same milestone
      await expect(
        service.create({
          paymentMilestoneId: milestone.id,
          // ... other fields
        }, userId)
      ).rejects.toThrow(ConflictException);
    });

    it('should handle concurrent invoice creation gracefully', async () => {
      const milestone = await createTestMilestone();

      const promises = [
        service.create({ paymentMilestoneId: milestone.id, ... }, userId),
        service.create({ paymentMilestoneId: milestone.id, ... }, userId),
      ];

      const results = await Promise.allSettled(promises);

      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');

      expect(successes.length).toBe(1); // Only one should succeed
      expect(failures.length).toBe(1); // One should fail
    });

    it('should override amounts with milestone data', async () => {
      const milestone = await createTestMilestone({
        paymentAmount: 10000000,
      });

      const invoice = await service.create({
        paymentMilestoneId: milestone.id,
        totalAmount: 5000000, // Try to override (should be ignored)
        // ... other fields
      }, userId);

      expect(invoice.totalAmount).toBe(10000000); // Should use milestone amount
    });
  });

  describe('createFromQuotation()', () => {
    it('should block creation from milestone-based quotation', async () => {
      const quotation = await createTestQuotation({
        paymentType: 'MILESTONE_BASED',
      });
      await createTestMilestones(quotation.id, 2);

      await expect(
        service.createFromQuotation(quotation.id, userId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should include milestone info in error message', async () => {
      const quotation = await createTestQuotation({
        paymentType: 'MILESTONE_BASED',
      });
      await createTestMilestones(quotation.id, 3);

      try {
        await service.createFromQuotation(quotation.id, userId);
      } catch (error) {
        expect(error.code).toBe('MILESTONE_BASED_QUOTATION');
        expect(error.milestones).toHaveLength(3);
      }
    });
  });

  describe('delete()', () => {
    it('should reset milestone.isInvoiced when invoice deleted', async () => {
      const milestone = await createTestMilestone();

      const invoice = await service.create({
        paymentMilestoneId: milestone.id,
        // ... other fields
      }, userId);

      // Verify milestone is invoiced
      let updatedMilestone = await prisma.paymentMilestone.findUnique({
        where: { id: milestone.id },
      });
      expect(updatedMilestone.isInvoiced).toBe(true);

      // Delete invoice
      await service.delete(invoice.id);

      // Verify milestone is reset
      updatedMilestone = await prisma.paymentMilestone.findUnique({
        where: { id: milestone.id },
      });
      expect(updatedMilestone.isInvoiced).toBe(false);
    });
  });
});
```

---

### **Task 5.2: Frontend Component Tests**
**Priority**: MEDIUM
**Effort**: 1 day

**Test File**: `frontend/src/components/invoices/MilestoneSelector.test.tsx`

```typescript
describe('MilestoneSelector', () => {
  it('should render all milestones', () => {
    const milestones = createTestMilestones(3);
    render(<MilestoneSelector milestones={milestones} {...props} />);

    expect(screen.getByText('Milestone 1')).toBeInTheDocument();
    expect(screen.getByText('Milestone 2')).toBeInTheDocument();
    expect(screen.getByText('Milestone 3')).toBeInTheDocument();
  });

  it('should disable already-invoiced milestones', () => {
    const milestones = [
      createTestMilestone({ id: '1', isInvoiced: true }),
      createTestMilestone({ id: '2', isInvoiced: false }),
    ];

    render(<MilestoneSelector milestones={milestones} {...props} />);

    const radio1 = screen.getByRole('radio', { name: /Milestone 1/ });
    const radio2 = screen.getByRole('radio', { name: /Milestone 2/ });

    expect(radio1).toBeDisabled();
    expect(radio2).not.toBeDisabled();
  });

  it('should show warning for out-of-sequence selection', () => {
    const milestones = [
      createTestMilestone({ milestoneNumber: 1, isInvoiced: false }),
      createTestMilestone({ milestoneNumber: 2, isInvoiced: false }),
    ];

    render(<MilestoneSelector milestones={milestones} {...props} />);

    // Milestone 2 should show warning (Milestone 1 not invoiced yet)
    expect(screen.getByText('Tidak berurutan')).toBeInTheDocument();
  });

  it('should call onSelect when milestone is clicked', () => {
    const onSelect = jest.fn();
    const milestones = createTestMilestones(2);

    render(<MilestoneSelector milestones={milestones} onSelect={onSelect} {...props} />);

    const radio2 = screen.getByRole('radio', { name: /Milestone 2/ });
    fireEvent.click(radio2);

    expect(onSelect).toHaveBeenCalledWith(milestones[1].id, milestones[1]);
  });
});
```

---

### **Task 5.3: Manual Testing Scenarios**
**Priority**: HIGH
**Effort**: 1 day

**Test Scenario 1: Standard 50-50 Payment Flow**

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Create quotation with 50-50 payment terms | 2 milestones created (each 50%) | ☐ |
| 2 | Approve quotation | Status changes to APPROVED | ☐ |
| 3 | Navigate to Invoices → Create New | Invoice form loads | ☐ |
| 4 | Select quotation with milestones | MilestoneSelector appears | ☐ |
| 5 | Select Milestone 1 (DP 50%) | Amount auto-populated to 50% of total | ☐ |
| 6 | Verify amount fields are disabled | Cannot manually edit amount | ☐ |
| 7 | Submit form | Invoice created successfully | ☐ |
| 8 | Check quotation detail page | Milestone 1 shows "Invoiced" badge | ☐ |
| 9 | Try to create another invoice for Milestone 1 | Error: "Milestone sudah memiliki invoice" | ☐ |
| 10 | Create invoice for Milestone 2 | Successfully created | ☐ |
| 11 | Check quotation progress | Shows "2/2 milestones invoiced (100%)" | ☐ |

**Test Scenario 2: Out-of-Sequence Invoicing**

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Create quotation with 3 milestones (30-40-30) | 3 milestones created | ☐ |
| 2 | Try to invoice Milestone 3 first | Warning shown: "Tidak berurutan" | ☐ |
| 3 | Invoice creation still allowed | Invoice created (warning only) | ☐ |
| 4 | Check logs/business journey events | OUT_OF_SEQUENCE event logged | ☐ |

**Test Scenario 3: Concurrent Access**

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open invoice create page in 2 browser tabs | Both load successfully | ☐ |
| 2 | Select same milestone in both tabs | Both show same amount | ☐ |
| 3 | Submit form in Tab 1 | Invoice created | ☐ |
| 4 | Submit form in Tab 2 (immediately after) | Error: "Invoice sedang dibuat oleh user lain" | ☐ |
| 5 | Refresh Tab 2 | Milestone shows "Sudah di-invoice" | ☐ |

**Test Scenario 4: Quotation Amount Change Prevention**

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Create quotation with milestones | Quotation created | ☐ |
| 2 | Invoice Milestone 1 | Invoice created successfully | ☐ |
| 3 | Try to edit quotation total amount | Error: "Tidak dapat mengubah jumlah quotation..." | ☐ |
| 4 | Try to add/remove milestones | Error: "Tidak dapat mengubah payment milestone..." | ☐ |

**Test Scenario 5: Generate All Milestone Invoices**

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Create quotation with 3 milestones | 3 milestones created | ☐ |
| 2 | Navigate to quotation detail page | "Generate All Invoices" button visible (ADMIN/MANAGER only) | ☐ |
| 3 | Click "Generate All" button | Confirmation modal shows all 3 milestones + total amount | ☐ |
| 4 | Confirm action | 3 invoices created simultaneously | ☐ |
| 5 | Check progress | Shows "3/3 milestones invoiced (100%)" | ☐ |
| 6 | Check invoice list | 3 new invoices visible, each with milestone badge | ☐ |

---

## **PHASE 6: Monitoring & Rollout (1 day)**

### **Task 6.1: Add Feature Flag**
**Priority**: HIGH
**Effort**: 2 hours

```typescript
// backend/.env
FEATURE_MILESTONE_INVOICE=true

// backend/src/modules/invoices/invoices.service.ts
if (process.env.FEATURE_MILESTONE_INVOICE === 'true') {
  // Milestone invoice logic enabled
} else {
  // Fall back to old behavior
}
```

---

### **Task 6.2: Add Telemetry & Monitoring**
**Priority**: MEDIUM
**Effort**: 3 hours

```typescript
// backend/src/modules/invoices/invoices.service.ts
import { MetricsService } from '../metrics/metrics.service';

async create(createInvoiceDto: CreateInvoiceDto, userId: string) {
  const startTime = Date.now();

  try {
    const invoice = await this.prisma.$transaction(...);

    // Track success
    this.metricsService.trackInvoiceCreated({
      type: createInvoiceDto.paymentMilestoneId ? 'milestone' : 'full',
      amount: invoice.totalAmount,
      duration: Date.now() - startTime,
      userId,
    });

    return invoice;
  } catch (error) {
    // Track errors
    this.metricsService.trackInvoiceCreationError({
      type: createInvoiceDto.paymentMilestoneId ? 'milestone' : 'full',
      errorType: error.constructor.name,
      userId,
    });
    throw error;
  }
}
```

**Metrics to Track**:
- Milestone invoice creation count (daily/weekly)
- Average creation time (should be < 500ms)
- Error rate by type (ConflictException, NotFoundException, etc.)
- Out-of-sequence invoicing frequency
- Percentage of quotations using milestone-based payment

---

### **Task 6.3: Gradual Rollout Plan**
**Priority**: HIGH
**Effort**: 3 hours

**Rollout Strategy**:

**Week 1: Internal Testing**
- ✅ Deploy to staging environment
- ✅ Test with 5 sample quotations (different milestone configurations)
- ✅ Verify all error scenarios
- ✅ Check logs for any unexpected errors

**Week 2: Beta Release**
- ✅ Enable feature flag for ADMIN users only
- ✅ Monitor usage for 3-5 days
- ✅ Gather feedback from admin users
- ✅ Fix any critical bugs

**Week 3: Full Release**
- ✅ Enable feature flag for all users
- ✅ Send notification email about new feature
- ✅ Provide user documentation/tutorial
- ✅ Monitor error rates closely for first week

**Rollback Criteria**:
- Error rate > 5% for milestone invoice creation
- Database transaction failures
- User complaints about data loss/corruption
- Performance degradation (invoice creation > 2s)

---

## **SUCCESS CRITERIA (REVISED)**

### **Functional Metrics**
- ✅ User can create quotation with milestone-based payment
- ✅ User can create invoice from specific milestone
- ✅ System prevents duplicate milestone invoices (0% failure rate)
- ✅ Sum of milestone invoices = quotation total (±1 IDR for rounding)
- ✅ Existing non-milestone invoice creation still works
- ✅ 100% of milestone-based quotations blocked from `createFromQuotation()`

### **Performance Metrics**
- ⏱️ Milestone invoice creation: < 500ms (p95)
- ⏱️ MilestoneSelector render time: < 100ms
- ⏱️ QuotationDetailPage load with milestones: < 1s
- ⏱️ No database deadlocks during concurrent creation

### **Business Metrics**
- 📊 Track % of quotations using milestone-based payment
- 📊 Average time from quotation approval to first milestone invoice < 1 day
- 📊 Out-of-sequence invoicing rate < 5%
- 📊 Zero accounting errors from milestone invoicing

### **User Experience Metrics**
- 👤 Milestone invoice creation in < 3 clicks (from quotation detail)
- 👤 Error rate for milestone selection < 1%
- 👤 Zero support tickets about "can't create milestone invoice"
- 👤 User satisfaction survey: > 4.5/5 stars

---

## **RISK MITIGATION**

### **Technical Risks**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Database unique constraint violation | HIGH | LOW | Unique partial index + graceful error handling |
| Race condition in concurrent invoice creation | HIGH | MEDIUM | Transaction-based updates + optimistic locking |
| Frontend state management issues | MEDIUM | MEDIUM | React Query caching + proper invalidation |
| Performance degradation with many milestones | MEDIUM | LOW | Indexed queries + pagination for large quotations |

### **Business Risks**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Users invoice out of sequence | LOW | MEDIUM | Warning shown but not blocked (business decision) |
| Quotation changed after milestone invoiced | HIGH | LOW | Validation prevents financial field changes |
| Incorrect milestone percentage calculations | HIGH | LOW | Use existing validated templates, add unit tests |
| User deletes milestone invoice accidentally | MEDIUM | LOW | Proper deletion flow with confirmation modal |

### **Operational Risks**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Feature deployed with bugs | HIGH | MEDIUM | Gradual rollout with feature flag |
| Database migration fails | CRITICAL | LOW | Test migration on staging first + rollback plan |
| User confusion about new UI | MEDIUM | HIGH | Clear documentation + in-app tooltips |

---

## **ROLLBACK PLAN**

### **If Critical Bug Found**

**Step 1: Immediate Response (< 5 minutes)**
```bash
# Disable feature flag
echo "FEATURE_MILESTONE_INVOICE=false" >> .env
pm2 restart all
```

**Step 2: Assess Impact (< 30 minutes)**
```sql
-- Check how many milestone invoices were created
SELECT COUNT(*) FROM invoices WHERE paymentMilestoneId IS NOT NULL;

-- Check for orphaned data
SELECT * FROM payment_milestones WHERE isInvoiced = true
  AND id NOT IN (SELECT paymentMilestoneId FROM invoices WHERE paymentMilestoneId IS NOT NULL);
```

**Step 3: Data Cleanup (if needed)**
```sql
-- Reset milestone status for orphaned records
UPDATE payment_milestones
SET isInvoiced = false
WHERE isInvoiced = true
  AND id NOT IN (
    SELECT paymentMilestoneId FROM invoices
    WHERE paymentMilestoneId IS NOT NULL
  );
```

**Step 4: Code Rollback (if feature flag not sufficient)**
```bash
git revert <commit-hash>
npm run build
pm2 restart all
```

---

## **IMPLEMENTATION TIMELINE**

### **Week 1: Backend Foundation**
- **Day 1 (4 hours)**: Task 1.1 + 1.2 (DTO + service enhancement)
- **Day 2 (4 hours)**: Task 1.3 + 1.4 (validation + refactoring)
- **Day 3 (4 hours)**: Task 1.5 + Phase 3 (concurrent access + business rules)
- **Day 4 (4 hours)**: Backend testing (Task 5.1)
- **Day 5 (4 hours)**: Backend deployment to staging + bug fixes

### **Week 2: Frontend & Launch**
- **Day 1 (4 hours)**: Task 2.1 (MilestoneSelector component)
- **Day 2 (4 hours)**: Task 2.2 + 2.3 (Progress component + InvoiceCreatePage integration)
- **Day 3 (4 hours)**: Task 4.1 + 4.2 (QuotationDetailPage + InvoiceListPage)
- **Day 4 (4 hours)**: Frontend testing (Task 5.2) + manual testing (Task 5.3)
- **Day 5 (4 hours)**: Production deployment + monitoring setup

**Total**: 40 hours (2 weeks)

---

## **POST-IMPLEMENTATION**

### **Documentation Updates**
- [ ] API documentation (Swagger/OpenAPI)
- [ ] User guide: "How to Create Milestone-Based Invoices"
- [ ] Developer documentation: Architecture decision records
- [ ] Video tutorial (3-5 minutes)

### **Continuous Monitoring**
- [ ] Set up Grafana dashboard for milestone invoice metrics
- [ ] Configure alerts for error rates > 5%
- [ ] Weekly review of out-of-sequence invoicing frequency
- [ ] Monthly business impact report

### **Future Enhancements**
- [ ] Automatic invoice generation on quotation approval (optional automation)
- [ ] Email reminders for upcoming milestone due dates
- [ ] Dashboard widget: "Milestones Due This Week"
- [ ] Calendar view for milestone payment schedule
- [ ] Bulk milestone editing for quotations (before first invoice)
- [ ] Milestone payment tracking (invoiced vs. actually paid)

---

## **APPENDIX**

### **A. Indonesian Business Compliance Notes**

**Materai Requirements**:
- Documents > 5,000,000 IDR require 10,000 IDR stamp duty
- Milestone invoices are treated independently (each checked for > 5M threshold)
- Physical materai application is manual process (system provides reminders)

**Tax Implications**:
- Each milestone invoice is taxable event
- PPN (11%) may apply based on quotation settings
- Invoice numbering must be sequential and auditable

**Payment Terms**:
- "Termin pembayaran" is standard Indonesian business practice
- Common patterns: 50-50, 30-40-30, 20-30-30-20
- Due dates typically 30-60 days from invoice date

### **B. Technical Architecture Diagram**

```
┌─────────────────┐
│  Frontend UI    │
│  (React)        │
└────────┬────────┘
         │
         │ POST /api/invoices
         │ { paymentMilestoneId: "..." }
         │
         ▼
┌─────────────────────────────┐
│  InvoicesController         │
│  @Post()                    │
└────────┬────────────────────┘
         │
         │ create(dto, userId)
         │
         ▼
┌─────────────────────────────┐
│  InvoicesService.create()   │
│  • Validate milestone       │
│  • Check isInvoiced         │
│  • Create invoice           │
│  • Mark milestone invoiced  │
└────────┬────────────────────┘
         │
         │ Transaction
         │
         ▼
┌─────────────────────────────┐
│  PostgreSQL Database        │
│  • invoices table           │
│  • payment_milestones table │
│  • Unique constraint        │
│  • Foreign keys             │
└─────────────────────────────┘
```

### **C. Database Schema Reference**

```sql
-- Invoices table
CREATE TABLE invoices (
  id VARCHAR PRIMARY KEY,
  invoice_number VARCHAR UNIQUE NOT NULL,
  quotation_id VARCHAR REFERENCES quotations(id),
  payment_milestone_id VARCHAR REFERENCES payment_milestones(id),
  total_amount DECIMAL(12,2) NOT NULL,
  -- ... other fields
  CONSTRAINT unique_milestone_invoice UNIQUE (payment_milestone_id)
    WHERE payment_milestone_id IS NOT NULL
);

-- Payment Milestones table
CREATE TABLE payment_milestones (
  id VARCHAR PRIMARY KEY,
  quotation_id VARCHAR REFERENCES quotations(id) ON DELETE CASCADE,
  milestone_number INT NOT NULL,
  name VARCHAR NOT NULL,
  payment_percentage DECIMAL(5,2) NOT NULL,
  payment_amount DECIMAL(12,2) NOT NULL,
  is_invoiced BOOLEAN DEFAULT FALSE,
  -- ... other fields
);

-- Indexes for performance
CREATE INDEX idx_invoices_payment_milestone ON invoices(payment_milestone_id);
CREATE INDEX idx_milestones_quotation ON payment_milestones(quotation_id);
CREATE INDEX idx_milestones_invoiced ON payment_milestones(is_invoiced);
```

---

**Document Version**: 2.0 (REVISED)
**Last Updated**: 2025-11-03
**Original Plan**: PAYMENT_MILESTONE_INVOICE_INTEGRATION_PLAN.md
**Status**: Ready for Implementation
**Estimated Completion**: 2 weeks from start date

---

## **APPROVAL & SIGN-OFF**

- [ ] **Technical Lead**: Reviewed architecture and implementation approach
- [ ] **Product Owner**: Approved business rules and user experience
- [ ] **QA Lead**: Reviewed testing strategy and acceptance criteria
- [ ] **DevOps**: Confirmed deployment strategy and rollback plan

**Next Steps**:
1. Schedule kickoff meeting with development team
2. Set up staging environment for testing
3. Begin Phase 1: Backend API Unification
4. Daily standup to track progress against 2-week timeline
