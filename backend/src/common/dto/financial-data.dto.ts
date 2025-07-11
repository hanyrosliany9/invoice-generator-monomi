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

/**
 * Utility class for financial data transformations
 */
export class FinancialDataUtil {
  /**
   * Convert Decimal to formatted string for API responses
   */
  static toResponseString(decimal: Decimal | number | null | undefined): string {
    if (!decimal) return '0.00'
    const value = typeof decimal === 'number' ? decimal : Number(decimal)
    return value.toFixed(2)
  }

  /**
   * Convert Decimal to Indonesian Rupiah format
   */
  static toIDRString(decimal: Decimal | number | null | undefined): string {
    if (!decimal) return 'Rp 0'
    const value = typeof decimal === 'number' ? decimal : Number(decimal)
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  /**
   * Parse string input to number for database storage
   */
  static fromString(value: string | number): number {
    if (typeof value === 'number') return value
    const cleaned = value.replace(/[^\d.-]/g, '')
    return parseFloat(cleaned) || 0
  }

  /**
   * Validate financial amount
   */
  static isValidAmount(amount: any): boolean {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return !isNaN(num) && num >= 0 && num <= 999999999999.99
  }

  /**
   * Calculate percentage
   */
  static calculatePercentage(part: Decimal | number, total: Decimal | number): number {
    const partNum = typeof part === 'number' ? part : Number(part)
    const totalNum = typeof total === 'number' ? total : Number(total)
    
    if (totalNum === 0) return 0
    return Math.round((partNum / totalNum) * 100)
  }

  /**
   * Check if amount requires materai (Indonesian stamp duty)
   */
  static requiresMaterai(amount: Decimal | number, threshold: number = 5000000): boolean {
    const value = typeof amount === 'number' ? amount : Number(amount)
    return value > threshold
  }

  /**
   * Calculate tax amount (if needed for future VAT implementation)
   */
  static calculateTax(amount: Decimal | number, taxRate: number = 0.11): number {
    const value = typeof amount === 'number' ? amount : Number(amount)
    return Math.round(value * taxRate)
  }

  /**
   * Round to nearest Rupiah (no decimals)
   */
  static roundToRupiah(amount: Decimal | number): number {
    const value = typeof amount === 'number' ? amount : Number(amount)
    return Math.round(value)
  }

  /**
   * Format amount for database storage (2 decimal places)
   */
  static formatForDatabase(amount: any): number {
    const num = this.fromString(amount)
    return Math.round(num * 100) / 100 // Round to 2 decimal places
  }
}