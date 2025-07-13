import { api } from '../config/api'
import {
  NotificationResponse,
  NotificationStats,
  NotificationTemplate,
  SendNotificationRequest,
} from '../types/notification'

export const notificationsService = {
  // Send notification
  async sendNotification(data: SendNotificationRequest): Promise<void> {
    const response = await api.post<NotificationResponse>(
      '/notifications/send',
      data
    )

    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
  },

  // Get notification templates
  async getNotificationTemplates(): Promise<NotificationTemplate[]> {
    const response = await api.get<NotificationResponse>(
      '/notifications/templates'
    )

    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }

    return (response.data.data as NotificationTemplate[]) || []
  },

  // Send test notification
  async sendTestNotification(email?: string): Promise<void> {
    const params = email ? `?email=${encodeURIComponent(email)}` : ''
    const response = await api.get<NotificationResponse>(
      `/notifications/test${params}`
    )

    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
  },

  // Get notification statistics (if implemented)
  async getNotificationStats(): Promise<NotificationStats> {
    // This would need to be implemented in the backend
    return {
      totalSent: 0,
      totalFailed: 0,
      byType: {},
      recentNotifications: [],
    }
  },

  // Helper functions
  getNotificationTypeLabel: (type: string): string => {
    const typeLabels: { [key: string]: string } = {
      QUOTATION_STATUS_CHANGE: 'Perubahan Status Quotation',
      INVOICE_GENERATED: 'Invoice Dibuat',
      QUOTATION_EXPIRING: 'Quotation Akan Berakhir',
      INVOICE_OVERDUE: 'Invoice Jatuh Tempo',
      MATERAI_REMINDER: 'Pengingat Materai',
    }

    return typeLabels[type] || type
  },

  getNotificationTypeColor: (type: string): string => {
    const typeColors: { [key: string]: string } = {
      QUOTATION_STATUS_CHANGE: 'text-blue-600 bg-blue-50',
      INVOICE_GENERATED: 'text-green-600 bg-green-50',
      QUOTATION_EXPIRING: 'text-yellow-600 bg-yellow-50',
      INVOICE_OVERDUE: 'text-red-600 bg-red-50',
      MATERAI_REMINDER: 'text-purple-600 bg-purple-50',
    }

    return typeColors[type] || 'text-gray-600 bg-gray-50'
  },

  // Create notification data for different types
  createQuotationStatusChangeNotification: (
    quotationData: any
  ): SendNotificationRequest => {
    return {
      type: 'QUOTATION_STATUS_CHANGE',
      to: quotationData.clientEmail,
      subject: `Status Quotation ${quotationData.quotationNumber} - ${quotationData.newStatus}`,
      data: {
        quotationNumber: quotationData.quotationNumber,
        newStatus: quotationData.newStatus,
        clientName: quotationData.clientName,
        projectName: quotationData.projectName,
        totalAmount: quotationData.totalAmount,
      },
    }
  },

  createInvoiceGeneratedNotification: (
    invoiceData: any
  ): SendNotificationRequest => {
    return {
      type: 'INVOICE_GENERATED',
      to: invoiceData.clientEmail,
      subject: `Invoice ${invoiceData.invoiceNumber} Telah Dibuat`,
      data: {
        invoiceNumber: invoiceData.invoiceNumber,
        quotationNumber: invoiceData.quotationNumber,
        clientName: invoiceData.clientName,
        projectName: invoiceData.projectName,
        totalAmount: invoiceData.totalAmount,
        dueDate: invoiceData.dueDate,
        materaiRequired: invoiceData.materaiRequired,
      },
    }
  },

  createQuotationExpiringNotification: (
    quotationData: any
  ): SendNotificationRequest => {
    return {
      type: 'QUOTATION_EXPIRING',
      to: quotationData.clientEmail,
      subject: `Quotation ${quotationData.quotationNumber} Akan Berakhir`,
      data: {
        quotationNumber: quotationData.quotationNumber,
        clientName: quotationData.clientName,
        daysRemaining: quotationData.daysRemaining,
        validUntil: quotationData.validUntil,
        totalAmount: quotationData.totalAmount,
      },
    }
  },

  createInvoiceOverdueNotification: (
    invoiceData: any
  ): SendNotificationRequest => {
    return {
      type: 'INVOICE_OVERDUE',
      to: invoiceData.clientEmail,
      subject: `Invoice ${invoiceData.invoiceNumber} Jatuh Tempo`,
      data: {
        invoiceNumber: invoiceData.invoiceNumber,
        clientName: invoiceData.clientName,
        dueDate: invoiceData.dueDate,
        daysOverdue: invoiceData.daysOverdue,
        totalAmount: invoiceData.totalAmount,
      },
    }
  },

  createMateraiReminderNotification: (
    invoiceData: any
  ): SendNotificationRequest => {
    return {
      type: 'MATERAI_REMINDER',
      to: invoiceData.clientEmail,
      subject: `Pengingat Materai - Invoice ${invoiceData.invoiceNumber}`,
      data: {
        invoiceNumber: invoiceData.invoiceNumber,
        totalAmount: invoiceData.totalAmount,
      },
    }
  },

  // Validate notification data
  validateNotificationData: (
    data: SendNotificationRequest
  ): { isValid: boolean; message?: string } => {
    if (!data.to) {
      return { isValid: false, message: 'Email recipient is required' }
    }

    if (!data.subject) {
      return { isValid: false, message: 'Subject is required' }
    }

    if (!data.type) {
      return { isValid: false, message: 'Notification type is required' }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.to)) {
      return { isValid: false, message: 'Invalid email format' }
    }

    return { isValid: true }
  },

  // Format notification data for display
  formatNotificationData: (data: any): string => {
    const entries = Object.entries(data)
    return entries.map(([key, value]) => `${key}: ${value}`).join(', ')
  },
}
