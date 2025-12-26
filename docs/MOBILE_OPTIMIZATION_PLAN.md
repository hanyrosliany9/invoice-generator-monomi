# Mobile Optimization Plan - Monomi Finance
**Indonesian Business Management System**

**Created:** 2025-11-04
**Status:** Planning Phase
**Priority:** High

---

## Executive Summary

This document outlines a comprehensive plan to optimize the Monomi Finance application for mobile devices. While the application has a solid foundation with mobile-specific hooks and components, many pages are not utilizing these mobile optimizations, resulting in poor mobile user experience.

### Current State Analysis

**✅ Existing Mobile Infrastructure:**
- Mobile detection hooks (`useMobileOptimized`, `useMediaQuery`)
- Mobile-specific components (`MobileTableView`, `MobileEntityNav`, `MobileQuickActions`)
- Touch optimization utilities
- Virtual keyboard handling
- WhatsApp integration for Indonesian business context
- Responsive grid system (Ant Design Col xs/sm/lg)
- Theme system with mobile considerations

**❌ Critical Issues Identified:**

1. **Table Components** (HIGH PRIORITY)
   - Main data pages (Invoices, Quotations, Projects, Clients, etc.) use desktop `<Table>` without horizontal scroll
   - No responsive table implementation on list pages
   - Tables overflow viewport width on mobile devices
   - MobileTableView component exists but is NOT used anywhere

2. **Form Pages** (HIGH PRIORITY)
   - Create/Edit forms not optimized for mobile
   - Form fields may be too small for touch input
   - Multi-column layouts don't collapse properly on mobile
   - Payment Milestone forms especially complex on mobile

3. **Layout Issues** (MEDIUM PRIORITY)
   - MainLayout header has fixed 32px padding (not responsive)
   - Content margins/padding not optimized for mobile
   - Statistics cards may overflow on small screens
   - Fixed-width modals don't adapt to mobile viewport

4. **Detail Pages** (MEDIUM PRIORITY)
   - Invoice/Quotation detail pages have horizontal overflow
   - PDF preview not mobile-friendly
   - Multiple card layouts don't stack properly on mobile
   - Action buttons may be too small for touch

5. **Dashboard** (LOW PRIORITY)
   - Dashboard tables lack mobile responsiveness
   - Statistic cards need better mobile layout
   - Charts may not be touch-optimized

---

## Implementation Strategy

### Phase 1: Foundation (Week 1) - CRITICAL PATH
**Goal:** Fix critical table and layout issues affecting all pages

#### 1.1 MainLayout Mobile Optimization
**Files to modify:**
- `frontend/src/components/layout/MainLayout.tsx`

**Changes:**
```typescript
// Responsive header padding
style={{
  padding: isMobile ? '0 16px' : '0 32px',
  // ... rest of header styles
}}

// Responsive content margins
style={{
  margin: isMobile ? '12px 8px 80px 8px' : '32px 24px 24px 24px',
  padding: isMobile ? '12px' : '32px',
  // ... rest of content styles
}}
```

**Testing:**
- Verify on iPhone SE (375px), iPhone 12 (390px), Android phones
- Check landscape orientation
- Test with virtual keyboard open

---

#### 1.2 Table Components - Add Horizontal Scroll
**Priority:** CRITICAL - Affects 15+ pages

**Files to modify:**
1. `frontend/src/pages/InvoicesPage.tsx`
2. `frontend/src/pages/QuotationsPage.tsx`
3. `frontend/src/pages/ProjectsPage.tsx`
4. `frontend/src/pages/ClientsPage.tsx`
5. `frontend/src/pages/ExpensesPage.tsx`
6. `frontend/src/pages/UsersPage.tsx`
7. `frontend/src/pages/VendorsPage.tsx`
8. `frontend/src/pages/AssetsPage.tsx`
9. `frontend/src/pages/ExpenseCategoriesPage.tsx`
10. `frontend/src/components/projects/ProjectExpenseList.tsx`
11. Dashboard tables

**Implementation Pattern:**
```typescript
<Table
  columns={columns}
  dataSource={data}
  scroll={{ x: 'max-content' }} // Allow horizontal scroll
  pagination={{
    pageSize: isMobile ? 10 : 20, // Smaller page size on mobile
    showSizeChanger: !isMobile,   // Hide size changer on mobile
    simple: isMobile,              // Use simple pagination on mobile
  }}
/>
```

**Additional Optimizations:**
```typescript
// Conditional column rendering for mobile
const columns = useMemo(() => {
  const baseColumns = [
    // ... all columns
  ];

  // On mobile, hide less important columns
  if (isMobile) {
    return baseColumns.filter(col =>
      ['number', 'client', 'amount', 'status', 'actions'].includes(col.key)
    );
  }

  return baseColumns;
}, [isMobile]);
```

**Testing:**
- Verify horizontal scroll works smoothly
- Test pagination on mobile
- Ensure action buttons are accessible
- Test with 100+ rows

---

#### 1.3 Replace Desktop Tables with MobileTableView
**Priority:** HIGH - Better UX than horizontal scroll

**Strategy:** Progressive enhancement
- Phase 1: Add horizontal scroll (quick fix)
- Phase 2: Replace with MobileTableView (better UX)

**Files to refactor:**
```typescript
// Pattern for all list pages
import MobileTableView from '../components/mobile/MobileTableView'
import { useIsMobile } from '../hooks/useMediaQuery'

export const InvoicesPage: React.FC = () => {
  const isMobile = useIsMobile()

  // ... existing code

  return (
    <>
      {isMobile ? (
        <MobileTableView
          data={invoices}
          entityType="invoices"
          loading={isLoading}
          onItemSelect={(item) => navigate(`/invoices/${item.id}`)}
          onAction={handleMobileAction}
          actions={[
            {
              key: 'edit',
              label: 'Edit',
              icon: <EditOutlined />,
              onClick: (record) => navigate(`/invoices/${record.id}/edit`),
            },
            // ... more actions
          ]}
        />
      ) : (
        <Table
          // ... existing desktop table
        />
      )}
    </>
  )
}
```

**Pages to update:**
1. InvoicesPage
2. QuotationsPage
3. ProjectsPage
4. ClientsPage
5. ExpensesPage
6. VendorsPage
7. UsersPage
8. AssetsPage

---

### Phase 2: Forms & Input Optimization (Week 2)

#### 2.1 Form Field Mobile Optimization
**Files to modify:**
- All Create/Edit pages (18 files)

**Implementation:**
```typescript
import { useMobileOptimized } from '../hooks/useMobileOptimized'

export const InvoiceCreatePage: React.FC = () => {
  const { isMobile, getFormFieldProps } = useMobileOptimized()

  return (
    <Form layout={isMobile ? 'vertical' : 'horizontal'}>
      <Form.Item label="Invoice Number">
        <Input {...getFormFieldProps()} />
      </Form.Item>

      {/* Responsive column layout */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Form.Item label="Date">
            <DatePicker
              {...getFormFieldProps()}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item label="Due Date">
            <DatePicker
              {...getFormFieldProps()}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )
}
```

**Key Changes:**
- Form layout: `vertical` on mobile, `horizontal` on desktop
- All columns: `xs={24}` to stack on mobile
- Input size: `large` on mobile for better touch targets
- DatePicker/Select: `style={{ width: '100%' }}` on mobile
- Button sizes: `large` on mobile

**Files to update:**
1. ✅ InvoiceCreatePage.tsx
2. ✅ InvoiceEditPage.tsx
3. ✅ QuotationCreatePage.tsx
4. ✅ QuotationEditPage.tsx
5. ProjectCreatePage.tsx
6. ProjectEditPage.tsx
7. ClientCreatePage.tsx
8. ClientEditPage.tsx
9. VendorCreatePage.tsx
10. VendorEditPage.tsx
11. ExpenseCreatePage.tsx
12. ExpenseEditPage.tsx
13. AssetCreatePage.tsx
14. AssetEditPage.tsx
15. UserCreatePage.tsx
16. UserEditPage.tsx

---

#### 2.2 Payment Milestone Form Mobile Optimization
**File:** `frontend/src/components/quotations/PaymentMilestoneForm.tsx`

**Current Issues:**
- Complex multi-column layout
- Percentage/amount inputs side-by-side
- Add/Remove buttons may be too small

**Changes:**
```typescript
// Stack columns on mobile
<Col xs={24} sm={12} md={8}>
  <Form.Item label="Percentage">
    <InputNumber {...getFormFieldProps()} />
  </Form.Item>
</Col>
<Col xs={24} sm={12} md={8}>
  <Form.Item label="Amount">
    <InputNumber {...getFormFieldProps()} />
  </Form.Item>
</Col>

// Larger remove buttons
<Button
  danger
  icon={<DeleteOutlined />}
  size={isMobile ? 'large' : 'default'}
  style={{ width: isMobile ? '100%' : 'auto' }}
>
  {isMobile && 'Hapus Milestone'}
</Button>
```

---

#### 2.3 Form Validation & Error Messages
**Goal:** Ensure error messages are visible on mobile

**Implementation:**
```typescript
// Mobile-friendly error display
<Form.Item
  validateStatus={error ? 'error' : ''}
  help={isMobile ? <div style={{ fontSize: '12px' }}>{error}</div> : error}
>
  <Input />
</Form.Item>
```

---

### Phase 3: Detail Pages & Modals (Week 3)

#### 3.1 Invoice Detail Page Mobile Optimization
**File:** `frontend/src/pages/InvoiceDetailPage.tsx`

**Current Issues:**
- Multiple cards in rows cause horizontal overflow
- Action buttons in header may be too small
- PDF preview modal not mobile-friendly
- Statistics cards don't stack properly

**Changes:**
```typescript
// Stack cards vertically on mobile
<Row gutter={[16, 16]}>
  <Col xs={24} lg={16}>
    {/* Main invoice details */}
  </Col>
  <Col xs={24} lg={8}>
    {/* Sidebar cards */}
  </Col>
</Row>

// Mobile-friendly action buttons
<Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : 'auto' }}>
  <Button type="primary" size={isMobile ? 'large' : 'default'} style={{ width: isMobile ? '100%' : 'auto' }}>
    Mark as Paid
  </Button>
  <Button size={isMobile ? 'large' : 'default'} style={{ width: isMobile ? '100%' : 'auto' }}>
    Download PDF
  </Button>
</Space>

// Responsive statistics
<Row gutter={[8, 8]}>
  <Col xs={12} sm={8} lg={6}>
    <Statistic title="Total" value={total} />
  </Col>
  <Col xs={12} sm={8} lg={6}>
    <Statistic title="Paid" value={paid} />
  </Col>
  <Col xs={12} sm={8} lg={6}>
    <Statistic title="Remaining" value={remaining} />
  </Col>
</Row>
```

**Similar changes needed for:**
- QuotationDetailPage.tsx
- ProjectDetailPage.tsx
- ClientDetailPage.tsx
- VendorDetailPage.tsx
- ExpenseDetailPage.tsx
- AssetDetailPage.tsx

---

#### 3.2 PDF Preview Modal Mobile Optimization
**Current Issue:** Fixed-width modal doesn't fit mobile viewport

**Implementation:**
```typescript
<Modal
  title="PDF Preview"
  open={pdfPreviewVisible}
  onCancel={closePdfPreview}
  width={isMobile ? '100%' : '90%'}
  style={isMobile ? { top: 0, maxWidth: '100vw' } : {}}
  bodyStyle={isMobile ? { height: 'calc(100vh - 55px)', padding: 0 } : {}}
  footer={null}
>
  <iframe
    src={pdfUrl}
    style={{ width: '100%', height: '100%', border: 'none' }}
  />
</Modal>
```

---

#### 3.3 Batch Operations Mobile Optimization
**Files:**
- InvoicesPage.tsx
- QuotationsPage.tsx

**Current Issue:** Batch action buttons may overflow

**Implementation:**
```typescript
{selectedRowKeys.length > 0 && (
  <Card style={{ marginBottom: 16 }}>
    <Space
      direction={isMobile ? 'vertical' : 'horizontal'}
      style={{ width: isMobile ? '100%' : 'auto' }}
    >
      <Text>{selectedRowKeys.length} selected</Text>
      <Button size={isMobile ? 'large' : 'default'} style={{ width: isMobile ? '100%' : 'auto' }}>
        Batch Send
      </Button>
      <Button size={isMobile ? 'large' : 'default'} style={{ width: isMobile ? '100%' : 'auto' }}>
        Batch Delete
      </Button>
    </Space>
  </Card>
)}
```

---

### Phase 4: Dashboard & Analytics (Week 4)

#### 4.1 Dashboard Mobile Layout
**File:** `frontend/src/pages/DashboardPage.tsx`

**Current State:** Already uses responsive grid (✅)
- Statistics cards: `xs={24} sm={12} lg={6}` ✅
- Revenue cards: `xs={24} sm={12} lg={12}` ✅
- Tables: `xs={24} lg={12}` ✅

**Additional Optimizations Needed:**
```typescript
// Add horizontal scroll to dashboard tables
<Table
  columns={quotationColumns}
  dataSource={recentQuotations}
  pagination={false}
  size="small"
  scroll={{ x: 'max-content' }} // ADD THIS
/>

// Mobile-friendly chart sizing
<ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
  <BarChart data={data}>
    {/* ... */}
  </BarChart>
</ResponsiveContainer>
```

---

#### 4.2 Reports Page Mobile Optimization
**File:** `frontend/src/pages/ReportsPage.tsx`

**Optimizations:**
- Date range pickers should be full-width on mobile
- Chart export buttons should be larger
- Tables should have horizontal scroll
- Filters should open in a drawer on mobile

---

#### 4.3 Milestone Analytics Page
**File:** `frontend/src/pages/MilestoneAnalyticsPage.tsx`

**Optimizations:**
- Timeline component should be scrollable horizontally
- Progress bars should stack vertically on mobile
- Statistics cards should be responsive

---

### Phase 5: Advanced Mobile Features (Week 5)

#### 5.1 Offline Support Enhancement
**File:** `frontend/src/components/mobile/OfflineSupport.tsx`

**Current State:** Component exists but may not be integrated

**Integration Points:**
- Add to MainLayout for global offline detection
- Cache recent invoices/quotations for offline viewing
- Queue actions for when connection returns
- Show offline indicator in mobile navigation

---

#### 5.2 WhatsApp Integration Enhancement
**File:** `frontend/src/components/mobile/WhatsAppIntegration.tsx`

**Enhancements:**
- Add quick WhatsApp buttons to detail pages
- Pre-fill Indonesian business messages
- Add to MobileTableView actions
- Support sharing PDFs via WhatsApp

---

#### 5.3 Touch Gesture Enhancements
**Areas for improvement:**
- Swipe to delete in table rows
- Pull to refresh on list pages
- Swipe between tabs on detail pages
- Long-press for context menus

---

#### 5.4 Mobile-Specific Keyboard Shortcuts
**File:** Create `frontend/src/hooks/useMobileShortcuts.ts`

**Features:**
- Hardware keyboard support for Android tablets
- Voice input for search fields
- Barcode scanner integration for invoice numbers

---

### Phase 6: Testing & Polish (Week 6)

#### 6.1 Device Testing Matrix

**Mandatory Test Devices:**

| Device | Screen Size | Orientation | Priority |
|--------|-------------|-------------|----------|
| iPhone SE (2022) | 375x667 | Portrait | HIGH |
| iPhone 12/13 | 390x844 | Portrait | HIGH |
| iPhone 12/13 | 844x390 | Landscape | MEDIUM |
| Samsung Galaxy S21 | 360x800 | Portrait | HIGH |
| Samsung Galaxy Tab | 768x1024 | Both | MEDIUM |
| iPad Air | 820x1180 | Portrait | LOW |
| Small Android (<360px) | 320x568 | Portrait | MEDIUM |

**Test Scenarios:**
1. ✅ Login and authentication
2. ✅ Navigate between pages
3. ✅ Create new invoice (full flow)
4. ✅ Create new quotation (full flow)
5. ✅ Edit existing invoice
6. ✅ View invoice details
7. ✅ Download PDF on mobile
8. ✅ Search and filter invoices
9. ✅ Use payment milestone form
10. ✅ View dashboard
11. ✅ Batch operations
12. ✅ WhatsApp integration
13. ✅ Offline behavior
14. ✅ Virtual keyboard behavior
15. ✅ Touch scrolling performance

---

#### 6.2 Performance Testing

**Metrics to measure:**
- First Contentful Paint (FCP): < 2s on 3G
- Time to Interactive (TTI): < 5s on 3G
- Cumulative Layout Shift (CLS): < 0.1
- First Input Delay (FID): < 100ms
- Mobile Lighthouse score: > 90

**Tools:**
- Chrome DevTools Mobile Emulation
- Lighthouse CI
- WebPageTest (mobile)
- React DevTools Profiler

---

#### 6.3 Accessibility (a11y) Testing

**Requirements:**
- Touch targets ≥ 44x44px (Apple HIG)
- Touch targets ≥ 48x48px (Android Material)
- Color contrast ratio ≥ 4.5:1
- Form labels properly associated
- Focus indicators visible
- Screen reader compatible
- Keyboard navigation support

**Testing Tools:**
- axe DevTools
- WAVE browser extension
- VoiceOver (iOS)
- TalkBack (Android)

---

#### 6.4 Cross-Browser Testing

**Browsers to test:**
- Safari iOS (latest)
- Chrome Android (latest)
- Samsung Internet
- Firefox Android
- Chrome iOS

---

### Phase 7: Documentation & Training (Week 7)

#### 7.1 Developer Documentation

**Create:** `frontend/src/docs/MOBILE_DEVELOPMENT_GUIDE.md`

**Content:**
- Mobile-first development principles
- How to use useMobileOptimized hook
- When to use MobileTableView vs Table
- Responsive grid patterns
- Touch optimization best practices
- Testing mobile changes

---

#### 7.2 Component Examples

**Create:** `frontend/src/docs/MOBILE_COMPONENT_EXAMPLES.md`

**Examples:**
- Responsive form layouts
- Mobile-friendly tables
- Touch-optimized buttons
- Mobile modals and drawers
- Responsive statistics cards

---

#### 7.3 User Guide

**Create:** `USER_GUIDE_MOBILE.md` (Indonesian)

**Konten:**
- Cara menggunakan aplikasi di HP
- Fitur khusus mobile
- Tips navigasi
- Troubleshooting umum

---

## Implementation Checklist

### Phase 1: Foundation (Week 1) ⚠️ CRITICAL
- [ ] 1.1 MainLayout mobile optimization
- [ ] 1.2 Add horizontal scroll to all tables (15+ files)
- [ ] 1.3 Implement MobileTableView on InvoicesPage
- [ ] 1.3 Implement MobileTableView on QuotationsPage
- [ ] 1.3 Implement MobileTableView on ProjectsPage
- [ ] 1.3 Implement MobileTableView on ClientsPage

### Phase 2: Forms (Week 2) 🔥 HIGH PRIORITY
- [ ] 2.1 Optimize form fields on all Create pages (8 files)
- [ ] 2.1 Optimize form fields on all Edit pages (8 files)
- [ ] 2.2 PaymentMilestoneForm mobile optimization
- [ ] 2.3 Form validation mobile-friendly

### Phase 3: Detail Pages (Week 3) 📱 HIGH PRIORITY
- [ ] 3.1 InvoiceDetailPage mobile optimization
- [ ] 3.1 QuotationDetailPage mobile optimization
- [ ] 3.1 ProjectDetailPage mobile optimization
- [ ] 3.1 ClientDetailPage mobile optimization
- [ ] 3.2 PDF preview modal mobile-friendly
- [ ] 3.3 Batch operations mobile-friendly

### Phase 4: Dashboard (Week 4) 📊 MEDIUM PRIORITY
- [ ] 4.1 Dashboard tables horizontal scroll
- [ ] 4.2 Reports page mobile optimization
- [ ] 4.3 Milestone analytics mobile optimization

### Phase 5: Advanced (Week 5) ✨ LOW PRIORITY
- [ ] 5.1 Offline support integration
- [ ] 5.2 WhatsApp integration enhancements
- [ ] 5.3 Touch gesture enhancements
- [ ] 5.4 Mobile keyboard shortcuts

### Phase 6: Testing (Week 6) ✅ VALIDATION
- [ ] 6.1 Test on all devices (7 configurations)
- [ ] 6.2 Performance testing (Lighthouse > 90)
- [ ] 6.3 Accessibility testing
- [ ] 6.4 Cross-browser testing (5 browsers)

### Phase 7: Documentation (Week 7) 📝 COMPLETION
- [ ] 7.1 Developer documentation
- [ ] 7.2 Component examples
- [ ] 7.3 User guide (Indonesian)

---

## Priority Matrix

### 🔴 CRITICAL (Week 1) - DO FIRST
Must fix immediately to prevent user frustration:
1. Table horizontal overflow (affects all list pages)
2. MainLayout responsive padding
3. Form field sizes on Create/Edit pages

### 🟠 HIGH (Weeks 2-3) - DO NEXT
Significant UX impact:
1. Replace tables with MobileTableView
2. Detail page responsive layouts
3. Modal/drawer mobile optimization
4. Payment Milestone form mobile UX

### 🟡 MEDIUM (Week 4) - DO AFTER
Moderate impact:
1. Dashboard optimizations
2. Reports page mobile UX
3. Statistics card layouts
4. Chart responsiveness

### 🟢 LOW (Week 5+) - NICE TO HAVE
Enhancement features:
1. Offline support
2. Advanced touch gestures
3. WhatsApp enhancements
4. Mobile shortcuts

---

## Code Patterns & Standards

### Pattern 1: Responsive Layout Hook
```typescript
import { useIsMobile } from '../hooks/useMediaQuery'

export const MyPage: React.FC = () => {
  const isMobile = useIsMobile()

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={16}>
        {/* Main content */}
      </Col>
      <Col xs={24} lg={8}>
        {/* Sidebar */}
      </Col>
    </Row>
  )
}
```

### Pattern 2: Conditional Rendering
```typescript
{isMobile ? (
  <MobileTableView data={data} />
) : (
  <Table columns={columns} dataSource={data} />
)}
```

### Pattern 3: Responsive Props
```typescript
<Space
  direction={isMobile ? 'vertical' : 'horizontal'}
  style={{ width: isMobile ? '100%' : 'auto' }}
>
  <Button size={isMobile ? 'large' : 'default'}>
    Action
  </Button>
</Space>
```

### Pattern 4: Mobile-Optimized Forms
```typescript
import { useMobileOptimized } from '../hooks/useMobileOptimized'

const { isMobile, getFormFieldProps } = useMobileOptimized()

<Form layout={isMobile ? 'vertical' : 'horizontal'}>
  <Form.Item>
    <Input {...getFormFieldProps()} />
  </Form.Item>
</Form>
```

---

## Risk Mitigation

### Risk 1: Breaking Desktop UX
**Mitigation:**
- Always use conditional rendering (`isMobile ? ... : ...`)
- Never remove desktop functionality
- Test both mobile and desktop after each change
- Use feature flags for gradual rollout

### Risk 2: Performance Degradation
**Mitigation:**
- Use `useMemo` and `useCallback` for expensive operations
- Lazy load mobile-specific components
- Monitor bundle size increase
- Test on real mobile devices (not just emulators)

### Risk 3: Inconsistent UX Across Devices
**Mitigation:**
- Document all mobile patterns
- Create reusable mobile components
- Code review checklist for mobile optimization
- Maintain design system

### Risk 4: Timeline Overrun
**Mitigation:**
- Focus on Phase 1 (critical fixes) first
- Phases 2-3 can be done iteratively
- Phases 4-5 are optional enhancements
- Each phase is independently deployable

---

## Success Metrics

### Quantitative Metrics
- ✅ Mobile Lighthouse score: > 90
- ✅ Mobile page load time: < 3s on 3G
- ✅ Touch target compliance: 100%
- ✅ Zero horizontal overflow bugs
- ✅ Mobile user retention: +30%
- ✅ Mobile task completion rate: +50%

### Qualitative Metrics
- ✅ User feedback: "Easy to use on mobile"
- ✅ Support tickets: -70% mobile-related issues
- ✅ Developer feedback: "Clear mobile patterns"

---

## Maintenance Plan

### Monthly Mobile Health Check
- [ ] Run Lighthouse audit on mobile
- [ ] Test on latest iOS/Android versions
- [ ] Check for new mobile browser features
- [ ] Review mobile analytics
- [ ] Update documentation

### Quarterly Device Testing
- [ ] Test on newly released devices
- [ ] Update device testing matrix
- [ ] Review and update breakpoints if needed

---

## Appendix

### A. Breakpoint Reference
```css
/* From useMediaQuery.ts */
Small Mobile:  <= 480px
Mobile:        <= 768px
Tablet:        <= 1024px
Desktop:       >= 1025px
```

### B. Touch Target Guidelines
```
Minimum: 44x44px (iOS)
Recommended: 48x48px (Android Material)
Spacing: 8px between targets
```

### C. Mobile-First CSS Media Queries
```css
/* Mobile first (default) */
.element { padding: 12px; }

/* Tablet and up */
@media (min-width: 769px) {
  .element { padding: 24px; }
}

/* Desktop and up */
@media (min-width: 1025px) {
  .element { padding: 32px; }
}
```

### D. Useful Resources
- [Ant Design Mobile Patterns](https://ant.design/components/overview/)
- [React Mobile Best Practices](https://react.dev/learn/rendering-lists)
- [Indonesian Mobile UX Guidelines](https://developer.android.com/guide/topics/large-screens)
- [Touch Target Sizes](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)

---

## Notes

**Last Updated:** 2025-11-04
**Next Review:** After Phase 1 completion

**Questions/Concerns:**
- Contact: Development Team
- Slack: #mobile-optimization
- Priority Issues: Create GitHub issue with `mobile` label
