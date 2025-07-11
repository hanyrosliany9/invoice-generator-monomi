/**
 * Tests for safe utilities and edge cases
 */
import { describe, expect, it } from 'vitest'
import { 
  safeArray, 
  safeDivision, 
  safeEnum, 
  safeGet, 
  safeGetNested,
  safeNumber,
  safePercentage,
  safePhoneFormat,
  safeString
} from './currency'
import { 
  hasStringProperty, 
 
  isDefined,
  isNotEmpty,
  isValidClient,
  validateClientArray
} from './type-guards'
import {
  arrayTestCases,
  createInvalidClient,
  createMockClient,
  numberTestCases,
  stringTestCases,
  testWithAllCases
} from './test-helpers'

describe('Safe String Operations', () => {
  testWithAllCases(
    stringTestCases,
    safeString,
    (result: string) => typeof result === 'string',
    'safeString handles all edge cases'
  )

  it('should handle undefined gracefully', () => {
    expect(safeString(undefined)).toBe('')
  })

  it('should handle null gracefully', () => {
    expect(safeString(null)).toBe('')
  })

  it('should preserve valid strings', () => {
    expect(safeString('hello')).toBe('hello')
  })

  it('should convert numbers to strings', () => {
    expect(safeString(123 as any)).toBe('123')
  })
})

describe('Safe Number Operations', () => {
  testWithAllCases(
    numberTestCases,
    safeNumber,
    (result: number) => typeof result === 'number' && !isNaN(result),
    'safeNumber handles all edge cases'
  )

  it('should handle NaN gracefully', () => {
    expect(safeNumber(NaN)).toBe(0)
  })

  it('should handle undefined gracefully', () => {
    expect(safeNumber(undefined)).toBe(0)
  })

  it('should handle null gracefully', () => {
    expect(safeNumber(null)).toBe(0)
  })

  it('should parse valid number strings', () => {
    expect(safeNumber('123.45')).toBe(123.45)
  })

  it('should handle invalid strings', () => {
    expect(safeNumber('not a number')).toBe(0)
  })
})

describe('Safe Array Operations', () => {
  testWithAllCases(
    arrayTestCases,
    safeArray,
    (result: any[]) => Array.isArray(result),
    'safeArray handles all edge cases'
  )

  it('should handle undefined gracefully', () => {
    expect(safeArray(undefined)).toEqual([])
  })

  it('should handle null gracefully', () => {
    expect(safeArray(null)).toEqual([])
  })

  it('should preserve valid arrays', () => {
    const testArray = [1, 2, 3]
    expect(safeArray(testArray)).toEqual(testArray)
  })

  it('should handle non-arrays', () => {
    expect(safeArray('not an array' as any)).toEqual([])
  })
})

describe('Safe Division', () => {
  it('should handle division by zero', () => {
    expect(safeDivision(10, 0)).toBe(0)
  })

  it('should handle undefined values', () => {
    expect(safeDivision(undefined as any, 5)).toBe(0)
    expect(safeDivision(10, undefined as any)).toBe(0)
  })

  it('should perform valid division', () => {
    expect(safeDivision(10, 2)).toBe(5)
  })

  it('should handle negative numbers', () => {
    expect(safeDivision(-10, 2)).toBe(-5)
  })
})

describe('Safe Object Access', () => {
  const testObject = {
    name: 'John',
    age: 30,
    address: {
      street: '123 Main St',
      city: 'New York'
    }
  }

  it('should safely get properties', () => {
    expect(safeGet(testObject, 'name')).toBe('John')
    expect(safeGet(testObject, 'nonexistent' as any)).toBeUndefined()
    expect(safeGet(null as any, 'name')).toBeUndefined()
    expect(safeGet(undefined as any, 'name')).toBeUndefined()
  })

  it('should safely get nested properties', () => {
    expect(safeGetNested(testObject, 'address.street')).toBe('123 Main St')
    expect(safeGetNested(testObject, 'address.zipcode', 'N/A')).toBe('N/A')
    expect(safeGetNested(null, 'address.street', 'N/A')).toBe('N/A')
  })
})

describe('Safe Enum Validation', () => {
  const validStatuses = ['active', 'inactive'] as const
  // type Status = typeof validStatuses[number]

  it('should validate enum values', () => {
    expect(safeEnum('active', validStatuses, 'inactive')).toBe('active')
    expect(safeEnum('invalid', validStatuses, 'inactive')).toBe('inactive')
    expect(safeEnum(null, validStatuses, 'inactive')).toBe('inactive')
    expect(safeEnum(undefined, validStatuses, 'inactive')).toBe('inactive')
  })
})

describe('Safe Percentage Calculation', () => {
  it('should calculate percentages safely', () => {
    expect(safePercentage(25, 100)).toBe(25)
    expect(safePercentage(1, 3, 2)).toBe(33.33)
    expect(safePercentage(10, 0)).toBe(0)
    expect(safePercentage(null, 100)).toBe(0)
    expect(safePercentage(25, null)).toBe(0)
  })
})

describe('Safe Phone Formatting', () => {
  it('should format Indonesian phone numbers', () => {
    expect(safePhoneFormat('62812345678')).toBe('+62 812 3456 78')
    expect(safePhoneFormat('081234567890')).toBe('0812 3456 7890')
    expect(safePhoneFormat(null)).toBe('')
    expect(safePhoneFormat(undefined)).toBe('')
    expect(safePhoneFormat('')).toBe('')
  })
})

describe('Type Guards', () => {
  describe('isDefined', () => {
    it('should check if value is defined', () => {
      expect(isDefined('hello')).toBe(true)
      expect(isDefined(0)).toBe(true)
      expect(isDefined(false)).toBe(true)
      expect(isDefined(null)).toBe(false)
      expect(isDefined(undefined)).toBe(false)
    })
  })

  describe('isNotEmpty', () => {
    it('should check if string is not empty', () => {
      expect(isNotEmpty('hello')).toBe(true)
      expect(isNotEmpty('   hello   ')).toBe(true)
      expect(isNotEmpty('')).toBe(false)
      expect(isNotEmpty('   ')).toBe(false)
      expect(isNotEmpty(null)).toBe(false)
      expect(isNotEmpty(undefined)).toBe(false)
    })
  })

  describe('hasStringProperty', () => {
    it('should check if object has string property', () => {
      const obj = { name: 'John', age: 30 }
      expect(hasStringProperty(obj, 'name')).toBe(true)
      expect(hasStringProperty(obj, 'age')).toBe(false)
      expect(hasStringProperty(null as any, 'name')).toBe(false)
    })
  })

  describe('isValidClient', () => {
    it('should validate client objects', () => {
      const validClient = createMockClient()
      expect(isValidClient(validClient)).toBe(true)
      
      expect(isValidClient(null)).toBe(false)
      expect(isValidClient(undefined)).toBe(false)
      expect(isValidClient({})).toBe(false)
      expect(isValidClient(createInvalidClient('partial'))).toBe(false)
      expect(isValidClient(createInvalidClient('wrong-types'))).toBe(false)
    })
  })

  describe('validateClientArray', () => {
    it('should validate and filter client arrays', () => {
      const validClient = createMockClient()
      const invalidClient = createInvalidClient('partial')
      
      const result = validateClientArray([validClient, invalidClient, null])
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(validClient)
      
      expect(validateClientArray(null)).toEqual([])
      expect(validateClientArray(undefined)).toEqual([])
      expect(validateClientArray('not an array')).toEqual([])
    })
  })
})

describe('Edge Case Scenarios', () => {
  it('should handle deeply nested null objects', () => {
    const deeplyNested = {
      level1: {
        level2: {
          level3: null
        }
      }
    }
    
    expect(safeGetNested(deeplyNested, 'level1.level2.level3.level4', 'fallback')).toBe('fallback')
  })

  it('should handle circular references safely', () => {
    const circular: any = { name: 'circular' }
    circular.self = circular
    
    expect(safeGet(circular, 'name')).toBe('circular')
    expect(safeGet(circular, 'self')).toBe(circular)
  })

  it('should handle array with mixed types', () => {
    const mixedArray = [1, 'string', null, undefined, { id: 1 }, [1, 2, 3]]
    const result = safeArray(mixedArray)
    expect(result).toEqual(mixedArray)
  })

  it('should handle extremely large numbers', () => {
    expect(safeNumber(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
    expect(safeNumber(Number.MIN_SAFE_INTEGER)).toBe(Number.MIN_SAFE_INTEGER)
    expect(safeNumber(Number.MAX_VALUE)).toBe(Number.MAX_VALUE)
  })

  it('should handle special string characters', () => {
    const specialString = 'Hello\nWorld\t🌟\u0000'
    expect(safeString(specialString)).toBe(specialString)
  })
})

describe('Performance Tests', () => {
  it('should handle large arrays efficiently', () => {
    const largeArray = Array.from({ length: 10000 }, (_, i) => i)
    
    const start = performance.now()
    const result = safeArray(largeArray)
    const end = performance.now()
    
    expect(result).toHaveLength(10000)
    expect(end - start).toBeLessThan(100) // Should complete in less than 100ms
  })

  it('should handle frequent string operations efficiently', () => {
    const iterations = 1000
    const testString = 'Test string for performance'
    
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      safeString(testString)
      safeString(null)
      safeString(undefined)
    }
    const end = performance.now()
    
    expect(end - start).toBeLessThan(50) // Should complete in less than 50ms
  })
})

describe('Integration Tests', () => {
  it('should work with real-world data patterns', () => {
    const apiResponse = {
      data: [
        createMockClient(),
        createMockClient({ id: 'client-2', name: 'Client 2' }),
        null, // Invalid item
        undefined, // Invalid item
        { id: 'invalid' }, // Partial item
      ]
    }
    
    const validatedClients = validateClientArray(apiResponse.data)
    expect(validatedClients).toHaveLength(2)
    
    // Test safe operations on the validated data
    const totalRevenue = validatedClients.reduce((sum, client) => {
      return sum + safeNumber(client.totalPaid)
    }, 0)
    
    expect(totalRevenue).toBe(2000000) // 2 clients × 1000000 each
  })

  it('should handle complex nested operations', () => {
    const complexData = {
      clients: [
        createMockClient(),
        createMockClient({ id: 'client-2', totalPaid: 500000 })
      ],
      meta: {
        pagination: {
          total: 2,
          page: 1,
          limit: 10
        }
      }
    }
    
    const clients = safeArray(complexData.clients)
    const total = safeGetNested(complexData, 'meta.pagination.total', 0)
    
    expect(clients).toHaveLength(2)
    expect(total).toBe(2)
    
    const totalRevenue = clients.reduce((sum, client) => {
      return sum + safeNumber(client?.totalPaid)
    }, 0)
    
    expect(totalRevenue).toBe(1500000)
  })
})