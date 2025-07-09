# Frontend Development Guidelines & Best Practices

## Table of Contents
1. [Undefined Safety Patterns](#undefined-safety-patterns)
2. [Type Safety Requirements](#type-safety-requirements)
3. [Code Review Checklist](#code-review-checklist)
4. [Common Anti-Patterns to Avoid](#common-anti-patterns-to-avoid)
5. [Recommended Patterns](#recommended-patterns)
6. [Error Handling](#error-handling)
7. [Performance Considerations](#performance-considerations)

## Undefined Safety Patterns

### ❌ NEVER Do This
```typescript
// Direct property access without checks
client.name.toLowerCase()
data.reduce((sum, item) => sum + item.amount, 0)
item.client.name
user.profile.settings.theme

// Unsafe string methods
company.startsWith('PT.')
email.includes('@')
text.trim()

// Unsafe array operations
invoices.filter(i => i.status === 'paid')
projects.map(p => p.name)

// Direct object destructuring
const { name, email } = client
```

### ✅ ALWAYS Do This
```typescript
// Safe property access with utilities
safeString(client?.name).toLowerCase()
safeArray(data).reduce((sum, item) => sum + safeNumber(item?.amount), 0)
safeGet(item, 'client')?.name || 'N/A'
safeGetNested(user, 'profile.settings.theme', 'light')

// Safe string methods
safeString(company).toUpperCase().startsWith('PT.')
safeString(email).includes('@')
safeString(text).trim()

// Safe array operations
safeArray(invoices).filter(i => i?.status === 'paid')
safeArray(projects).map(p => safeString(p?.name))

// Safe destructuring with defaults
const { name = '', email = '' } = client || {}
```

## Type Safety Requirements

### 1. Use Type Guards for API Data
```typescript
// Always validate API responses
const clients = validateApiArrayResponse(apiResponse, validateClientArray)
const client = validateApiResponse(apiResponse, isValidClient, defaultClient)

// Use type guards in components
if (isValidClient(client)) {
  // TypeScript now knows client is ValidClient
  return <div>{client.name}</div>
}
```

### 2. Define Proper Interfaces
```typescript
// Complete interface definitions
interface Client {
  id: string
  name: string
  email: string
  company: string
  contactPerson: string
  phone: string
  status: 'active' | 'inactive'
  totalPaid: number
  totalPending: number
  totalQuotations: number
  totalInvoices: number
}

// Use union types for status fields
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'
type ProjectType = 'production' | 'socialMedia'
```

### 3. Function Return Types
```typescript
// Always specify return types for functions
const calculateTotal = (items: Item[]): number => {
  return safeArray(items).reduce((sum, item) => sum + safeNumber(item?.amount), 0)
}

const formatClient = (client: Client | null): string => {
  return safeString(client?.name) || 'Unknown Client'
}
```

## Code Review Checklist

### Before Submitting Code
- [ ] All string methods use `safeString()` or optional chaining
- [ ] All array operations use `safeArray()` 
- [ ] All object property access uses optional chaining or `safeGet()`
- [ ] All mathematical operations use `safeNumber()`
- [ ] All table renders handle undefined data gracefully
- [ ] No direct property access without null checks
- [ ] All API responses are validated with type guards
- [ ] Function return types are explicitly defined
- [ ] Error boundaries are in place for complex components

### Review Questions
1. **Undefined Safety**: What happens if this data is undefined?
2. **Type Safety**: Are all types properly defined and validated?
3. **Error Handling**: How does this handle edge cases?
4. **Performance**: Are there unnecessary re-renders or calculations?
5. **Accessibility**: Does this work with screen readers?

## Common Anti-Patterns to Avoid

### 1. The "It Works on My Machine" Pattern
```typescript
// ❌ Assuming data structure
const clientName = response.data.clients[0].name

// ✅ Defensive programming
const clients = safeArray(response?.data?.clients)
const clientName = safeString(clients[0]?.name) || 'No clients'
```

### 2. The "Null Coalescing Everything" Pattern
```typescript
// ❌ Overusing || operator
const name = client.name || client.company || client.email || 'Unknown'

// ✅ Explicit handling
const name = safeString(client?.name) || 
             safeString(client?.company) || 
             safeString(client?.email) || 
             'Unknown Client'
```

### 3. The "Silent Failure" Pattern
```typescript
// ❌ Failing silently
try {
  return data.clients.map(c => c.name)
} catch {
  return []
}

// ✅ Explicit handling with logging
const clients = safeArray(data?.clients)
if (clients.length === 0) {
  console.warn('No clients data available')
}
return clients.map(c => safeString(c?.name))
```

## Recommended Patterns

### 1. Safe Component Rendering
```typescript
const ClientCard: React.FC<{ client: Client | null }> = ({ client }) => {
  if (!isValidClient(client)) {
    return <div>Invalid client data</div>
  }

  return (
    <Card>
      <h3>{client.name}</h3>
      <p>{client.email}</p>
      <p>{formatIDR(client.totalPaid)}</p>
    </Card>
  )
}
```

### 2. Safe Data Processing
```typescript
const processInvoiceData = (rawData: unknown): ProcessedInvoiceData => {
  const invoices = validateInvoiceArray(rawData)
  
  return {
    total: invoices.length,
    totalValue: invoices.reduce((sum, inv) => sum + safeNumber(inv.amount), 0),
    byStatus: {
      draft: invoices.filter(inv => inv.status === 'draft').length,
      sent: invoices.filter(inv => inv.status === 'sent').length,
      paid: invoices.filter(inv => inv.status === 'paid').length,
      overdue: invoices.filter(inv => inv.status === 'overdue').length,
    }
  }
}
```

### 3. Safe Table Columns
```typescript
const clientColumns: ColumnType<Client>[] = [
  {
    title: 'Client',
    key: 'client',
    render: (_, client) => (
      <div>
        <div>{safeString(client?.name)}</div>
        <div className="text-gray-500">{safeString(client?.company)}</div>
      </div>
    ),
    sorter: (a, b) => safeString(a?.name).localeCompare(safeString(b?.name))
  },
  {
    title: 'Revenue',
    dataIndex: 'totalPaid',
    key: 'revenue',
    render: (amount: number) => formatIDR(safeNumber(amount)),
    sorter: (a, b) => safeNumber(a?.totalPaid) - safeNumber(b?.totalPaid)
  }
]
```

### 4. Safe Form Handling
```typescript
const handleFormSubmit = (values: FormValues): void => {
  const safeValues = {
    name: safeString(values?.name).trim(),
    email: safeString(values?.email).toLowerCase().trim(),
    amount: safeNumber(values?.amount),
    items: safeArray(values?.items).map(item => ({
      quantity: safeNumber(item?.quantity),
      unitPrice: safeNumber(item?.unitPrice),
      description: safeString(item?.description).trim()
    }))
  }

  // Validate before submission
  if (!safeValues.name || !safeValues.email) {
    message.error('Name and email are required')
    return
  }

  submitForm(safeValues)
}
```

## Error Handling

### 1. Error Boundaries
```typescript
const withErrorBoundary = <T extends {}>(Component: React.ComponentType<T>) => {
  return (props: T) => (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <Component {...props} />
    </ErrorBoundary>
  )
}
```

### 2. API Error Handling
```typescript
const useClients = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      try {
        const response = await clientsApi.getAll()
        return validateClientArray(response.data)
      } catch (error) {
        console.error('Failed to fetch clients:', error)
        throw new Error('Unable to load clients. Please try again.')
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
```

### 3. Graceful Degradation
```typescript
const Dashboard: React.FC = () => {
  const { data: clients, error, isLoading } = useClients()

  if (isLoading) return <Spin size="large" />
  
  if (error) {
    return (
      <Alert
        message="Unable to load dashboard data"
        description="Please refresh the page or contact support if the problem persists."
        type="error"
        showIcon
      />
    )
  }

  const safeClients = safeArray(clients)
  
  return (
    <div>
      <h1>Dashboard</h1>
      {safeClients.length === 0 ? (
        <Empty description="No clients found" />
      ) : (
        <ClientsList clients={safeClients} />
      )}
    </div>
  )
}
```

## Performance Considerations

### 1. Memoization for Safe Operations
```typescript
const MemoizedClientCard = React.memo<{ client: Client | null }>(({ client }) => {
  const safeClient = useMemo(() => {
    if (!isValidClient(client)) return null
    return {
      name: safeString(client.name),
      email: safeString(client.email),
      totalPaid: safeNumber(client.totalPaid)
    }
  }, [client])

  if (!safeClient) return null

  return (
    <Card>
      <h3>{safeClient.name}</h3>
      <p>{safeClient.email}</p>
      <p>{formatIDR(safeClient.totalPaid)}</p>
    </Card>
  )
})
```

### 2. Efficient Safe Filtering
```typescript
const useFilteredClients = (clients: Client[], searchText: string) => {
  return useMemo(() => {
    const safeClients = safeArray(clients)
    const searchLower = safeString(searchText).toLowerCase()
    
    if (!searchLower) return safeClients

    return safeClients.filter(client => {
      const name = safeString(client?.name).toLowerCase()
      const company = safeString(client?.company).toLowerCase()
      const email = safeString(client?.email).toLowerCase()
      
      return name.includes(searchLower) || 
             company.includes(searchLower) || 
             email.includes(searchLower)
    })
  }, [clients, searchText])
}
```

## Testing Guidelines

### 1. Test with Edge Cases
```typescript
describe('ClientCard', () => {
  it('handles null client gracefully', () => {
    render(<ClientCard client={null} />)
    expect(screen.getByText('Invalid client data')).toBeInTheDocument()
  })

  it('handles undefined properties', () => {
    const invalidClient = { id: '1' } as Client
    render(<ClientCard client={invalidClient} />)
    expect(screen.getByText('Invalid client data')).toBeInTheDocument()
  })

  it('renders valid client correctly', () => {
    const validClient: Client = {
      id: '1',
      name: 'Test Client',
      email: 'test@example.com',
      // ... other required properties
    }
    render(<ClientCard client={validClient} />)
    expect(screen.getByText('Test Client')).toBeInTheDocument()
  })
})
```

### 2. Test Safe Utilities
```typescript
describe('Safe Utilities', () => {
  describe('safeString', () => {
    it('handles null and undefined', () => {
      expect(safeString(null)).toBe('')
      expect(safeString(undefined)).toBe('')
      expect(safeString('')).toBe('')
    })

    it('returns valid strings', () => {
      expect(safeString('hello')).toBe('hello')
    })
  })

  describe('safeArray', () => {
    it('handles non-arrays', () => {
      expect(safeArray(null)).toEqual([])
      expect(safeArray(undefined)).toEqual([])
      expect(safeArray('not array')).toEqual([])
    })
  })
})
```

## Migration Guide

### Converting Existing Code

1. **Replace direct property access**:
   ```typescript
   // Before
   client.name
   
   // After
   safeString(client?.name)
   ```

2. **Replace array operations**:
   ```typescript
   // Before
   clients.filter(c => c.status === 'active')
   
   // After
   safeArray(clients).filter(c => c?.status === 'active')
   ```

3. **Add type validation**:
   ```typescript
   // Before
   const { data } = useQuery('clients', fetchClients)
   
   // After
   const { data: rawData } = useQuery('clients', fetchClients)
   const data = validateClientArray(rawData)
   ```

Remember: **Defensive programming is not paranoia - it's professionalism!**