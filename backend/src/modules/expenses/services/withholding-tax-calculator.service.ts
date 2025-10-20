import { Injectable } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { WithholdingTaxType } from "@prisma/client";

/**
 * Withholding Tax (PPh) Calculator Service
 * Handles Indonesian income tax withholding calculations
 *
 * PPh Types:
 * - PPh Pasal 23: Services (2% or 15%)
 * - PPh Pasal 4(2): Final tax on specific income
 * - PPh Pasal 15: Specific business activities
 */
@Injectable()
export class WithholdingTaxCalculatorService {
  // Withholding Tax Rates by Type
  private readonly WITHHOLDING_TAX_RATES = {
    // PPh Pasal 23 - Services
    PPH23_RENTAL: 0.02, // 2% for rental services
    PPH23_CONSULTING: 0.02, // 2% for consulting services
    PPH23_TECHNICAL: 0.02, // 2% for technical services
    PPH23_MANAGEMENT: 0.02, // 2% for management services
    PPH23_INTEREST: 0.15, // 15% for interest
    PPH23_DIVIDENDS: 0.15, // 15% for dividends
    PPH23_ROYALTY: 0.15, // 15% for royalty

    // PPh Pasal 4(2) - Final Tax
    PPH4_2_LAND_BUILDING_RENT: 0.1, // 10% for land/building rental
    PPH4_2_CONSTRUCTION: 0.02, // 2%-4% for construction (varies)
    PPH4_2_INTEREST: 0.2, // 20% for interest income (final)

    // PPh Pasal 15 - Specific Activities
    PPH15_AVIATION: 0.018, // 1.8% for aviation
    PPH15_SHIPPING: 0.012, // 1.2% for shipping
  };

  /**
   * Calculate withholding tax amount
   *
   * @param grossAmount - Base amount before withholding
   * @param taxType - Type of withholding tax
   * @param customRate - Optional custom rate (overrides default)
   * @returns Withholding tax amount
   */
  calculateWithholdingTax(
    grossAmount: number | Decimal,
    taxType: WithholdingTaxType,
    customRate?: number,
  ): number {
    const amount =
      typeof grossAmount === "number" ? grossAmount : grossAmount.toNumber();

    if (taxType === WithholdingTaxType.NONE) {
      return 0;
    }

    const rate = customRate ?? this.getDefaultRate(taxType);
    return this.roundToTwoDecimals(amount * rate);
  }

  /**
   * Calculate net payment amount after withholding
   *
   * @param grossAmount - Base amount
   * @param ppnAmount - PPN amount (added to gross)
   * @param withholdingAmount - Withholding tax amount (subtracted)
   * @returns Net payment amount
   */
  calculateNetPayment(
    grossAmount: number | Decimal,
    ppnAmount: number | Decimal,
    withholdingAmount: number | Decimal,
  ): number {
    const gross =
      typeof grossAmount === "number" ? grossAmount : grossAmount.toNumber();
    const ppn =
      typeof ppnAmount === "number" ? ppnAmount : ppnAmount.toNumber();
    const withholding =
      typeof withholdingAmount === "number"
        ? withholdingAmount
        : withholdingAmount.toNumber();

    // Net Payment = Gross + PPN - Withholding
    return this.roundToTwoDecimals(gross + ppn - withholding);
  }

  /**
   * Get default withholding tax rate for a given type
   *
   * @param taxType - Withholding tax type
   * @returns Default rate as decimal
   */
  getDefaultRate(taxType: WithholdingTaxType): number {
    switch (taxType) {
      case WithholdingTaxType.PPH23:
        return this.WITHHOLDING_TAX_RATES.PPH23_CONSULTING; // Default 2%
      case WithholdingTaxType.PPH4_2:
        return this.WITHHOLDING_TAX_RATES.PPH4_2_CONSTRUCTION; // Default 2%
      case WithholdingTaxType.PPH15:
        return this.WITHHOLDING_TAX_RATES.PPH15_AVIATION; // Default 1.8%
      case WithholdingTaxType.NONE:
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Get withholding tax rate by account code (PSAK)
   *
   * @param accountCode - PSAK account code
   * @returns Tax type and rate
   */
  getRateByAccountCode(accountCode: string): {
    type: WithholdingTaxType;
    rate: number;
  } {
    // Office Rent (6-2020) - PPh 4(2) 10%
    if (accountCode === "6-2020") {
      return {
        type: WithholdingTaxType.PPH4_2,
        rate: this.WITHHOLDING_TAX_RATES.PPH4_2_LAND_BUILDING_RENT,
      };
    }

    // Professional Services (6-2070) - PPh 23 2%
    if (accountCode === "6-2070") {
      return {
        type: WithholdingTaxType.PPH23,
        rate: this.WITHHOLDING_TAX_RATES.PPH23_CONSULTING,
      };
    }

    // Consulting (6-2140) - PPh 23 2%
    if (accountCode === "6-2140") {
      return {
        type: WithholdingTaxType.PPH23,
        rate: this.WITHHOLDING_TAX_RATES.PPH23_CONSULTING,
      };
    }

    // Legal (6-2150) - PPh 23 2%
    if (accountCode === "6-2150") {
      return {
        type: WithholdingTaxType.PPH23,
        rate: this.WITHHOLDING_TAX_RATES.PPH23_CONSULTING,
      };
    }

    // Interest Expense (8-1010) - PPh 23 15%
    if (accountCode === "8-1010") {
      return {
        type: WithholdingTaxType.PPH23,
        rate: this.WITHHOLDING_TAX_RATES.PPH23_INTEREST,
      };
    }

    // Sales Commission (6-1020) - PPh 23 2%
    if (accountCode === "6-1020") {
      return {
        type: WithholdingTaxType.PPH23,
        rate: this.WITHHOLDING_TAX_RATES.PPH23_CONSULTING,
      };
    }

    // Default: No withholding
    return { type: WithholdingTaxType.NONE, rate: 0 };
  }

  /**
   * Validate withholding tax calculation
   *
   * @param grossAmount - Base amount
   * @param withholdingAmount - Calculated withholding amount
   * @param taxType - Tax type
   * @param rate - Applied rate
   * @returns Whether the withholding amount is correct
   */
  validateWithholdingCalculation(
    grossAmount: number | Decimal,
    withholdingAmount: number | Decimal,
    taxType: WithholdingTaxType,
    rate: number,
  ): boolean {
    const expectedWithholding = this.calculateWithholdingTax(
      grossAmount,
      taxType,
      rate,
    );
    const actualWithholding =
      typeof withholdingAmount === "number"
        ? withholdingAmount
        : withholdingAmount.toNumber();

    // Allow small rounding differences (< 1 cent)
    return Math.abs(expectedWithholding - actualWithholding) < 0.01;
  }

  /**
   * Calculate full expense breakdown with withholding
   *
   * @param grossAmount - Base amount
   * @param ppnAmount - PPN amount
   * @param taxType - Withholding tax type
   * @param customRate - Optional custom rate
   * @returns Complete breakdown
   */
  calculateExpenseBreakdown(
    grossAmount: number | Decimal,
    ppnAmount: number | Decimal,
    taxType: WithholdingTaxType,
    customRate?: number,
  ) {
    const gross =
      typeof grossAmount === "number" ? grossAmount : grossAmount.toNumber();
    const ppn =
      typeof ppnAmount === "number" ? ppnAmount : ppnAmount.toNumber();

    const withholdingRate = customRate ?? this.getDefaultRate(taxType);
    const withholdingAmount = this.calculateWithholdingTax(
      gross,
      taxType,
      withholdingRate,
    );
    const netPayment = this.calculateNetPayment(gross, ppn, withholdingAmount);
    const totalAmount = gross + ppn;

    return {
      grossAmount: this.roundToTwoDecimals(gross),
      ppnAmount: this.roundToTwoDecimals(ppn),
      withholdingTaxType: taxType,
      withholdingTaxRate: withholdingRate,
      withholdingTaxAmount: this.roundToTwoDecimals(withholdingAmount),
      totalAmount: this.roundToTwoDecimals(totalAmount),
      netPayment: this.roundToTwoDecimals(netPayment),
    };
  }

  /**
   * Generate Bukti Potong number
   * Format: BP-YYYY-NNNNN
   *
   * @param year - Year
   * @param sequence - Sequence number
   * @returns Bukti Potong number
   */
  generateBuktiPotongNumber(year: number, sequence: number): string {
    return `BP-${year}-${sequence.toString().padStart(5, "0")}`;
  }

  /**
   * Check if withholding tax is required for account code
   *
   * @param accountCode - PSAK account code
   * @returns Whether withholding is required
   */
  isWithholdingRequired(accountCode: string): boolean {
    const { type } = this.getRateByAccountCode(accountCode);
    return type !== WithholdingTaxType.NONE;
  }

  /**
   * Format withholding tax rate as percentage string
   *
   * @param rate - Rate as decimal
   * @returns Formatted rate string (e.g., "2%" or "10%")
   */
  formatWithholdingRate(rate: number): string {
    return `${(rate * 100).toFixed(rate >= 0.01 ? 0 : 1)}%`;
  }

  /**
   * Get withholding tax type display name
   *
   * @param type - Withholding tax type
   * @returns Indonesian display name
   */
  getWithholdingTaxTypeName(type: WithholdingTaxType): string {
    switch (type) {
      case WithholdingTaxType.PPH23:
        return "PPh Pasal 23";
      case WithholdingTaxType.PPH4_2:
        return "PPh Pasal 4(2)";
      case WithholdingTaxType.PPH15:
        return "PPh Pasal 15";
      case WithholdingTaxType.NONE:
        return "Tidak Ada";
      default:
        return "Unknown";
    }
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
}
