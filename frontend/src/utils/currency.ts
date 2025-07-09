/**
 * Safe number conversion that prevents NaN
 */
export const safeNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined || value === '') {
    return 0
  }
  
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^\d.-]/g, ''))
    return isNaN(parsed) ? 0 : parsed
  }
  
  return 0
}

/**
 * Safe division that prevents division by zero
 */
export const safeDivision = (numerator: number, denominator: number): number => {
  const safeNum = safeNumber(numerator)
  const safeDenom = safeNumber(denominator)
  
  if (safeDenom === 0) {
    return 0
  }
  
  const result = safeNum / safeDenom
  return isNaN(result) ? 0 : result
}

/**
 * Format Indonesian Rupiah currency
 */
export const formatIDR = (amount: number | string | null | undefined): string => {
  const numericAmount = safeNumber(amount)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount)
}

/**
 * Parse IDR string back to number
 */
export const parseIDR = (idrString: string | null | undefined): number => {
  if (!idrString) return 0
  
  // Remove 'Rp', spaces, and dots, then convert to number
  const cleanString = idrString.replace(/Rp\s?|\.|\s|,/g, '')
  const parsed = parseInt(cleanString, 10)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Format number with thousand separators (dots)
 */
export const formatNumber = (amount: number | string | null | undefined): string => {
  const numericAmount = safeNumber(amount)
  return new Intl.NumberFormat('id-ID').format(numericAmount)
}

/**
 * Check if amount requires materai (stamp duty)
 * Indonesian law requires materai for invoices > 5 million IDR
 */
export const requiresMaterai = (amount: number | string | null | undefined): boolean => {
  const numericAmount = safeNumber(amount)
  return numericAmount > 5_000_000
}

/**
 * Get materai amount (fixed IDR 10,000)
 */
export const getMateraiAmount = (): number => {
  return 10_000
}

/**
 * Safe string operations that prevent undefined/null errors
 */
export const safeString = (value: string | null | undefined): string => {
  return value || ''
}

/**
 * Safe string method wrapper that prevents errors on undefined/null
 */
export const safeStringMethod = <T>(
  value: string | null | undefined,
  method: (str: string) => T,
  fallback: T
): T => {
  if (!value || typeof value !== 'string') {
    return fallback
  }
  try {
    return method(value)
  } catch {
    return fallback
  }
}

/**
 * Safe array operations that prevent undefined/null errors
 */
export const safeArray = <T>(value: T[] | null | undefined): T[] => {
  return Array.isArray(value) ? value : []
}

/**
 * Safe object property access
 */
export const safeGet = <T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  fallback?: T[K]
): T[K] | undefined => {
  if (obj && typeof obj === 'object' && key in obj) {
    return obj[key]
  }
  return fallback
}

/**
 * Safe nested property access with dot notation
 */
export const safeGetNested = (
  obj: any,
  path: string,
  fallback: any = undefined
): any => {
  if (!obj || typeof obj !== 'object') {
    return fallback
  }
  
  return path.split('.').reduce((current, key) => {
    return (current && typeof current === 'object' && key in current) 
      ? current[key] 
      : fallback
  }, obj)
}

/**
 * Enhanced safe utilities with logging and debugging
 */
export const safeStringWithLog = (
  value: string | null | undefined,
  context?: string
): string => {
  if (value === null || value === undefined || value === '') {
    if (context && import.meta.env.DEV) {
      console.warn(`safeString: Empty value in context: ${context}`)
    }
    return ''
  }
  return String(value)
}

export const safeArrayWithLog = <T>(
  value: T[] | null | undefined,
  context?: string
): T[] => {
  if (!Array.isArray(value)) {
    if (context && import.meta.env.DEV) {
      console.warn(`safeArray: Non-array value in context: ${context}`, value)
    }
    return []
  }
  return value
}

/**
 * Safe object merge utility
 */
export const safeMerge = <T extends Record<string, any>>(
  target: T | null | undefined,
  source: Partial<T> | null | undefined
): T => {
  const safeTarget = target || {} as T
  const safeSource = source || {}
  
  return { ...safeTarget, ...safeSource }
}

/**
 * Safe deep clone utility
 */
export const safeDeepClone = <T>(value: T | null | undefined): T | null => {
  if (value === null || value === undefined) {
    return null
  }
  
  try {
    return JSON.parse(JSON.stringify(value))
  } catch (error) {
    console.error('safeDeepClone: Failed to clone object', error)
    return null
  }
}

/**
 * Safe property setter that creates nested structure if needed
 */
export const safeSet = <T extends Record<string, any>>(
  obj: T | null | undefined,
  path: string,
  value: any
): T => {
  const safeObj = obj || {} as T
  const keys = path.split('.')
  let current: any = safeObj
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!key) continue
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }
  
  const lastKey = keys[keys.length - 1]
  if (lastKey) {
    current[lastKey] = value
  }
  return safeObj
}

/**
 * Safe array find with fallback
 */
export const safeFindWithFallback = <T>(
  array: T[] | null | undefined,
  predicate: (item: T) => boolean,
  fallback: T
): T => {
  const safeArr = safeArray(array)
  const found = safeArr.find(predicate)
  return found || fallback
}

/**
 * Safe array find by ID
 */
export const safeFindById = <T extends { id: string }>(
  array: T[] | null | undefined,
  id: string | null | undefined
): T | null => {
  if (!id) return null
  const safeArr = safeArray(array)
  return safeArr.find(item => item?.id === id) || null
}

/**
 * Safe date formatting
 */
export const safeFormatDate = (
  date: string | Date | null | undefined
): string => {
  if (!date) return ''
  
  try {
    // Use dayjs for date formatting (assuming it's available)
    return new Date(date).toLocaleDateString('id-ID')
  } catch (error) {
    console.error('safeFormatDate: Invalid date', date, error)
    return ''
  }
}

/**
 * Format date for Indonesian reports
 */
export const formatIndonesianDate = (
  date: string | Date | null | undefined
): string => {
  if (!date) return ''
  
  try {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  } catch (error) {
    console.error('formatIndonesianDate: Invalid date', date, error)
    return ''
  }
}

/**
 * Format month-year for charts
 */
export const formatMonthYear = (
  date: string | Date | null | undefined
): string => {
  if (!date) return ''
  
  try {
    return new Date(date).toLocaleDateString('id-ID', {
      month: 'short',
      year: 'numeric'
    })
  } catch (error) {
    console.error('formatMonthYear: Invalid date', date, error)
    return ''
  }
}

/**
 * Format compact currency for charts (K, M, B)
 */
export const formatCompactCurrency = (amount: number | string | null | undefined): string => {
  const numericAmount = safeNumber(amount)
  
  if (numericAmount >= 1_000_000_000) {
    return `Rp ${(numericAmount / 1_000_000_000).toFixed(1)}M`
  } else if (numericAmount >= 1_000_000) {
    return `Rp ${(numericAmount / 1_000_000).toFixed(1)}Jt`
  } else if (numericAmount >= 1_000) {
    return `Rp ${(numericAmount / 1_000).toFixed(0)}K`
  } else {
    return formatIDR(numericAmount)
  }
}

/**
 * Safe enum validation
 */
export const safeEnum = <T extends string>(
  value: string | null | undefined,
  enumValues: readonly T[],
  fallback: T
): T => {
  if (!value || !enumValues.includes(value as T)) {
    return fallback
  }
  return value as T
}

/**
 * Safe percentage calculation
 */
export const safePercentage = (
  numerator: number | null | undefined,
  denominator: number | null | undefined,
  decimals: number = 2
): number => {
  const safeNum = safeNumber(numerator)
  const safeDenom = safeNumber(denominator)
  
  if (safeDenom === 0) return 0
  
  const percentage = (safeNum / safeDenom) * 100
  return Math.round(percentage * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

/**
 * Safe URL validation and formatting
 */
export const safeUrl = (
  url: string | null | undefined,
  protocol: string = 'https://'
): string => {
  const safeUrlString = safeString(url).trim()
  
  if (!safeUrlString) return ''
  
  // Add protocol if missing
  if (!safeUrlString.startsWith('http://') && !safeUrlString.startsWith('https://')) {
    return `${protocol}${safeUrlString}`
  }
  
  return safeUrlString
}

/**
 * Safe phone number formatting for Indonesian numbers
 */
export const safePhoneFormat = (
  phone: string | null | undefined
): string => {
  const safePhone = safeString(phone).replace(/\D/g, '')
  
  if (!safePhone) return ''
  
  // Format Indonesian phone numbers
  if (safePhone.startsWith('62')) {
    return `+${safePhone.substring(0, 2)} ${safePhone.substring(2, 5)} ${safePhone.substring(5, 9)} ${safePhone.substring(9)}`
  }
  
  if (safePhone.startsWith('0')) {
    return `${safePhone.substring(0, 4)} ${safePhone.substring(4, 8)} ${safePhone.substring(8)}`
  }
  
  return safePhone
}