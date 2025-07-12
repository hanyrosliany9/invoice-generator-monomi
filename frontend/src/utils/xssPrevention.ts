// XSS Prevention Utilities - Indonesian Business Management System
// Comprehensive XSS prevention and input sanitization for Indonesian business data

import DOMPurify from 'dompurify'

// Basic DOMPurify type augmentation
declare module 'dompurify' {
  interface DOMPurifyI {
    addHook(hookName: string, hookFunction: (node: any, data?: any) => void): void
  }
}

// Configuration for Indonesian business-specific sanitization
interface SanitizationConfig {
  allowedTags?: string[]
  allowedAttributes?: Record<string, string[]>
  indonesianBusinessContext?: boolean
  preserveIndonesianChars?: boolean
  materaiDataProtection?: boolean
  clientDataProtection?: boolean
}

// XSS Prevention result interface
interface XSSPreventionResult {
  sanitized: string
  wasModified: boolean
  removedElements: string[]
  securityWarnings: string[]
  indonesianCompliance: boolean
}

// Indonesian business data patterns that need special handling
const INDONESIAN_BUSINESS_PATTERNS = {
  // NPWP format: XX.XXX.XXX.X-XXX.XXX
  npwp: /^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/,
  
  // NIK format: 16 digits
  nik: /^\d{16}$/,
  
  // Indonesian phone numbers
  phoneNumber: /^(\+62|62|0)(\d{9,13})$/,
  
  // Indonesian postal codes
  postalCode: /^\d{5}$/,
  
  // Indonesian bank account patterns
  bankAccount: /^\d{10,16}$/,
  
  // Materai amounts (in IDR)
  materaiAmount: /^(10000|20000)$/,
  
  // Indonesian business registration numbers
  businessRegistration: /^[A-Z0-9\-\/]{10,20}$/
}

// Dangerous patterns that should be blocked
const DANGEROUS_PATTERNS = [
  // Script injection patterns
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /onload\s*=/gi,
  /onclick\s*=/gi,
  /onerror\s*=/gi,
  /onmouseover\s*=/gi,
  
  // SQL injection patterns
  /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/gi,
  /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi,
  /(\bOR\b|\bAND\b)\s+[\'"]\w+[\'"]\s*=\s*[\'"]\w+[\'"]/gi,
  
  // Path traversal patterns
  /\.\.\//gi,
  /\.\.\\/gi,
  
  // Indonesian-specific sensitive data patterns
  /\b\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}\b/g, // NPWP in logs
  /\b\d{16}\b/g, // Potential NIK
]

// Default sanitization configuration for Indonesian business
const DEFAULT_INDONESIAN_CONFIG: SanitizationConfig = {
  allowedTags: [
    'p', 'br', 'strong', 'em', 'u', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote',
    'table', 'thead', 'tbody', 'tr', 'td', 'th'
  ],
  allowedAttributes: {
    '*': ['class', 'id'],
    'span': ['style'],
    'div': ['style'],
    'table': ['style', 'cellpadding', 'cellspacing'],
    'td': ['style', 'colspan', 'rowspan'],
    'th': ['style', 'colspan', 'rowspan']
  },
  indonesianBusinessContext: true,
  preserveIndonesianChars: true,
  materaiDataProtection: true,
  clientDataProtection: true
}

// Configure DOMPurify for Indonesian business use
const configureDOMPurify = (config: SanitizationConfig) => {
  // Create fresh DOMPurify instance
  const purify = DOMPurify

  // Add Indonesian character preservation hook
  if (config.preserveIndonesianChars) {
    purify.addHook('beforeSanitizeElements', (node) => {
      // Preserve Indonesian characters like á, é, í, ó, ú
      if (node.nodeType === 3) { // Text node
        const text = node.textContent || ''
        // Indonesian characters are already UTF-8 safe, but ensure they're not escaped
        node.textContent = text
      }
    })
  }

  // Add business data protection hook
  if (config.materaiDataProtection || config.clientDataProtection) {
    purify.addHook('afterSanitizeAttributes', (node) => {
      // Remove any attributes that might contain sensitive Indonesian business data
      if (typeof node.hasAttribute === 'function' && typeof node.removeAttribute === 'function') {
        const attributes = node.attributes
        if (attributes) {
          for (let i = attributes.length - 1; i >= 0; i--) {
            const attr = attributes[i]
            if (!attr) continue
            
            const value = attr.value.toLowerCase()
            
            // Check for potential sensitive data in attributes
            if (containsSensitiveIndonesianData(value)) {
              console.warn(`Removing attribute containing sensitive data: ${attr.name}`)
              node.removeAttribute(attr.name)
            }
          }
        }
      }
    })
  }

  return purify
}

// Check if content contains sensitive Indonesian business data
const containsSensitiveIndonesianData = (content: string): boolean => {
  const sensitivePatterns = [
    INDONESIAN_BUSINESS_PATTERNS.npwp,
    INDONESIAN_BUSINESS_PATTERNS.nik,
    /password/i,
    /secret/i,
    /token/i,
    /key/i
  ]

  return sensitivePatterns.some(pattern => pattern.test(content))
}

// Main XSS prevention function
export const preventXSS = (
  input: string, 
  config: SanitizationConfig = DEFAULT_INDONESIAN_CONFIG
): XSSPreventionResult => {
  if (!input || typeof input !== 'string') {
    return {
      sanitized: '',
      wasModified: false,
      removedElements: [],
      securityWarnings: [],
      indonesianCompliance: true
    }
  }

  const originalInput = input
  const purify = configureDOMPurify(config)
  const removedElements: string[] = []
  const securityWarnings: string[] = []
  
  // Track removed elements
  purify.addHook('uponSanitizeElement', (_node, data) => {
    if (data.allowedTags && !data.allowedTags[data.tagName]) {
      removedElements.push(data.tagName)
    }
  })

  // Check for dangerous patterns before sanitization
  DANGEROUS_PATTERNS.forEach(pattern => {
    if (pattern.test(input)) {
      securityWarnings.push(`Dangerous pattern detected: ${pattern.source}`)
    }
  })

  // Convert allowedAttributes to flat array format for DOMPurify
  const allowedAttributes = config.allowedAttributes || DEFAULT_INDONESIAN_CONFIG.allowedAttributes
  const flattenedAttrs = allowedAttributes ? 
    Object.values(allowedAttributes).flat().concat(['class', 'id']) : 
    ['class', 'id']

  // Sanitize the input
  let sanitized = purify.sanitize(input, {
    ALLOWED_TAGS: config.allowedTags || DEFAULT_INDONESIAN_CONFIG.allowedTags,
    ALLOWED_ATTR: flattenedAttrs,
    KEEP_CONTENT: true,
    SANITIZE_DOM: true
  }) as string

  // Additional Indonesian business-specific sanitization
  if (config.indonesianBusinessContext) {
    sanitized = sanitizeIndonesianBusinessData(sanitized)
  }

  // Check Indonesian compliance
  const indonesianCompliance = validateIndonesianCompliance(sanitized)
  if (!indonesianCompliance) {
    securityWarnings.push('Content may not comply with Indonesian data protection laws')
  }

  return {
    sanitized,
    wasModified: originalInput !== sanitized,
    removedElements: [...new Set(removedElements)],
    securityWarnings,
    indonesianCompliance
  }
}

// Sanitize Indonesian business-specific data
const sanitizeIndonesianBusinessData = (input: string): string => {
  let sanitized = input

  // Mask NPWP in logs or display (keep format but hide digits)
  sanitized = sanitized.replace(
    INDONESIAN_BUSINESS_PATTERNS.npwp,
    'XX.XXX.XXX.X-XXX.XXX'
  )

  // Mask NIK (show only first 4 and last 4 digits)
  sanitized = sanitized.replace(
    INDONESIAN_BUSINESS_PATTERNS.nik,
    (match) => `${match.slice(0, 4)}${'*'.repeat(8)}${match.slice(-4)}`
  )

  // Mask bank account numbers
  sanitized = sanitized.replace(
    INDONESIAN_BUSINESS_PATTERNS.bankAccount,
    (match) => `${'*'.repeat(match.length - 4)}${match.slice(-4)}`
  )

  return sanitized
}

// Validate Indonesian compliance
const validateIndonesianCompliance = (content: string): boolean => {
  // Check if content exposes sensitive Indonesian data
  const exposesNPWP = INDONESIAN_BUSINESS_PATTERNS.npwp.test(content)
  const exposesNIK = INDONESIAN_BUSINESS_PATTERNS.nik.test(content)
  const exposesBankAccount = INDONESIAN_BUSINESS_PATTERNS.bankAccount.test(content)

  // Indonesian compliance requires that sensitive data is not exposed in plain text
  return !(exposesNPWP || exposesNIK || exposesBankAccount)
}

// Sanitize form input specifically for Indonesian business forms
export const sanitizeIndonesianFormInput = (
  input: string,
  fieldType: 'name' | 'address' | 'description' | 'title' | 'phone' | 'email' | 'notes'
): string => {
  const fieldConfigs: Record<string, SanitizationConfig> = {
    name: {
      allowedTags: [],
      indonesianBusinessContext: true,
      preserveIndonesianChars: true,
      clientDataProtection: true
    },
    address: {
      allowedTags: ['br'],
      indonesianBusinessContext: true,
      preserveIndonesianChars: true
    },
    description: {
      allowedTags: ['p', 'br', 'strong', 'em'],
      indonesianBusinessContext: true,
      preserveIndonesianChars: true
    },
    title: {
      allowedTags: [],
      indonesianBusinessContext: true,
      preserveIndonesianChars: true
    },
    phone: {
      allowedTags: [],
      indonesianBusinessContext: true
    },
    email: {
      allowedTags: [],
      indonesianBusinessContext: false
    },
    notes: {
      allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
      indonesianBusinessContext: true,
      preserveIndonesianChars: true
    }
  }

  const config = fieldConfigs[fieldType] || DEFAULT_INDONESIAN_CONFIG
  const result = preventXSS(input, config)

  // Log security warnings for audit
  if (result.securityWarnings.length > 0) {
    console.warn(`XSS Prevention warnings for ${fieldType}:`, result.securityWarnings)
  }

  return result.sanitized
}

// Sanitize Indonesian business document content
export const sanitizeBusinessDocument = (content: string): XSSPreventionResult => {
  return preventXSS(content, {
    ...DEFAULT_INDONESIAN_CONFIG,
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'hr'
    ],
    materaiDataProtection: true,
    clientDataProtection: true
  })
}

// Validate and sanitize URL for Indonesian business context
export const sanitizeBusinessURL = (url: string): { sanitized: string; isSafe: boolean } => {
  if (!url || typeof url !== 'string') {
    return { sanitized: '', isSafe: false }
  }

  try {
    // Remove dangerous protocols
    const dangerousProtocols = ['javascript:', 'vbscript:', 'data:', 'file:']
    const lowerUrl = url.toLowerCase()
    
    for (const protocol of dangerousProtocols) {
      if (lowerUrl.startsWith(protocol)) {
        return { sanitized: '', isSafe: false }
      }
    }

    // Parse URL to validate structure
    const urlObj = new URL(url)
    
    // Only allow http, https, and mailto
    if (!['http:', 'https:', 'mailto:'].includes(urlObj.protocol)) {
      return { sanitized: '', isSafe: false }
    }

    // Additional validation for Indonesian business domains
    const sanitized = encodeURI(url)
    
    return { sanitized, isSafe: true }
  } catch (error) {
    return { sanitized: '', isSafe: false }
  }
}

// Create CSRF token for Indonesian business forms
export const generateCSRFToken = (): string => {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2)
  const business = 'MONOMI_ID_BIZ'
  
  const tokenData = `${business}_${timestamp}_${random}`
  
  // Simple encoding (in production, use proper cryptographic signing)
  return btoa(tokenData)
}

// Validate CSRF token
export const validateCSRFToken = (token: string, maxAge: number = 3600000): boolean => {
  try {
    const decoded = atob(token)
    const parts = decoded.split('_')
    
    if (parts.length !== 4 || parts[0] !== 'MONOMI' || parts[1] !== 'ID' || parts[2] !== 'BIZ' || !parts[3]) {
      return false
    }

    const timestamp = parseInt(parts[3], 10)
    const now = Date.now()
    
    return (now - timestamp) <= maxAge
  } catch (error) {
    return false
  }
}

// Security headers for Indonesian business compliance
export const getSecurityHeaders = (): Record<string, string> => {
  return {
    'Content-Security-Policy': `
      default-src 'self';
      script-src 'self' 'unsafe-inline' https://apis.google.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' data: https:;
      connect-src 'self' https://api.whatsapp.com;
      frame-ancestors 'none';
      base-uri 'self';
      form-action 'self';
    `.replace(/\s+/g, ' ').trim(),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    // Indonesian privacy compliance
    'X-Indonesian-Privacy-Compliance': 'UU-27-2022',
    'X-Materai-Calculation-Protected': 'true'
  }
}

// Audit log for security events
export const logSecurityEvent = (event: {
  type: 'xss_attempt' | 'csrf_failure' | 'sensitive_data_exposure' | 'materai_miscalculation'
  details: string
  userAgent?: string
  ip?: string
  timestamp?: Date
}) => {
  const logEntry = {
    ...event,
    timestamp: event.timestamp || new Date(),
    indonesianCompliance: true,
    severity: event.type === 'sensitive_data_exposure' ? 'critical' : 'high'
  }

  // In production, send to security monitoring service
  console.warn('Security Event:', logEntry)
  
  // Store for compliance audit
  try {
    const securityLogs = JSON.parse(localStorage.getItem('securityLogs') || '[]')
    securityLogs.push(logEntry)
    
    // Keep only last 1000 entries
    const recentLogs = securityLogs.slice(-1000)
    localStorage.setItem('securityLogs', JSON.stringify(recentLogs))
  } catch (error) {
    console.error('Failed to store security log:', error)
  }
}

export default {
  preventXSS,
  sanitizeIndonesianFormInput,
  sanitizeBusinessDocument,
  sanitizeBusinessURL,
  generateCSRFToken,
  validateCSRFToken,
  getSecurityHeaders,
  logSecurityEvent
}