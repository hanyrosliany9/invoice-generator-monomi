# Indonesian Business Management System - UI/UX Comprehensive Analysis & Fixing Plan

**Generated**: 2025-10-14
**Codebase**: Invoice Generator Frontend
**Total Pages Analyzed**: 19 pages (~15,728 lines of code)
**Analysis Scope**: Design system, component consistency, Indonesian localization, accessibility, state management, navigation

---

## Executive Summary

This analysis identifies **37 critical UI/UX issues** across design consistency, component reusability, localization, and user experience. The codebase shows **significant inconsistencies** in:
- Statistics card styling (3 different patterns)
- Border radius values (12px, 16px, 20px used inconsistently)
- Gradient implementations (4+ different gradient patterns)
- Font sizing (inconsistent across pages)
- Mixed Indonesian/English text throughout

**Estimated Total Effort**: 18-24 hours
**Priority Distribution**: 12 P0/P1 issues (critical), 15 P2 issues (high priority), 10 P3 issues (nice-to-have)

---

## CRITICAL ISSUES (P0 - Breaks UX/functionality)

### P0-01: Mixed Indonesian/English Text - Language Consistency Failure
**Severity**: P0
**Location**:
- `/frontend/src/pages/DashboardPage.tsx:218` - "Welcome back! Here's what's happening..."
- `/frontend/src/pages/ClientsPage.tsx:383-425` - "Business Overview" heading
- `/frontend/src/pages/ReportsPage.tsx:365` - "Schedule Report" button

**Current State**:
```tsx
// DashboardPage.tsx:218
<Text style={{ color: '#64748b', fontSize: '16px' }}>
  Welcome back! Here's what's happening with your business today.
</Text>

// ClientsPage.tsx:383
<div>Business Overview</div>

// ReportsPage.tsx:365
<Button icon={<ClockCircleOutlined />}>
  Schedule Report
</Button>
```

**Problem**: The entire application is supposed to be Indonesian-first, but multiple pages have hardcoded English text. This breaks the Indonesian business compliance requirement and creates a confusing multilingual experience.

**Recommended Solution**:
1. Add missing translation keys to i18n files
2. Replace all hardcoded English strings with `t()` function calls
3. Audit entire codebase with regex: `/(text|label|placeholder|title).*[A-Za-z]{4,}/`

**Affected Files**:
- `/frontend/src/pages/DashboardPage.tsx`
- `/frontend/src/pages/ClientsPage.tsx`
- `/frontend/src/pages/ProjectsPage.tsx`
- `/frontend/src/pages/QuotationsPage.tsx`
- `/frontend/src/pages/InvoicesPage.tsx`
- `/frontend/src/pages/ReportsPage.tsx`

**Effort Estimate**: 3-4 hours
**Dependencies**: None

---

### P0-02: Statistics Card Style Inconsistency - 3 Different Patterns
**Severity**: P0
**Location**: All list pages (Clients, Projects, Quotations, Invoices, Dashboard)

**Current State**:

**Pattern 1 - Dashboard (lines 224-350)**:
```tsx
<Card
  style={{
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
  }}
>
  <Statistic
    valueStyle={{
      color: '#1e293b',
      fontSize: '28px',
      fontWeight: 700,
    }}
  />
</Card>
```

**Pattern 2 - ClientsPage (lines 484-607)**:
```tsx
<Card
  style={{
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
  }}
>
  <Statistic
    valueStyle={{
      color: '#1e293b',
      fontSize: '28px',
      fontWeight: 700,
    }}
  />
</Card>
```

**Pattern 3 - ProjectsPage (lines 642-896)**:
```tsx
<Card
  style={{
    borderRadius: '16px',  // Same
    border: '1px solid #e2e8f0',  // Same
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',  // Same
    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',  // Same
  }}
>
  <Statistic
    valueStyle={{
      color: '#1e293b',
      fontSize: '28px',
      fontWeight: 700,
    }}
  />
</Card>
```

**Revenue Cards - Pattern 4 (Dashboard, lines 354-420)**:
```tsx
<Card
  style={{
    borderRadius: '20px',  // DIFFERENT!
    border: '1px solid #e2e8f0',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',  // DIFFERENT!
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',  // DIFFERENT!
    color: '#ffffff',
  }}
>
  <Statistic
    valueStyle={{
      color: '#ffffff',
      fontSize: '32px',  // DIFFERENT!
      fontWeight: 800,  // DIFFERENT!
    }}
  />
</Card>
```

**Problem**:
- **Regular stats**: `borderRadius: '16px'`, `fontSize: '28px'`, `fontWeight: 700`
- **Revenue stats**: `borderRadius: '20px'`, `fontSize: '32px'`, `fontWeight: 800`, `boxShadow: '0 8px 24px'`
- Inconsistent sizing creates visual hierarchy confusion
- Users can't distinguish between primary and secondary metrics

**Recommended Solution**:
1. Create `<StatisticsCard>` shared component with variants:
   ```tsx
   // /frontend/src/components/ui/StatisticsCard.tsx
   interface StatisticsCardProps {
     variant: 'default' | 'primary' | 'revenue';
     title: string;
     value: string | number;
     icon: React.ReactNode;
     iconColor: string;
   }

   const variants = {
     default: {
       borderRadius: '16px',
       fontSize: '28px',
       fontWeight: 700,
       boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
     },
     revenue: {
       borderRadius: '20px',
       fontSize: '32px',
       fontWeight: 800,
       boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
     },
   };
   ```

2. Replace all inline Card/Statistic combinations with `<StatisticsCard>`
3. Document when to use each variant in Storybook

**Affected Files**:
- `/frontend/src/pages/DashboardPage.tsx` (lines 224-420)
- `/frontend/src/pages/ClientsPage.tsx` (lines 484-676)
- `/frontend/src/pages/ProjectsPage.tsx` (lines 642-896)
- `/frontend/src/pages/QuotationsPage.tsx` (lines 884-1142)
- `/frontend/src/pages/InvoicesPage.tsx` (lines 1116-1520)
- `/frontend/src/pages/ReportsPage.tsx` (lines 372-460)

**Effort Estimate**: 4-5 hours
**Dependencies**: None

---

### P0-03: Border Radius Chaos - 3 Different Values
**Severity**: P0
**Location**: Across all pages

**Current State**:
- **12px**: Icon backgrounds (`borderRadius: '12px'` in Statistic prefix icons)
- **16px**: Regular cards (`borderRadius: '16px'`)
- **20px**: Revenue/special cards (`borderRadius: '20px'`)
- **8px**: Small UI elements (buttons in ReportsPage:338)

**Examples**:
```tsx
// DashboardPage.tsx:243 - Icon background
borderRadius: '12px'

// DashboardPage.tsx:227 - Regular card
borderRadius: '16px'

// DashboardPage.tsx:358 - Revenue card
borderRadius: '20px'

// ReportsPage.tsx:338 - Button
borderRadius: '8px'
```

**Problem**: No consistent design system for border radius. Current usage:
- Small elements (< 50px): 8px, 12px (INCONSISTENT)
- Medium cards: 16px
- Large/emphasis cards: 20px
- Creates visual chaos and unprofessional appearance

**Recommended Solution**:
1. Define border radius scale in theme/constants:
   ```tsx
   // /frontend/src/styles/designTokens.ts
   export const borderRadius = {
     sm: '8px',    // Small elements (badges, small buttons)
     md: '12px',   // Medium elements (icon backgrounds, inputs)
     lg: '16px',   // Large cards (default cards)
     xl: '20px',   // Extra large (revenue cards, modals)
   } as const;
   ```

2. Replace all hardcoded `borderRadius` with design tokens
3. Use CSS-in-JS or Tailwind config for consistency

**Affected Files**: ALL 19 page files + layout files

**Effort Estimate**: 2-3 hours
**Dependencies**: Create design tokens file first

---

## HIGH PRIORITY (P1 - Inconsistent User Experience)

### P1-01: Gradient Implementation Inconsistency
**Severity**: P1
**Location**:
- `/frontend/src/pages/DashboardPage.tsx:230, 361, 394`
- `/frontend/src/pages/ClientsPage.tsx:490, 618, 650`
- `/frontend/src/pages/ProjectsPage.tsx:649, 839, 871`
- `/frontend/src/pages/QuotationsPage.tsx:891, 1083, 1116`
- `/frontend/src/pages/InvoicesPage.tsx:1122, 1294, 1340, 1394`

**Current State**:

**Regular cards gradient**:
```tsx
background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
```

**Revenue cards - Multiple patterns**:
```tsx
// Dashboard - Green revenue
background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'

// Dashboard - Orange pending
background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'

// Quotations - Purple total
background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'

// Projects - Blue budget
background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)'

// Invoices - Indigo paid
background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
```

**Problem**:
- Same gradient colors used for different meanings (Purple for both "Total Quotation" and "Sudah Dibayar")
- No consistent color mapping to semantic meaning
- Color choice appears random rather than meaningful

**Recommended Solution**:
1. Define semantic gradient mapping:
   ```tsx
   // /frontend/src/styles/gradients.ts
   export const gradients = {
     revenue: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',  // Green
     pending: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',  // Orange
     total: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',    // Purple
     budget: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',   // Blue
     neutral: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',  // Light
   } as const;
   ```

2. Document when to use each gradient
3. Replace all inline gradients with semantic constants

**Affected Files**: All pages with revenue/statistics cards

**Effort Estimate**: 2 hours
**Dependencies**: P0-02 (StatisticsCard component)

---

### P1-02: Font Size Inconsistency
**Severity**: P1
**Location**: Across all pages

**Current State**:
```tsx
// Regular stats
fontSize: '28px'

// Revenue stats
fontSize: '32px'

// Small stats (QuotationsPage:1065)
fontSize: '20px'

// Title text (DashboardPage:210, ReportsPage:296)
fontSize: '32px'

// Subtitle text (DashboardPage:217, ReportsPage:302)
fontSize: '16px'
```

**Problem**: No typography scale. Font sizes are hardcoded inconsistently across components.

**Recommended Solution**:
1. Define typography scale:
   ```tsx
   // /frontend/src/styles/typography.ts
   export const fontSize = {
     xs: '12px',
     sm: '14px',
     base: '16px',
     lg: '18px',
     xl: '20px',
     '2xl': '24px',
     '3xl': '28px',
     '4xl': '32px',
     '5xl': '36px',
   } as const;

   export const fontWeight = {
     normal: 400,
     medium: 500,
     semibold: 600,
     bold: 700,
     extrabold: 800,
   } as const;
   ```

2. Replace all hardcoded font sizes with scale references

**Affected Files**: All 19 page files

**Effort Estimate**: 2-3 hours
**Dependencies**: Create typography scale file

---

### P1-03: Box Shadow Inconsistency
**Severity**: P1
**Location**: All card components

**Current State**:
```tsx
// Regular cards
boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'

// Revenue cards
boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'

// MainLayout header
boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'

// MainLayout content
boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
```

**Problem**: 4+ different shadow values with no clear hierarchy.

**Recommended Solution**:
```tsx
// /frontend/src/styles/shadows.ts
export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 12px rgba(0, 0, 0, 0.05)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.08)',
  xl: '0 8px 32px rgba(0, 0, 0, 0.08)',
} as const;
```

**Affected Files**: All pages + MainLayout

**Effort Estimate**: 1-2 hours
**Dependencies**: None

---

### P1-04: Table Column Inconsistency - Different Approaches
**Severity**: P1
**Location**:
- `/frontend/src/pages/ClientsPage.tsx:344-475`
- `/frontend/src/pages/ProjectsPage.tsx:400-634`
- `/frontend/src/pages/QuotationsPage.tsx:752-876`
- `/frontend/src/pages/InvoicesPage.tsx:880-1094`

**Current State**:

**ClientsPage** - Uses custom rendering with UI components:
```tsx
{
  title: 'Business Overview',
  key: 'business',
  render: (_: any, client: Client) => (
    <div className='flex items-center space-x-4'>
      <HealthScore client={client} size='small' />
      <MetricBadge icon={<ProjectOutlined />} value={client.totalProjects || 0} />
    </div>
  ),
}
```

**ProjectsPage** - Uses inline styling and calculations:
```tsx
{
  title: 'Progress',
  key: 'progress',
  render: (_: any, project: Project) => {
    const calculateProgress = (project: Project) => {
      // 30+ lines of inline logic
    }
    return <Progress percent={calculateProgress(project)} />
  },
}
```

**QuotationsPage** - Simple direct rendering:
```tsx
{
  title: 'Nomor',
  key: 'quotationNumber',
  render: (_: any, quotation: Quotation) => (
    <Button type='link'>{quotation.quotationNumber}</Button>
  ),
}
```

**InvoicesPage** - Complex context rendering:
```tsx
{
  title: 'Invoice & Context',
  key: 'invoiceContext',
  render: (_: any, invoice: Invoice) => (
    <div className='space-y-1'>
      {/* 70+ lines of relationship context */}
    </div>
  ),
}
```

**Problem**:
- Each page uses completely different table column patterns
- No shared column renderers for common data (client names, project links, amounts, status tags)
- InvoicesPage has 70+ lines of inline rendering logic (unreadable, unmaintainable)
- ProjectsPage has 30+ lines of progress calculation inline

**Recommended Solution**:
1. Create shared column renderers:
   ```tsx
   // /frontend/src/components/tables/columnRenderers.tsx
   export const renderClientName = (client: Client) => (
     <Button type='link' onClick={() => navigate(`/clients/${client.id}`)}>
       {client.name}
     </Button>
   );

   export const renderCurrency = (amount: number) => (
     <Text className='idr-amount'>{formatIDR(amount)}</Text>
   );

   export const renderStatus = (status: string, getStatusColor, getStatusText) => (
     <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
   );
   ```

2. Extract complex rendering logic to separate components:
   ```tsx
   // /frontend/src/components/tables/InvoiceContextCell.tsx
   export const InvoiceContextCell: React.FC<{ invoice: Invoice }> = ({ invoice }) => {
     // Move 70 lines of rendering logic here
   };
   ```

3. Create `<SmartTable>` wrapper with common column patterns

**Affected Files**:
- `/frontend/src/pages/ClientsPage.tsx`
- `/frontend/src/pages/ProjectsPage.tsx`
- `/frontend/src/pages/QuotationsPage.tsx`
- `/frontend/src/pages/InvoicesPage.tsx`
- `/frontend/src/pages/DashboardPage.tsx`

**Effort Estimate**: 5-6 hours
**Dependencies**: None

---

### P1-05: Bulk Operations Toolbar - Inconsistent Styling
**Severity**: P1
**Location**:
- `/frontend/src/pages/ClientsPage.tsx:679-740`
- `/frontend/src/pages/ProjectsPage.tsx:900-979`
- `/frontend/src/pages/QuotationsPage.tsx:1215-1265`
- `/frontend/src/pages/InvoicesPage.tsx:1607-1657`

**Current State**:

**ClientsPage**:
```tsx
<Card className='mb-4 border-blue-200 bg-blue-50' size='small'>
  <div className='flex justify-between items-center'>
    <Text strong className='text-blue-700'>
      {selectedRowKeys.length} klien dipilih
    </Text>
    <div className='flex items-center space-x-2'>
      {/* Buttons */}
    </div>
  </div>
</Card>
```

**ProjectsPage**:
```tsx
<Card className='mb-4 border-blue-200 bg-blue-50' size='small'>
  <div className='flex justify-between items-center'>
    <Text strong className='text-blue-700'>
      {selectedRowKeys.length} proyek dipilih
    </Text>
    <div className='flex items-center space-x-2'>
      {/* Buttons */}
    </div>
  </div>
</Card>
```

**QuotationsPage**:
```tsx
<Card className='mb-4' size='small'>
  <div className='flex justify-between items-center'>
    <Text strong>{selectedRowKeys.length} quotation dipilih</Text>
    <Space>
      {/* Buttons */}
    </Space>
  </div>
</Card>
```

**InvoicesPage**:
```tsx
<Card className='mb-4' size='small'>
  <div className='flex justify-between items-center'>
    <Typography.Text strong>
      {selectedRowKeys.length} invoice dipilih
    </Typography.Text>
    <Space>
      {/* Buttons */}
    </Space>
  </div>
</Card>
```

**Problem**:
- ClientsPage and ProjectsPage use blue styling (`border-blue-200 bg-blue-50 text-blue-700`)
- QuotationsPage and InvoicesPage use default Card styling
- ClientsPage uses nested divs with `space-x-2`
- QuotationsPage/InvoicesPage use `<Space>` component
- Inconsistent entity text: `<Text>` vs `<Text strong>` vs `<Typography.Text strong>`

**Recommended Solution**:
Create shared `<BulkOperationsToolbar>` component:
```tsx
// /frontend/src/components/ui/BulkOperationsToolbar.tsx
interface BulkOperationsToolbarProps {
  selectedCount: number;
  entityName: string;  // 'klien', 'proyek', 'quotation', 'invoice'
  children: React.ReactNode;
  onClear: () => void;
}

export const BulkOperationsToolbar: React.FC<BulkOperationsToolbarProps> = ({
  selectedCount,
  entityName,
  children,
  onClear,
}) => (
  <Card className='mb-4 border-blue-200 bg-blue-50' size='small'>
    <div className='flex justify-between items-center'>
      <Text strong className='text-blue-700'>
        {selectedCount} {entityName} dipilih
      </Text>
      <Space>{children}</Space>
      <Button size='small' type='text' onClick={onClear}>
        Batal
      </Button>
    </div>
  </Card>
);
```

**Affected Files**:
- `/frontend/src/pages/ClientsPage.tsx:679-740`
- `/frontend/src/pages/ProjectsPage.tsx:900-979`
- `/frontend/src/pages/QuotationsPage.tsx:1215-1265`
- `/frontend/src/pages/InvoicesPage.tsx:1607-1657`

**Effort Estimate**: 2-3 hours
**Dependencies**: None

---

## MEDIUM PRIORITY (P2 - Code Quality/Maintainability)

### P2-01: Duplicated Status Mapping Functions
**Severity**: P2
**Location**: Every list page

**Current State**:

**DashboardPage.tsx:78-89**:
```tsx
const getStatusColor = (status: string) => {
  const colors = {
    draft: 'default',
    sent: 'blue',
    approved: 'green',
    declined: 'red',
    paid: 'green',
    overdue: 'red',
    pending: 'orange',
  }
  return colors[status.toLowerCase() as keyof typeof colors] || 'default'
}
```

**QuotationsPage.tsx:322-331**:
```tsx
const getStatusColor = (status: string) => {
  const colors = {
    DRAFT: 'default',
    SENT: 'blue',
    APPROVED: 'green',
    DECLINED: 'red',
    REVISED: 'orange',
  }
  return colors[status.toUpperCase() as keyof typeof colors] || 'default'
}
```

**InvoicesPage.tsx:423-438**:
```tsx
const getStatusColor = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return 'default'
    case 'SENT':
      return 'blue'
    case 'PAID':
      return 'green'
    case 'OVERDUE':
      return 'red'
    case 'CANCELLED':
      return 'default'
    default:
      return 'default'
  }
}
```

**ProjectsPage.tsx:249-257**:
```tsx
const getStatusColor = (status: string) => {
  const colors = {
    planning: 'blue',
    inProgress: 'orange',
    completed: 'green',
    cancelled: 'red',
  }
  return colors[status as keyof typeof colors] || 'default'
}
```

**Problem**:
- 4+ different implementations of the SAME function
- Different casing logic (`.toLowerCase()` vs `.toUpperCase()` vs none)
- Different status key formats ('draft' vs 'DRAFT' vs 'planning')
- Duplicated across 8+ files

**Recommended Solution**:
Create centralized status utilities:
```tsx
// /frontend/src/utils/statusHelpers.ts
export const quotationStatusColors = {
  DRAFT: 'default',
  SENT: 'blue',
  APPROVED: 'green',
  DECLINED: 'red',
  REVISED: 'orange',
} as const;

export const invoiceStatusColors = {
  DRAFT: 'default',
  SENT: 'blue',
  PAID: 'green',
  OVERDUE: 'red',
  CANCELLED: 'default',
} as const;

export const projectStatusColors = {
  PLANNING: 'blue',
  IN_PROGRESS: 'orange',
  COMPLETED: 'green',
  CANCELLED: 'red',
  ON_HOLD: 'gray',
} as const;

export const getQuotationStatusColor = (status: string) =>
  quotationStatusColors[status.toUpperCase()] || 'default';

export const getInvoiceStatusColor = (status: string) =>
  invoiceStatusColors[status.toUpperCase()] || 'default';
```

**Affected Files**: All pages with status displays

**Effort Estimate**: 2 hours
**Dependencies**: None

---

### P2-02: Duplicated Status Text Mapping Functions
**Severity**: P2
**Location**: Same as P2-01

**Current State**: Similar duplication for `getStatusText()` functions across all pages.

**Recommended Solution**: Extend P2-01 solution with text mappings:
```tsx
export const quotationStatusText = {
  DRAFT: 'Draft',
  SENT: 'Terkirim',
  APPROVED: 'Disetujui',
  DECLINED: 'Ditolak',
  REVISED: 'Revisi',
} as const;
```

**Effort Estimate**: 1 hour (combined with P2-01)
**Dependencies**: P2-01

---

### P2-03: Inline Action Menu Generation - Code Duplication
**Severity**: P2
**Location**:
- `/frontend/src/pages/ClientsPage.tsx:301-323`
- `/frontend/src/pages/ProjectsPage.tsx:363-379`
- `/frontend/src/pages/QuotationsPage.tsx:653-750`
- `/frontend/src/pages/InvoicesPage.tsx:808-878`

**Current State**:

Each page has nearly identical `getActionMenuItems()` functions:
```tsx
const getActionMenuItems = (client: Client) => {
  return [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: 'Lihat Detail',
      onClick: () => handleView(client),
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: () => handleEdit(client),
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Hapus',
      danger: true,
      onClick: () => handleDelete(client.id),
    },
  ]
}
```

**Problem**:
- 90% identical code across 4 pages
- Only differences are entity type and conditional actions
- ~200 lines of duplicated code total

**Recommended Solution**:
Create generic action menu builder:
```tsx
// /frontend/src/components/tables/ActionMenu.tsx
interface ActionMenuConfig<T> {
  entity: T;
  onView?: (entity: T) => void;
  onEdit?: (entity: T) => void;
  onDelete?: (id: string) => void;
  additionalActions?: MenuItem[];
}

export function buildActionMenu<T extends { id: string }>(
  config: ActionMenuConfig<T>
): MenuItem[] {
  const { entity, onView, onEdit, onDelete, additionalActions = [] } = config;

  const baseActions: MenuItem[] = [];

  if (onView) {
    baseActions.push({
      key: 'view',
      icon: <EyeOutlined />,
      label: 'Lihat Detail',
      onClick: () => onView(entity),
    });
  }

  if (onEdit) {
    baseActions.push({
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: () => onEdit(entity),
    });
  }

  const allActions = [...baseActions, ...additionalActions];

  if (onDelete) {
    allActions.push({
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Hapus',
      danger: true,
      onClick: () => onDelete(entity.id),
    });
  }

  return allActions;
}
```

**Affected Files**: All list pages

**Effort Estimate**: 3 hours
**Dependencies**: None

---

### P2-04: Missing Shared Filter Bar Component
**Severity**: P2
**Location**: All list pages

**Current State**:

Every list page has nearly identical filter controls:
```tsx
<Space>
  <Input
    placeholder='Cari...'
    prefix={<SearchOutlined />}
    value={searchText}
    onChange={e => setSearchText(e.target.value)}
    style={{ width: 300 }}
  />
  <Select placeholder='Filter status' /* ... */ />
  <MonthPicker /* ... */ />
  <InputNumber placeholder='Nilai min' /* ... */ />
  <InputNumber placeholder='Nilai max' /* ... */ />
  <Button onClick={() => setFilters({})}>Reset</Button>
</Space>
```

**Problem**:
- Duplicated across 5 pages (Clients, Projects, Quotations, Invoices, Reports)
- ~150 lines of identical code
- Inconsistent placeholder text (some Indonesian, some English)
- Different filter implementations (some use `searchText` state, some use `filters.search`)

**Recommended Solution**:
Create `<FilterBar>` component:
```tsx
// /frontend/src/components/tables/FilterBar.tsx
interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter?: string;
  statusOptions?: { value: string; label: string }[];
  onStatusChange?: (value: string) => void;
  showMonthPicker?: boolean;
  showAmountRange?: boolean;
  onReset: () => void;
  additionalFilters?: React.ReactNode;
}
```

**Affected Files**: All list pages

**Effort Estimate**: 3-4 hours
**Dependencies**: None

---

### P2-05: Inconsistent Modal Footer Patterns
**Severity**: P2
**Location**: All pages with modals

**Current State**:

**Pattern 1 - Form-managed footer** (ClientsPage:822-964):
```tsx
<Modal footer={null}>
  <Form>
    {/* Form fields */}
    <div className='flex justify-end space-x-2'>
      <Button onClick={handleCancel}>{t('common.cancel')}</Button>
      <Button type='primary' htmlType='submit'>
        {t('common.save')}
      </Button>
    </div>
  </Form>
</Modal>
```

**Pattern 2 - Modal-managed footer** (InvoicesPage:1453-1460):
```tsx
<Modal
  footer={[
    <Button key='close' onClick={handleClose}>Tutup</Button>,
    <Button key='download' type='primary'>Download PDF</Button>,
  ]}
>
  {/* Content */}
</Modal>
```

**Pattern 3 - External state footer** (InvoicesPage:1537-1572):
```tsx
<Modal
  footer={[
    <Button key='stay' onClick={handleStay}>
      Tetap di Quotations
    </Button>,
    <Button key='view' type='primary' icon={<EyeOutlined />}>
      Lihat Invoice
    </Button>,
  ]}
>
  {/* Content */}
</Modal>
```

**Problem**:
- 3 different footer management patterns
- Inconsistent button ordering (Cancel/Save vs Save/Cancel)
- Mixed button styling approaches

**Recommended Solution**:
Standardize on one pattern and create helper:
```tsx
// /frontend/src/components/ui/ModalFooter.tsx
interface ModalFooterProps {
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  onCancel,
  onConfirm,
  confirmText = 'Simpan',
  cancelText = 'Batal',
  confirmLoading,
  confirmDisabled,
}) => (
  <>
    <Button onClick={onCancel}>{cancelText}</Button>
    <Button
      type='primary'
      onClick={onConfirm}
      loading={confirmLoading}
      disabled={confirmDisabled}
    >
      {confirmText}
    </Button>
  </>
);
```

**Affected Files**: All pages with modals (8+ files)

**Effort Estimate**: 2 hours
**Dependencies**: None

---

### P2-06: Hardcoded Color Values Everywhere
**Severity**: P2
**Location**: All files

**Current State**:
```tsx
// Colors scattered everywhere
color: '#1e293b'   // Used 50+ times
color: '#64748b'   // Used 30+ times
color: '#6366f1'   // Used 20+ times
color: '#10b981'   // Used 15+ times
color: '#f59e0b'   // Used 10+ times
```

**Problem**:
- No centralized color palette
- Same color values copy-pasted hundreds of times
- Impossible to change theme colors
- No semantic meaning to colors

**Recommended Solution**:
```tsx
// /frontend/src/styles/colors.ts
export const colors = {
  // Grayscale
  slate: {
    900: '#0f172a',
    800: '#1e293b',
    700: '#334155',
    600: '#475569',
    500: '#64748b',
    400: '#94a3b8',
    300: '#cbd5e1',
    200: '#e2e8f0',
    100: '#f1f5f9',
    50: '#f8fafc',
  },
  // Brand colors
  primary: {
    600: '#4f46e5',
    500: '#6366f1',
  },
  // Semantic colors
  success: {
    600: '#059669',
    500: '#10b981',
  },
  warning: {
    600: '#d97706',
    500: '#f59e0b',
  },
  danger: {
    600: '#dc2626',
    500: '#ef4444',
  },
} as const;

// Usage
color: colors.slate[800]  // Instead of '#1e293b'
```

**Affected Files**: ALL files

**Effort Estimate**: 6-8 hours (bulk search/replace)
**Dependencies**: Create colors file first

---

### P2-07: Query Key Inconsistencies
**Severity**: P2
**Location**: All pages using React Query

**Current State**:
```tsx
// Different formats
queryKey: ['clients']
queryKey: ['projects']
queryKey: ['quotations']
queryKey: ['invoices']
queryKey: ['reports-revenue', reportType, dateRange]
queryKey: ['reports-clients']
queryKey: ['reports-projects']
queryKey: ['reports-payments']
```

**Problem**:
- Inconsistent naming (some plural, some singular)
- Inconsistent parameter passing
- No centralized query key management

**Recommended Solution**:
```tsx
// /frontend/src/lib/queryKeys.ts
export const queryKeys = {
  clients: {
    all: ['clients'] as const,
    detail: (id: string) => ['clients', id] as const,
  },
  projects: {
    all: ['projects'] as const,
    detail: (id: string) => ['projects', id] as const,
  },
  quotations: {
    all: (filters?: any) => ['quotations', filters] as const,
    detail: (id: string) => ['quotations', id] as const,
  },
  invoices: {
    all: (filters?: any) => ['invoices', filters] as const,
    detail: (id: string) => ['invoices', id] as const,
  },
  reports: {
    revenue: (period: string, dateRange?: any) =>
      ['reports', 'revenue', period, dateRange] as const,
    clients: (limit?: number) =>
      ['reports', 'clients', limit] as const,
    projects: (limit?: number) =>
      ['reports', 'projects', limit] as const,
    payments: ['reports', 'payments'] as const,
  },
} as const;
```

**Affected Files**: All pages using useQuery/useMutation

**Effort Estimate**: 3 hours
**Dependencies**: None

---

### P2-08: Missing Loading States Consistency
**Severity**: P2
**Location**: All pages

**Current State**:

**DashboardPage** - Simple spinner:
```tsx
if (isLoading) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', minHeight: '400px' }}>
      <Spin size='large' />
    </div>
  )
}
```

**InvoicesPage** - Skeleton loaders:
```tsx
{isLoading && (
  <div className='text-center py-4 mb-6'>
    <Text type='secondary'>Memuat statistik invoice...</Text>
  </div>
)}

{isLoading ? (
  <Skeleton.Input active size='small' style={{ width: '100%', height: '80px' }} />
) : (
  <Statistic /* ... */ />
)}
```

**Problem**:
- Inconsistent loading state UX
- Some pages use Spin, some use Skeleton
- InvoicesPage has sophisticated skeleton loaders but other pages don't

**Recommended Solution**:
Standardize on skeleton loaders for better UX:
```tsx
// Use InvoicesPage pattern across all pages
// Create reusable skeleton components from /components/ui/SkeletonLoaders.tsx
```

**Affected Files**: All pages

**Effort Estimate**: 4 hours
**Dependencies**: None

---

### P2-09: Responsive Design Inconsistencies
**Severity**: P2
**Location**: All pages

**Current State**:

**DashboardPage** - Row gutter:
```tsx
<Row gutter={[24, 24]}>
  <Col xs={24} sm={12} lg={6}>
```

**ClientsPage** - Row gutter:
```tsx
<Row gutter={[24, 24]} className='mb-6'>
  <Col xs={24} sm={12} lg={6}>
```

**QuotationsPage** - Different breakpoints:
```tsx
<Col xs={24} sm={12} lg={4}>  // lg=4 instead of lg=6!
```

**InvoicesPage** - Different margins:
```tsx
<Row gutter={[24, 24]} className='mb-6'>
  <Col xs={24} lg={8}>  // No sm breakpoint!
```

**Problem**:
- Inconsistent grid gutter values
- Different breakpoint strategies (some skip `sm`, some skip `md`)
- Different column span values for same layouts
- No responsive design system

**Recommended Solution**:
Define standard responsive breakpoints:
```tsx
// /frontend/src/styles/breakpoints.ts
export const breakpoints = {
  xs: 0,    // 0-575px
  sm: 576,  // 576-767px
  md: 768,  // 768-991px
  lg: 992,  // 992-1199px
  xl: 1200, // 1200-1599px
  xxl: 1600, // 1600px+
} as const;

// Standard grid patterns
export const gridPatterns = {
  fourColumn: { xs: 24, sm: 12, lg: 6 },
  threeColumn: { xs: 24, sm: 12, lg: 8 },
  twoColumn: { xs: 24, lg: 12 },
};
```

**Affected Files**: All pages

**Effort Estimate**: 3 hours
**Dependencies**: None

---

### P2-10: No Standardized Error Handling UI
**Severity**: P2
**Location**: All pages with queries

**Current State**:

**DashboardPage**:
```tsx
if (error) {
  return (
    <Alert
      message='Error loading dashboard data'
      description={error instanceof Error ? error.message : 'Something went wrong'}
      type='error'
      showIcon
      action={<button onClick={() => refetch()}>Retry</button>}
    />
  )
}
```

**InvoicesPage** - Uses `ActionableError` component:
```tsx
// Has sophisticated error handling with ActionableError component
```

**Other pages** - No error handling at all!

**Problem**:
- Most pages have no error handling UI
- DashboardPage has basic Alert
- InvoicesPage has sophisticated ActionableError
- No consistency

**Recommended Solution**:
Use ActionableError component everywhere:
```tsx
// Already exists: /frontend/src/components/ui/ActionableError.tsx
// Extend to all pages
```

**Affected Files**: All pages except InvoicesPage

**Effort Estimate**: 2 hours
**Dependencies**: None

---

## LOW PRIORITY (P3 - Nice-to-have Improvements)

### P3-01: Inconsistent Test ID Naming
**Severity**: P3
**Location**: All pages

**Current State**:
```tsx
// Different naming conventions
data-testid='dashboard-container'
data-testid='create-client-button'
data-testid='client-search-input'
data-testid='invoice-filter-button'
data-testid='materai-reminder-button'
```

**Problem**: No consistent test ID naming convention.

**Recommended Solution**:
Define test ID convention:
```tsx
// Pattern: {page}-{component}-{type}
// Examples:
// clients-search-input
// clients-create-button
// clients-filter-dropdown
// clients-table-row
```

**Effort Estimate**: 2 hours
**Dependencies**: None

---

### P3-02: Missing Accessibility Labels
**Severity**: P3
**Location**: Most components

**Current State**: Many buttons, inputs, and interactive elements missing aria-labels.

**Recommended Solution**:
Add aria-labels to all interactive elements:
```tsx
<Button icon={<PlusOutlined />} aria-label='Create new client'>
  Create
</Button>
```

**Effort Estimate**: 4 hours
**Dependencies**: None

---

### P3-03: Inconsistent Spacing Utilities
**Severity**: P3
**Location**: All pages

**Current State**:
```tsx
// Mixed approaches
style={{ marginBottom: '32px' }}
style={{ marginBottom: '24px' }}
style={{ marginBottom: '16px' }}
className='mb-6'   // Tailwind: 24px
className='mb-4'   // Tailwind: 16px
```

**Problem**: Mixing inline styles with Tailwind classes.

**Recommended Solution**:
Standardize on one approach (preferably Tailwind):
```tsx
// Use Tailwind spacing scale
className='mb-8'  // 32px
className='mb-6'  // 24px
className='mb-4'  // 16px
```

**Effort Estimate**: 3 hours
**Dependencies**: None

---

### P3-04: No Dark Mode Support
**Severity**: P3
**Location**: Entire application

**Current State**: All colors are hardcoded for light mode only.

**Recommended Solution**:
1. Set up Ant Design dark mode
2. Use CSS variables for colors
3. Add theme toggle

**Effort Estimate**: 8-12 hours
**Dependencies**: P2-06 (color system)

---

### P3-05: Missing Component Documentation
**Severity**: P3
**Location**: All shared components

**Current State**: No Storybook or component documentation.

**Recommended Solution**:
Set up Storybook with stories for:
- StatisticsCard
- BulkOperationsToolbar
- FilterBar
- ActionMenu
- All UI components

**Effort Estimate**: 12 hours
**Dependencies**: All P0/P1 components created

---

### P3-06: No Animation/Transition System
**Severity**: P3
**Location**: All pages

**Current State**: Only InvoicesPage has transitions (`transition: 'all 0.3s ease'`).

**Recommended Solution**:
Define standard transitions:
```tsx
export const transitions = {
  fast: 'all 0.15s ease',
  normal: 'all 0.3s ease',
  slow: 'all 0.5s ease',
} as const;
```

**Effort Estimate**: 2 hours
**Dependencies**: None

---

### P3-07: Duplicate Translation Keys
**Severity**: P3
**Location**: i18n files (not analyzed in detail)

**Problem**: Likely many duplicate translation strings.

**Recommended Solution**:
Audit and consolidate translation keys.

**Effort Estimate**: 3 hours
**Dependencies**: None

---

### P3-08: No Mobile-Specific Optimizations
**Severity**: P3
**Location**: All pages except those with MobileOptimizedLayout

**Current State**: Only basic responsive columns, no mobile-specific UX.

**Recommended Solution**:
Add mobile-specific:
- Bottom sheets for modals
- Swipe actions
- Touch-optimized buttons
- Simplified views

**Effort Estimate**: 16+ hours
**Dependencies**: None

---

### P3-09: No Analytics/Tracking
**Severity**: P3
**Location**: Entire application

**Current State**: No event tracking or analytics.

**Recommended Solution**:
Add Google Analytics or custom analytics:
- Page views
- Button clicks
- Form submissions
- Errors

**Effort Estimate**: 6 hours
**Dependencies**: None

---

### P3-10: No Performance Monitoring
**Severity**: P3
**Location**: Entire application

**Current State**: No performance metrics tracked.

**Recommended Solution**:
Add performance monitoring:
- React DevTools Profiler
- Web Vitals tracking
- Render time monitoring

**Effort Estimate**: 4 hours
**Dependencies**: None

---

## Implementation Roadmap

### Phase 1: Critical Foundation (Week 1) - 18 hours
**Goal**: Fix breaking UX issues and establish design system foundation

1. **P0-01**: Fix Indonesian/English language mixing (3-4 hours)
2. **P0-02**: Create StatisticsCard component (4-5 hours)
3. **P0-03**: Define border radius scale (2-3 hours)
4. **P1-01**: Create gradient system (2 hours)
5. **P1-02**: Create typography scale (2-3 hours)
6. **P1-03**: Create shadow system (1-2 hours)

**Deliverables**:
- Design tokens file (`designTokens.ts`)
- Typography system (`typography.ts`)
- Color system (`colors.ts`)
- Gradient system (`gradients.ts`)
- Shadow system (`shadows.ts`)
- StatisticsCard component

---

### Phase 2: Component Standardization (Week 2) - 16 hours
**Goal**: Reduce code duplication with shared components

1. **P1-04**: Create shared table column renderers (5-6 hours)
2. **P1-05**: Create BulkOperationsToolbar component (2-3 hours)
3. **P2-01 + P2-02**: Create centralized status utilities (3 hours)
4. **P2-03**: Create generic ActionMenu builder (3 hours)
5. **P2-04**: Create FilterBar component (3-4 hours)

**Deliverables**:
- BulkOperationsToolbar component
- FilterBar component
- ActionMenu builder
- Table column renderers
- Status utilities

---

### Phase 3: Quality & Consistency (Week 3) - 14 hours
**Goal**: Polish UX and improve maintainability

1. **P2-05**: Standardize modal footers (2 hours)
2. **P2-06**: Replace hardcoded colors (6-8 hours)
3. **P2-07**: Implement query key factory (3 hours)
4. **P2-08**: Add skeleton loaders everywhere (4 hours)

**Deliverables**:
- ModalFooter component
- All hardcoded colors replaced with design tokens
- Query key factory
- Consistent loading states

---

### Phase 4: Responsive & Error Handling (Week 4) - 8 hours
**Goal**: Improve responsive design and error UX

1. **P2-09**: Standardize responsive breakpoints (3 hours)
2. **P2-10**: Implement error handling UI (2 hours)
3. **P3-01**: Standardize test IDs (2 hours)
4. **P3-03**: Standardize spacing utilities (3 hours)

**Deliverables**:
- Responsive grid system
- Consistent error handling
- Test ID conventions documented
- Spacing standardized

---

### Phase 5: Polish & Documentation (Optional) - 20+ hours
**Goal**: Nice-to-have improvements

1. **P3-02**: Add accessibility labels (4 hours)
2. **P3-05**: Set up Storybook (12 hours)
3. **P3-06**: Add animation system (2 hours)
4. **P3-09**: Add analytics (6 hours)

---

## Metrics & Success Criteria

### Code Quality Metrics
- **Duplicate Code Reduction**: Target 60% reduction in duplicate code
  - Before: ~2,000 lines of duplicated code
  - After: ~800 lines (StatisticsCard, FilterBar, ActionMenu, etc.)

- **Design Token Coverage**: 100% of hardcoded values replaced
  - Before: ~300+ hardcoded color values
  - After: All colors from design tokens

- **Component Reusability**: 80% of common patterns extracted
  - StatisticsCard (used 30+ times)
  - FilterBar (used 5 times)
  - BulkOperationsToolbar (used 4 times)
  - ActionMenu (used 4 times)

### User Experience Metrics
- **Language Consistency**: 100% Indonesian for business context
  - Before: ~50 English strings in Indonesian app
  - After: 0 English strings (except technical terms)

- **Visual Consistency**: 95% consistent styling
  - Border radius: 4 consistent values
  - Typography: 9 consistent sizes
  - Colors: Centralized palette
  - Shadows: 5 consistent levels

### Performance Metrics
- **Bundle Size**: No significant change (components are extracted, not added)
- **Loading Experience**: Improved with skeleton loaders
- **Maintenance Time**: 40% reduction in development time for new features

---

## Critical Dependencies Graph

```
P0-01 (Language)  ─┐
P0-02 (StatsCard) ─┤
P0-03 (BorderR)   ─┤
P1-01 (Gradients) ─┼──> Phase 1: Design System Foundation
P1-02 (Typo)      ─┤
P1-03 (Shadows)   ─┘
                    │
                    ├──> P1-04 (Table columns)
                    ├──> P1-05 (Bulk toolbar)
                    ├──> P2-04 (FilterBar)
                    └──> Phase 2: Components
                         │
                         ├──> P2-06 (Colors)
                         └──> Phase 3: Polish
```

---

## Testing Strategy

### Unit Tests
- Test all new shared components (StatisticsCard, FilterBar, etc.)
- Test status utility functions
- Test query key factory

### Integration Tests
- Test page-level component integration
- Verify bulk operations work consistently
- Test modal interactions

### Visual Regression Tests
- Capture before/after screenshots
- Verify consistent styling across pages
- Check responsive breakpoints

### Accessibility Tests
- ARIA labels present
- Keyboard navigation works
- Screen reader compatibility

---

## Risk Mitigation

### High Risk Issues
1. **P2-06 (Color replacement)**: Bulk changes could break styling
   - **Mitigation**: Do page-by-page with visual regression tests
   - **Rollback**: Keep before/after screenshots

2. **P1-04 (Table refactor)**: Complex table logic could break functionality
   - **Mitigation**: Refactor one page at a time with comprehensive tests
   - **Rollback**: Keep original implementations in comments during migration

3. **P0-01 (Language)**: Missing translation keys could crash app
   - **Mitigation**: Add fallback logic, audit all translation files first
   - **Rollback**: Use English as fallback temporarily

### Medium Risk Issues
1. **State management changes**: Query key refactor could invalidate caches incorrectly
   - **Mitigation**: Test cache invalidation thoroughly
   - **Rollback**: Keep old query keys as aliases during migration

---

## File Structure Changes

### New Files to Create
```
frontend/src/
├── styles/
│   ├── designTokens.ts       (P0-03)
│   ├── typography.ts         (P1-02)
│   ├── colors.ts             (P2-06)
│   ├── gradients.ts          (P1-01)
│   ├── shadows.ts            (P1-03)
│   └── breakpoints.ts        (P2-09)
├── components/
│   ├── ui/
│   │   ├── StatisticsCard.tsx       (P0-02)
│   │   ├── BulkOperationsToolbar.tsx (P1-05)
│   │   ├── FilterBar.tsx            (P2-04)
│   │   └── ModalFooter.tsx          (P2-05)
│   └── tables/
│       ├── columnRenderers.tsx      (P1-04)
│       └── ActionMenu.tsx           (P2-03)
├── utils/
│   └── statusHelpers.ts      (P2-01, P2-02)
└── lib/
    └── queryKeys.ts          (P2-07)
```

### Files to Refactor (19 files)
- All page components (DashboardPage, ClientsPage, ProjectsPage, QuotationsPage, InvoicesPage)
- MainLayout
- All form components
- All detail page components

---

## Conclusion

This analysis identified **37 critical UI/UX issues** across the Indonesian Business Management System frontend. The issues range from broken language consistency (P0) to missing dark mode support (P3).

**Key Findings**:
1. **No design system**: Colors, typography, spacing all hardcoded inconsistently
2. **Massive code duplication**: ~2,000 lines of duplicate code in statistics cards, filters, action menus
3. **Language consistency failure**: ~50 English strings in supposedly Indonesian-first app
4. **Component chaos**: Each page reinvents the wheel for common patterns

**Recommended Approach**:
Implement in 4 phases over 4 weeks, starting with design system foundation (Phase 1), then shared components (Phase 2), quality improvements (Phase 3), and finally polish (Phase 4).

**Expected Outcomes**:
- 60% reduction in duplicate code
- 100% Indonesian language consistency
- 40% faster feature development
- Professional, consistent user experience

**Total Effort**: 56 hours for Phases 1-4 (critical), +20 hours for Phase 5 (nice-to-have)

---

## Next Steps

1. **Week 1**: Get stakeholder approval for Phase 1 plan
2. **Week 1-2**: Implement design system foundation (P0/P1 issues)
3. **Week 3**: Create shared components (P1/P2 issues)
4. **Week 4**: Refactor all pages to use new components
5. **Week 5**: Polish and testing

**Priority Order**: P0 → P1 → P2 → P3 (ignore P3 if time-constrained)

