# CRUD Operations - Comprehensive Bug Analysis Report

**Generated:** 2025-10-16
**Scope:** All CRUD operations across Clients, Projects, Quotations, and Invoices
**Severity Levels:** 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low

---

## Executive Summary

This comprehensive analysis identified **30 bugs** across all CRUD operations:
- 🔴 **Critical**: 6 bugs (data loss/corruption risk)
- 🟠 **High**: 10 bugs (functionality broken/incorrect)
- 🟡 **Medium**: 10 bugs (UX issues/inconsistencies)
- 🔵 **Low**: 4 bugs (minor issues)

---

## 🔴 CRITICAL BUGS

### BUG-001: Project Revenue Calculation Uses Wrong Field (Multiple Locations)
**Location:** `frontend/src/pages/ProjectsPage.tsx:234-249`
**Severity:** 🔴 Critical
**Impact:** Financial data completely incorrect

**Issue:**
```typescript
// WRONG - Line 234-249
const stats = {
  totalBudget: safeProjects.reduce(
    (sum, p) => sum + safeNumber(p?.basePrice || p?.basePrice),  // ❌ Same field twice!
    0
  ),
  totalActual: safeProjects.reduce(
    (sum, p) => sum + safeNumber(p?.basePrice || p?.basePrice),  // ❌ Same field twice!
    0
  ),
  totalRevenue: safeProjects.reduce(
    (sum, p) => sum + safeNumber(p?.basePrice || p?.basePrice),  // ❌ Should use totalRevenue!
    0
  ),
  totalPending: safeProjects.reduce(
    (sum, p) => sum + safeNumber(p?.basePrice || p?.basePrice),  // ❌ Should calculate pending
    0
  ),
}
```

**Fix:**
```typescript
const stats = {
  totalBudget: safeProjects.reduce(
    (sum, p) => sum + safeNumber(p?.estimatedBudget || p?.basePrice || 0),
    0
  ),
  totalActual: safeProjects.reduce(
    (sum, p) => sum + safeNumber(p?.basePrice || 0),
    0
  ),
  totalRevenue: safeProjects.reduce(
    (sum, p) => sum + safeNumber(p?.totalRevenue || 0),  // ✅ Use correct field
    0
  ),
  totalPending: safeProjects.reduce(
    (sum, p) => sum + Math.max(
      safeNumber(p?.basePrice || 0) - safeNumber(p?.totalRevenue || 0),
      0
    ),
    0
  ),
}
```

---

### BUG-002: Project Type Filter Mismatch (Case Sensitivity)
**Location:** `frontend/src/pages/ProjectsPage.tsx:218, 899-901`
**Severity:** 🔴 Critical
**Impact:** Filter completely broken, shows no results

**Issue:**
```typescript
// Filter uses lowercase - Line 899-901
<Select>
  <Option value='production'>Produksi</Option>      // ❌ lowercase
  <Option value='socialMedia'>Media Sosial</Option>  // ❌ camelCase
</Select>

// But comparison uses uppercase - Line 218
const matchesType = !typeFilter || project?.projectType?.code === typeFilter
// project.projectType.code is 'PRODUCTION' or 'SOCIAL_MEDIA' (uppercase + underscore)
```

**Fix:**
```typescript
// Option 1: Fix filter values to match database
<Select>
  <Option value='PRODUCTION'>Produksi</Option>
  <Option value='SOCIAL_MEDIA'>Media Sosial</Option>
</Select>

// Option 2: Normalize comparison
const matchesType = !typeFilter ||
  project?.projectType?.code?.toUpperCase().replace('_', '') ===
  typeFilter.toUpperCase().replace('_', '')
```

---

### BUG-003: Project Creation Uses Wrong Field Name
**Location:** `frontend/src/pages/ProjectsPage.tsx:1118-1125` vs `ProjectCreatePage.tsx`
**Severity:** 🔴 Critical
**Impact:** Project creation fails from modal

**Issue:**
```typescript
// Modal form uses 'type' field
<Form.Item name='type' label={t('projects.type')}>
  <Select id='type' placeholder='Pilih tipe proyek'>
    <Option value='PRODUCTION'>Produksi</Option>
    <Option value='SOCIAL_MEDIA'>Media Sosial</Option>
  </Select>
</Form.Item>

// But service expects 'projectTypeId' (UUID string)
interface CreateProjectRequest {
  projectTypeId: string  // ❌ Mismatch!
  // ... other fields
}
```

**Fix:**
```typescript
// Fetch project types and use their IDs
const { data: projectTypes = [] } = useQuery({
  queryKey: ['project-types'],
  queryFn: projectTypesApi.getAll,
})

<Form.Item name='projectTypeId' label='Project Type'>
  <Select>
    {projectTypes.map(pt => (
      <Option key={pt.id} value={pt.id}>{pt.name}</Option>
    ))}
  </Select>
</Form.Item>
```

---

### BUG-004: Duplicate Field Reference in Revenue Display
**Location:** `frontend/src/pages/ProjectsPage.tsx:633`
**Severity:** 🔴 Critical
**Impact:** Displays wrong budget value

**Issue:**
```typescript
const budget = safeNumber(project.basePrice || project.basePrice || 0)  // ❌ Same field twice!
```

**Fix:**
```typescript
const budget = safeNumber(project.estimatedBudget || project.basePrice || 0)
```

---

### BUG-005: Type Mismatch in Price Parsing
**Location:** `frontend/src/pages/ProjectsPage.tsx:657`
**Severity:** 🔴 Critical
**Impact:** Sorting by price fails or gives wrong results

**Issue:**
```typescript
sorter: (a: Project, b: Project) =>
  (parseFloat(a.basePrice || '0') || 0) - (parseFloat(b.basePrice || '0') || 0)
  // ❌ basePrice might already be a number, or undefined
```

**Fix:**
```typescript
sorter: (a: Project, b: Project) => {
  const aPrice = typeof a.basePrice === 'string'
    ? parseFloat(a.basePrice) || 0
    : safeNumber(a.basePrice)
  const bPrice = typeof b.basePrice === 'string'
    ? parseFloat(b.basePrice) || 0
    : safeNumber(b.basePrice)
  return aPrice - bPrice
}
```

---

### BUG-006: Missing Quotation Status Validation for Invoice Generation
**Location:** `frontend/src/pages/InvoiceCreatePage.tsx:142-147`
**Severity:** 🔴 Critical
**Impact:** Allows invoice creation from non-approved quotations

**Issue:**
```typescript
// Warning shown but creation still allowed
if (selectedQuotation.status !== 'APPROVED') {
  message.warning({ /* ... */ })  // ❌ Only warning, should block!
}
```

**Fix:**
```typescript
// Block form submission for non-approved quotations
if (selectedQuotation && selectedQuotation.status !== 'APPROVED') {
  message.error({
    content: 'Cannot create invoice. Quotation must be APPROVED first.',
    duration: 5,
  })
  return // ✅ Block submission
}
```

---

## 🟠 HIGH SEVERITY BUGS

### BUG-007: Inconsistent Error Handling in Bulk Operations
**Location:** `ClientsPage.tsx:133-147`, `ProjectsPage.tsx:137-151`
**Severity:** 🟠 High
**Impact:** Partial failures not handled, UI state corrupted

**Issue:**
```typescript
const bulkDeleteMutation = useMutation({
  mutationFn: async (ids: string[]) => {
    await Promise.all(ids.map(id => clientService.deleteClient(id)))
    // ❌ If one fails, all fail - no partial success handling
  },
  onSuccess: () => {
    // ❌ Assumes all succeeded
    message.success(`Berhasil menghapus ${selectedRowKeys.length} klien`)
  },
})
```

**Fix:**
```typescript
const bulkDeleteMutation = useMutation({
  mutationFn: async (ids: string[]) => {
    const results = await Promise.allSettled(
      ids.map(id => clientService.deleteClient(id))
    )
    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    return { succeeded, failed, total: ids.length }
  },
  onSuccess: ({ succeeded, failed, total }) => {
    if (failed > 0) {
      message.warning(`${succeeded} of ${total} deleted. ${failed} failed.`)
    } else {
      message.success(`Successfully deleted ${succeeded} clients`)
    }
  },
})
```

---

### BUG-008: Missing Required Field Validation on Quotation Form
**Location:** `QuotationCreatePage.tsx`, `QuotationEditPage.tsx`
**Severity:** 🟠 High
**Impact:** Invalid data submitted to API

**Issue:**
- `scopeOfWork` field is optional in form but might be required by business logic
- No validation for `totalAmount` > `amountPerProject`
- No validation that `validUntil` is after creation date

**Fix:**
```typescript
// Add custom validators
<Form.Item
  name='totalAmount'
  rules={[
    { required: true },
    ({ getFieldValue }) => ({
      validator(_, value) {
        const amountPerProject = getFieldValue('amountPerProject')
        if (value && amountPerProject && value < amountPerProject) {
          return Promise.reject('Total amount must be >= project amount')
        }
        return Promise.resolve()
      },
    }),
  ]}
>
```

---

### BUG-009: Race Condition in Auto-Save and Form Submit
**Location:** All create pages with `useOptimizedAutoSave`
**Severity:** 🟠 High
**Impact:** Data loss if submit happens during auto-save

**Issue:**
```typescript
const handleSubmit = async (values: ProjectFormData) => {
  // ❌ No check if auto-save is in progress
  createProjectMutation.mutate(data)
}
```

**Fix:**
```typescript
const handleSubmit = async (values: ProjectFormData) => {
  // Wait for pending auto-save
  if (autoSave.isSaving) {
    await autoSave.forceSave(values)
  }
  createProjectMutation.mutate(data)
}
```

---

### BUG-010: Materai Calculation Uses Wrong Amount
**Location:** `InvoiceCreatePage.tsx:151`, `InvoiceEditPage.tsx`
**Severity:** 🟠 High
**Impact:** Incorrect Indonesian tax compliance

**Issue:**
```typescript
const materaiRequired = selectedQuotation.totalAmount > 5000000
// ❌ Should check invoice totalAmount, not quotation amount
```

**Fix:**
```typescript
const materaiRequired = form.getFieldValue('totalAmount') > 5000000
// Or watch form values
const totalAmount = Form.useWatch('totalAmount', form)
const materaiRequired = totalAmount > 5000000
```

---

### BUG-011: Invoice Number Not Displayed Correctly
**Location:** `InvoiceEditPage.tsx:329`
**Severity:** 🟠 High
**Impact:** Confusing UX, wrong invoice number shown

**Issue:**
```typescript
title={`Edit Invoice ${invoice.invoiceNumber || invoice.number || 'Draft'}`}
// ❌ Falls back to 'number' which might not exist
```

**Fix:**
```typescript
title={`Edit Invoice ${invoice.invoiceNumber || 'DRAFT-' + invoice.id.slice(0, 8)}`}
```

---

### BUG-012: Query Cache Not Invalidated After Status Change
**Location:** Multiple edit pages
**Severity:** 🟠 High
**Impact:** Stale data shown in list views

**Issue:**
```typescript
const updateStatusMutation = useMutation({
  mutationFn: (status: string) => invoiceService.updateStatus(id!, status),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    queryClient.invalidateQueries({ queryKey: ['invoice', id] })
    // ❌ Missing: stats, recent, overdue queries
  },
})
```

**Fix:**
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['invoices'] })
  queryClient.invalidateQueries({ queryKey: ['invoice', id] })
  queryClient.invalidateQueries({ queryKey: ['invoice-stats'] })  // ✅
  queryClient.invalidateQueries({ queryKey: ['recent-invoices'] })  // ✅
  queryClient.invalidateQueries({ queryKey: ['overdue-invoices'] })  // ✅
}
```

---

### BUG-013: Null Reference in Project Type Display
**Location:** `ProjectsPage.tsx:420-434`
**Severity:** 🟠 High
**Impact:** Runtime error if projectType is null

**Issue:**
```typescript
<span style={{
  background: (project.projectType?.code || 'PRODUCTION') === 'PRODUCTION'
    ? 'rgba(239, 68, 68, 0.15)'
    : 'rgba(6, 182, 212, 0.15)',
  // ❌ If projectType is null, uses fallback 'PRODUCTION' which might be wrong
}}>
  {getTypeText(project.projectType?.code || 'PRODUCTION')}
</span>
```

**Fix:**
```typescript
{project.projectType ? (
  <span style={{
    background: project.projectType.code === 'PRODUCTION'
      ? 'rgba(239, 68, 68, 0.15)'
      : 'rgba(6, 182, 212, 0.15)',
  }}>
    {getTypeText(project.projectType.code)}
  </span>
) : (
  <span style={{ color: '#999' }}>No type</span>
)}
```

---

### BUG-014: Missing Error Boundaries on CRUD Forms
**Location:** All create/edit pages
**Severity:** 🟠 High
**Impact:** App crashes on form errors

**Issue:**
- No error boundaries wrapping form components
- Uncaught errors in form validation crash the app

**Fix:**
```typescript
// Wrap forms with ErrorBoundary
<ErrorBoundary fallback={<FormErrorFallback />}>
  <Form onFinish={handleSubmit}>
    {/* form content */}
  </Form>
</ErrorBoundary>
```

---

## 🟡 MEDIUM SEVERITY BUGS

### BUG-015: Inconsistent Date Format Display
**Location:** Multiple table columns
**Severity:** 🟡 Medium
**Impact:** Confusing UX, inconsistent formatting

**Issue:**
```typescript
// ClientsPage.tsx:481
render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY') : '-')

// ProjectsPage.tsx:611
<div>Mulai: {project.startDate ? dayjs(project.startDate).format('DD/MM/YYYY') : 'TBD'}</div>
// ❌ Uses 'TBD' instead of '-'
```

**Fix:**
```typescript
// Create utility function
const formatDate = (date: string | null | undefined, fallback = '-') =>
  date ? dayjs(date).format('DD/MM/YYYY') : fallback

// Use consistently
render: (date: string) => formatDate(date)
```

---

### BUG-016: Missing Loading States on Dependent Dropdowns
**Location:** `ProjectCreatePage.tsx`, `QuotationCreatePage.tsx`
**Severity:** 🟡 Medium
**Impact:** Poor UX, users can select before data loads

**Issue:**
```typescript
<Form.Item name='clientId'>
  <Select loading={clientsLoading}>
    {/* ❌ But what if projectTypes are still loading? */}
  </Select>
</Form.Item>
```

**Fix:**
```typescript
<Form.Item name='clientId'>
  <Select
    loading={clientsLoading}
    disabled={clientsLoading || projectTypesLoading}  // ✅
  >
```

---

### BUG-017: Progress Calculation Logic Error
**Location:** `ProjectsPage.tsx:460-500`
**Severity:** 🟡 Medium
**Impact:** Incorrect progress display

**Issue:**
```typescript
case 'IN_PROGRESS':
  if (startDate && endDate) {
    const elapsedDuration = now.getTime() - startDate.getTime()
    const timeProgress = Math.min(Math.max((elapsedDuration / totalDuration) * 100, 10), 85)
    // ❌ Clamped to 85% max, but what if project is 95% done by time?
  } else {
    statusProgress = 50 // ❌ Arbitrary 50%
  }
```

**Fix:**
```typescript
case 'IN_PROGRESS':
  if (startDate && endDate) {
    const totalDuration = endDate.getTime() - startDate.getTime()
    const elapsedDuration = now.getTime() - startDate.getTime()
    const timeProgress = Math.max(0, Math.min(95, (elapsedDuration / totalDuration) * 100))
    statusProgress = Math.round(timeProgress)
  } else {
    statusProgress = 30 // More conservative estimate
  }
```

---

### BUG-018: Form Reset Doesn't Clear All State
**Location:** All modal forms
**Severity:** 🟡 Medium
**Impact:** Stale data shown when reopening modal

**Issue:**
```typescript
onCancel={() => {
  setModalVisible(false)
  setEditingClient(null)
  form.resetFields()
  // ❌ Missing: clear validation errors, reset custom state
}}
```

**Fix:**
```typescript
const handleModalClose = () => {
  form.resetFields()
  form.clearValidate()  // ✅ Clear validation errors
  setEditingClient(null)
  setModalVisible(false)
  // ✅ Clear any custom form state
}
```

---

### BUG-019: Missing Debounce on Search Input
**Location:** `ClientsPage.tsx:663`, `ProjectsPage.tsx:873`
**Severity:** 🟡 Medium
**Impact:** Performance issue on large datasets

**Issue:**
```typescript
onChange={e => setSearchText(e.target.value)}
// ❌ Filters on every keystroke
```

**Fix:**
```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const [searchInput, setSearchInput] = useState('')
const searchText = useDebouncedValue(searchInput, 300)

onChange={e => setSearchInput(e.target.value)}  // ✅ Debounced
```

---

### BUG-020: Quotation Filter Not Applied to API Call
**Location:** `QuotationCreatePage.tsx`, service layer
**Severity:** 🟡 Medium
**Impact:** Fetches all quotations instead of filtering

**Issue:**
```typescript
// In InvoiceCreatePage, shows ALL quotations
const { data: quotations = [] } = useQuery({
  queryKey: ['quotations'],
  queryFn: quotationService.getQuotations,
  // ❌ Should filter for APPROVED only
})
```

**Fix:**
```typescript
const { data: quotations = [] } = useQuery({
  queryKey: ['quotations', 'approved'],
  queryFn: () => quotationService.getQuotations({ status: 'APPROVED' }),
})
```

---

### BUG-021: Inconsistent Number Formatting in Forms
**Location:** Multiple InputNumber components
**Severity:** 🟡 Medium
**Impact:** Confusing UX, data entry errors

**Issue:**
```typescript
// Some use dot separator
formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}

// Others use comma
formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
```

**Fix:**
```typescript
// Create consistent utility
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID').format(value)

<InputNumber formatter={formatCurrency} />
```

---

## 🔵 LOW SEVERITY BUGS

### BUG-022: Unused State Variables
**Location:** Multiple pages
**Severity:** 🔵 Low
**Impact:** Code bloat, confusion

**Issue:**
```typescript
// ProjectsPage.tsx:78
const [filters, setFilters] = useState<Record<string, any>>({})
// ❌ Declared but some filter logic doesn't use it properly
```

**Fix:**
- Remove unused state or implement completely
- Use consistent filter state management

---

### BUG-023: Hardcoded Text in Indonesian (No i18n)
**Location:** Multiple components
**Severity:** 🔵 Low
**Impact:** Not translatable

**Issue:**
```typescript
<Button>Hapus ({selectedRowKeys.length})</Button>
// ❌ Hardcoded Indonesian text
```

**Fix:**
```typescript
<Button>{t('common.delete')} ({selectedRowKeys.length})</Button>
```

---

### BUG-024: Console Logs in Production Code
**Location:** `ProjectsPage.tsx:357`
**Severity:** 🔵 Low
**Impact:** Debug logs in production

**Issue:**
```typescript
console.log('Submitting project data:', JSON.stringify(data, null, 2))
// ❌ Should be removed or wrapped in __DEV__
```

**Fix:**
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Submitting project data:', JSON.stringify(data, null, 2))
}
```

---

### BUG-025: Direct form.getFieldValue Calls in Render
**Location:** `InvoiceEditPage.tsx:280, 289`, `InvoiceCreatePage.tsx:289`
**Severity:** 🔵 Low
**Impact:** Violates React rules, causes unnecessary re-renders

**Issue:**
```typescript
// Called directly in render body
const selectedClient = clients.find(
  c => c.id === form.getFieldValue('clientId')  // ❌ Violates React rules
)
const totalAmount = form.getFieldValue('totalAmount') || 0
```

**Fix:**
```typescript
// Use Form.useWatch for reactive values
const clientId = Form.useWatch('clientId', form)
const totalAmount = Form.useWatch('totalAmount', form) || 0

const selectedClient = clients.find(c => c.id === clientId)
```

---

### BUG-026: Change Detection Uses JSON.stringify with Dayjs Objects
**Location:** `QuotationEditPage.tsx:176-183`
**Severity:** 🟡 Medium
**Impact:** Change detection fails for date fields

**Issue:**
```typescript
const handleFormChange = () => {
  const currentValues = form.getFieldsValue()
  const changed =
    originalValues &&
    JSON.stringify(currentValues) !== JSON.stringify(originalValues)
  // ❌ dayjs objects don't serialize properly with JSON.stringify
  setHasChanges(!!changed)
}
```

**Fix:**
```typescript
const handleFormChange = () => {
  const currentValues = form.getFieldsValue()
  const changed = originalValues &&
    Object.keys(originalValues).some(key => {
      const current = currentValues[key]
      const original = originalValues[key]

      // Handle dayjs comparison
      if (dayjs.isDayjs(current) && dayjs.isDayjs(original)) {
        return !current.isSame(original)
      }

      return current !== original
    })
  setHasChanges(!!changed)
}
```

---

### BUG-027: Hardcoded Auto-Save Timestamp Text
**Location:** `QuotationEditPage.tsx:346`
**Severity:** 🔵 Low
**Impact:** Misleading user feedback

**Issue:**
```typescript
{
  type: 'info',
  message: 'Auto-saved 2 minutes ago',  // ❌ Hardcoded, never updates
}
```

**Fix:**
```typescript
// Use actual timestamp from auto-save hook
{
  type: 'info',
  message: autoSave.getLastSavedText() || 'No changes to save',
}
```

---

### BUG-028: Auto-Save Stubbed Out Without Backend Implementation
**Location:** `QuotationEditPage.tsx:217-227`, `InvoiceEditPage.tsx:242-252`
**Severity:** 🟠 High
**Impact:** Users think data is saved but it's not

**Issue:**
```typescript
const handleSaveDraft = async () => {
  setAutoSaving(true)
  try {
    const values = form.getFieldsValue()
    // Auto-save logic would go here  // ❌ Not implemented!
    message.success('Draft saved')  // ❌ False success message
  } catch (error) {
    message.error('Failed to save draft')
  } finally {
    setAutoSaving(false)
  }
}
```

**Fix:**
```typescript
const handleSaveDraft = async () => {
  setAutoSaving(true)
  try {
    const values = form.getFieldsValue()
    const draftData = {
      ...values,
      validUntil: values.validUntil?.toISOString(),
    }
    // ✅ Actually save to backend
    await quotationService.updateQuotation(id, draftData)
    message.success('Draft saved')
  } catch (error) {
    message.error('Failed to save draft')
  } finally {
    setAutoSaving(false)
  }
}
```

---

### BUG-029: Race Condition in Save-and-Send Operations
**Location:** `InvoiceCreatePage.tsx:267-269`
**Severity:** 🟠 High
**Impact:** Invoice might be sent before creation completes

**Issue:**
```typescript
const invoice = await invoiceService.createInvoice(invoiceData)
// Update status to SENT
await invoiceService.updateInvoice(invoice.id, { status: 'SENT' })
// ❌ Race condition if first call fails or is slow
```

**Fix:**
```typescript
// Option 1: Add status to initial creation
const invoice = await invoiceService.createInvoice({
  ...invoiceData,
  status: 'SENT',  // ✅ Create as SENT directly
})

// Option 2: Use optimistic updates with proper error handling
try {
  const invoice = await invoiceService.createInvoice(invoiceData)
  await invoiceService.updateStatus(invoice.id, 'SENT')
} catch (error) {
  // Rollback or handle partial failure
  message.error('Failed to send invoice. It was saved as draft.')
}
```

---

### BUG-030: Materai Switch Controlled and Disabled Simultaneously
**Location:** `InvoiceEditPage.tsx:670`, `InvoiceCreatePage.tsx:623`
**Severity:** 🟡 Medium
**Impact:** Confusing form state, can create inconsistencies

**Issue:**
```typescript
<Form.Item name='materaiRequired' valuePropName='checked'>
  <Switch
    disabled={!canEdit || !form.getFieldValue('materaiRequired')}
    // ❌ materaiApplied switch is disabled if materaiRequired is false
    // But materaiRequired itself is also controlled by form
  />
</Form.Item>
```

**Fix:**
```typescript
// Watch the materaiRequired value reactively
const materaiRequired = Form.useWatch('materaiRequired', form)

<Form.Item name='materaiApplied' valuePropName='checked'>
  <Switch
    disabled={!canEdit || !materaiRequired}  // ✅ Use watched value
    checkedChildren='Applied'
    unCheckedChildren='Not Applied'
  />
</Form.Item>
```

---

## Priority Fix Recommendations

### Immediate (This Sprint)
1. **BUG-001**: Fix revenue calculation (Critical financial bug)
2. **BUG-002**: Fix project type filter (Completely broken)
3. **BUG-003**: Fix project creation from modal (Creation fails)
4. **BUG-006**: Block invoice creation from non-approved quotations
5. **BUG-028**: Implement auto-save backend logic (False success messages)

### Next Sprint
6. **BUG-007**: Implement proper bulk operation error handling
7. **BUG-009**: Fix race condition in auto-save
8. **BUG-029**: Fix race condition in save-and-send operations
9. **BUG-012**: Fix cache invalidation
10. **BUG-014**: Add error boundaries

### Backlog
- All Medium and Low severity bugs
- Code quality improvements
- i18n completion

---

## Testing Recommendations

### Unit Tests Needed
1. Revenue calculation functions
2. Type filter matching logic
3. Date formatting utilities
4. Progress calculation algorithm

### Integration Tests Needed
1. Bulk delete with partial failures
2. Form submission during auto-save
3. Cache invalidation after mutations
4. Filter combinations

### E2E Tests Needed
1. Complete quotation → invoice workflow
2. Project creation → quotation → invoice flow
3. Bulk operations with various scenarios

---

## Code Quality Improvements

### Type Safety
- Add strict null checks
- Use discriminated unions for status types
- Add runtime type validation with Zod

### Error Handling
- Implement error boundary components
- Add specific error types
- Log errors to monitoring service

### Performance
- Implement virtual scrolling for large tables
- Add pagination to all list endpoints
- Debounce all search inputs

---

**Report End**
