# Payment Milestone Invoice Integration Plan

**Date**: 2025-11-03
**Status**: Planning Phase
**Priority**: High
**Estimated Effort**: 80-100 hours (2-3 weeks for 1 developer)

---

## 🔍 **COMPREHENSIVE ANALYSIS: Payment Milestone Invoice Integration**

### **Current State Assessment**

#### ✅ **EXISTING INFRASTRUCTURE (Working)**

1. **Database Layer**: Full schema support for `PaymentMilestone` with relations to `Invoice` and `Quotation`

2. **Backend Services**:
   - `PaymentMilestonesService` with full CRUD operations (`backend/src/modules/quotations/services/payment-milestones.service.ts:1-394`)
   - `generateMilestoneInvoice()` method exists (line 243-328) - fully automated invoice creation from milestone
   - Validation logic for 100% percentage totals
   - Progress tracking for milestone invoicing status

3. **Backend API Endpoints**:
   - `POST /api/quotations/:quotationId/payment-milestones/:id/generate-invoice` (controller:115-125)
   - Full REST API for milestone CRUD

4. **Frontend Infrastructure**:
   - `paymentMilestonesService` with API client methods (`frontend/src/services/payment-milestones.ts:1-113`)
   - React Query hooks: `usePaymentMilestones`, `useGenerateMilestoneInvoice` (`frontend/src/hooks/usePaymentMilestones.ts:1-150`)
   - `MilestonePaymentTerms` component for quotation creation (`frontend/src/components/quotations/MilestonePaymentTerms.tsx:1-584`)
   - Templates for Indonesian payment terms (50-50, 30-40-30, 20-30-30-20)

#### ❌ **CRITICAL GAPS (Missing)**

**Backend Issues:**

1. **CreateInvoiceDto** (`backend/src/modules/invoices/dto/create-invoice.dto.ts:16`):
   - Missing `paymentMilestoneId?: string` field

2. **InvoicesService.create()** (`backend/src/modules/invoices/invoices.service.ts:35-141`):
   - Doesn't accept or link `paymentMilestoneId`
   - Doesn't mark milestone as `isInvoiced = true`
   - No validation against duplicate milestone invoices

3. **InvoicesService.createFromQuotation()** (line 143-262):
   - Ignores payment milestones entirely
   - Creates single invoice for full quotation amount
   - Should detect milestone-based quotations and either:
     - Generate all milestone invoices automatically, OR
     - Return error requiring manual milestone selection

**Frontend Issues:**

1. **InvoiceCreatePage.tsx** (`frontend/src/pages/InvoiceCreatePage.tsx:68-882`):
   - No milestone selector when quotation has `paymentType = MILESTONE_BASED`
   - No display of milestone status (which are invoiced, pending)
   - No auto-population of amounts from selected milestone
   - Manual `amountPerProject` and `totalAmount` entry (lines 643-673)

2. **Missing Components**:
   - No `MilestoneSelector` component
   - No milestone invoice progress indicator
   - No milestone validation warnings

---

## 📋 **ROBUST IMPLEMENTATION PLAN**

---

## **PHASE 1: Backend Foundation Enhancement**

### **Task 1.1: Update CreateInvoiceDto**

**File**: `backend/src/modules/invoices/dto/create-invoice.dto.ts`

**Changes**:

```typescript
// Add after line 40 (quotationId field)
@ApiProperty({
  description: "ID payment milestone (untuk invoice berbasis termin)",
  example: "clx123456789",
  required: false,
})
@IsOptional()
@IsString({ message: "ID payment milestone harus berupa string yang valid" })
paymentMilestoneId?: string;
```

**Validation**:
- Ensure `paymentMilestoneId` is mutually exclusive with manual amount entry
- If `paymentMilestoneId` provided, amounts should be inherited from milestone

---

### **Task 1.2: Enhance InvoicesService.create()**

**File**: `backend/src/modules/invoices/invoices.service.ts`

**Changes** (at line 35-141):

1. **Before creating invoice** (after line 70):

```typescript
// If paymentMilestoneId provided, validate and inherit data
let paymentMilestone = null;
if (createInvoiceDto.paymentMilestoneId) {
  paymentMilestone = await this.prisma.paymentMilestone.findUnique({
    where: { id: createInvoiceDto.paymentMilestoneId },
    include: { quotation: true, invoices: true },
  });

  if (!paymentMilestone) {
    throw new NotFoundException('Payment milestone tidak ditemukan');
  }

  // Validate milestone is not already invoiced
  if (paymentMilestone.isInvoiced) {
    throw new ConflictException('Milestone ini sudah memiliki invoice');
  }

  // Validate milestone belongs to the quotation (if quotationId provided)
  if (createInvoiceDto.quotationId &&
      paymentMilestone.quotationId !== createInvoiceDto.quotationId) {
    throw new BadRequestException('Payment milestone tidak sesuai dengan quotation');
  }

  // Override amounts with milestone data
  createInvoiceDto.totalAmount = Number(paymentMilestone.paymentAmount);
  createInvoiceDto.quotationId = paymentMilestone.quotationId;
}
```

2. **Update invoice creation** (line 102-110):

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
  // ... rest of include
});
```

3. **After invoice creation** (after line 122):

```typescript
// Mark milestone as invoiced
if (paymentMilestone) {
  await prisma.paymentMilestone.update({
    where: { id: paymentMilestone.id },
    data: { isInvoiced: true },
  });
}
```

---

### **Task 1.3: Fix createFromQuotation() for Milestone-Based Quotations**

**File**: `backend/src/modules/invoices/invoices.service.ts`

**Changes** (at line 143-262):

1. **After fetching quotation** (line 146):

```typescript
const quotation = await this.quotationsService.findOne(quotationId);

// Check if quotation is milestone-based
if (quotation.paymentType === 'MILESTONE_BASED') {
  const milestones = await this.prisma.paymentMilestone.findMany({
    where: { quotationId },
    orderBy: { milestoneNumber: 'asc' },
  });

  if (milestones.length > 0) {
    throw new BadRequestException(
      'Quotation ini menggunakan termin pembayaran. ' +
      'Silakan buat invoice untuk setiap milestone secara terpisah.'
    );
  }
}
```

---

### **Task 1.4: Add Bulk Milestone Invoice Generation Endpoint**

**File**: `backend/src/modules/quotations/controllers/payment-milestones.controller.ts`

**Add new endpoint** (after line 125):

```typescript
/**
 * POST /api/quotations/:quotationId/payment-milestones/generate-all-invoices
 * Generate invoices for all un-invoiced milestones
 */
@Post('generate-all-invoices')
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

**Add service method** in `payment-milestones.service.ts`:

```typescript
async generateAllMilestoneInvoices(
  quotationId: string,
  userId: string,
): Promise<any[]> {
  const milestones = await this.prisma.paymentMilestone.findMany({
    where: {
      quotationId,
      isInvoiced: false,
    },
    orderBy: { milestoneNumber: 'asc' },
  });

  const invoices = [];
  for (const milestone of milestones) {
    const invoice = await this.generateMilestoneInvoice(milestone.id, userId);
    invoices.push(invoice);
  }

  return invoices;
}
```

---

## **PHASE 2: Frontend UI Enhancement**

### **Task 2.1: Create MilestoneSelector Component**

**New File**: `frontend/src/components/invoices/MilestoneSelector.tsx`

**Purpose**:
- Display list of payment milestones from quotation
- Show status (invoiced/pending) for each milestone
- Allow selection of milestone for invoice creation
- Display milestone amount, percentage, due date
- Show visual progress (e.g., "Milestone 2 of 3")

**Key Features**:
- Integration with `usePaymentMilestones(quotationId)` hook
- Display template: "DP 50% - Rp 15,000,000 [Not Invoiced]"
- Disable already-invoiced milestones
- Show warning if trying to invoice out of sequence

**Component Structure**:

```typescript
interface MilestoneSelectorProps {
  milestones: PaymentMilestone[]
  selectedMilestoneId: string | null
  onSelect: (milestoneId: string) => void
  disabled?: boolean
}

export const MilestoneSelector: React.FC<MilestoneSelectorProps> = ({
  milestones,
  selectedMilestoneId,
  onSelect,
  disabled,
}) => {
  // Implementation with Radio.Group or Select
  // Show milestone cards with:
  // - Milestone number and name
  // - Percentage and amount
  // - Status badge (Invoiced/Pending)
  // - Due date
  // - Disable if already invoiced
}
```

---

### **Task 2.2: Enhance InvoiceCreatePage**

**File**: `frontend/src/pages/InvoiceCreatePage.tsx`

**Changes**:

1. **Add milestone state** (after line 77):

```typescript
const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null)
```

2. **Fetch milestones when quotation selected** (after line 128):

```typescript
const { data: quotationMilestones = [], isLoading: milestonesLoading } = useQuery({
  queryKey: ['paymentMilestones', 'quotation', prefilledQuotationId],
  queryFn: () => paymentMilestonesService.getQuotationMilestones(prefilledQuotationId!),
  enabled: !!prefilledQuotationId && selectedQuotation?.paymentType === 'MILESTONE_BASED',
})
```

3. **Add milestone selector section** (after line 632):

```typescript
{/* Milestone Selection (if quotation has milestones) */}
{selectedQuotation?.paymentType === 'MILESTONE_BASED' &&
 quotationMilestones.length > 0 && (
  <ProgressiveSection
    title='Payment Milestone Selection'
    subtitle='Select which payment milestone to invoice'
    icon={<CalendarOutlined />}
    defaultOpen={true}
    required={true}
  >
    <MilestoneSelector
      milestones={quotationMilestones}
      selectedMilestoneId={selectedMilestoneId}
      onSelect={(milestoneId) => {
        setSelectedMilestoneId(milestoneId)
        const milestone = quotationMilestones.find(m => m.id === milestoneId)
        if (milestone) {
          form.setFieldsValue({
            totalAmount: milestone.paymentAmount,
            amountPerProject: milestone.paymentAmount,
          })
        }
      }}
    />
  </ProgressiveSection>
)}
```

4. **Disable manual amount entry when milestone selected** (line 643-673):

```typescript
<Form.Item
  name='totalAmount'
  label='Total Invoice Amount (IDR)'
  rules={[...]}
>
  <IDRCurrencyInput
    placeholder='Enter total amount'
    showMateraiWarning={true}
    disabled={!!selectedMilestoneId} // ADD THIS
  />
</Form.Item>
```

5. **Update submit handler** (line 240-271):

```typescript
const invoiceData: CreateInvoiceRequest = {
  // ...existing fields
  paymentMilestoneId: selectedMilestoneId, // ADD THIS
}
```

---

### **Task 2.3: Create Milestone Progress Indicator Component**

**New File**: `frontend/src/components/invoices/MilestoneProgress.tsx`

**Purpose**:
- Show visual progress of milestone invoicing
- Display: "2 of 3 milestones invoiced (66%)"
- Progress bar visualization
- List of pending milestones

**Component Structure**:

```typescript
interface MilestoneProgressProps {
  quotationId: string
}

export const MilestoneProgress: React.FC<MilestoneProgressProps> = ({
  quotationId,
}) => {
  const { data: progress } = useMilestoneProgress(quotationId)

  return (
    <Card>
      <Progress
        percent={progress?.invoicedPercentage || 0}
        status={progress?.invoicedPercentage === 100 ? 'success' : 'active'}
      />
      <Text>
        {progress?.milestonesInvoiced} of {progress?.totalMilestones} milestones invoiced
      </Text>
      {/* List of milestones with status */}
    </Card>
  )
}
```

---

### **Task 2.4: Add Warning for Non-Milestone Invoice Creation**

**File**: `frontend/src/pages/InvoiceCreatePage.tsx`

**Add validation** (line 145-178):

```typescript
if (selectedQuotation) {
  // Check if quotation has milestones
  if (selectedQuotation.paymentType === 'MILESTONE_BASED') {
    const milestones = await paymentMilestonesService.getQuotationMilestones(
      selectedQuotation.id
    );

    if (milestones.length > 0) {
      message.warning({
        content: 'This quotation uses milestone-based payments. Please select a milestone.',
        duration: 5,
      });
      // Don't allow manual amount entry
      return;
    }
  }
}
```

---

## **PHASE 3: Type Safety & Validation**

### **Task 3.1: Update TypeScript Interfaces**

**File**: `frontend/src/services/invoices.ts`

```typescript
export interface CreateInvoiceRequest {
  // ...existing fields
  paymentMilestoneId?: string; // ADD THIS
}
```

**File**: `frontend/src/types/invoice.ts`

```typescript
export interface Invoice {
  // ...existing fields
  paymentMilestoneId?: string; // ADD THIS
  paymentMilestone?: {
    id: string;
    milestoneNumber: number;
    name: string;
    nameId?: string;
    paymentPercentage: number;
    paymentAmount: number;
    isInvoiced: boolean;
  };
}
```

**File**: `frontend/src/types/quotation.ts` (create if doesn't exist)

```typescript
export interface Quotation {
  // ...existing fields
  paymentType: 'FULL_PAYMENT' | 'MILESTONE_BASED' | 'ADVANCE_PAYMENT' | 'CUSTOM';
  paymentMilestones?: PaymentMilestone[];
}

export interface PaymentMilestone {
  id: string;
  milestoneNumber: number;
  name: string;
  nameId?: string;
  description?: string;
  descriptionId?: string;
  paymentPercentage: number;
  paymentAmount: number;
  dueDate?: string;
  dueDaysFromPrev?: number;
  deliverables?: string[];
  isInvoiced?: boolean;
}
```

---

### **Task 3.2: Add Frontend Validation**

**Validations to implement**:

1. **Milestone Selection Required**:
   ```typescript
   if (quotation.paymentType === 'MILESTONE_BASED' && !selectedMilestoneId) {
     throw new Error('Please select a payment milestone');
   }
   ```

2. **Cannot Invoice Already-Invoiced Milestone**:
   ```typescript
   const milestone = milestones.find(m => m.id === selectedMilestoneId);
   if (milestone?.isInvoiced) {
     throw new Error('This milestone has already been invoiced');
   }
   ```

3. **Amount Validation**:
   ```typescript
   if (selectedMilestoneId && totalAmount !== milestone.paymentAmount) {
     throw new Error('Invoice amount must match milestone amount');
   }
   ```

4. **Sequence Warning**:
   ```typescript
   const unInvoicedMilestones = milestones
     .filter(m => !m.isInvoiced)
     .sort((a, b) => a.milestoneNumber - b.milestoneNumber);

   if (milestone.milestoneNumber !== unInvoicedMilestones[0].milestoneNumber) {
     message.warning('You are invoicing milestones out of sequence');
   }
   ```

---

## **PHASE 4: UX Enhancements**

### **Task 4.1: QuotationDetailPage Integration**

**File**: `frontend/src/pages/QuotationDetailPage.tsx`

**Add "Generate Milestone Invoice" buttons**:

```typescript
// Add section showing payment milestones
{quotation.paymentType === 'MILESTONE_BASED' && (
  <Card title="Payment Milestones">
    <MilestoneProgress quotationId={quotation.id} />

    <List
      dataSource={paymentMilestones}
      renderItem={(milestone) => (
        <List.Item
          actions={[
            milestone.isInvoiced ? (
              <Tag color="success">Invoiced</Tag>
            ) : (
              <Button
                type="primary"
                onClick={() => handleGenerateMilestoneInvoice(milestone.id)}
              >
                Create Invoice
              </Button>
            )
          ]}
        >
          <List.Item.Meta
            title={`${milestone.nameId || milestone.name} (${milestone.paymentPercentage}%)`}
            description={formatIDR(milestone.paymentAmount)}
          />
        </List.Item>
      )}
    />
  </Card>
)}
```

**Handler**:

```typescript
const generateMilestoneInvoiceMutation = useGenerateMilestoneInvoice();

const handleGenerateMilestoneInvoice = async (milestoneId: string) => {
  try {
    const invoice = await generateMilestoneInvoiceMutation.mutateAsync(milestoneId);
    message.success('Invoice created successfully');
    navigate(`/invoices/${invoice.id}`);
  } catch (error) {
    message.error('Failed to create invoice');
  }
};
```

---

### **Task 4.2: Add Milestone Invoice Batch Generation**

**Add UI option** in `QuotationDetailPage.tsx`:

```typescript
<Button
  type="primary"
  icon={<ThunderboltOutlined />}
  onClick={handleGenerateAllMilestoneInvoices}
  disabled={allMilestonesInvoiced}
>
  Generate All Milestone Invoices
</Button>
```

**Handler with confirmation modal**:

```typescript
const handleGenerateAllMilestoneInvoices = () => {
  Modal.confirm({
    title: 'Generate All Milestone Invoices',
    content: (
      <div>
        <p>This will create invoices for all un-invoiced milestones:</p>
        <ul>
          {unInvoicedMilestones.map(m => (
            <li key={m.id}>
              {m.nameId || m.name}: {formatIDR(m.paymentAmount)}
            </li>
          ))}
        </ul>
        <p>Total: {formatIDR(totalUnInvoiced)}</p>
      </div>
    ),
    onOk: async () => {
      try {
        await apiClient.post(
          `/api/quotations/${quotationId}/payment-milestones/generate-all-invoices`
        );
        message.success('All milestone invoices created successfully');
        queryClient.invalidateQueries(['paymentMilestones']);
        queryClient.invalidateQueries(['invoices']);
      } catch (error) {
        message.error('Failed to generate invoices');
      }
    },
  });
};
```

---

### **Task 4.3: Invoice List Page Enhancement**

**File**: `frontend/src/pages/InvoicesPage.tsx`

**Show milestone context in invoice list**:

```typescript
// Add column to invoice table
{
  title: 'Payment Term',
  dataIndex: 'paymentMilestone',
  key: 'paymentMilestone',
  render: (milestone, invoice) => {
    if (!milestone) return <Tag>Full Payment</Tag>;

    return (
      <Space direction="vertical" size="small">
        <Tag color="blue">
          Milestone {milestone.milestoneNumber}
        </Tag>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {milestone.nameId || milestone.name} ({milestone.paymentPercentage}%)
        </Text>
      </Space>
    );
  },
}
```

**Add filter**:

```typescript
<Select
  placeholder="Filter by payment type"
  allowClear
  options={[
    { label: 'All Invoices', value: null },
    { label: 'Full Payment', value: 'full' },
    { label: 'Milestone-Based', value: 'milestone' },
  ]}
  onChange={(value) => {
    // Filter invoices
  }}
/>
```

---

## **PHASE 5: Testing & Validation**

### **Task 5.1: Backend Tests**

**File**: `backend/src/modules/invoices/invoices.service.spec.ts`

**Test cases to add**:

```typescript
describe('InvoicesService - Milestone Integration', () => {
  it('should create invoice with payment milestone', async () => {
    // Test creating invoice with paymentMilestoneId
    // Verify invoice.paymentMilestoneId is set
    // Verify milestone.isInvoiced is set to true
  });

  it('should prevent duplicate milestone invoices', async () => {
    // Create invoice for milestone
    // Try to create another invoice for same milestone
    // Should throw ConflictException
  });

  it('should inherit amount from milestone', async () => {
    // Create invoice with paymentMilestoneId
    // Verify totalAmount matches milestone.paymentAmount
  });

  it('should reject createFromQuotation for milestone-based quotations', async () => {
    // Create quotation with milestones
    // Call createFromQuotation
    // Should throw BadRequestException
  });
});
```

---

### **Task 5.2: Frontend Tests**

**File**: `frontend/src/components/invoices/MilestoneSelector.test.tsx`

```typescript
describe('MilestoneSelector', () => {
  it('should render all milestones', () => {
    // Test milestone list rendering
  });

  it('should disable already-invoiced milestones', () => {
    // Test disabled state for isInvoiced=true
  });

  it('should call onSelect when milestone is clicked', () => {
    // Test selection callback
  });
});
```

**File**: `frontend/src/pages/InvoiceCreatePage.test.tsx`

```typescript
describe('InvoiceCreatePage - Milestone Integration', () => {
  it('should show milestone selector for milestone-based quotations', () => {
    // Test conditional rendering
  });

  it('should auto-populate amounts when milestone is selected', () => {
    // Test form field updates
  });

  it('should disable amount fields when milestone is selected', () => {
    // Test disabled state
  });
});
```

---

### **Task 5.3: Manual Testing Scenarios**

#### **Scenario 1: Standard 50-50 Payment Flow**

1. **Setup**:
   - Create client: "PT Test Client"
   - Create project: "Website Development"
   - Expected: Successful creation

2. **Create Quotation with Milestones**:
   - Navigate to Quotations → Create New
   - Select client and project
   - Total amount: IDR 20,000,000
   - Payment Type: "Milestone-Based (Termin)"
   - Apply template: "Termin 2 Fase (50-50)"
   - Verify: 2 milestones created
     - Milestone 1: DP 50% - IDR 10,000,000
     - Milestone 2: Final 50% - IDR 10,000,000
   - Save as DRAFT

3. **Approve Quotation**:
   - Open quotation detail
   - Change status to APPROVED
   - Expected: Status changes, milestone section visible

4. **Create Invoice from Milestone 1**:
   - Option A: From quotation detail page
     - Click "Create Invoice" button next to Milestone 1
   - Option B: From invoice create page
     - Navigate to Invoices → Create New
     - Select quotation from dropdown
     - Verify: Milestone selector appears
     - Select Milestone 1
     - Verify: Amount auto-populated to IDR 10,000,000
     - Verify: Amount fields are disabled
   - Fill payment info and terms
   - Click "Create Invoice"
   - Expected: Invoice created, redirected to invoice detail

5. **Verify Milestone 1 Status**:
   - Go back to quotation detail
   - Verify: Milestone 1 shows "Invoiced" badge
   - Verify: Progress shows "1 of 2 milestones invoiced (50%)"
   - Verify: Cannot create another invoice for Milestone 1

6. **Create Invoice from Milestone 2**:
   - Click "Create Invoice" button next to Milestone 2
   - Verify: Amount is IDR 10,000,000
   - Create invoice
   - Expected: Second invoice created

7. **Verify Completion**:
   - Go to quotation detail
   - Verify: Progress shows "2 of 2 milestones invoiced (100%)"
   - Verify: Both milestones show "Invoiced" badge
   - Go to invoice list
   - Verify: 2 invoices exist, each with milestone badge

8. **Verify Amounts**:
   - Total of both invoices: IDR 20,000,000
   - Should equal quotation total

#### **Scenario 2: 3-Phase Payment (30-40-30)**

1. Create quotation with "Termin 3 Fase (Standard)" template
2. Verify: 3 milestones created (30%, 40%, 30%)
3. Create invoices for each milestone sequentially
4. Verify: All amounts sum to quotation total

#### **Scenario 3: Error Cases**

1. **Duplicate Milestone Invoice**:
   - Create invoice for Milestone 1
   - Try to create another invoice for Milestone 1
   - Expected: Error message "Milestone ini sudah memiliki invoice"

2. **Full Payment from Milestone Quotation**:
   - Create quotation with milestones
   - Try to use "Create from Quotation" button (old flow)
   - Expected: Error "Quotation ini menggunakan termin pembayaran..."

3. **Manual Amount Edit**:
   - Create invoice with milestone selected
   - Try to edit amount manually
   - Expected: Field is disabled

#### **Scenario 4: Batch Generation**

1. Create quotation with 3 milestones
2. Approve quotation
3. Click "Generate All Milestone Invoices"
4. Confirm modal
5. Expected: 3 invoices created simultaneously
6. Verify: All milestones marked as invoiced

---

## **IMPLEMENTATION SEQUENCE**

### **Week 1: Backend Foundation** (Phase 1)
- **Day 1-2**: Task 1.1 & 1.2 (DTO and service enhancements)
- **Day 3**: Task 1.3 (Fix createFromQuotation)
- **Day 4-5**: Task 1.4 (Batch generation endpoint) + Backend tests

### **Week 2: Frontend UI** (Phase 2)
- **Day 1-2**: Task 2.1 (MilestoneSelector component)
- **Day 3-4**: Task 2.2 (InvoiceCreatePage enhancements)
- **Day 5**: Task 2.3 & 2.4 (Progress indicator + warnings)

### **Week 3: Type Safety + UX** (Phase 3 & 4)
- **Day 1**: Phase 3 tasks (TypeScript interfaces)
- **Day 2**: Task 4.1 (QuotationDetailPage integration)
- **Day 3**: Task 4.2 (Batch generation UI)
- **Day 4**: Task 4.3 (Invoice list enhancements)
- **Day 5**: Integration testing

### **Week 4: Testing & Polish** (Phase 5)
- **Day 1-2**: Backend unit tests
- **Day 3**: Frontend component tests
- **Day 4**: Manual testing scenarios
- **Day 5**: Bug fixes and documentation

---

## **RISK MITIGATION**

### **Breaking Changes**
- ✅ Adding optional `paymentMilestoneId` field is **backward compatible**
- ✅ Existing invoice creation flow remains unchanged
- ✅ Non-milestone quotations continue to work as before

### **Data Integrity**
- ✅ Validation prevents duplicate milestone invoices
- ✅ Atomic transactions ensure `milestone.isInvoiced` updates correctly
- ✅ Foreign key constraints maintain referential integrity

### **User Experience**
- ✅ Clear warnings when quotation has milestones
- ✅ Visual progress indicators for milestone status
- ✅ Cannot accidentally create wrong invoice amounts
- ✅ Disabled fields prevent manual errors

### **Performance**
- ✅ Milestone queries use indexed fields (`quotationId`, `milestoneNumber`)
- ✅ Batch generation uses transactions for consistency
- ✅ Frontend caching with React Query reduces API calls

---

## **SUCCESS CRITERIA**

### **Functional Requirements**
✅ User can create quotation with 50-50 payment terms
✅ User can create invoice from milestone 1, amount auto-populated to 50%
✅ System prevents creating duplicate invoice for same milestone
✅ User can create invoice from milestone 2, completing payment cycle
✅ Dashboard shows milestone progress (2/2 invoiced, 100%)
✅ All existing invoice creation flows remain functional

### **Non-Functional Requirements**
✅ Milestone invoice creation completes in < 2 seconds
✅ UI is responsive and works on mobile devices
✅ No breaking changes to existing APIs
✅ Test coverage > 80% for new code
✅ Documentation updated with new workflows

### **Business Requirements**
✅ Supports Indonesian "termin pembayaran" business practice
✅ Accurate financial tracking for milestone-based projects
✅ Clear audit trail for milestone invoicing
✅ Prevents accounting errors from manual amount entry

---

## **ROLLBACK PLAN**

If critical issues arise:

1. **Backend Rollback**:
   - Remove `paymentMilestoneId` from invoice creation
   - Revert service method changes
   - Database schema changes are non-breaking (optional field)

2. **Frontend Rollback**:
   - Hide milestone selector with feature flag
   - Revert to manual amount entry
   - Remove new components

3. **Database Cleanup**:
   ```sql
   -- If needed, unlink invoices from milestones
   UPDATE invoices SET paymentMilestoneId = NULL WHERE paymentMilestoneId IS NOT NULL;

   -- Reset milestone invoiced status
   UPDATE payment_milestones SET isInvoiced = FALSE WHERE isInvoiced = TRUE;
   ```

---

## **POST-IMPLEMENTATION**

### **Documentation Updates**
- [ ] Update API documentation with new endpoints
- [ ] Add user guide for milestone-based invoicing
- [ ] Update developer documentation with schema changes
- [ ] Create video tutorial for milestone workflow

### **Monitoring**
- [ ] Add metrics for milestone invoice creation
- [ ] Track usage of milestone vs. full payment quotations
- [ ] Monitor error rates for milestone operations

### **Future Enhancements**
- [ ] Automatic milestone invoice generation on quotation approval
- [ ] Email notifications for milestone payment reminders
- [ ] Dashboard widget showing upcoming milestone due dates
- [ ] Milestone payment schedule calendar view

---

## **STAKEHOLDER SIGN-OFF**

- [ ] Product Owner: _________________________  Date: __________
- [ ] Lead Developer: _________________________  Date: __________
- [ ] QA Lead: _________________________  Date: __________
- [ ] Business Analyst: _________________________  Date: __________

---

**Document Version**: 1.0
**Last Updated**: 2025-11-03
**Next Review**: After Phase 1 completion
