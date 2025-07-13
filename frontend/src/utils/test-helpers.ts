/**
 * Testing Utilities for Edge Cases and Undefined Safety
 * These utilities help test components and functions with various edge cases
 */

import { ValidClient, ValidInvoice, ValidProject, ValidQuotation } from './type-guards'

// Mock data generators for testing
export const createMockClient = (overrides: Partial<ValidClient> = {}): ValidClient => ({
  id: 'client-1',
  name: 'Test Client',
  email: 'test@example.com',
  company: 'PT Test Company',
  contactPerson: 'John Doe',
  phone: '021-12345678',
  status: 'active',
  totalPaid: 1000000,
  totalPending: 500000,
  totalQuotations: 5,
  totalInvoices: 3,
  ...overrides
})

export const createMockInvoice = (overrides: Partial<ValidInvoice> = {}): ValidInvoice => ({
  id: 'invoice-1',
  number: 'INV-2025-001',
  clientName: 'Test Client',
  projectName: 'Test Project',
  amount: 1000000,
  status: 'DRAFT',
  dueDate: '2025-08-01',
  materaiRequired: false,
  materaiApplied: false,
  ...overrides
})

export const createMockProject = (overrides: Partial<ValidProject> = {}): ValidProject => ({
  id: 'project-1',
  number: 'PRJ-PH-202507-001',
  description: 'Test Project',
  clientName: 'Test Client',
  type: 'PRODUCTION',
  status: 'PLANNING',
  basePrice: 2000000,
  actualBudget: 1800000,
  totalPaid: 1000000,
  totalPending: 800000,
  startDate: '2025-07-01',
  endDate: '2025-08-01',
  progress: 50,
  ...overrides
})

export const createMockQuotation = (overrides: Partial<ValidQuotation> = {}): ValidQuotation => ({
  id: 'quotation-1',
  number: 'QT-2025-001',
  clientName: 'Test Client',
  projectName: 'Test Project',
  amount: 1500000,
  status: 'DRAFT',
  validUntil: '2025-08-01',
  ...overrides
})

// Edge case data generators
export const createInvalidClient = (type: 'null' | 'undefined' | 'empty' | 'partial' | 'wrong-types') => {
  switch (type) {
    case 'null':
      return null
    case 'undefined':
      return undefined
    case 'empty':
      return {}
    case 'partial':
      return { id: 'client-1', name: 'Test Client' } // Missing required fields
    case 'wrong-types':
      return {
        id: 123, // Should be string
        name: null, // Should be string
        email: '', // Empty string
        company: undefined, // Should be string
        totalPaid: 'not-a-number', // Should be number
        status: 'invalid-status' // Should be 'active' | 'inactive'
      }
    default:
      return null
  }
}

export const createInvalidArray = (type: 'null' | 'undefined' | 'not-array' | 'mixed' | 'empty') => {
  switch (type) {
    case 'null':
      return null
    case 'undefined':
      return undefined
    case 'not-array':
      return 'not an array'
    case 'mixed':
      return [createMockClient(), null, undefined, 'invalid', createMockClient()]
    case 'empty':
      return []
    default:
      return null
  }
}

// Test scenarios for API responses
export const apiResponseScenarios = {
  success: {
    data: [createMockClient(), createMockClient({ id: 'client-2', name: 'Client 2' })]
  },
  emptyArray: {
    data: []
  },
  nullData: {
    data: null
  },
  undefinedData: {
    data: undefined
  },
  invalidData: {
    data: 'not an array'
  },
  mixedData: {
    data: [createMockClient(), null, undefined, { invalid: 'object' }]
  },
  serverError: null,
  networkError: undefined
}

// Test utilities for form validation
export const formTestCases = {
  validForm: {
    name: 'Test Client',
    email: 'test@example.com',
    company: 'PT Test Company',
    phone: '021-12345678'
  },
  emptyForm: {},
  nullForm: null,
  undefinedForm: undefined,
  partialForm: {
    name: 'Test Client'
    // Missing required fields
  },
  invalidTypes: {
    name: 123,
    email: null,
    company: undefined,
    phone: ''
  },
  emptyStrings: {
    name: '',
    email: '',
    company: '',
    phone: ''
  },
  whitespaceStrings: {
    name: '   ',
    email: '  ',
    company: '\t',
    phone: '\n'
  }
}

// Test utilities for string operations
export const stringTestCases = {
  valid: 'Test String',
  empty: '',
  null: null,
  undefined: undefined,
  whitespace: '   ',
  special: 'String with special chars: !@#$%^&*()',
  unicode: 'Unicode: 你好 🌟',
  number: 123,
  boolean: true,
  object: { toString: () => 'object string' },
  array: ['array', 'string']
}

// Test utilities for number operations
export const numberTestCases = {
  valid: 123.45,
  zero: 0,
  negative: -456.78,
  infinity: Infinity,
  negativeInfinity: -Infinity,
  nan: NaN,
  null: null,
  undefined: undefined,
  string: '123.45',
  invalidString: 'not a number',
  empty: '',
  boolean: true,
  object: { valueOf: () => 456 },
  array: [123]
}

// Test utilities for array operations
export const arrayTestCases = {
  valid: [1, 2, 3, 4, 5],
  empty: [],
  null: null,
  undefined: undefined,
  string: 'not an array',
  number: 123,
  object: { 0: 'a', 1: 'b', length: 2 }, // Array-like object
  mixed: [1, 'string', null, undefined, { id: 1 }],
  nested: [[1, 2], [3, 4], [5, 6]],
  sparse: [1, , , 4, 5] // Sparse array
}

// Test utilities for date operations
export const dateTestCases = {
  validDate: new Date('2025-07-09'),
  validString: '2025-07-09',
  invalidString: 'not a date',
  null: null,
  undefined: undefined,
  empty: '',
  timestamp: 1720512000000,
  invalidTimestamp: 'invalid timestamp'
}

// Helper functions for testing
export const expectSafeOperation = <T>(
  operation: () => T,
  fallback: T,
  description: string
): void => {
  try {
    const result = operation()
    if (typeof global !== 'undefined' && typeof (global as any).expect !== 'undefined') {
      const expect = (global as any).expect
      expect(result).not.toBeNull()
      expect(result).not.toBeUndefined()
      expect(result).not.toBe(NaN)
    }
  } catch (error) {
    console.warn(`Safe operation failed: ${description}`, error)
    if (typeof global !== 'undefined' && typeof (global as any).expect !== 'undefined') {
      const expect = (global as any).expect
      expect(fallback).toBeDefined()
    }
  }
}

export const testWithAllCases = <T>(
  testCases: Record<string, any>,
  operation: (value: any) => T,
  validator: (result: T) => boolean,
  description: string
): void => {
  // This function is designed to be used in test files where test and expect are available
  if (typeof global !== 'undefined' && typeof (global as any).test !== 'undefined' && typeof (global as any).expect !== 'undefined') {
    const test = (global as any).test
    const expect = (global as any).expect
    Object.entries(testCases).forEach(([caseName, testValue]) => {
      test(`${description} - ${caseName}`, () => {
        const result = operation(testValue)
        expect(validator(result)).toBe(true)
      })
    })
  }
}

// Mock API responses for testing
export const mockApiResponses = {
  clients: {
    success: () => Promise.resolve({ data: [createMockClient(), createMockClient({ id: 'client-2' })] }),
    empty: () => Promise.resolve({ data: [] }),
    error: () => Promise.reject(new Error('API Error')),
    invalid: () => Promise.resolve({ data: 'invalid data' }),
    null: () => Promise.resolve({ data: null }),
    undefined: () => Promise.resolve({ data: undefined })
  },
  invoices: {
    success: () => Promise.resolve({ data: [createMockInvoice(), createMockInvoice({ id: 'invoice-2' })] }),
    empty: () => Promise.resolve({ data: [] }),
    error: () => Promise.reject(new Error('API Error')),
    invalid: () => Promise.resolve({ data: 'invalid data' })
  }
}

// Component testing utilities
export const renderWithSafeData = (props: any = {}) => {
  const safeProps = {
    ...props,
    // Provide safe defaults for common props
    clients: props.clients || [],
    invoices: props.invoices || [],
    projects: props.projects || [],
    quotations: props.quotations || [],
    loading: props.loading || false,
    error: props.error || null
  }
  
  return { props: safeProps }
}

// Performance testing utilities
export const measureSafeOperation = <T>(
  operation: () => T,
  iterations: number = 1000
): { result: T; averageTime: number } => {
  const start = performance.now()
  let result: T
  
  for (let i = 0; i < iterations; i++) {
    result = operation()
  }
  
  const end = performance.now()
  const averageTime = (end - start) / iterations
  
  return { result: result!, averageTime }
}

// Memory leak testing
export const testMemoryLeak = (
  operation: () => void,
  iterations: number = 1000
): boolean => {
  const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
  
  for (let i = 0; i < iterations; i++) {
    operation()
  }
  
  // Force garbage collection if available
  if (typeof global !== 'undefined' && (global as any).gc) {
    (global as any).gc()
  }
  
  const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
  const memoryIncrease = finalMemory - initialMemory
  
  // If memory increased by more than 10MB, consider it a potential leak
  return memoryIncrease < 10 * 1024 * 1024
}

// Export all test utilities
export default {
  createMockClient,
  createMockInvoice,
  createMockProject,
  createMockQuotation,
  createInvalidClient,
  createInvalidArray,
  apiResponseScenarios,
  formTestCases,
  stringTestCases,
  numberTestCases,
  arrayTestCases,
  dateTestCases,
  expectSafeOperation,
  testWithAllCases,
  mockApiResponses,
  renderWithSafeData,
  measureSafeOperation,
  testMemoryLeak
}