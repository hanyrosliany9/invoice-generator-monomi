import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PPNCategory } from '@prisma/client';

/**
 * PPN (Pajak Pertambahan Nilai) Calculator Service
 * Handles Indonesian VAT calculations according to 2025 tax regulations
 *
 * PPN Rate: 12% (effective 11% for non-luxury goods as of January 1, 2025)
 */
@Injectable()
export class PPNCalculatorService {
  // PPN Rates as of January 2025
  private readonly PPN_RATES = {
    STANDARD: 0.12,    // 12% statutory rate
    EFFECTIVE: 0.11,   // 11% effective rate for non-luxury goods
    LUXURY: 0.12,      // 12% for luxury goods (no reduction)
    EXPORT: 0.00,      // 0% for exports
  };

  /**
   * Calculate PPN amount based on gross amount and luxury goods flag
   *
   * @param grossAmount - Base amount before PPN (DPP - Dasar Pengenaan Pajak)
   * @param isLuxuryGoods - Whether the item is classified as luxury goods
   * @returns PPN amount to be added
   */
  calculatePPN(grossAmount: number | Decimal, isLuxuryGoods: boolean = false): number {
    const amount = typeof grossAmount === 'number' ? grossAmount : grossAmount.toNumber();

    if (isLuxuryGoods) {
      // Luxury goods: Full 12%
      return this.roundToTwoDecimals(amount * this.PPN_RATES.LUXURY);
    }

    // Non-luxury: Effective 11% (DPP × 11/12 × 12% = DPP × 11%)
    return this.roundToTwoDecimals(amount * this.PPN_RATES.EFFECTIVE);
  }

  /**
   * Calculate total amount including PPN
   *
   * @param grossAmount - Base amount before PPN
   * @param isLuxuryGoods - Whether the item is classified as luxury goods
   * @returns Total amount (gross + PPN)
   */
  calculateTotalWithPPN(grossAmount: number | Decimal, isLuxuryGoods: boolean = false): number {
    const amount = typeof grossAmount === 'number' ? grossAmount : grossAmount.toNumber();
    const ppn = this.calculatePPN(amount, isLuxuryGoods);
    return this.roundToTwoDecimals(amount + ppn);
  }

  /**
   * Extract gross amount from total that includes PPN
   * (Reverse calculation)
   *
   * @param totalAmount - Total amount including PPN
   * @param isLuxuryGoods - Whether the item is classified as luxury goods
   * @returns Base amount (DPP) before PPN
   */
  extractGrossFromTotal(totalAmount: number | Decimal, isLuxuryGoods: boolean = false): number {
    const total = typeof totalAmount === 'number' ? totalAmount : totalAmount.toNumber();
    const rate = isLuxuryGoods ? this.PPN_RATES.LUXURY : this.PPN_RATES.EFFECTIVE;

    // Formula: DPP = Total / (1 + rate)
    return this.roundToTwoDecimals(total / (1 + rate));
  }

  /**
   * Get applicable PPN rate based on luxury goods flag
   *
   * @param isLuxuryGoods - Whether the item is classified as luxury goods
   * @returns PPN rate as decimal (0.11 or 0.12)
   */
  getPPNRate(isLuxuryGoods: boolean = false): number {
    return isLuxuryGoods ? this.PPN_RATES.LUXURY : this.PPN_RATES.EFFECTIVE;
  }

  /**
   * Check if PPN is creditable based on category
   *
   * @param category - PPN category
   * @returns Whether PPN can be credited against output VAT
   */
  isCreditablePPN(category: PPNCategory): boolean {
    return category === PPNCategory.CREDITABLE;
  }

  /**
   * Validate PPN calculation
   *
   * @param grossAmount - Base amount
   * @param ppnAmount - Calculated PPN amount
   * @param isLuxuryGoods - Luxury goods flag
   * @returns Whether the PPN amount is correctly calculated
   */
  validatePPNCalculation(
    grossAmount: number | Decimal,
    ppnAmount: number | Decimal,
    isLuxuryGoods: boolean = false,
  ): boolean {
    const expectedPPN = this.calculatePPN(grossAmount, isLuxuryGoods);
    const actualPPN = typeof ppnAmount === 'number' ? ppnAmount : ppnAmount.toNumber();

    // Allow small rounding differences (< 1 cent)
    return Math.abs(expectedPPN - actualPPN) < 0.01;
  }

  /**
   * Calculate breakdown of amounts
   *
   * @param grossAmount - Base amount before PPN
   * @param isLuxuryGoods - Luxury goods flag
   * @returns Object with all calculated amounts
   */
  calculateBreakdown(grossAmount: number | Decimal, isLuxuryGoods: boolean = false) {
    const amount = typeof grossAmount === 'number' ? grossAmount : grossAmount.toNumber();
    const ppnRate = this.getPPNRate(isLuxuryGoods);
    const ppnAmount = this.calculatePPN(amount, isLuxuryGoods);
    const totalAmount = amount + ppnAmount;

    return {
      grossAmount: this.roundToTwoDecimals(amount),
      ppnRate,
      ppnAmount: this.roundToTwoDecimals(ppnAmount),
      totalAmount: this.roundToTwoDecimals(totalAmount),
      isLuxuryGoods,
    };
  }

  /**
   * Round number to 2 decimal places (IDR cents)
   *
   * @param value - Number to round
   * @returns Rounded number
   */
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Format PPN rate as percentage string
   *
   * @param isLuxuryGoods - Luxury goods flag
   * @returns Formatted rate string (e.g., "11%" or "12%")
   */
  formatPPNRate(isLuxuryGoods: boolean = false): string {
    const rate = this.getPPNRate(isLuxuryGoods);
    return `${(rate * 100).toFixed(0)}%`;
  }

  /**
   * Determine PPN category based on expense type
   *
   * @param accountCode - PSAK account code
   * @param isTaxDeductible - Whether expense is tax deductible
   * @returns Suggested PPN category
   */
  suggestPPNCategory(accountCode: string, isTaxDeductible: boolean): PPNCategory {
    // Non-deductible expenses typically have non-creditable PPN
    if (!isTaxDeductible) {
      return PPNCategory.NON_CREDITABLE;
    }

    // Entertainment and personal expenses (6-2170, 6-2180) - non-creditable
    if (accountCode === '6-2170' || accountCode === '6-2180') {
      return PPNCategory.NON_CREDITABLE;
    }

    // Salaries and non-cash expenses - exempt
    if (accountCode === '6-1010' || accountCode === '6-2010' || accountCode === '6-2100') {
      return PPNCategory.EXEMPT;
    }

    // Default: creditable for business expenses
    return PPNCategory.CREDITABLE;
  }
}
