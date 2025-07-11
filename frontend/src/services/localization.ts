import { api } from '../config/api'
import { 
  IndonesianBusinessConfig,
  PaymentMethod,
  LocalizationResponse,
  FormatCurrencyRequest,
  CalculateVATRequest,
  ValidateBusinessDataRequest
} from '../types/localization'

export const localizationService = {
  // Get Indonesian business configuration
  async getIndonesianBusinessConfig(): Promise<IndonesianBusinessConfig> {
    const response = await api.get<LocalizationResponse>('/localization/config')
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as IndonesianBusinessConfig
  },

  // Get payment methods
  async getPaymentMethods(includeUnavailable = false, type?: string): Promise<PaymentMethod[]> {
    const params = new URLSearchParams()
    if (includeUnavailable) params.append('includeUnavailable', 'true')
    if (type) params.append('type', type)
    
    const response = await api.get<LocalizationResponse>(
      `/localization/payment-methods?${params.toString()}`
    )
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return (response.data.data as PaymentMethod[]) || []
  },

  // Get popular payment methods
  async getPopularPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await api.get<LocalizationResponse>('/localization/payment-methods/popular')
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return (response.data.data as PaymentMethod[]) || []
  },

  // Get payment method by ID
  async getPaymentMethodById(id: string): Promise<PaymentMethod> {
    const response = await api.get<LocalizationResponse>(`/localization/payment-methods/${id}`)
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as PaymentMethod
  },

  // Format currency
  async formatCurrency(data: FormatCurrencyRequest): Promise<{
    amount: number
    formatted: string
    inWords: string
  }> {
    const response = await api.post<LocalizationResponse>('/localization/format-currency', data)
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as { amount: number; formatted: string; inWords: string }
  },

  // Calculate VAT
  async calculateVAT(data: CalculateVATRequest): Promise<{
    amount: number
    vatAmount: number
    totalWithVAT: number
    vatRate: number
  }> {
    const response = await api.post<LocalizationResponse>('/localization/calculate-vat', data)
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as {
      amount: number
      vatAmount: number
      totalWithVAT: number
      vatRate: number
    }
  },

  // Validate business data
  async validateBusinessData(data: ValidateBusinessDataRequest): Promise<{
    phone: boolean | null
    npwp: boolean | null
    formattedNPWP: string | null
  }> {
    const response = await api.post<LocalizationResponse>('/localization/validate-business-data', data)
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as {
      phone: boolean | null
      npwp: boolean | null
      formattedNPWP: string | null
    }
  },

  // Get Indonesian provinces
  async getIndonesianProvinces(): Promise<string[]> {
    const response = await api.get<LocalizationResponse>('/localization/provinces')
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return (response.data.data as string[]) || []
  },

  // Get document templates
  async getDocumentTemplates(): Promise<{
    templates: {
      invoice: string
      quotation: string
      receipt: string
    }
    termsAndConditions: string[]
  }> {
    const response = await api.get<LocalizationResponse>('/localization/templates')
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as {
      templates: {
        invoice: string
        quotation: string
        receipt: string
      }
      termsAndConditions: string[]
    }
  },

  // Check working day
  async checkWorkingDay(date: string): Promise<{
    date: string
    isWorkingDay: boolean
    isBankHoliday: boolean
    nextWorkingDay: string
  }> {
    const response = await api.get<LocalizationResponse>(`/localization/working-days/check/${date}`)
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as {
      date: string
      isWorkingDay: boolean
      isBankHoliday: boolean
      nextWorkingDay: string
    }
  },

  // Helper functions
  formatIDR: (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  },

  formatIndonesianDate: (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  },

  formatIndonesianDateTime: (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta'
    })
  },

  parseIDRString: (idrString: string): number => {
    return parseFloat(idrString.replace(/[^\d.-]/g, '')) || 0
  },

  getPaymentMethodColor: (type: PaymentMethod['type']): string => {
    switch (type) {
      case 'bank_transfer':
        return 'text-blue-600 bg-blue-50'
      case 'e_wallet':
        return 'text-green-600 bg-green-50'
      case 'credit_card':
        return 'text-purple-600 bg-purple-50'
      case 'cash':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  },

  getPaymentMethodIcon: (type: PaymentMethod['type']): string => {
    switch (type) {
      case 'bank_transfer':
        return '🏦'
      case 'e_wallet':
        return '📱'
      case 'credit_card':
        return '💳'
      case 'cash':
        return '💵'
      default:
        return '💰'
    }
  },

  getPaymentMethodTypeLabel: (type: PaymentMethod['type']): string => {
    switch (type) {
      case 'bank_transfer':
        return 'Transfer Bank'
      case 'e_wallet':
        return 'E-Wallet'
      case 'credit_card':
        return 'Kartu Kredit'
      case 'cash':
        return 'Tunai'
      default:
        return 'Lainnya'
    }
  },

  // Validate Indonesian phone number format
  validateIndonesianPhone: (phone: string): boolean => {
    const patterns = [
      /^(\+62|62)?[0-9]{9,13}$/, // General pattern
      /^(\+62|62)?8[0-9]{8,11}$/, // Mobile numbers
      /^(\+62|62)?[2-9][0-9]{7,10}$/ // Landline numbers
    ]
    
    return patterns.some(pattern => pattern.test(phone.replace(/\s|-/g, '')))
  },

  // Validate Indonesian business license number (NPWP)
  validateNPWP: (npwp: string): boolean => {
    const npwpPattern = /^(\d{2})\.(\d{3})\.(\d{3})\.(\d{1})-(\d{3})\.(\d{3})$/
    return npwpPattern.test(npwp.replace(/\s/g, ''))
  },

  // Format Indonesian business license number (NPWP)
  formatNPWP: (npwp: string): string => {
    const cleanNPWP = npwp.replace(/\D/g, '')
    if (cleanNPWP.length !== 15) {
      return npwp
    }
    return `${cleanNPWP.slice(0, 2)}.${cleanNPWP.slice(2, 5)}.${cleanNPWP.slice(5, 8)}.${cleanNPWP.slice(8, 9)}-${cleanNPWP.slice(9, 12)}.${cleanNPWP.slice(12, 15)}`
  },

  // Filter payment methods
  filterPaymentMethods: (methods: PaymentMethod[], filters: {
    type?: PaymentMethod['type']
    available?: boolean
    popular?: boolean
  }): PaymentMethod[] => {
    return methods.filter(method => {
      if (filters.type && method.type !== filters.type) return false
      if (filters.available !== undefined && method.available !== filters.available) return false
      if (filters.popular !== undefined && method.popularInIndonesia !== filters.popular) return false
      return true
    })
  },

  // Sort payment methods
  sortPaymentMethods: (methods: PaymentMethod[], criteria: 'name' | 'type' | 'popular'): PaymentMethod[] => {
    return [...methods].sort((a, b) => {
      switch (criteria) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'type':
          return a.type.localeCompare(b.type)
        case 'popular':
          return Number(b.popularInIndonesia) - Number(a.popularInIndonesia)
        default:
          return 0
      }
    })
  },

  // Get payment method recommendations
  getPaymentMethodRecommendations: (amount: number): PaymentMethod['type'][] => {
    const recommendations: PaymentMethod['type'][] = []
    
    // For small amounts, recommend e-wallets
    if (amount < 1000000) {
      recommendations.push('e_wallet', 'cash')
    }
    
    // For medium amounts, recommend bank transfers
    if (amount >= 1000000 && amount < 10000000) {
      recommendations.push('bank_transfer', 'e_wallet')
    }
    
    // For large amounts, recommend bank transfers
    if (amount >= 10000000) {
      recommendations.push('bank_transfer')
    }
    
    return recommendations
  },

  // Calculate payment processing fees
  calculatePaymentFees: (amount: number, method: PaymentMethod): number => {
    if (!method.fees) return 0
    
    const { fixed, percentage } = method.fees
    return fixed + (amount * percentage / 100)
  },

  // Get business hours in Indonesian timezone
  getIndonesianBusinessHours: (): {
    open: string
    close: string
    timezone: string
    workingDays: string[]
  } => {
    return {
      open: '09:00',
      close: '17:00',
      timezone: 'Asia/Jakarta',
      workingDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']
    }
  }
}
