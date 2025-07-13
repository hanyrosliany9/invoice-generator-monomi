import { Decimal } from "@prisma/client/runtime/library";

export class TransformationUtil {
  /**
   * Convert Prisma Decimal to string for API responses
   */
  static decimalToString(decimal: Decimal | null | undefined): string {
    if (!decimal) return "0";
    return decimal.toString();
  }

  /**
   * Convert Date to ISO string for API responses
   */
  static dateToString(date: Date | null | undefined): string | undefined {
    if (!date) return undefined;
    return date.toISOString();
  }

  /**
   * Remove sensitive fields from user object
   */
  static sanitizeUser(user: any) {
    if (!user) return user;
    const { password, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Calculate days between two dates
   */
  static daysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if invoice requires materai (Indonesian stamp duty)
   */
  static requiresMaterai(
    amount: Decimal | number,
    threshold: number = 5000000,
  ): boolean {
    const numAmount = typeof amount === "number" ? amount : Number(amount);
    return numAmount > threshold;
  }

  /**
   * Format Indonesian Rupiah amount
   */
  static formatIDR(amount: Decimal | number | string): string {
    const numAmount =
      typeof amount === "string" ? parseFloat(amount) : Number(amount);
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  }

  /**
   * Validate Indonesian phone number format
   */
  static isValidIndonesianPhone(phone: string): boolean {
    // Indonesian phone number patterns
    const patterns = [
      /^(\+62|62)?[0-9]{9,13}$/, // General pattern
      /^(\+62|62)?8[0-9]{8,11}$/, // Mobile numbers
      /^(\+62|62)?[2-9][0-9]{7,10}$/, // Landline numbers
    ];

    return patterns.some((pattern) => pattern.test(phone.replace(/\s|-/g, "")));
  }

  /**
   * Generate invoice/quotation number
   */
  static generateNumber(prefix: string, lastNumber: number): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const sequence = String(lastNumber + 1).padStart(4, "0");
    return `${prefix}${year}${month}${sequence}`;
  }

  /**
   * Format Indonesian date
   */
  static formatIndonesianDate(date: Date): string {
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  /**
   * Format Indonesian date and time
   */
  static formatIndonesianDateTime(date: Date): string {
    return date.toLocaleString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    });
  }

  /**
   * Parse Indonesian currency string to number
   */
  static parseIDRString(idrString: string): number {
    return parseFloat(idrString.replace(/[^\d.-]/g, "")) || 0;
  }

  /**
   * Calculate VAT (PPN) for Indonesian business
   */
  static calculateVAT(amount: number, vatRate: number = 0.11): number {
    return amount * vatRate;
  }

  /**
   * Calculate total with VAT
   */
  static calculateTotalWithVAT(amount: number, vatRate: number = 0.11): number {
    return amount + this.calculateVAT(amount, vatRate);
  }

  /**
   * Validate Indonesian business license number (NPWP)
   */
  static isValidNPWP(npwp: string): boolean {
    // Indonesian NPWP format: XX.XXX.XXX.X-XXX.XXX
    const npwpPattern = /^(\d{2})\.(\d{3})\.(\d{3})\.(\d{1})-(\d{3})\.(\d{3})$/;
    return npwpPattern.test(npwp.replace(/\s/g, ""));
  }

  /**
   * Format Indonesian business license number (NPWP)
   */
  static formatNPWP(npwp: string): string {
    const cleanNPWP = npwp.replace(/\D/g, "");
    if (cleanNPWP.length !== 15) {
      return npwp;
    }
    return `${cleanNPWP.slice(0, 2)}.${cleanNPWP.slice(2, 5)}.${cleanNPWP.slice(5, 8)}.${cleanNPWP.slice(8, 9)}-${cleanNPWP.slice(9, 12)}.${cleanNPWP.slice(12, 15)}`;
  }

  /**
   * Generate Indonesian business document reference
   */
  static generateIndonesianReference(
    type: "invoice" | "quotation" | "receipt",
    sequence: number,
  ): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const seq = String(sequence).padStart(4, "0");

    const prefixes = {
      invoice: "INV",
      quotation: "QUO",
      receipt: "RCP",
    };

    return `${prefixes[type]}/${year}/${month}/${seq}`;
  }

  /**
   * Convert number to Indonesian words (for invoice amounts)
   */
  static numberToIndonesianWords(num: number): string {
    if (num === 0) return "nol";

    const ones = [
      "",
      "satu",
      "dua",
      "tiga",
      "empat",
      "lima",
      "enam",
      "tujuh",
      "delapan",
      "sembilan",
    ];
    const teens = [
      "sepuluh",
      "sebelas",
      "dua belas",
      "tiga belas",
      "empat belas",
      "lima belas",
      "enam belas",
      "tujuh belas",
      "delapan belas",
      "sembilan belas",
    ];
    const tens = [
      "",
      "",
      "dua puluh",
      "tiga puluh",
      "empat puluh",
      "lima puluh",
      "enam puluh",
      "tujuh puluh",
      "delapan puluh",
      "sembilan puluh",
    ];
    const scales = ["", "ribu", "juta", "miliar", "triliun"];

    if (num < 0) return "minus " + this.numberToIndonesianWords(-num);
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100)
      return (
        tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "")
      );
    if (num < 1000)
      return (
        ones[Math.floor(num / 100)] +
        " ratus" +
        (num % 100 ? " " + this.numberToIndonesianWords(num % 100) : "")
      );

    for (let i = 0; i < scales.length; i++) {
      const scale = Math.pow(1000, i + 1);
      if (num < scale) {
        const quotient = Math.floor(num / Math.pow(1000, i));
        const remainder = num % Math.pow(1000, i);
        return (
          this.numberToIndonesianWords(quotient) +
          " " +
          scales[i] +
          (remainder ? " " + this.numberToIndonesianWords(remainder) : "")
        );
      }
    }

    return num.toString(); // fallback for very large numbers
  }

  /**
   * Format amount in Indonesian words with currency
   */
  static formatAmountInWords(amount: number): string {
    const words = this.numberToIndonesianWords(Math.floor(amount));
    return `${words} rupiah`;
  }

  /**
   * Get Indonesian timezone offset
   */
  static getIndonesianTimezone(): string {
    return "Asia/Jakarta";
  }

  /**
   * Convert UTC date to Indonesian timezone
   */
  static toIndonesianTime(date: Date): Date {
    return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  }
}
