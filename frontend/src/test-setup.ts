import '@testing-library/jest-dom'

// Add jest-axe matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R
    }
  }
}