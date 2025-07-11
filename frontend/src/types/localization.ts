export interface IndonesianBusinessConfig {
  defaultCurrency: string
  defaultTimezone: string
  defaultLanguage: string
  businessRegistrationRequired: boolean
  vatRate: number
  materaiThreshold: number
  paymentTermsOptions: string[]
  bankHolidays: string[]
  workingDays: number[]
}

export interface PaymentMethod {
  id: string
  name: string
  displayName: string
  type: 'bank_transfer' | 'e_wallet' | 'credit_card' | 'cash' | 'other'
  provider: string
  accountNumber?: string
  accountName?: string
  instructions: string
  fees?: {
    fixed: number
    percentage: number
  }
  available: boolean
  popularInIndonesia: boolean
}

export interface LocalizationResponse {
  data: IndonesianBusinessConfig | PaymentMethod[] | PaymentMethod | any
  message: string
  status: 'success' | 'error'
}

export interface FormatCurrencyRequest {
  amount: number
}

export interface CalculateVATRequest {
  amount: number
}

export interface ValidateBusinessDataRequest {
  phone?: string
  npwp?: string
}

export interface PaymentMethodFilters {
  type?: PaymentMethod['type']
  available?: boolean
  popular?: boolean
}

export interface IndonesianAddress {
  street: string
  city: string
  province: string
  postalCode: string
  country?: string
}

export interface BusinessHours {
  open: string
  close: string
  timezone: string
  workingDays: string[]
}

export interface CurrencyFormat {
  amount: number
  formatted: string
  inWords: string
}

export interface VATCalculation {
  amount: number
  vatAmount: number
  totalWithVAT: number
  vatRate: number
}

export interface BusinessDataValidation {
  phone: boolean | null
  npwp: boolean | null
  formattedNPWP: string | null
}

export interface WorkingDayCheck {
  date: string
  isWorkingDay: boolean
  isBankHoliday: boolean
  nextWorkingDay: string
}

export interface DocumentTemplates {
  templates: {
    invoice: string
    quotation: string
    receipt: string
  }
  termsAndConditions: string[]
}
