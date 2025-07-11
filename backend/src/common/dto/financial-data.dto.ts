import { Transform } from 'class-transformer'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Custom transformer for financial data
 * Converts string inputs to Decimal for database storage
 */
export const FinancialTransform = () => {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      // Remove currency formatting and convert to number
      const cleaned = value.replace(/[^\d.-]/g, '')
      return parseFloat(cleaned) || 0
    }
    if (typeof value === 'number') {
      return value
    }
    return 0
  })
}

