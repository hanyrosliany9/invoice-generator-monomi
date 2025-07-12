// Test Setup Configuration for Business Journey Components
// Enhanced testing environment for Indonesian business system

import { vi } from 'vitest'
import 'jest-axe/extend-expect'

// Mock IntersectionObserver for virtualization tests
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: []
}))

// Mock ResizeObserver for responsive tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock scrollTo for virtualization
window.scrollTo = vi.fn()

// Setup environment variables for testing
process.env.REACT_APP_COMPANY_NAME = 'Monomi Test'
process.env.NODE_ENV = 'test'

// Mock console methods for cleaner test output
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn()
}

// Mock clipboard API for sharing tests
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve(''))
  }
})

// Mock geolocation for Indonesian timezone tests
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn((success) => 
      success({
        coords: {
          latitude: -6.2088,  // Jakarta coordinates
          longitude: 106.8456
        }
      })
    )
  }
})

// Setup Indonesian locale for testing
Object.defineProperty(navigator, 'language', {
  value: 'id-ID'
})

Object.defineProperty(navigator, 'languages', {
  value: ['id-ID', 'id', 'en-US']
})

// Mock crypto for UUID generation in tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => '12345678-1234-1234-1234-123456789012'
  }
})

// Setup timezone for Indonesian business hours testing
process.env.TZ = 'Asia/Jakarta'

// Mock URL for WhatsApp sharing tests
global.URL.createObjectURL = vi.fn(() => 'blob:test-url')
global.URL.revokeObjectURL = vi.fn()

// Extend expect with custom matchers for Indonesian business logic
expect.extend({
  toBeValidIDR(received) {
    const idrPattern = /^Rp\s[\d.,]+$/
    const pass = idrPattern.test(received)
    
    return {
      message: () => 
        pass
          ? `Expected ${received} not to be valid IDR format`
          : `Expected ${received} to be valid IDR format`,
      pass,
    }
  },
  
  toHaveMateraiCompliance(received, amount) {
    const pass = amount >= 5000000 ? received.materaiRequired : !received.materaiRequired
    
    return {
      message: () =>
        pass
          ? `Expected materai compliance to be incorrect for amount ${amount}`
          : `Expected materai compliance to be correct for amount ${amount}`,
      pass,
    }
  },
  
  toBeAccessibleElement(received) {
    const hasAriaLabel = received.hasAttribute('aria-label')
    const hasRole = received.hasAttribute('role')
    const hasTabIndex = received.hasAttribute('tabindex') || received.tabIndex >= 0
    
    const pass = hasAriaLabel || hasRole || hasTabIndex
    
    return {
      message: () =>
        pass
          ? `Expected element to not be accessible`
          : `Expected element to have accessibility attributes (aria-label, role, or tabindex)`,
      pass,
    }
  }
})

// Add TypeScript declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidIDR(): R
      toHaveMateraiCompliance(amount: number): R
      toBeAccessibleElement(): R
    }
  }
}