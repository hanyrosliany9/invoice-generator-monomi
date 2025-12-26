# Implementation Plan: Ayat Jurnal Penyesuaian (Adjusting Journal Entries)

**Created**: 2025-10-18
**Status**: Ready for Implementation
**Priority**: High (Required for PSAK Compliance)

---

## 1. Executive Summary

This document outlines the implementation plan for adding **Ayat Jurnal Penyesuaian** (Adjusting Journal Entries) functionality to the Indonesian Business Management System. This feature is required for proper accrual accounting and PSAK (Indonesian Accounting Standards) compliance.

### What Are Ayat Jurnal Penyesuaian?

Adjusting journal entries are end-of-period accounting entries that ensure revenues and expenses are recorded in the correct accounting period, following the matching principle and accrual basis accounting.

**4 Main Types**:
1. **Beban Dibayar Dimuka** (Prepaid Expense) - Payment made before service received
   - Example: 12-month insurance paid upfront
   - Entry: DR Expense / CR Prepaid Asset

2. **Pendapatan Diterima Dimuka** (Unearned Revenue) - Payment received before service provided
   - Example: Annual subscription paid in advance
   - Entry: DR Unearned Revenue Liability / CR Revenue

3. **Pendapatan yang Masih Harus Diterima** (Accrued Revenue) - Service provided, payment not yet received
   - Example: Consulting work completed, invoice not yet sent
   - Entry: DR Accrued Revenue Receivable / CR Revenue

4. **Beban yang Masih Harus Dibayar** (Accrued Expense) - Service received, payment not yet made
   - Example: Electricity used, bill not yet received
   - Entry: DR Expense / CR Accrued Expense Payable

---

## 2. Current System Analysis

### ✅ Backend - FULLY READY (100%)

The backend already has complete infrastructure to support adjusting entries:

**Journal Service** (`journal.service.ts`):
- ✅ `createJournalEntry()` - Create manual journal entries
- ✅ `updateJournalEntry()` - Edit draft entries
- ✅ `postJournalEntry()` - Post to general ledger
- ✅ `reverseJournalEntry()` - Reverse posted entries
- ✅ Validation: Balanced entry (debit = credit)
- ✅ Account code validation
- ✅ Fiscal period management
- ✅ Auto-generated entry numbers (JE-YYYY-MM-XXXX)

**TransactionType Enum** (schema.prisma):
```prisma
enum TransactionType {
  INVOICE_SENT
  PAYMENT_RECEIVED
  EXPENSE_SUBMITTED
  PAYMENT_MADE
  DEPRECIATION
  ECL_PROVISION
  ECL_REVERSAL
  ADJUSTMENT          // ✅ Already exists!
  REVENUE_RECOGNITION
  DEFERRED_REVENUE
  WIP_RECOGNITION
  TAX_PROVISION
  MANUAL
}
```

**API Endpoints** (accounting.controller.ts):
- ✅ POST `/accounting/journal-entries` - Create entry
- ✅ GET `/accounting/journal-entries` - List with filters
- ✅ GET `/accounting/journal-entries/:id` - View details
- ✅ PATCH `/accounting/journal-entries/:id` - Update draft
- ✅ POST `/accounting/journal-entries/:id/post` - Post to ledger
- ✅ POST `/accounting/journal-entries/:id/reverse` - Reverse entry
- ✅ DELETE `/accounting/journal-entries/:id` - Delete draft
- ✅ GET `/accounting/chart-of-accounts` - Account picker
- ✅ GET `/accounting/fiscal-periods` - Period picker

### ❌ Frontend - MISSING MANUAL ENTRY UI

**JournalEntriesPage.tsx** - View-Only:
- ✅ List journal entries with filters
- ✅ View details modal with line items
- ✅ Search and filter capabilities
- ❌ **NO CREATE BUTTON** - Cannot create entries manually
- ❌ **NO EDIT BUTTON** - Cannot edit existing entries
- ❌ **NO POST BUTTON** - Cannot post to ledger via UI
- ❌ **NO REVERSE BUTTON** - Cannot reverse entries via UI

### Gap Analysis

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Create Manual Entry | ✅ Ready | ❌ Missing | **Needs UI** |
| Edit Draft Entry | ✅ Ready | ❌ Missing | **Needs UI** |
| Post to Ledger | ✅ Ready | ❌ Missing | **Needs UI** |
| Reverse Entry | ✅ Ready | ❌ Missing | **Needs UI** |
| Adjusting Entry Templates | ❌ N/A | ❌ Missing | **New Feature** |
| Real-time Validation | ❌ N/A | ❌ Missing | **New Feature** |

---

## 3. Implementation Plan

### Phase 1: Manual Journal Entry Form (Foundation)
**Duration**: 2-3 days
**Priority**: Critical

Create the core UI for manually creating journal entries. This is the foundation for adjusting entries.

#### Components to Create

**1.1. `JournalEntryFormPage.tsx`** - Main Form
- Form layout using Ant Design
- Entry header fields:
  - Entry Date (DatePicker)
  - Transaction Type (Select with Indonesian labels)
  - Description (TextArea - Indonesian, English optional)
  - Document Number (Input - optional)
  - Document Date (DatePicker - optional)
  - Fiscal Period (Auto-selected, readonly)
- Line items editor (table component)
- Save as Draft / Submit button
- Cancel button

**1.2. `JournalLineItemsEditor.tsx`** - Dynamic Line Items Table
- Editable table component
- Columns:
  - Account Code (Searchable Select)
  - Account Name (Readonly, auto-filled)
  - Description (Input)
  - Debit (Number Input)
  - Credit (Number Input)
  - Actions (Delete row button)
- Add Line Item button
- Real-time totals:
  - Total Debit (sum)
  - Total Credit (sum)
  - Difference (debit - credit)
  - **Validation indicator**: Green checkmark if balanced, red warning if not
- Minimum 2 line items required

**1.3. `AccountSelector.tsx`** - Account Picker
- Searchable Select component
- Fetch accounts from `/accounting/chart-of-accounts`
- Display: `${code} - ${nameId || name}`
- Filter by account type (optional)
- Show inactive accounts option (default: hidden)

**1.4. Validation Rules**
- Entry date required
- Transaction type required
- Description required (minimum 10 characters)
- Minimum 2 line items
- Each line must have either debit OR credit (not both, not neither)
- Total debits must equal total credits
- Account codes must be valid and active
- All amounts must be > 0

**1.5. Routes**
- `/accounting/journal-entries/create` - Create new entry
- `/accounting/journal-entries/:id/edit` - Edit draft entry

#### API Integration
```typescript
// services/accounting.ts

export interface CreateJournalEntryRequest {
  entryDate: string; // ISO date
  description: string;
  descriptionId?: string;
  descriptionEn?: string;
  transactionType: TransactionType;
  transactionId: string; // Use entryNumber for manual entries
  documentNumber?: string;
  documentDate?: string; // ISO date
  fiscalPeriodId?: string; // Auto-filled if empty
  lineItems: {
    accountCode: string;
    description?: string;
    descriptionId?: string;
    debit: number;
    credit: number;
    projectId?: string;
    clientId?: string;
    departmentId?: string;
  }[];
}

export const createManualJournalEntry = async (
  data: CreateJournalEntryRequest
): Promise<JournalEntry> => {
  const response = await api.post('/accounting/journal-entries', {
    ...data,
    status: 'DRAFT', // Always start as draft
  });
  return response.data;
};

export const updateJournalEntry = async (
  id: string,
  data: Partial<CreateJournalEntryRequest>
): Promise<JournalEntry> => {
  const response = await api.patch(`/accounting/journal-entries/${id}`, data);
  return response.data;
};
```

---

### Phase 2: Post & Reverse Actions (Journal Management)
**Duration**: 1 day
**Priority**: High

Add actions to post and reverse journal entries from the UI.

#### Enhancements to `JournalEntriesPage.tsx`

**2.1. Actions in Detail Modal**
- Add action buttons after entry details:
  - **Post to Ledger** (only if status = DRAFT and isPosted = false)
    - Confirmation dialog: "Posting will lock this entry and update account balances. Continue?"
    - Success message: "Journal entry posted successfully"
    - Reload entry to show new status
  - **Reverse Entry** (only if isPosted = true and isReversing = false)
    - Confirmation dialog: "This will create a reversing entry with swapped debits/credits. Continue?"
    - Success message: "Reversing entry created: JE-YYYY-MM-XXXX"
    - Navigate to reversing entry details
  - **Edit** (only if status = DRAFT and isPosted = false)
    - Navigate to edit page: `/accounting/journal-entries/:id/edit`
  - **Delete** (only if status = DRAFT and isPosted = false)
    - Confirmation dialog: "Delete this draft entry? This cannot be undone."
    - Success message: "Entry deleted successfully"
    - Close modal and refresh list

**2.2. API Integration**
```typescript
// services/accounting.ts

export const postJournalEntry = async (id: string): Promise<JournalEntry> => {
  const response = await api.post(`/accounting/journal-entries/${id}/post`);
  return response.data;
};

export const reverseJournalEntry = async (id: string): Promise<JournalEntry> => {
  const response = await api.post(`/accounting/journal-entries/${id}/reverse`);
  return response.data;
};

export const deleteJournalEntry = async (id: string): Promise<void> => {
  await api.delete(`/accounting/journal-entries/${id}`);
};
```

**2.3. UI Enhancements**
- Add status badges in entry list:
  - Draft: Gray badge
  - Posted: Green badge with lock icon
  - Reversing: Orange badge with "Reversal" label
- Add "Create Entry" button in page header
- Add transaction type filter with Indonesian labels:
  ```typescript
  const transactionTypeLabels: Record<TransactionType, string> = {
    INVOICE_SENT: 'Faktur Terkirim',
    PAYMENT_RECEIVED: 'Pembayaran Diterima',
    EXPENSE_SUBMITTED: 'Beban Diajukan',
    PAYMENT_MADE: 'Pembayaran Dilakukan',
    DEPRECIATION: 'Penyusutan',
    ECL_PROVISION: 'Penyisihan Piutang',
    ECL_REVERSAL: 'Pembalikan Penyisihan',
    ADJUSTMENT: 'Penyesuaian',
    REVENUE_RECOGNITION: 'Pengakuan Pendapatan',
    DEFERRED_REVENUE: 'Pendapatan Ditangguhkan',
    WIP_RECOGNITION: 'Pengakuan WIP',
    TAX_PROVISION: 'Provisi Pajak',
    MANUAL: 'Manual',
  };
  ```

---

### Phase 3: Adjusting Entry Templates (Specialized Feature)
**Duration**: 2-3 days
**Priority**: Medium

Create pre-configured templates for the 4 types of adjusting entries to simplify data entry.

#### Components to Create

**3.1. `AdjustingEntryWizard.tsx`** - Template Selector
- Step 1: Select Adjusting Entry Type
  - Radio group with 4 options:
    - **Prepaid Expense (Beban Dibayar Dimuka)**
      - Icon: Calendar + Money
      - Description: "Mengakui beban dari pembayaran yang telah dilakukan sebelumnya"
      - Example: "Asuransi, sewa, perlengkapan kantor"
    - **Unearned Revenue (Pendapatan Diterima Dimuka)**
      - Icon: Gift
      - Description: "Mengakui pendapatan dari pembayaran yang telah diterima sebelumnya"
      - Example: "Langganan tahunan, uang muka proyek"
    - **Accrued Revenue (Pendapatan yang Masih Harus Diterima)**
      - Icon: Clock + Dollar
      - Description: "Mengakui pendapatan untuk jasa yang telah diberikan tetapi belum ditagih"
      - Example: "Jasa konsultasi selesai, invoice belum terkirim"
    - **Accrued Expense (Beban yang Masih Harus Dibayar)**
      - Icon: Warning + Money
      - Description: "Mengakui beban untuk jasa yang telah diterima tetapi belum dibayar"
      - Example: "Listrik, telepon, gaji karyawan"
- Step 2: Fill Template Fields
  - Based on selected type, show pre-configured form
  - Auto-fill account codes with suggestions
  - Allow override if needed
- Step 3: Review & Submit
  - Show generated journal entry
  - Confirm and create

**3.2. Template Configurations**

**Template 1: Prepaid Expense → Expense Recognition**
```typescript
interface PrepaidExpenseTemplate {
  templateType: 'PREPAID_EXPENSE';
  fields: {
    prepaidAssetAccount: string; // Default: 1-1510 (Prepaid Expense)
    expenseAccount: string; // User selects (e.g., 6-1010 Rent Expense)
    amount: number;
    entryDate: Date;
    description: string;
  };
  generateEntry: () => {
    lineItems: [
      {
        accountCode: fields.expenseAccount,
        description: `Pengakuan beban: ${fields.description}`,
        debit: fields.amount,
        credit: 0,
      },
      {
        accountCode: fields.prepaidAssetAccount,
        description: `Pengurangan beban dibayar dimuka: ${fields.description}`,
        debit: 0,
        credit: fields.amount,
      }
    ],
    transactionType: 'ADJUSTMENT',
    description: `Penyesuaian beban dibayar dimuka: ${fields.description}`,
  };
}
```

**Template 2: Unearned Revenue → Revenue Recognition**
```typescript
interface UnearnedRevenueTemplate {
  templateType: 'UNEARNED_REVENUE';
  fields: {
    unearnedRevenueAccount: string; // Default: 2-2010 (Unearned Revenue)
    revenueAccount: string; // User selects (e.g., 4-1010 Service Revenue)
    amount: number;
    entryDate: Date;
    description: string;
  };
  generateEntry: () => {
    lineItems: [
      {
        accountCode: fields.unearnedRevenueAccount,
        description: `Pengakuan pendapatan: ${fields.description}`,
        debit: fields.amount,
        credit: 0,
      },
      {
        accountCode: fields.revenueAccount,
        description: `Pendapatan dari jasa yang telah diberikan: ${fields.description}`,
        debit: 0,
        credit: fields.amount,
      }
    ],
    transactionType: 'ADJUSTMENT',
    description: `Penyesuaian pendapatan diterima dimuka: ${fields.description}`,
  };
}
```

**Template 3: Accrued Revenue → Revenue Receivable**
```typescript
interface AccruedRevenueTemplate {
  templateType: 'ACCRUED_REVENUE';
  fields: {
    accruedRevenueAccount: string; // Default: 1-2020 (Accrued Revenue)
    revenueAccount: string; // User selects (e.g., 4-1010 Service Revenue)
    amount: number;
    entryDate: Date;
    description: string;
    clientId?: string; // Optional link to client
  };
  generateEntry: () => {
    lineItems: [
      {
        accountCode: fields.accruedRevenueAccount,
        description: `Pendapatan yang masih harus diterima: ${fields.description}`,
        debit: fields.amount,
        credit: 0,
        clientId: fields.clientId,
      },
      {
        accountCode: fields.revenueAccount,
        description: `Pengakuan pendapatan: ${fields.description}`,
        debit: 0,
        credit: fields.amount,
        clientId: fields.clientId,
      }
    ],
    transactionType: 'ADJUSTMENT',
    description: `Penyesuaian pendapatan yang masih harus diterima: ${fields.description}`,
  };
}
```

**Template 4: Accrued Expense → Expense Payable**
```typescript
interface AccruedExpenseTemplate {
  templateType: 'ACCRUED_EXPENSE';
  fields: {
    expenseAccount: string; // User selects (e.g., 6-3010 Utilities)
    accruedExpenseAccount: string; // Default: 2-1020 (Accrued Expenses)
    amount: number;
    entryDate: Date;
    description: string;
  };
  generateEntry: () => {
    lineItems: [
      {
        accountCode: fields.expenseAccount,
        description: `Pengakuan beban: ${fields.description}`,
        debit: fields.amount,
        credit: 0,
      },
      {
        accountCode: fields.accruedExpenseAccount,
        description: `Beban yang masih harus dibayar: ${fields.description}`,
        debit: 0,
        credit: fields.amount,
      }
    ],
    transactionType: 'ADJUSTMENT',
    description: `Penyesuaian beban yang masih harus dibayar: ${fields.description}`,
  };
}
```

**3.3. Routes**
- `/accounting/adjusting-entries/create` - Open wizard
- After template submission, redirect to manual form with pre-filled data
- User can still edit before saving

**3.4. Navigation**
- Add new menu item in accounting section:
  - "Jurnal Penyesuaian" (Adjusting Entries)
  - Opens wizard

---

### Phase 4: Chart of Accounts Enhancement (Optional)
**Duration**: 1 day
**Priority**: Low (if accounts exist)

Ensure all required accounts for adjusting entries exist in the Chart of Accounts.

#### Required Accounts

**Asset Accounts** (Account Type: ASSET):
- `1-1510` - Beban Dibayar Dimuka (Prepaid Expense)
- `1-2020` - Pendapatan yang Masih Harus Diterima (Accrued Revenue)

**Liability Accounts** (Account Type: LIABILITY):
- `2-1020` - Beban yang Masih Harus Dibayar (Accrued Expenses)
- `2-2010` - Pendapatan Diterima Dimuka (Unearned Revenue)

**Validation Query**:
```sql
SELECT code, name, nameId, accountType, isActive
FROM "ChartOfAccounts"
WHERE code IN ('1-1510', '1-2020', '2-1020', '2-2010');
```

If missing, create seed data or admin UI to add them.

---

## 4. Technical Specifications

### Frontend Tech Stack
- **Framework**: React 19 + TypeScript
- **UI Library**: Ant Design 5.x
- **State Management**: TanStack Query (React Query)
- **Form Handling**: Ant Design Form with custom validation
- **Routing**: React Router

### Key Libraries
- `@ant-design/icons` - Icons
- `dayjs` - Date handling
- `@tanstack/react-query` - API caching

### State Management Strategy
- Use React Query for server state (journal entries, accounts)
- Local state for form editing (useState)
- No global state needed

### Validation Strategy
- **Backend**: DTOs with class-validator (already implemented)
- **Frontend**: Real-time validation
  - Account code exists check (debounced)
  - Debit/credit balance check (onChange)
  - Required field check (onBlur)
  - Form-level validation (onSubmit)

### Error Handling
- API errors displayed as Ant Design message.error()
- Form validation errors inline with field
- Confirmation dialogs for destructive actions

---

## 5. Implementation Checklist

### Phase 1: Manual Journal Entry Form
- [ ] Create `JournalEntryFormPage.tsx`
- [ ] Create `JournalLineItemsEditor.tsx`
- [ ] Create `AccountSelector.tsx`
- [ ] Implement form validation logic
- [ ] Add routes for create/edit
- [ ] Add API service functions
- [ ] Test creating draft entries
- [ ] Test editing draft entries
- [ ] Test validation errors

### Phase 2: Post & Reverse Actions
- [ ] Add "Create Entry" button to JournalEntriesPage
- [ ] Add "Post" button in detail modal
- [ ] Add "Reverse" button in detail modal
- [ ] Add "Edit" button in detail modal
- [ ] Add "Delete" button in detail modal
- [ ] Implement confirmation dialogs
- [ ] Add Indonesian transaction type labels
- [ ] Test posting entries
- [ ] Test reversing entries
- [ ] Test deleting draft entries

### Phase 3: Adjusting Entry Templates
- [ ] Create `AdjustingEntryWizard.tsx`
- [ ] Implement 4 template configurations
- [ ] Add template selection step
- [ ] Add template field input step
- [ ] Add review & submit step
- [ ] Add navigation menu item
- [ ] Test all 4 templates
- [ ] Test pre-fill → manual edit flow

### Phase 4: Chart of Accounts (If Needed)
- [ ] Query database for required accounts
- [ ] Create seed data if missing
- [ ] Verify account codes in templates

---

## 6. Testing Plan

### Unit Tests
- Form validation logic
- Template generation functions
- Balance calculation functions

### Integration Tests
- Create journal entry API call
- Update journal entry API call
- Post journal entry API call
- Reverse journal entry API call

### E2E Tests (Manual)
1. Create manual journal entry with 2 line items
2. Verify debit = credit validation
3. Save as draft
4. Edit draft entry
5. Post to ledger
6. Verify cannot edit posted entry
7. Reverse posted entry
8. Verify reversing entry created
9. Use Prepaid Expense template
10. Verify pre-filled form
11. Submit template-based entry
12. Post template entry to ledger

---

## 7. Database Schema (No Changes Required)

The existing schema already supports all features:

```prisma
model JournalEntry {
  id                String              @id @default(uuid())
  entryNumber       String              @unique
  entryDate         DateTime
  description       String
  descriptionId     String?
  descriptionEn     String?
  transactionType   TransactionType     // ADJUSTMENT already exists
  transactionId     String
  documentNumber    String?
  documentDate      DateTime?
  status            JournalStatus       @default(DRAFT)
  isPosted          Boolean             @default(false)
  postedAt          DateTime?
  postedBy          String?
  fiscalPeriodId    String?
  isReversing       Boolean             @default(false)
  reversedEntryId   String?
  createdBy         String
  updatedBy         String?
  lineItems         JournalLineItem[]
  // ... relations
}

model JournalLineItem {
  id              String        @id @default(uuid())
  journalEntryId  String
  lineNumber      Int
  accountId       String
  description     String?
  descriptionId   String?
  debit           Decimal       @default(0) @db.Decimal(15, 2)
  credit          Decimal       @default(0) @db.Decimal(15, 2)
  projectId       String?
  clientId        String?
  departmentId    String?
  // ... relations
}
```

**No migrations required!** ✅

---

## 8. Documentation Requirements

### User Documentation (Create After Implementation)
- [ ] How to create manual journal entries
- [ ] How to use adjusting entry templates
- [ ] Explanation of 4 adjusting entry types with examples
- [ ] Video tutorial (screen recording)

### Developer Documentation (Update Existing)
- [ ] Update API documentation with manual entry endpoints
- [ ] Add journal entry workflow diagram
- [ ] Document template system architecture

---

## 9. Success Criteria

The implementation is successful when:

1. ✅ Users can create manual journal entries from the UI
2. ✅ Users can edit draft journal entries
3. ✅ Users can post journal entries to the general ledger
4. ✅ Users can reverse posted journal entries
5. ✅ Real-time validation ensures balanced entries
6. ✅ 4 adjusting entry templates are available and functional
7. ✅ All operations comply with PSAK standards
8. ✅ All text is in Bahasa Indonesia
9. ✅ Dark theme support is maintained
10. ✅ No TypeScript compilation errors
11. ✅ All CRUD operations work as expected

---

## 10. Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Manual Entry Form | 2-3 days | None |
| Phase 2: Post/Reverse Actions | 1 day | Phase 1 complete |
| Phase 3: Templates | 2-3 days | Phase 1 complete |
| Phase 4: Accounts (if needed) | 1 day | Database access |
| **Total** | **6-8 days** | - |

**Recommended Approach**: Implement Phase 1 → Phase 2 → Phase 3 in sequence.

---

## 11. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing required accounts | High | Phase 4 verification |
| Complex validation logic | Medium | Reuse backend validation |
| User training needed | Medium | Create video tutorials |
| Template logic errors | Low | Extensive testing |

---

## 12. Post-Implementation

After implementation:
1. Train accounting team on new features
2. Migrate any manual spreadsheet entries to system
3. Monitor usage and gather feedback
4. Add more templates if requested (e.g., depreciation adjustments)

---

## 13. References

- **PSAK Standards**: Indonesian Financial Accounting Standards
- **Backend Service**: `backend/src/modules/accounting/services/journal.service.ts`
- **API Controller**: `backend/src/modules/accounting/accounting.controller.ts`
- **Frontend Page**: `frontend/src/pages/accounting/JournalEntriesPage.tsx`
- **Database Schema**: `backend/prisma/schema.prisma`

---

**End of Implementation Plan**
