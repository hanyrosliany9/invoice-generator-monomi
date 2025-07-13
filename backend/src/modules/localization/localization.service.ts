import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TransformationUtil } from "../../common/utils/transformation.util";

export interface PaymentMethod {
  id: string;
  name: string;
  displayName: string;
  type: "bank_transfer" | "e_wallet" | "credit_card" | "cash" | "other";
  provider: string;
  accountNumber?: string;
  accountName?: string;
  instructions: string;
  fees?: {
    fixed: number;
    percentage: number;
  };
  available: boolean;
  popularInIndonesia: boolean;
}

export interface IndonesianBusinessConfig {
  defaultCurrency: string;
  defaultTimezone: string;
  defaultLanguage: string;
  businessRegistrationRequired: boolean;
  vatRate: number;
  materaiThreshold: number;
  paymentTermsOptions: string[];
  bankHolidays: string[];
  workingDays: number[];
}

@Injectable()
export class LocalizationService {
  private readonly config: IndonesianBusinessConfig;
  private readonly paymentMethods: PaymentMethod[];

  constructor(private configService: ConfigService) {
    this.config = {
      defaultCurrency: "IDR",
      defaultTimezone: "Asia/Jakarta",
      defaultLanguage: "id-ID",
      businessRegistrationRequired: true,
      vatRate: 0.11, // 11% PPN
      materaiThreshold: 5000000, // 5 million IDR
      paymentTermsOptions: [
        "Net 7 hari",
        "Net 14 hari",
        "Net 30 hari",
        "Net 60 hari",
        "COD (Cash on Delivery)",
        "Advance Payment",
        "Pembayaran dimuka 50%",
      ],
      bankHolidays: [
        "2024-01-01", // New Year
        "2024-02-10", // Chinese New Year
        "2024-03-29", // Good Friday
        "2024-04-10", // Eid al-Fitr
        "2024-05-01", // Labor Day
        "2024-05-09", // Ascension Day
        "2024-06-01", // Pancasila Day
        "2024-06-17", // Eid al-Adha
        "2024-08-17", // Independence Day
        "2024-12-25", // Christmas
      ],
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
    };

    this.paymentMethods = [
      {
        id: "bca",
        name: "BCA",
        displayName: "Bank Central Asia",
        type: "bank_transfer",
        provider: "BCA",
        accountNumber: this.configService.get("BCA_ACCOUNT_NUMBER", ""),
        accountName: this.configService.get("BCA_ACCOUNT_NAME", ""),
        instructions:
          "Transfer ke rekening BCA berikut dan konfirmasi pembayaran via WhatsApp",
        fees: { fixed: 0, percentage: 0 },
        available: true,
        popularInIndonesia: true,
      },
      {
        id: "mandiri",
        name: "Mandiri",
        displayName: "Bank Mandiri",
        type: "bank_transfer",
        provider: "Mandiri",
        accountNumber: this.configService.get("MANDIRI_ACCOUNT_NUMBER", ""),
        accountName: this.configService.get("MANDIRI_ACCOUNT_NAME", ""),
        instructions:
          "Transfer ke rekening Mandiri berikut dan konfirmasi pembayaran via WhatsApp",
        fees: { fixed: 0, percentage: 0 },
        available: true,
        popularInIndonesia: true,
      },
      {
        id: "bri",
        name: "BRI",
        displayName: "Bank Rakyat Indonesia",
        type: "bank_transfer",
        provider: "BRI",
        accountNumber: this.configService.get("BRI_ACCOUNT_NUMBER", ""),
        accountName: this.configService.get("BRI_ACCOUNT_NAME", ""),
        instructions:
          "Transfer ke rekening BRI berikut dan konfirmasi pembayaran via WhatsApp",
        fees: { fixed: 0, percentage: 0 },
        available: true,
        popularInIndonesia: true,
      },
      {
        id: "bni",
        name: "BNI",
        displayName: "Bank Negara Indonesia",
        type: "bank_transfer",
        provider: "BNI",
        accountNumber: this.configService.get("BNI_ACCOUNT_NUMBER", ""),
        accountName: this.configService.get("BNI_ACCOUNT_NAME", ""),
        instructions:
          "Transfer ke rekening BNI berikut dan konfirmasi pembayaran via WhatsApp",
        fees: { fixed: 0, percentage: 0 },
        available: true,
        popularInIndonesia: true,
      },
      {
        id: "gopay",
        name: "GoPay",
        displayName: "GoPay",
        type: "e_wallet",
        provider: "Gojek",
        accountNumber: this.configService.get("GOPAY_PHONE_NUMBER", ""),
        instructions:
          "Transfer via GoPay ke nomor berikut dan screenshot bukti pembayaran",
        fees: { fixed: 0, percentage: 0 },
        available: true,
        popularInIndonesia: true,
      },
      {
        id: "ovo",
        name: "OVO",
        displayName: "OVO",
        type: "e_wallet",
        provider: "OVO",
        accountNumber: this.configService.get("OVO_PHONE_NUMBER", ""),
        instructions:
          "Transfer via OVO ke nomor berikut dan screenshot bukti pembayaran",
        fees: { fixed: 0, percentage: 0 },
        available: true,
        popularInIndonesia: true,
      },
      {
        id: "dana",
        name: "DANA",
        displayName: "DANA",
        type: "e_wallet",
        provider: "DANA",
        accountNumber: this.configService.get("DANA_PHONE_NUMBER", ""),
        instructions:
          "Transfer via DANA ke nomor berikut dan screenshot bukti pembayaran",
        fees: { fixed: 0, percentage: 0 },
        available: true,
        popularInIndonesia: true,
      },
      {
        id: "cash",
        name: "Cash",
        displayName: "Tunai",
        type: "cash",
        provider: "Manual",
        instructions: "Pembayaran tunai saat pengiriman atau di kantor",
        fees: { fixed: 0, percentage: 0 },
        available: true,
        popularInIndonesia: true,
      },
    ];
  }

  /**
   * Get Indonesian business configuration
   */
  getIndonesianBusinessConfig(): IndonesianBusinessConfig {
    return { ...this.config };
  }

  /**
   * Get available payment methods
   */
  getPaymentMethods(includeUnavailable = false): PaymentMethod[] {
    return this.paymentMethods.filter(
      (method) => includeUnavailable || method.available,
    );
  }

  /**
   * Get popular payment methods in Indonesia
   */
  getPopularPaymentMethods(): PaymentMethod[] {
    return this.paymentMethods.filter(
      (method) => method.popularInIndonesia && method.available,
    );
  }

  /**
   * Get payment method by ID
   */
  getPaymentMethodById(id: string): PaymentMethod | undefined {
    return this.paymentMethods.find((method) => method.id === id);
  }

  /**
   * Get payment methods by type
   */
  getPaymentMethodsByType(type: PaymentMethod["type"]): PaymentMethod[] {
    return this.paymentMethods.filter(
      (method) => method.type === type && method.available,
    );
  }

  /**
   * Format currency for Indonesian display
   */
  formatCurrency(amount: number): string {
    return TransformationUtil.formatIDR(amount);
  }

  /**
   * Format amount in Indonesian words
   */
  formatAmountInWords(amount: number): string {
    return TransformationUtil.formatAmountInWords(amount);
  }

  /**
   * Format Indonesian date
   */
  formatDate(date: Date): string {
    return TransformationUtil.formatIndonesianDate(date);
  }

  /**
   * Format Indonesian date and time
   */
  formatDateTime(date: Date): string {
    return TransformationUtil.formatIndonesianDateTime(date);
  }

  /**
   * Calculate VAT for Indonesian business
   */
  calculateVAT(amount: number): number {
    return TransformationUtil.calculateVAT(amount, this.config.vatRate);
  }

  /**
   * Calculate total with VAT
   */
  calculateTotalWithVAT(amount: number): number {
    return TransformationUtil.calculateTotalWithVAT(
      amount,
      this.config.vatRate,
    );
  }

  /**
   * Check if date is Indonesian bank holiday
   */
  isIndonesianBankHoliday(date: Date): boolean {
    const dateStr = date.toISOString().split("T")[0];
    return this.config.bankHolidays.includes(dateStr);
  }

  /**
   * Check if date is working day in Indonesia
   */
  isWorkingDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return (
      this.config.workingDays.includes(dayOfWeek) &&
      !this.isIndonesianBankHoliday(date)
    );
  }

  /**
   * Get next working day in Indonesia
   */
  getNextWorkingDay(date: Date): Date {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    if (this.isWorkingDay(nextDay)) {
      return nextDay;
    }

    return this.getNextWorkingDay(nextDay);
  }

  /**
   * Calculate payment due date based on terms
   */
  calculatePaymentDueDate(invoiceDate: Date, paymentTerms: string): Date {
    const dueDate = new Date(invoiceDate);

    // Extract number of days from payment terms
    const daysMatch = paymentTerms.match(/\d+/);
    if (daysMatch) {
      const days = parseInt(daysMatch[0]);
      dueDate.setDate(dueDate.getDate() + days);
    } else if (paymentTerms.toLowerCase().includes("cod")) {
      // COD - same day
      return dueDate;
    } else {
      // Default to 30 days
      dueDate.setDate(dueDate.getDate() + 30);
    }

    // If due date falls on non-working day, move to next working day
    if (!this.isWorkingDay(dueDate)) {
      return this.getNextWorkingDay(dueDate);
    }

    return dueDate;
  }

  /**
   * Validate Indonesian phone number
   */
  validateIndonesianPhone(phone: string): boolean {
    return TransformationUtil.isValidIndonesianPhone(phone);
  }

  /**
   * Validate Indonesian business license (NPWP)
   */
  validateNPWP(npwp: string): boolean {
    return TransformationUtil.isValidNPWP(npwp);
  }

  /**
   * Format Indonesian business license (NPWP)
   */
  formatNPWP(npwp: string): string {
    return TransformationUtil.formatNPWP(npwp);
  }

  /**
   * Generate invoice number with Indonesian format
   */
  generateInvoiceNumber(sequence: number): string {
    return TransformationUtil.generateIndonesianReference("invoice", sequence);
  }

  /**
   * Generate quotation number with Indonesian format
   */
  generateQuotationNumber(sequence: number): string {
    return TransformationUtil.generateIndonesianReference(
      "quotation",
      sequence,
    );
  }

  /**
   * Get Indonesian business document templates
   */
  getDocumentTemplates(): {
    invoice: string;
    quotation: string;
    receipt: string;
  } {
    return {
      invoice:
        "Terima kasih atas kepercayaan Anda untuk menggunakan layanan kami.",
      quotation:
        "Penawaran ini berlaku selama 30 hari sejak tanggal penawaran.",
      receipt: "Bukti pembayaran ini sah dan berlaku sebagai tanda terima.",
    };
  }

  /**
   * Get Indonesian business terms and conditions
   */
  getTermsAndConditions(): string[] {
    return [
      "Pembayaran dilakukan sesuai dengan metode yang telah disepakati.",
      "Faktur yang telah jatuh tempo akan dikenakan denda keterlambatan.",
      "Semua pajak dan biaya administrasi ditanggung oleh pihak yang bersangkutan.",
      "Dokumen ini sah dan berlaku tanpa tanda tangan basah.",
      "Untuk invoice di atas 5 juta rupiah, wajib menggunakan materai.",
      "Komplain atau pertanyaan dapat disampaikan melalui kontak yang tersedia.",
    ];
  }

  /**
   * Get Indonesian business address format
   */
  formatIndonesianAddress(address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country?: string;
  }): string {
    return `${address.street}, ${address.city}, ${address.province} ${address.postalCode}${address.country ? ", " + address.country : ""}`;
  }

  /**
   * Get Indonesian provinces
   */
  getIndonesianProvinces(): string[] {
    return [
      "DKI Jakarta",
      "Jawa Barat",
      "Jawa Tengah",
      "Jawa Timur",
      "Banten",
      "Yogyakarta",
      "Bali",
      "Sumatera Utara",
      "Sumatera Barat",
      "Sumatera Selatan",
      "Lampung",
      "Riau",
      "Jambi",
      "Bengkulu",
      "Aceh",
      "Kalimantan Barat",
      "Kalimantan Tengah",
      "Kalimantan Selatan",
      "Kalimantan Timur",
      "Kalimantan Utara",
      "Sulawesi Utara",
      "Sulawesi Tengah",
      "Sulawesi Selatan",
      "Sulawesi Tenggara",
      "Gorontalo",
      "Sulawesi Barat",
      "Maluku",
      "Maluku Utara",
      "Papua",
      "Papua Barat",
      "Papua Selatan",
      "Papua Tengah",
      "Papua Pegunungan",
      "Nusa Tenggara Barat",
      "Nusa Tenggara Timur",
    ];
  }
}
