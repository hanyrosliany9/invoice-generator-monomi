# iOS + Notion Design System - Layout Redesign Plan

## 📱 CORE DESIGN PRINCIPLES

### iOS Philosophy (Clean, Spacious, Minimal)
- **8px Grid System**: All spacing divisible by 8 (8, 16, 24, 32, 40, 48)
- **Touch Targets**: Minimum 44px for all interactive elements
- **Margins**: 24px container padding (desktop), 16px (mobile)
- **Whitespace**: Generous spacing between sections (24px standard, 40px major)
- **Minimal Elements**: Remove clutter, show only what's needed

### Notion Philosophy (Efficient, Database-Like, Hover-Revealed)
- **8px Grid Alignment**: Everything snaps to 8px increments
- **Hover Actions**: Hide secondary actions until hover (cleaner)
- **Property Badges**: Colored background tags for status (not outline tags)
- **Inline Editing**: Edit values directly in tables/cards
- **Compact Groupings**: Use 6-8px gaps for related items
- **Section Blocks**: Each section feels like independent blocks

---

## 🔧 PRIORITY 1: Foundation Fixes (Critical)

### 1.1 Fix Remaining Gradient Cards
**Location**: DashboardPage.tsx lines 365-370, 401-404
```typescript
// REPLACE gradient cards with clean glassmorphism
background: theme.colors.glass.background
border: theme.colors.glass.border
boxShadow: theme.colors.glass.shadow
```

### 1.2 Standardize Card Border Radius
**Change**: All cards from mixed (16px/20px) → **12px** (iOS standard)
```typescript
borderRadius: '12px' // iOS standard corner radius
```

### 1.3 Implement 8px Grid System
**Replace all spacing with 8px multiples**:
- Current: 32px, 40px, 24px, 16px, 12px, 6px, 4px ❌
- New: 8px, 16px, 24px, 32px, 40px, 48px ✅

---

## 🎨 PRIORITY 2: Layout Density Reduction (iOS Spaciousness)

### 2.1 Reduce Statistics Card Density
**Current**: 4-6 cards per row (cramped)
**New**: Maximum 3 cards per row (spacious)
```typescript
// OLD: <Col xs={24} sm={12} lg={6}> (4 columns)
// NEW: <Col xs={24} sm={12} lg={8}> (3 columns - iOS spacious)
```

### 2.2 Increase Section Spacing
**Between major sections**:
- Small gap (related items): **8px** (Notion compact)
- Standard gap: **24px** (iOS default)
- Major sections: **40px** (iOS generous)

```typescript
// Statistics section
<Row gutter={[24, 24]} style={{ marginBottom: '40px' }}>

// Cards section
<Row gutter={[24, 24]} style={{ marginBottom: '40px' }}>

// Table section (no bottom margin - end of page)
<Row gutter={[24, 24]}>
```

### 2.3 Container Padding Standard
**All pages get consistent padding**:
```typescript
<div style={{ padding: '24px' }}> // Desktop standard
// Mobile: padding: '16px' (iOS iPhone margin)
```

---

## 🎭 PRIORITY 3: Notion-Style Interactions

### 3.1 Filter Pills (Notion Style)
**Replace heavy dropdown filters with lightweight pills**:

**Current** (cramped, 1000px+ width):
```typescript
<Input width={300} />
<Select width={150} />
<MonthPicker width={180} />
<InputNumber width={120} />
<InputNumber width={120} />
<Button>Reset</Button>
```

**New** (Notion pill style, responsive wrapping):
```typescript
<Space size={8} wrap>
  <Input.Search
    placeholder="Search..."
    style={{ width: 240, borderRadius: '16px' }} // Pill shape
  />

  {/* Active filters shown as removable pills */}
  {filters.status && (
    <Tag
      closable
      onClose={() => removeFilter('status')}
      style={{
        borderRadius: '12px',
        padding: '4px 12px',
        background: theme.colors.accent.primary + '20' // Notion colored background
      }}
    >
      Status: {filters.status}
    </Tag>
  )}

  {/* Add filter button */}
  <Button
    icon={<PlusOutlined />}
    style={{ borderRadius: '20px' }} // Capsule
  >
    Add Filter
  </Button>
</Space>
```

### 3.2 Hover-Revealed Actions (Notion Pattern)
**Current**: All action buttons always visible
**New**: Show actions only on row hover

```typescript
// Table row component
const [hoveredRow, setHoveredRow] = useState(null)

<Table
  onRow={(record) => ({
    onMouseEnter: () => setHoveredRow(record.id),
    onMouseLeave: () => setHoveredRow(null),
  })}
  columns={[
    // ... data columns ...
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, record) => (
        <div style={{
          opacity: hoveredRow === record.id ? 1 : 0,
          transition: 'opacity 0.2s'
        }}>
          <Dropdown menu={{ items: getActions(record) }}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </div>
      )
    }
  ]}
/>
```

### 3.3 Property Badge Status (Notion Style)
**Replace plain Tag with colored property badges**:

**Current**:
```typescript
<Tag color="green">Lunas</Tag>
```

**New** (Notion property badge):
```typescript
<span style={{
  background: theme.colors.status.success + '15', // Light background
  color: theme.colors.status.success,
  padding: '4px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600
}}>
  Lunas
</span>
```

### 3.4 Hide Batch Actions Until Selection (Cleaner)
**Current**: Toolbar always visible
**New**: Only show when items selected (Notion style)

```typescript
{selectedRowKeys.length > 0 && (
  <Card style={{
    marginBottom: '24px',
    borderRadius: '12px',
    // ... glassmorphism
  }}>
    {/* Batch operations */}
  </Card>
)}
```

---

## 📐 PRIORITY 4: iOS Touch Targets & Buttons

### 4.1 Minimum Touch Target Size
**All interactive elements ≥ 44px**:

```typescript
// Buttons
<Button
  size="large" // Ensures 44px height
  style={{
    borderRadius: '22px', // Capsule shape (iOS)
    minHeight: '44px',
    padding: '0 24px'
  }}
>

// Icon buttons
<Button
  icon={<EditOutlined />}
  style={{
    width: '44px',
    height: '44px',
    borderRadius: '22px' // Circular
  }}
/>
```

### 4.2 Capsule-Shaped Buttons (iOS Style)
**Primary actions get capsule treatment**:

```typescript
// Primary CTA
<Button
  type="primary"
  size="large"
  style={{
    borderRadius: '24px', // Full capsule
    height: '48px',
    padding: '0 32px',
    fontSize: '16px',
    fontWeight: 600,
    // Remove gradient, use solid theme color
    background: theme.colors.accent.primary,
    border: 'none'
  }}
>
  Create Invoice
</Button>

// Secondary actions
<Button
  size="large"
  style={{
    borderRadius: '24px',
    height: '44px',
    padding: '0 24px'
  }}
>
  Export
</Button>
```

---

## 📊 PRIORITY 5: Statistics Card Redesign (iOS Centered + Spacious)

### 5.1 Single Card Design Standard
**No more mixed sizes - one consistent design**:

```typescript
<Card
  style={{
    borderRadius: '12px', // iOS standard
    border: theme.colors.glass.border,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', // Subtle iOS shadow
    background: theme.colors.glass.background,
    backdropFilter: theme.colors.glass.backdropFilter,
    padding: '24px', // Generous iOS padding
    textAlign: 'center' // iOS centered content
  }}
>
  <div style={{
    width: '56px', // iOS icon container
    height: '56px',
    margin: '0 auto 16px',
    borderRadius: '16px',
    background: iconColor + '15',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <Icon style={{ fontSize: '32px', color: iconColor }} />
  </div>

  <Text type="secondary" style={{
    fontSize: '14px',
    display: 'block',
    marginBottom: '8px'
  }}>
    Total Revenue
  </Text>

  <Text strong style={{
    fontSize: '32px',
    fontWeight: 700,
    display: 'block',
    color: theme.colors.text.primary
  }}>
    {formatIDR(value)}
  </Text>
</Card>
```

### 5.2 Grid Pattern Standardization
**All pages use same pattern**:
```typescript
// Statistics: Always 3 columns (iOS spacious)
<Row gutter={[24, 24]} style={{ marginBottom: '40px' }}>
  <Col xs={24} sm={12} lg={8}>
  <Col xs={24} sm={12} lg={8}>
  <Col xs={24} sm={12} lg={8}>
</Row>

// Content cards: 2 columns
<Row gutter={[24, 24]} style={{ marginBottom: '40px' }}>
  <Col xs={24} lg={12}>
  <Col xs={24} lg={12}>
</Row>

// Full width (charts, tables)
<Col span={24}>
```

---

## 📱 PRIORITY 6: Page Header Standardization (iOS Hierarchy)

### 6.1 Consistent Header Pattern
```typescript
<div style={{ marginBottom: '32px' }}>
  <Title
    level={2}
    style={{
      margin: 0,
      marginBottom: '8px',
      fontSize: '34px', // iOS large title size
      fontWeight: 700,
      color: theme.colors.text.primary
    }}
  >
    <Icon style={{
      marginRight: '12px',
      fontSize: '32px',
      color: theme.colors.accent.primary
    }} />
    Page Title
  </Title>

  <Text
    style={{
      fontSize: '16px',
      color: theme.colors.text.secondary,
      lineHeight: 1.5
    }}
  >
    Clear description of page purpose
  </Text>
</div>
```

---

## 🎨 PRIORITY 7: Typography Improvements (Readability)

### 7.1 Type Scale (iOS-inspired)
```typescript
// Large Title (Page headers)
fontSize: '34px', fontWeight: 700

// Title 1 (Section headers)
fontSize: '28px', fontWeight: 700

// Title 2 (Card titles)
fontSize: '22px', fontWeight: 600

// Title 3 (Sub-headers)
fontSize: '18px', fontWeight: 600

// Body (Default)
fontSize: '16px', fontWeight: 400, lineHeight: 1.5

// Caption (Secondary text)
fontSize: '14px', fontWeight: 400, lineHeight: 1.4

// Small (Footnotes)
fontSize: '12px', fontWeight: 400
```

### 7.2 Increase Line Height
```typescript
// Body text
lineHeight: 1.5 // Was 1.2-1.3, now more readable

// Headings
lineHeight: 1.2 // Tight but readable
```

---

## 🔄 PRIORITY 8: Responsive Design (iOS Adaptive)

### 8.1 Breakpoint Strategy
```typescript
// Mobile (iPhone)
xs: { span: 24, padding: '16px' }

// Tablet (iPad)
sm: { span: 12, padding: '24px' }

// Desktop
lg: { span: 8, padding: '24px' }
```

### 8.2 Filter Bar Stacking
**Filters wrap gracefully on mobile**:
```typescript
<Space
  size={[8, 8]} // Horizontal, Vertical
  wrap // Enables wrapping
  style={{ width: '100%' }}
>
  {/* Filters automatically stack on narrow screens */}
</Space>
```

---

## 📦 IMPLEMENTATION ORDER

### Phase 1: Foundation (Critical Fixes)
1. ✅ Fix DashboardPage gradient cards (2 cards)
2. ✅ Change all card borderRadius: 16px/20px → 12px
3. ✅ Standardize spacing to 8px grid system
4. ✅ Add consistent container padding (24px)

### Phase 2: Statistics Redesign (Visual Impact)
5. Redesign statistics cards (centered, iOS style)
6. Reduce grid from 4-6 columns → 3 columns max
7. Increase section spacing (24px → 40px between major sections)

### Phase 3: Buttons & Touch Targets (iOS UX)
8. Convert all buttons to capsule shape (borderRadius: 20-24px)
9. Ensure 44px minimum height for interactive elements
10. Remove gradient buttons → solid theme colors

### Phase 4: Filters & Actions (Notion Efficiency)
11. Replace filter dropdowns with pill-based system
12. Hide batch actions until items selected
13. Implement hover-revealed row actions
14. Convert status Tags to property badges

### Phase 5: Typography & Headers (Consistency)
15. Standardize page headers (icon + title + description)
16. Implement iOS type scale
17. Increase line heights for readability

### Phase 6: Tables & Content (Polish)
18. Add hover states to table rows
19. Improve table action visibility
20. Ensure all content follows 8px grid

---

## 📏 DESIGN SYSTEM REFERENCE

### Spacing Scale (8px Grid)
```typescript
const spacing = {
  xxs: '4px',   // Rare, only for tight inline elements
  xs: '8px',    // Compact groupings (Notion sections)
  sm: '16px',   // Related elements
  md: '24px',   // Standard section spacing (iOS default)
  lg: '32px',   // Card internal padding
  xl: '40px',   // Major section breaks
  xxl: '48px',  // Page-level spacing
}
```

### Card Styling
```typescript
const card = {
  borderRadius: '12px',        // iOS standard
  padding: '24px',             // Generous iOS padding
  shadow: '0 1px 3px rgba(0,0,0,0.08)', // Subtle
  border: theme.colors.glass.border,
  background: theme.colors.glass.background,
  backdropFilter: theme.colors.glass.backdropFilter,
}
```

### Button Styles
```typescript
const button = {
  primary: {
    height: '48px',
    borderRadius: '24px',      // Full capsule
    padding: '0 32px',
    fontSize: '16px',
    fontWeight: 600,
  },
  secondary: {
    height: '44px',
    borderRadius: '22px',
    padding: '0 24px',
  },
  icon: {
    width: '44px',
    height: '44px',
    borderRadius: '22px',      // Circular
  }
}
```

### Typography
```typescript
const typography = {
  largeTitle: { fontSize: '34px', fontWeight: 700, lineHeight: 1.2 },
  title1: { fontSize: '28px', fontWeight: 700, lineHeight: 1.2 },
  title2: { fontSize: '22px', fontWeight: 600, lineHeight: 1.3 },
  title3: { fontSize: '18px', fontWeight: 600, lineHeight: 1.4 },
  body: { fontSize: '16px', fontWeight: 400, lineHeight: 1.5 },
  caption: { fontSize: '14px', fontWeight: 400, lineHeight: 1.4 },
  footnote: { fontSize: '12px', fontWeight: 400, lineHeight: 1.3 },
}
```

---

## ✅ EXPECTED OUTCOMES

After implementation:
- ✅ **40% less visual clutter** (fewer cards, more whitespace)
- ✅ **Consistent 8px grid** alignment throughout
- ✅ **iOS-level touch targets** (44px minimum)
- ✅ **Notion-style efficiency** (hover actions, pill filters)
- ✅ **Professional polish** (capsule buttons, property badges)
- ✅ **Better mobile experience** (responsive wrapping, proper spacing)
- ✅ **Unified design language** across all 7 pages
