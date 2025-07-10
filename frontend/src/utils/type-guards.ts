/**
 * Comprehensive Type Guards and Validators
 * These utilities provide runtime type checking and validation
 * to prevent undefined property access errors
 */

// Basic type guards
export const isString = (value: unknown): value is string => {
  return typeof value === 'string'
}

export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value)
}

export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === 'boolean'
}

export const isObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export const isArray = <T = unknown>(value: unknown): value is T[] => {
  return Array.isArray(value)
}

export const isDefined = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined
}

export const isNotEmpty = (value: string | null | undefined): value is string => {
  return isString(value) && value.trim().length > 0
}

// Enhanced object validation
export const hasProperty = <T extends Record<string, unknown>, K extends string>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> => {
  return isObject(obj) && key in obj
}

export const hasStringProperty = <T extends Record<string, unknown>, K extends string>(
  obj: T,
  key: K
): obj is T & Record<K, string> => {
  return hasProperty(obj, key) && isString(obj[key])
}

export const hasNumberProperty = <T extends Record<string, unknown>, K extends string>(
  obj: T,
  key: K
): obj is T & Record<K, number> => {
  return hasProperty(obj, key) && isNumber(obj[key])
}

// Business entity validators
export interface ValidClient {
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

export const isValidClient = (value: unknown): value is ValidClient => {
  if (!isObject(value)) return false
  
  return hasStringProperty(value, 'id') &&
         hasStringProperty(value, 'name') &&
         hasStringProperty(value, 'email') &&
         hasStringProperty(value, 'company') &&
         hasStringProperty(value, 'contactPerson') &&
         hasStringProperty(value, 'phone') &&
         hasProperty(value, 'status') &&
         (value.status === 'active' || value.status === 'inactive') &&
         hasNumberProperty(value, 'totalPaid') &&
         hasNumberProperty(value, 'totalPending') &&
         hasNumberProperty(value, 'totalQuotations') &&
         hasNumberProperty(value, 'totalInvoices')
}

export interface ValidInvoice {
  id: string
  number: string
  clientName: string
  projectName: string
  amount: number
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  dueDate: string
  materaiRequired: boolean
  materaiApplied: boolean
}

export const isValidInvoice = (value: unknown): value is ValidInvoice => {
  if (!isObject(value)) return false
  
  const validStatuses = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']
  
  return hasStringProperty(value, 'id') &&
         hasStringProperty(value, 'number') &&
         hasStringProperty(value, 'clientName') &&
         hasStringProperty(value, 'projectName') &&
         hasNumberProperty(value, 'amount') &&
         hasProperty(value, 'status') &&
         validStatuses.includes(value.status as string) &&
         hasStringProperty(value, 'dueDate') &&
         hasProperty(value, 'materaiRequired') &&
         isBoolean(value.materaiRequired) &&
         hasProperty(value, 'materaiApplied') &&
         isBoolean(value.materaiApplied)
}

export interface ValidProject {
  id: string
  number: string
  description: string
  clientName: string
  type: 'PRODUCTION' | 'SOCIAL_MEDIA'
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  estimatedBudget: number
  actualBudget: number
  totalPaid: number
  totalPending: number
  startDate: string
  endDate: string
  progress: number
}

export const isValidProject = (value: unknown): value is ValidProject => {
  if (!isObject(value)) return false
  
  const validTypes = ['PRODUCTION', 'SOCIAL_MEDIA']
  const validStatuses = ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
  
  return hasStringProperty(value, 'id') &&
         hasStringProperty(value, 'number') &&
         hasStringProperty(value, 'description') &&
         hasStringProperty(value, 'clientName') &&
         hasProperty(value, 'type') &&
         validTypes.includes(value.type as string) &&
         hasProperty(value, 'status') &&
         validStatuses.includes(value.status as string) &&
         hasNumberProperty(value, 'estimatedBudget') &&
         hasNumberProperty(value, 'actualBudget') &&
         hasNumberProperty(value, 'totalPaid') &&
         hasNumberProperty(value, 'totalPending') &&
         hasStringProperty(value, 'startDate') &&
         hasStringProperty(value, 'endDate') &&
         hasNumberProperty(value, 'progress')
}

export interface ValidQuotation {
  id: string
  number: string
  clientName: string
  projectName: string
  amount: number
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'REVISED'
  validUntil: string
}

export const isValidQuotation = (value: unknown): value is ValidQuotation => {
  if (!isObject(value)) return false
  
  const validStatuses = ['DRAFT', 'SENT', 'APPROVED', 'DECLINED', 'REVISED']
  
  return hasStringProperty(value, 'id') &&
         hasStringProperty(value, 'number') &&
         hasStringProperty(value, 'clientName') &&
         hasStringProperty(value, 'projectName') &&
         hasNumberProperty(value, 'amount') &&
         hasProperty(value, 'status') &&
         validStatuses.includes(value.status as string) &&
         hasStringProperty(value, 'validUntil')
}

// Array validators
export const validateClientArray = (value: unknown): ValidClient[] => {
  if (!isArray(value)) return []
  return value.filter(isValidClient)
}

export const validateInvoiceArray = (value: unknown): ValidInvoice[] => {
  if (!isArray(value)) return []
  return value.filter(isValidInvoice)
}

export const validateProjectArray = (value: unknown): ValidProject[] => {
  if (!isArray(value)) return []
  return value.filter(isValidProject)
}

export const validateQuotationArray = (value: unknown): ValidQuotation[] => {
  if (!isArray(value)) return []
  return value.filter(isValidQuotation)
}

// Utility to validate API responses
export const validateApiResponse = <T>(
  data: unknown,
  validator: (value: unknown) => value is T,
  fallback: T
): T => {
  if (validator(data)) {
    return data
  }
  console.warn('Invalid API response data:', data)
  return fallback
}

// Utility to validate array API responses
export const validateApiArrayResponse = <T>(
  data: unknown,
  validator: (value: unknown) => T[]
): T[] => {
  try {
    return validator(data)
  } catch (error) {
    console.warn('Invalid API array response:', data, error)
    return []
  }
}

// Create typed safe getters
export const createSafeGetter = <T extends Record<string, unknown>, K extends keyof T>(
  validator: (value: unknown) => value is T[K]
) => {
  return (obj: T | null | undefined, key: K, fallback: T[K]): T[K] => {
    if (!obj || !hasProperty(obj, key as string)) {
      return fallback
    }
    
    const value = obj[key]
    return validator(value) ? value : fallback
  }
}

// Export pre-configured safe getters
export const safeGetString = createSafeGetter(isString)
export const safeGetNumber = createSafeGetter(isNumber)
export const safeGetBoolean = createSafeGetter(isBoolean)

// Runtime assertion with error context
export const assertDefined = <T>(
  value: T | null | undefined,
  context: string
): T => {
  if (!isDefined(value)) {
    throw new Error(`Expected defined value in context: ${context}`)
  }
  return value
}

export const assertString = (
  value: unknown,
  context: string
): string => {
  if (!isString(value)) {
    throw new Error(`Expected string in context: ${context}, got: ${typeof value}`)
  }
  return value
}

export const assertNumber = (
  value: unknown,
  context: string
): number => {
  if (!isNumber(value)) {
    throw new Error(`Expected number in context: ${context}, got: ${typeof value}`)
  }
  return value
}

export const assertArray = <T>(
  value: unknown,
  context: string
): T[] => {
  if (!isArray(value)) {
    throw new Error(`Expected array in context: ${context}, got: ${typeof value}`)
  }
  return value as T[]
}