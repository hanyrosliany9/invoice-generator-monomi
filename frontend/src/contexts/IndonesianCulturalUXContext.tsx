// Indonesian Cultural UX Context - Indonesian Business Management System
// Cultural adaptations and UX patterns for Indonesian business workflows

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

// Indonesian cultural preferences
export interface IndonesianCulturalPreferences {
  // Language and communication
  languageFormality: 'formal' | 'informal' | 'mixed'
  communicationStyle: 'direct' | 'indirect' | 'hierarchical'
  useHonorificTitles: boolean
  bahasaIndonesiaCompliance: boolean

  // Business etiquette
  businessHierarchy: 'strict' | 'moderate' | 'flat'
  meetingCulture: 'punctual' | 'flexible' | 'relationship-first'
  decisionMaking: 'consensus' | 'hierarchical' | 'individual'

  // Visual and design preferences
  colorPalette: 'traditional' | 'modern' | 'mixed'
  useIndonesianSymbols: boolean
  dateTimeFormat: 'indonesian' | 'international' | 'mixed'
  currencyDisplay: 'full' | 'abbreviated' | 'symbol-only'

  // Technology preferences
  whatsappIntegrationLevel: 'basic' | 'enhanced' | 'full'
  mobileFirst: boolean
  offlineSupport: boolean
  internetSpeedOptimization: boolean

  // Regional considerations
  region:
    | 'jakarta'
    | 'jawa'
    | 'sumatera'
    | 'kalimantan'
    | 'sulawesi'
    | 'papua'
    | 'bali_ntt_ntb'
    | 'maluku'
    | 'general'
  timezone: string
  localBusinessPractices: boolean
}

// Indonesian business workflow patterns
export interface IndonesianBusinessWorkflow {
  quotationApprovalFlow: 'simple' | 'hierarchical' | 'collaborative'
  invoiceProcessing: 'immediate' | 'batched' | 'approval-based'
  materaiHandling: 'automatic' | 'manual' | 'smart-suggestion'
  paymentReminders: 'gentle' | 'formal' | 'persistent'
  clientCommunication: 'whatsapp-first' | 'email-first' | 'mixed'
}

// Indonesian cultural messages and texts
export interface IndonesianCulturalMessages {
  greetings: {
    morning: string
    afternoon: string
    evening: string
    formal: string
    informal: string
  }
  businessPhrases: {
    quotationSubject: string
    invoiceReminder: string
    paymentRequest: string
    thankYou: string
    apology: string
    followUp: string
  }
  honorifics: {
    male: string[]
    female: string[]
    general: string[]
    business: string[]
  }
  culturalNotes: {
    ramadanConsiderations: string[]
    businessHours: string[]
    nationalHolidays: string[]
    regionalCustoms: string[]
  }
}

// Indonesian UX patterns
export interface IndonesianUXPatterns {
  navigationStyle: 'breadcrumb-heavy' | 'tab-based' | 'sidebar'
  formInteraction: 'step-by-step' | 'single-page' | 'modal-based'
  dataVisualization: 'table-heavy' | 'chart-heavy' | 'mixed'
  actionConfirmation: 'explicit' | 'implicit' | 'smart'
  errorHandling: 'gentle' | 'direct' | 'explanatory'
}

// Context interface
export interface IndonesianCulturalUXContextType {
  preferences: IndonesianCulturalPreferences
  workflow: IndonesianBusinessWorkflow
  messages: IndonesianCulturalMessages
  uxPatterns: IndonesianUXPatterns

  // Actions
  updatePreferences: (
    preferences: Partial<IndonesianCulturalPreferences>
  ) => void
  updateWorkflow: (workflow: Partial<IndonesianBusinessWorkflow>) => void

  // Helpers
  formatCurrency: (
    amount: number,
    style?: 'full' | 'abbreviated' | 'symbol-only'
  ) => string
  formatDateTime: (
    date: Date,
    style?: 'indonesian' | 'international' | 'mixed'
  ) => string
  getGreeting: (
    timeOfDay?: 'morning' | 'afternoon' | 'evening',
    formal?: boolean
  ) => string
  getHonorific: (
    gender?: 'male' | 'female',
    context?: 'business' | 'general'
  ) => string
  getBusinessPhrase: (
    type: keyof IndonesianCulturalMessages['businessPhrases'],
    context?: any
  ) => string

  // WhatsApp integration helpers
  formatWhatsAppMessage: (template: string, data: Record<string, any>) => string
  getWhatsAppBusinessTemplate: (
    type: 'quotation' | 'invoice' | 'reminder' | 'follow-up'
  ) => string

  // Cultural validation
  validateBusinessEtiquette: (
    action: string,
    context: any
  ) => { valid: boolean; suggestions: string[] }
  getCulturalRecommendations: () => string[]
}

// Default cultural preferences
const DEFAULT_PREFERENCES: IndonesianCulturalPreferences = {
  languageFormality: 'formal',
  communicationStyle: 'hierarchical',
  useHonorificTitles: true,
  bahasaIndonesiaCompliance: true,
  businessHierarchy: 'moderate',
  meetingCulture: 'relationship-first',
  decisionMaking: 'consensus',
  colorPalette: 'mixed',
  useIndonesianSymbols: true,
  dateTimeFormat: 'indonesian',
  currencyDisplay: 'full',
  whatsappIntegrationLevel: 'enhanced',
  mobileFirst: true,
  offlineSupport: true,
  internetSpeedOptimization: true,
  region: 'general',
  timezone: 'Asia/Jakarta',
  localBusinessPractices: true,
}

// Default workflow patterns
const DEFAULT_WORKFLOW: IndonesianBusinessWorkflow = {
  quotationApprovalFlow: 'hierarchical',
  invoiceProcessing: 'approval-based',
  materaiHandling: 'smart-suggestion',
  paymentReminders: 'gentle',
  clientCommunication: 'whatsapp-first',
}

// Indonesian cultural messages
const INDONESIAN_MESSAGES: IndonesianCulturalMessages = {
  greetings: {
    morning: 'Selamat pagi',
    afternoon: 'Selamat siang',
    evening: 'Selamat malam',
    formal: 'Selamat pagi/siang/malam, Bapak/Ibu',
    informal: 'Halo',
  },
  businessPhrases: {
    quotationSubject: 'Penawaran Harga untuk {{projectName}} - {{companyName}}',
    invoiceReminder:
      'Pengingat Invoice #{{invoiceNumber}} - Jatuh Tempo {{dueDate}}',
    paymentRequest:
      'Mohon konfirmasi pembayaran untuk Invoice #{{invoiceNumber}}',
    thankYou: 'Terima kasih atas kepercayaan Bapak/Ibu kepada kami',
    apology: 'Mohon maaf atas ketidaknyamanan yang terjadi',
    followUp: 'Izin menindaklanjuti terkait {{subject}}',
  },
  honorifics: {
    male: ['Bapak', 'Pak', 'Mas'],
    female: ['Ibu', 'Bu', 'Mbak'],
    general: ['Bapak/Ibu', 'Saudara/i'],
    business: ['Yang Terhormat', 'Bapak Direktur', 'Ibu Manager'],
  },
  culturalNotes: {
    ramadanConsiderations: [
      'Hindari penjadwalan meeting saat jam berbuka puasa (18:00-19:00)',
      'Berikan fleksibilitas waktu kerja selama bulan Ramadan',
      'Pertimbangkan tradisi mudik saat Lebaran',
    ],
    businessHours: [
      'Jam kerja umumnya 08:00-17:00 WIB',
      'Istirahat siang 12:00-13:00 WIB',
      'Hindari meeting di hari Jumat 11:30-13:00 WIB (sholat Jumat)',
    ],
    nationalHolidays: [
      'Tahun Baru Masehi',
      'Imlek',
      'Nyepi',
      'Wafat Isa Al-Masih',
      'Hari Raya Idul Fitri',
      'Hari Buruh',
      'Kenaikan Isa Al-Masih',
      'Hari Raya Waisak',
      'Hari Lahir Pancasila',
      'Hari Raya Idul Adha',
      'Tahun Baru Islam',
      'Maulid Nabi Muhammad',
      'Hari Kemerdekaan',
      'Hari Natal',
    ],
    regionalCustoms: [
      'Jakarta: Pace bisnis cepat, networking penting',
      'Jawa: Budaya halus, sopan santun tinggi',
      'Bali: Toleransi agama, tourist-friendly',
      'Sumatera: Entrepreneurial spirit, trading culture',
    ],
  },
}

// Default UX patterns
const DEFAULT_UX_PATTERNS: IndonesianUXPatterns = {
  navigationStyle: 'breadcrumb-heavy',
  formInteraction: 'step-by-step',
  dataVisualization: 'table-heavy',
  actionConfirmation: 'explicit',
  errorHandling: 'explanatory',
}

// Context implementation
const IndonesianCulturalUXContext =
  createContext<IndonesianCulturalUXContextType | null>(null)

export const IndonesianCulturalUXProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const { i18n } = useTranslation()

  // State management
  const [preferences, setPreferences] =
    useState<IndonesianCulturalPreferences>(DEFAULT_PREFERENCES)
  const [workflow, setWorkflow] =
    useState<IndonesianBusinessWorkflow>(DEFAULT_WORKFLOW)
  const [messages] = useState<IndonesianCulturalMessages>(INDONESIAN_MESSAGES)
  const [uxPatterns] = useState<IndonesianUXPatterns>(DEFAULT_UX_PATTERNS)

  // Load preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem(
      'indonesian-cultural-preferences'
    )
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences)
        setPreferences(prev => ({ ...prev, ...parsed }))
      } catch (error) {
        console.warn('Failed to parse saved preferences:', error)
      }
    }
  }, [])

  // Update preferences
  const updatePreferences = useCallback(
    (newPreferences: Partial<IndonesianCulturalPreferences>) => {
      setPreferences(prev => {
        const updated = { ...prev, ...newPreferences }
        localStorage.setItem(
          'indonesian-cultural-preferences',
          JSON.stringify(updated)
        )
        return updated
      })
    },
    []
  )

  // Update workflow
  const updateWorkflow = useCallback(
    (newWorkflow: Partial<IndonesianBusinessWorkflow>) => {
      setWorkflow(prev => ({ ...prev, ...newWorkflow }))
    },
    []
  )

  // Currency formatting based on Indonesian preferences
  const formatCurrency = useCallback(
    (amount: number, style?: 'full' | 'abbreviated' | 'symbol-only') => {
      const displayStyle = style || preferences.currencyDisplay

      switch (displayStyle) {
        case 'full':
          return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(amount)

        case 'abbreviated':
          if (amount >= 1000000000) {
            return `Rp ${(amount / 1000000000).toFixed(1)}M`
          } else if (amount >= 1000000) {
            return `Rp ${(amount / 1000000).toFixed(1)}jt`
          } else if (amount >= 1000) {
            return `Rp ${(amount / 1000).toFixed(0)}rb`
          }
          return `Rp ${amount.toLocaleString('id-ID')}`

        case 'symbol-only':
          return `Rp${amount.toLocaleString('id-ID')}`

        default:
          return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
          }).format(amount)
      }
    },
    [preferences.currencyDisplay]
  )

  // Date/time formatting based on Indonesian preferences
  const formatDateTime = useCallback(
    (date: Date, style?: 'indonesian' | 'international' | 'mixed') => {
      const displayStyle = style || preferences.dateTimeFormat

      switch (displayStyle) {
        case 'indonesian':
          return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: preferences.timezone,
          })

        case 'international':
          return date.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })

        case 'mixed':
          return `${date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })} (${date.toLocaleDateString('en-GB')})`

        default:
          return date.toLocaleDateString('id-ID')
      }
    },
    [preferences.dateTimeFormat, preferences.timezone]
  )

  // Get appropriate greeting
  const getGreeting = useCallback(
    (timeOfDay?: 'morning' | 'afternoon' | 'evening', formal?: boolean) => {
      const useFormal =
        formal !== undefined
          ? formal
          : preferences.languageFormality === 'formal'

      if (useFormal) {
        return messages.greetings.formal
      }

      if (timeOfDay) {
        return messages.greetings[timeOfDay]
      }

      const hour = new Date().getHours()
      if (hour < 12) return messages.greetings.morning
      if (hour < 17) return messages.greetings.afternoon
      return messages.greetings.evening
    },
    [preferences.languageFormality, messages]
  )

  // Get appropriate honorific
  const getHonorific = useCallback(
    (gender?: 'male' | 'female', context?: 'business' | 'general') => {
      if (!preferences.useHonorificTitles) return ''

      const contextType = context || 'general'

      if (contextType === 'business') {
        return messages.honorifics.business[0] || '' // Default to formal business honorific
      }

      if (gender) {
        const honorifics = messages.honorifics[gender]
        return honorifics[0] || '' // Default to most formal
      }

      return messages.honorifics.general[0] || ''
    },
    [preferences.useHonorificTitles, messages]
  )

  // Get business phrase with template substitution
  const getBusinessPhrase = useCallback(
    (
      type: keyof IndonesianCulturalMessages['businessPhrases'],
      context?: any
    ) => {
      let phrase = messages.businessPhrases[type]

      if (context) {
        Object.keys(context).forEach(key => {
          phrase = phrase.replace(new RegExp(`{{${key}}}`, 'g'), context[key])
        })
      }

      return phrase
    },
    [messages]
  )

  // Format WhatsApp message with Indonesian business etiquette
  const formatWhatsAppMessage = useCallback(
    (template: string, data: Record<string, any>) => {
      const greeting = getGreeting(undefined, true)
      const honorific = getHonorific(data['gender'], 'business')

      let message = template

      // Add greeting if not present
      if (!message.includes('Selamat')) {
        message = `${greeting} ${honorific} ${data['clientName'] || 'Yang Terhormat'},\n\n${message}`
      }

      // Add closing if not present
      if (!message.includes('Terima kasih')) {
        message += `\n\n${messages.businessPhrases.thankYou}.\n\nSalam hormat,\n${data['senderName'] || 'Tim Kami'}`
      }

      // Replace template variables
      Object.keys(data).forEach(key => {
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), data[key])
      })

      return message
    },
    [getGreeting, getHonorific, messages]
  )

  // Get WhatsApp business templates
  const getWhatsAppBusinessTemplate = useCallback(
    (type: 'quotation' | 'invoice' | 'reminder' | 'follow-up') => {
      const templates = {
        quotation: `Terima kasih atas kepercayaan Bapak/Ibu {{clientName}}.

Berikut kami sampaikan penawaran harga untuk {{projectTitle}}:

📋 Detail Penawaran:
• Nomor: {{quotationNumber}}
• Tanggal: {{quotationDate}}
• Nilai: {{amount}}
• Berlaku hingga: {{validUntil}}

📎 Dokumen penawaran terlampir dalam pesan ini.

Jika ada pertanyaan atau diskusi lebih lanjut, silakan hubungi kami.`,

        invoice: `Bapak/Ibu {{clientName}} yang terhormat,

Berikut kami sampaikan invoice untuk {{projectTitle}}:

🧾 Detail Invoice:
• Nomor: {{invoiceNumber}}
• Tanggal: {{invoiceDate}}
• Jatuh Tempo: {{dueDate}}
• Total: {{amount}}
{{#materaiRequired}}• Materai: Diperlukan ({{materaiAmount}}){{/materaiRequired}}

💳 Pembayaran dapat dilakukan melalui:
{{paymentMethods}}

Terima kasih atas kerja sama yang baik.`,

        reminder: `Bapak/Ibu {{clientName}} yang terhormat,

Izin mengingatkan bahwa invoice berikut akan jatuh tempo:

🔔 Detail Invoice:
• Nomor: {{invoiceNumber}}
• Jatuh Tempo: {{dueDate}}
• Total: {{amount}}
• Status: {{overdueDays}} hari {{#isOverdue}}terlambat{{/isOverdue}}{{^isOverdue}}menuju jatuh tempo{{/isOverdue}}

Mohon konfirmasi jika pembayaran sudah dilakukan atau ada kendala yang perlu dibantu.`,

        'follow-up': `Selamat {{timeGreeting}} Bapak/Ibu {{clientName}},

Izin menindaklanjuti terkait {{subject}}.

{{followUpMessage}}

Mohon informasi terkait hal tersebut. Terima kasih atas perhatiannya.`,
      }

      return templates[type]
    },
    []
  )

  // Validate business etiquette
  const validateBusinessEtiquette = useCallback(
    (action: string, context: any) => {
      const suggestions: string[] = []
      let valid = true

      // Check timing considerations
      if (action === 'send_invoice' || action === 'send_reminder') {
        const sendTime = new Date(context.scheduledTime || Date.now())
        const hour = sendTime.getHours()

        // Avoid Friday prayer time
        if (sendTime.getDay() === 5 && hour >= 11 && hour <= 13) {
          valid = false
          suggestions.push(
            'Hindari pengiriman saat waktu sholat Jumat (11:30-13:00)'
          )
        }

        // Respect business hours
        if (hour < 8 || hour > 17) {
          suggestions.push(
            'Pertimbangkan mengirim dalam jam kerja (08:00-17:00 WIB)'
          )
        }
      }

      // Check formality level
      if (action === 'send_message' && context.message) {
        if (
          !context.message.includes('Bapak') &&
          !context.message.includes('Ibu')
        ) {
          suggestions.push(
            'Gunakan sapaan formal "Bapak/Ibu" untuk komunikasi bisnis'
          )
        }
      }

      // Check payment reminder tone
      if (action === 'send_reminder' && context.reminderCount > 2) {
        suggestions.push(
          'Gunakan bahasa yang lebih halus untuk pengingatan berulang'
        )
      }

      return { valid, suggestions }
    },
    []
  )

  // Get cultural recommendations
  const getCulturalRecommendations = useCallback(() => {
    const recommendations: string[] = []

    // Language recommendations
    if (preferences.languageFormality === 'informal') {
      recommendations.push(
        'Pertimbangkan menggunakan bahasa formal untuk komunikasi bisnis Indonesia'
      )
    }

    // WhatsApp integration
    if (preferences.whatsappIntegrationLevel === 'basic') {
      recommendations.push(
        'Tingkatkan integrasi WhatsApp untuk komunikasi yang lebih efektif dengan klien Indonesia'
      )
    }

    // Regional considerations
    if (preferences.region !== 'general') {
      recommendations.push(
        `Aktifkan fitur khusus untuk wilayah ${preferences.region}`
      )
    }

    // Mobile optimization
    if (!preferences.mobileFirst) {
      recommendations.push(
        'Aktifkan optimisasi mobile-first untuk pengalaman yang lebih baik di Indonesia'
      )
    }

    return recommendations
  }, [preferences])

  // Context value
  const contextValue: IndonesianCulturalUXContextType = useMemo(
    () => ({
      preferences,
      workflow,
      messages,
      uxPatterns,
      updatePreferences,
      updateWorkflow,
      formatCurrency,
      formatDateTime,
      getGreeting,
      getHonorific,
      getBusinessPhrase,
      formatWhatsAppMessage,
      getWhatsAppBusinessTemplate,
      validateBusinessEtiquette,
      getCulturalRecommendations,
    }),
    [
      preferences,
      workflow,
      messages,
      uxPatterns,
      updatePreferences,
      updateWorkflow,
      formatCurrency,
      formatDateTime,
      getGreeting,
      getHonorific,
      getBusinessPhrase,
      formatWhatsAppMessage,
      getWhatsAppBusinessTemplate,
      validateBusinessEtiquette,
      getCulturalRecommendations,
    ]
  )

  return (
    <IndonesianCulturalUXContext.Provider value={contextValue}>
      {children}
    </IndonesianCulturalUXContext.Provider>
  )
}

// Hook for using Indonesian cultural UX context
export const useIndonesianCulturalUX = (): IndonesianCulturalUXContextType => {
  const context = useContext(IndonesianCulturalUXContext)
  if (!context) {
    throw new Error(
      'useIndonesianCulturalUX must be used within IndonesianCulturalUXProvider'
    )
  }
  return context
}

export default IndonesianCulturalUXProvider
