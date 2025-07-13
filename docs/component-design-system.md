# Component Design System for Create/Edit Pages
## Reusable Components for Consistent UX

### Overview

This document outlines the reusable component architecture that will power our enhanced create/edit pages, ensuring consistent design language and user experience across all entity types (Clients, Projects, Quotations, Invoices).

---

## Core Design Principles

### 1. Design Language Consistency
- **Hero Card Pattern:** Unified header design across all pages
- **Progressive Disclosure:** Collapsible sections for complex forms
- **Responsive Grid System:** Mobile-first breakpoints
- **Indonesian Business Context:** Local compliance and formatting

### 2. Component Hierarchy
```
EntityFormLayout (Page Container)
├── EntityHeroCard (Header)
├── FormProgress (Optional - Multi-step)
├── ProgressiveSection[] (Form Sections)
│   ├── FormFields
│   ├── FormStatistics
│   └── ValidationPanel
├── ActionPanel (Save/Cancel)
└── PreviewPanel (Optional - Live Preview)
```

### 3. Accessibility Standards
- WCAG 2.1 AA compliance
- Keyboard navigation throughout
- Screen reader optimization
- High contrast mode support

---

## Component Specifications

### EntityHeroCard Component

**Purpose:** Consistent page header across all create/edit pages

```typescript
interface EntityHeroCardProps {
  title: string
  subtitle?: string
  icon: React.ReactNode
  avatar?: string | React.ReactNode
  breadcrumb: string[]
  metadata?: Array<{
    label: string
    value: string | number
    format?: 'currency' | 'date' | 'number'
  }>
  actions?: Array<{
    label: string
    icon?: React.ReactNode
    type?: 'primary' | 'default' | 'ghost'
    onClick: () => void
    loading?: boolean
    disabled?: boolean
  }>
  status?: {
    type: 'success' | 'warning' | 'error' | 'info'
    message: string
  }
}
```

**Design Specifications:**
```scss
.entity-hero-card {
  background: linear-gradient(135deg, #f6f9fc 0%, #ffffff 100%);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  
  @media (max-width: 768px) {
    padding: 16px;
    margin-bottom: 16px;
  }
}

.hero-avatar {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  
  @media (max-width: 768px) {
    width: 48px;
    height: 48px;
  }
}
```

**Usage Examples:**
```typescript
// Client Create Page
<EntityHeroCard
  title="Create New Client"
  subtitle="Add client information and business details"
  icon={<UserOutlined />}
  breadcrumb={['Clients', 'Create New']}
  actions={[
    { label: 'Save as Draft', type: 'default', onClick: saveDraft },
    { label: 'Save & Create Project', type: 'primary', onClick: saveAndContinue }
  ]}
/>

// Project Edit Page  
<EntityHeroCard
  title={project.number}
  subtitle={`Editing project • ${project.description}`}
  icon={<ProjectOutlined />}
  avatar={project.client.avatar}
  breadcrumb={['Projects', project.number, 'Edit']}
  metadata={[
    { label: 'Client', value: project.client.name },
    { label: 'Value', value: project.totalValue, format: 'currency' },
    { label: 'Created', value: project.createdAt, format: 'date' }
  ]}
  status={{
    type: 'info',
    message: 'Auto-saved 2 minutes ago'
  }}
/>
```

---

### EntityFormLayout Component

**Purpose:** Page wrapper providing consistent layout structure

```typescript
interface EntityFormLayoutProps {
  children: React.ReactNode
  hero: React.ReactNode
  sidebar?: React.ReactNode
  preview?: React.ReactNode
  loading?: boolean
  className?: string
}
```

**Layout Structure:**
```tsx
<div className="entity-form-layout">
  <div className="form-hero">
    {hero}
  </div>
  
  <div className="form-body">
    <div className="form-main">
      {children}
    </div>
    
    {sidebar && (
      <div className="form-sidebar">
        {sidebar}
      </div>
    )}
  </div>
  
  {preview && (
    <div className="form-preview">
      {preview}
    </div>
  )}
</div>
```

**Responsive Behavior:**
- **Desktop (>1200px):** 3-column layout (main, sidebar, preview)
- **Tablet (768-1200px):** 2-column layout (main, sidebar)
- **Mobile (<768px):** Single column, collapsible sidebar

---

### ProgressiveSection Component

**Purpose:** Collapsible form sections with consistent styling

```typescript
interface ProgressiveSectionProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  defaultOpen?: boolean
  required?: boolean
  disabled?: boolean
  children: React.ReactNode
  extra?: React.ReactNode
  validation?: {
    status: 'success' | 'warning' | 'error' | 'validating'
    message?: string
  }
  mobileCollapsed?: boolean
  onToggle?: (open: boolean) => void
}
```

**Design Features:**
- Smooth expand/collapse animations
- Visual indicators for required sections
- Real-time validation status
- Mobile-optimized touch targets
- Keyboard accessibility

**Implementation:**
```tsx
<ProgressiveSection
  title="Client Information"
  subtitle="Basic client details and contact information"
  icon={<UserOutlined />}
  defaultOpen={true}
  required={true}
  validation={{
    status: errors.client ? 'error' : 'success',
    message: errors.client ? 'Please complete required fields' : undefined
  }}
>
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12}>
      <Form.Item name="name" label="Client Name" required>
        <Input placeholder="Enter client name" />
      </Form.Item>
    </Col>
    <Col xs={24} sm={12}>
      <Form.Item name="email" label="Email" required>
        <Input type="email" placeholder="client@company.com" />
      </Form.Item>
    </Col>
  </Row>
</ProgressiveSection>
```

---

### FormStatistics Component

**Purpose:** Real-time statistics and calculated values

```typescript
interface FormStatisticsProps {
  stats: Array<{
    label: string
    value: string | number
    format?: 'currency' | 'percentage' | 'number' | 'duration'
    icon?: React.ReactNode
    trend?: {
      type: 'up' | 'down' | 'neutral'
      value: number
      format?: string
    }
    color?: string
    loading?: boolean
  }>
  layout?: 'horizontal' | 'vertical' | 'grid'
  size?: 'small' | 'default' | 'large'
}
```

**Usage Examples:**
```typescript
// Project Form Statistics
<FormStatistics
  stats={[
    {
      label: 'Total Products',
      value: products.length,
      icon: <ShoppingOutlined />,
      color: '#1890ff'
    },
    {
      label: 'Estimated Value',
      value: calculatedValue,
      format: 'currency',
      icon: <DollarOutlined />,
      trend: { type: 'up', value: 15, format: 'percentage' }
    },
    {
      label: 'Project Duration',
      value: estimatedDuration,
      format: 'duration',
      icon: <ClockCircleOutlined />
    },
    {
      label: 'Materai Required',
      value: requiresMaterai(calculatedValue) ? 'Yes' : 'No',
      icon: <BankOutlined />,
      color: requiresMaterai(calculatedValue) ? '#faad14' : '#52c41a'
    }
  ]}
  layout="grid"
/>
```

---

### InheritanceIndicator Component

**Purpose:** Show data inheritance from related entities

```typescript
interface InheritanceIndicatorProps {
  source: 'quotation' | 'project' | 'client' | 'template' | 'manual'
  sourceEntity?: {
    id: string
    name: string
    number?: string
  }
  inheritedData: {
    [key: string]: {
      value: any
      editable: boolean
      confidence?: number
    }
  }
  onEdit?: (field: string) => void
  onRevert?: (field: string) => void
}
```

**Visual Design:**
```tsx
<Card 
  size="small" 
  className="inheritance-indicator"
  title={
    <Space>
      <LinkOutlined />
      <span>Inherited from {source}</span>
      {sourceEntity && (
        <Button 
          type="link" 
          size="small"
          onClick={() => navigate(`/${source}s/${sourceEntity.id}`)}
        >
          View {sourceEntity.name}
        </Button>
      )}
    </Space>
  }
>
  {Object.entries(inheritedData).map(([field, data]) => (
    <Row key={field} justify="space-between" align="middle">
      <Col>
        <Text>{field}: </Text>
        <Text strong>{formatValue(data.value)}</Text>
        {data.confidence && (
          <Tag color={data.confidence > 80 ? 'green' : 'orange'}>
            {data.confidence}% confidence
          </Tag>
        )}
      </Col>
      <Col>
        {data.editable && (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => onEdit?.(field)} />
            <Button size="small" icon={<UndoOutlined />} onClick={() => onRevert?.(field)} />
          </Space>
        )}
      </Col>
    </Row>
  ))}
</Card>
```

---

### ActionPanel Component

**Purpose:** Consistent save/cancel actions across all forms

```typescript
interface ActionPanelProps {
  primaryActions: Array<{
    label: string
    icon?: React.ReactNode
    type?: 'primary' | 'default'
    onClick: () => void
    loading?: boolean
    disabled?: boolean
    shortcut?: string
  }>
  secondaryActions?: Array<{
    label: string
    icon?: React.ReactNode
    onClick: () => void
    disabled?: boolean
  }>
  position?: 'fixed' | 'static'
  showShortcuts?: boolean
  isDirty?: boolean
  lastSaved?: Date
}
```

**Fixed Position Behavior:**
```scss
.action-panel-fixed {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-top: 1px solid #f0f0f0;
  padding: 16px 24px;
  z-index: 1000;
  
  @media (max-width: 768px) {
    padding: 12px 16px;
  }
}
```

---

### PreviewPanel Component

**Purpose:** Live preview of forms (especially for quotations/invoices)

```typescript
interface PreviewPanelProps {
  mode: 'live' | 'static'
  data: any
  template: 'quotation' | 'invoice' | 'project'
  showPdf?: boolean
  allowDownload?: boolean
  onDownload?: () => void
  className?: string
}
```

**Features:**
- Real-time data binding
- PDF preview integration
- Print optimization
- Mobile-responsive scaling
- Zoom controls

---

## Indonesian Business Components

### MateraiCompliancePanel

**Purpose:** Handle Indonesian materai (stamp duty) requirements

```typescript
interface MateraiCompliancePanelProps {
  totalAmount: number
  currentStatus: 'not_required' | 'required' | 'applied'
  onStatusChange: (status: string) => void
  showCalculation?: boolean
}
```

### IDRCurrencyInput

**Purpose:** Indonesian Rupiah formatted input with validation

```typescript
interface IDRCurrencyInputProps extends Omit<InputProps, 'value' | 'onChange'> {
  value?: number
  onChange?: (value: number) => void
  showMateraiWarning?: boolean
  precision?: number
}
```

### IndonesianDatePicker

**Purpose:** Localized date picker with Indonesian calendar

```typescript
interface IndonesianDatePickerProps extends DatePickerProps {
  showLunarCalendar?: boolean
  businessDaysOnly?: boolean
  holidayIndicator?: boolean
}
```

---

## Form Validation System

### ValidationPanel Component

**Purpose:** Centralized validation display and management

```typescript
interface ValidationPanelProps {
  errors: Record<string, string[]>
  warnings: Record<string, string[]>
  showSummary?: boolean
  onFieldFocus?: (field: string) => void
}
```

### Real-time Validation Hooks

```typescript
// Custom hooks for form validation
export const useFormValidation = (schema: ValidationSchema) => {
  const [errors, setErrors] = useState({})
  const [warnings, setWarnings] = useState({})
  
  const validateField = useCallback((field: string, value: any) => {
    // Real-time validation logic
  }, [schema])
  
  const validateAll = useCallback(() => {
    // Complete form validation
  }, [schema])
  
  return { errors, warnings, validateField, validateAll }
}
```

---

## Performance Optimization

### Lazy Loading Strategy

```typescript
// Code splitting for heavy components
const PreviewPanel = lazy(() => import('./PreviewPanel'))
const AdvancedStatistics = lazy(() => import('./AdvancedStatistics'))

// Progressive enhancement
const EnhancedFormFeatures = lazy(() => 
  import('./EnhancedFormFeatures').then(module => ({
    default: module.EnhancedFormFeatures
  }))
)
```

### Memoization Patterns

```typescript
// Expensive calculations
const FormStatistics = memo(({ data }) => {
  const calculations = useMemo(() => 
    performExpensiveCalculations(data), [data]
  )
  
  return <StatisticsDisplay data={calculations} />
})

// Form validation
const ValidationPanel = memo(({ errors, warnings }) => (
  <ValidationDisplay errors={errors} warnings={warnings} />
))
```

---

## Testing Strategy

### Component Testing

```typescript
// EntityHeroCard.test.tsx
describe('EntityHeroCard', () => {
  it('renders with required props', () => {
    render(
      <EntityHeroCard
        title="Test Title"
        icon={<UserOutlined />}
        breadcrumb={['Test']}
      />
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('handles responsive breakpoints', () => {
    // Test mobile/tablet/desktop layouts
  })

  it('supports keyboard navigation', () => {
    // Test accessibility
  })
})
```

### Integration Testing

```typescript
// FormWorkflow.integration.test.tsx
describe('Create/Edit Form Workflow', () => {
  it('completes full client creation flow', async () => {
    // Test end-to-end form completion
  })

  it('handles form inheritance correctly', async () => {
    // Test data inheritance from related entities
  })

  it('validates Indonesian business requirements', async () => {
    // Test materai, currency, date formatting
  })
})
```

---

## Implementation Guidelines

### Component Development Order

1. **Core Layout Components** (Week 1)
   - EntityFormLayout
   - EntityHeroCard
   - ProgressiveSection

2. **Form Components** (Week 2)
   - FormStatistics
   - ActionPanel
   - ValidationPanel

3. **Business Logic Components** (Week 3)
   - InheritanceIndicator
   - MateraiCompliancePanel
   - IDRCurrencyInput

4. **Advanced Features** (Week 4)
   - PreviewPanel
   - Real-time collaboration
   - Performance optimization

### TypeScript Configuration & Standards

**TypeScript Configuration:**
```typescript
// Standard TypeScript setup
{
  "compilerOptions": {
    // Standard configuration without strict mode enforcement
  }
}
```

**Type Safety Validation Commands:**
```bash
# Simple type checking only
npm run typecheck                   # All TypeScript files
tsc --noEmit                       # TypeScript compilation check
npm run build                       # Production build
```

**Interface Design Standards:**
```typescript
// All component props must extend base interface
interface BaseComponentProps {
  className?: string
  'data-testid'?: string
  'aria-label'?: string
}

// Form components must include validation props
interface BaseFormComponentProps extends BaseComponentProps {
  error?: string
  warning?: string
  required?: boolean
  disabled?: boolean
}

// Indonesian business components must include locale props
interface IndonesianComponentProps extends BaseComponentProps {
  locale?: 'id-ID'
  currency?: 'IDR'
  timezone?: 'Asia/Jakarta'
}
```

### Code Quality Standards

```typescript
// TypeScript enabled
// 100% TypeScript coverage for props
// Comprehensive JSDoc documentation
// Accessibility testing with @testing-library/jest-dom
```

### Documentation Standards

- Component prop interfaces with examples
- Storybook stories for visual documentation
- Usage guidelines and best practices
- Accessibility notes and keyboard shortcuts
- Performance considerations and optimization tips

This component design system provides the foundation for building consistent, accessible, and performant create/edit pages that maintain design language consistency while providing the flexibility needed for different entity types and business requirements.