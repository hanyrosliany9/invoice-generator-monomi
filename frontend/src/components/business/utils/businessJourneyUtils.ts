// Business Journey Utilities - Indonesian Business Management System
// Enhanced with performance, security, and cultural optimization

import dayjs from 'dayjs'
import DOMPurify from 'dompurify'
import {
  BusinessJourneyEvent,
  BusinessJourneyEventStatus,
  BusinessJourneyEventType,
  BusinessJourneyFilters,
  MateraiComplianceStatus,
} from '../types/businessJourney.types'

// Security utilities
export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
  })
}

export const validatePriceInput = (amount: number): boolean => {
  return (
    Number.isFinite(amount) &&
    amount >= 0 &&
    amount <= 999999999999 && // Prevent integer overflow
    /^\d+(\.\d{1,2})?$/.test(amount.toString())
  ) // Valid currency format
}

// Indonesian business utilities
export const formatIDR = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const formatIDRForScreenReader = (amount: number): string => {
  const formatted = formatIDR(amount)
  return formatted.replace(/\./g, ' ribu ').replace(',', ' dan ')
}

export const getTimeGreeting = (): string => {
  const hour = new Date().getHours()
  if (hour < 12) return 'pagi'
  if (hour < 15) return 'siang'
  if (hour < 18) return 'sore'
  return 'malam'
}

export const calculateMateraiAmount = (invoiceAmount: number): number => {
  // 2025 Indonesian materai calculation
  if (invoiceAmount >= 5000000 && invoiceAmount < 1000000000) {
    return 10000 // 10,000 IDR materai
  }
  if (invoiceAmount >= 1000000000) {
    return 20000 // 20,000 IDR materai for high-value transactions
  }
  return 0
}

export const validateMateraiCompliance = (
  invoiceAmount: number,
  materaiApplied: boolean,
  materaiAmount: number
): MateraiComplianceStatus => {
  const requiredAmount = calculateMateraiAmount(invoiceAmount)
  const required = requiredAmount > 0

  return {
    required,
    totalRequiredAmount: requiredAmount,
    appliedAmount: materaiApplied ? materaiAmount : 0,
    pendingAmount: required && !materaiApplied ? requiredAmount : 0,
    compliancePercentage: required ? (materaiApplied ? 100 : 0) : 100,
  }
}

// Event processing utilities
export const getEventIcon = (eventType: BusinessJourneyEventType): string => {
  const iconMap: Record<BusinessJourneyEventType, string> = {
    client_created: '👤',
    project_started: '🚀',
    quotation_draft: '📝',
    quotation_sent: '📧',
    quotation_approved: '✅',
    quotation_declined: '❌',
    quotation_revised: '🔄',
    invoice_generated: '📄',
    invoice_sent: '📮',
    payment_received: '💰',
    payment_overdue: '⚠️',
    materai_required: '🏷️',
    materai_applied: '✔️',
  }
  return iconMap[eventType] || '📋'
}

export const getEventColor = (
  eventType: BusinessJourneyEventType,
  status: BusinessJourneyEventStatus
): string => {
  if (status === 'cancelled') return '#ff4d4f'
  if (status === 'requires_attention') return '#faad14'

  const colorMap: Record<BusinessJourneyEventType, string> = {
    client_created: '#1890ff',
    project_started: '#52c41a',
    quotation_draft: '#faad14',
    quotation_sent: '#1890ff',
    quotation_approved: '#52c41a',
    quotation_declined: '#ff4d4f',
    quotation_revised: '#faad14',
    invoice_generated: '#722ed1',
    invoice_sent: '#1890ff',
    payment_received: '#52c41a',
    payment_overdue: '#ff4d4f',
    materai_required: '#fa541c',
    materai_applied: '#52c41a',
  }
  return colorMap[eventType] || '#d9d9d9'
}

export const getEventTitle = (
  eventType: BusinessJourneyEventType,
  language: 'id' | 'en' = 'id'
): string => {
  const titleMap: Record<
    BusinessJourneyEventType,
    Record<'id' | 'en', string>
  > = {
    client_created: { id: 'Klien Dibuat', en: 'Client Created' },
    project_started: { id: 'Proyek Dimulai', en: 'Project Started' },
    quotation_draft: { id: 'Draft Quotation', en: 'Quotation Draft' },
    quotation_sent: { id: 'Quotation Dikirim', en: 'Quotation Sent' },
    quotation_approved: { id: 'Quotation Disetujui', en: 'Quotation Approved' },
    quotation_declined: { id: 'Quotation Ditolak', en: 'Quotation Declined' },
    quotation_revised: { id: 'Quotation Direvisi', en: 'Quotation Revised' },
    invoice_generated: { id: 'Invoice Dibuat', en: 'Invoice Generated' },
    invoice_sent: { id: 'Invoice Dikirim', en: 'Invoice Sent' },
    payment_received: { id: 'Pembayaran Diterima', en: 'Payment Received' },
    payment_overdue: { id: 'Pembayaran Terlambat', en: 'Payment Overdue' },
    materai_required: { id: 'Materai Diperlukan', en: 'Materai Required' },
    materai_applied: { id: 'Materai Diterapkan', en: 'Materai Applied' },
  }
  return titleMap[eventType][language]
}

// Filter utilities
export const filterEvents = (
  events: BusinessJourneyEvent[],
  filters: BusinessJourneyFilters
): BusinessJourneyEvent[] => {
  return events.filter(event => {
    // Event type filter
    if (
      filters.eventTypes.length > 0 &&
      !filters.eventTypes.includes(event.type)
    ) {
      return false
    }

    // Status filter
    if (
      filters.statusFilter.length > 0 &&
      !filters.statusFilter.includes(event.status)
    ) {
      return false
    }

    // Date range filter
    const eventDate = dayjs(event.createdAt)
    if (
      filters.dateRange.start &&
      eventDate.isBefore(dayjs(filters.dateRange.start))
    ) {
      return false
    }
    if (
      filters.dateRange.end &&
      eventDate.isAfter(dayjs(filters.dateRange.end))
    ) {
      return false
    }

    // Amount range filter
    if (filters.amountRange && event.amount) {
      if (
        event.amount < filters.amountRange.min ||
        event.amount > filters.amountRange.max
      ) {
        return false
      }
    }

    // Search term filter
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase()
      const searchableText =
        `${event.title} ${event.description} ${event.metadata.notes || ''}`.toLowerCase()
      if (!searchableText.includes(searchTerm)) {
        return false
      }
    }

    return true
  })
}

// Performance utilities
export const calculateSatisfaction = (
  renderTime: number
): 'good' | 'needs-improvement' | 'poor' => {
  if (renderTime < 100) return 'good'
  if (renderTime < 300) return 'needs-improvement'
  return 'poor'
}

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastExecution = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastExecution >= delay) {
      func(...args)
      lastExecution = now
    }
  }
}

// WhatsApp integration utilities
export const generateWhatsAppMessage = (
  documentType: 'quotation' | 'invoice',
  documentNumber: string,
  amount: number,
  dueDate?: string
): string => {
  const docTypeIndonesian =
    documentType === 'quotation' ? 'Quotation' : 'Invoice'
  const formattedAmount = formatIDR(amount)

  let message = `Selamat ${getTimeGreeting()},\n\n`
  message += `Bersama ini kami kirimkan ${docTypeIndonesian} ${documentNumber} `
  message += `dengan nilai ${formattedAmount}.\n\n`

  if (documentType === 'invoice' && dueDate) {
    message += `Jatuh tempo pembayaran: ${dayjs(dueDate).format('DD MMMM YYYY')}\n\n`
  }

  message += `Silakan klik link berikut untuk melihat detail:\n`
  message += `${window.location.origin}/${documentType}s/${documentNumber}\n\n`
  message += `Terima kasih atas kepercayaan Anda.\n\n`
  message += `Hormat kami,\n`
  message += `Tim ${process.env['REACT_APP_COMPANY_NAME'] || 'Monomi'}`

  return encodeURIComponent(message)
}

// Data transformation utilities
export const groupEventsByMonth = (
  events: BusinessJourneyEvent[]
): Record<string, BusinessJourneyEvent[]> => {
  return events.reduce(
    (groups, event) => {
      const monthKey = dayjs(event.createdAt).format('YYYY-MM')
      if (!groups[monthKey]) {
        groups[monthKey] = []
      }
      groups[monthKey].push(event)
      return groups
    },
    {} as Record<string, BusinessJourneyEvent[]>
  )
}

export const calculateBusinessMetrics = (events: BusinessJourneyEvent[]) => {
  const totalRevenue = events
    .filter(event => event.type === 'payment_received' && event.amount)
    .reduce((sum, event) => sum + (event.amount || 0), 0)

  const totalInvoices = events.filter(
    event => event.type === 'invoice_generated'
  ).length
  const totalPayments = events.filter(
    event => event.type === 'payment_received'
  ).length

  const paymentRate =
    totalInvoices > 0 ? (totalPayments / totalInvoices) * 100 : 0

  const overduePayments = events.filter(
    event => event.type === 'payment_overdue'
  ).length
  const overdueRate =
    totalInvoices > 0 ? (overduePayments / totalInvoices) * 100 : 0

  return {
    totalRevenue,
    totalInvoices,
    totalPayments,
    paymentRate,
    overdueRate,
    averageInvoiceValue: totalInvoices > 0 ? totalRevenue / totalInvoices : 0,
  }
}

// Accessibility utilities
export const generateAriaLabel = (event: BusinessJourneyEvent): string => {
  const title = getEventTitle(event.type, 'id')
  const date = dayjs(event.createdAt).format('DD MMMM YYYY, HH:mm')
  const amount = event.amount
    ? `, nilai ${formatIDRForScreenReader(event.amount)}`
    : ''
  return `${title} pada ${date}${amount}. Status: ${event.status}`
}

export const announceToScreenReader = (message: string): void => {
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', 'polite')
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  document.body.appendChild(announcement)

  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

// Export all utilities
export const businessJourneyUtils = {
  sanitizeInput,
  validatePriceInput,
  formatIDR,
  formatIDRForScreenReader,
  getTimeGreeting,
  calculateMateraiAmount,
  validateMateraiCompliance,
  getEventIcon,
  getEventColor,
  getEventTitle,
  filterEvents,
  calculateSatisfaction,
  debounce,
  throttle,
  generateWhatsAppMessage,
  groupEventsByMonth,
  calculateBusinessMetrics,
  generateAriaLabel,
  announceToScreenReader,
}
