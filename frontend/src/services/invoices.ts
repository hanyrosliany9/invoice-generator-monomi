import { apiClient } from '../config/api'
import { paymentsService } from './payments'
import { Payment } from '../types/payment'

export interface Invoice {
  id: string
  invoiceNumber: string
  number?: string
  creationDate: string
  dueDate: string
  quotationId?: string
  clientId: string
  projectId: string
  amountPerProject: string | number
  totalAmount: string | number
  amount?: string | number
  paymentInfo: string
  materaiRequired: boolean
  materaiApplied: boolean
  terms: string
  signature?: string
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  createdBy: string
  createdAt: string
  updatedAt: string
  paidAt?: string
  
  // Payment tracking
  paymentSummary?: {
    totalPaid: string
    remainingAmount: string
    paymentCount: number
    lastPaymentDate?: string
  }
  
  // Business status
  businessStatus?: {
    isOverdue: boolean
    daysOverdue: number
    daysToDue: number
    materaiStatus: 'NOT_REQUIRED' | 'REQUIRED' | 'APPLIED'
  }
  clientName?: string
  projectName?: string
  client?: {
    id: string
    name: string
    company: string
    email: string
  }
  project?: {
    id: string
    number: string
    description: string
    type: string
  }
  quotation?: {
    id: string
    quotationNumber: string
  }
}

export interface CreateInvoiceRequest {
  clientId: string
  projectId: string
  amountPerProject: string | number
  totalAmount: string | number
  paymentInfo: string
  terms: string
  dueDate: string
  materaiRequired?: boolean
  quotationId?: string
}

export interface UpdateInvoiceRequest extends Partial<CreateInvoiceRequest> {
  status?: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  materaiApplied?: boolean
  signature?: string
}

export const invoiceService = {
  // Get all invoices
  getInvoices: async (): Promise<Invoice[]> => {
    const response = await apiClient.get('/invoices')
    return response?.data?.data || []
  },

  // Get invoice by ID
  getInvoice: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get(`/invoices/${id}`)
    if (!response?.data?.data) {
      throw new Error('Invoice not found')
    }
    return response.data.data
  },

  // Create new invoice
  createInvoice: async (data: CreateInvoiceRequest): Promise<Invoice> => {
    const requestId = `invoice_${Date.now()}_${Math.random()}`;
    
    const response = await apiClient.post('/invoices', data, {
      headers: {
        'X-Request-ID': requestId
      }
    });
    
    if (!response?.data?.data) {
      throw new Error('Invoice creation failed')
    }
    return response.data.data;
  },

  // Update existing invoice
  updateInvoice: async (id: string, data: UpdateInvoiceRequest): Promise<Invoice> => {
    const response = await apiClient.patch(`/invoices/${id}`, data)
    if (!response?.data?.data) {
      throw new Error('Invoice update failed')
    }
    return response.data.data
  },

  // Delete invoice
  deleteInvoice: async (id: string): Promise<void> => {
    await apiClient.delete(`/invoices/${id}`)
  },

  // Update invoice status
  updateStatus: async (id: string, status: string): Promise<Invoice> => {
    const response = await apiClient.patch(`/invoices/${id}/status`, { status })
    if (!response?.data?.data) {
      throw new Error('Invoice status update failed')
    }
    return response.data.data
  },

  // Mark invoice as paid
  markAsPaid: async (id: string): Promise<Invoice> => {
    const response = await apiClient.patch(`/invoices/${id}/mark-paid`)
    if (!response?.data?.data) {
      throw new Error('Invoice payment marking failed')
    }
    return response.data.data
  },

  // Generate PDF
  generatePDF: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/pdf/invoice/${id}`, {
      responseType: 'blob'
    })
    return response.data
  },

  // Send invoice via email
  sendInvoice: async (id: string, email?: string): Promise<void> => {
    await apiClient.post(`/invoices/${id}/send`, { email })
  },

  // Get invoice statistics
  getInvoiceStats: async () => {
    const response = await apiClient.get('/invoices/stats')
    return response?.data?.data || {}
  },

  // Get recent invoices
  getRecentInvoices: async (limit: number = 5) => {
    const response = await apiClient.get(`/invoices/recent?limit=${limit}`)
    return response?.data?.data || []
  },

  // Get overdue invoices
  getOverdueInvoices: async () => {
    const response = await apiClient.get('/invoices/overdue')
    return response?.data?.data || []
  },

  // Get invoice with payment information
  getInvoiceWithPayments: async (id: string): Promise<Invoice & { payments: Payment[] }> => {
    const [invoice, payments] = await Promise.all([
      invoiceService.getInvoice(id),
      paymentsService.getPaymentsByInvoice(id)
    ])
    
    const paymentSummary = paymentsService.calculatePaymentSummary(payments, invoice.totalAmount)
    const businessStatus = invoiceService.calculateBusinessStatus(invoice)
    
    return {
      ...invoice,
      payments,
      paymentSummary,
      businessStatus
    }
  },

  // Calculate business status for invoice
  calculateBusinessStatus: (invoice: Invoice) => {
    const now = new Date()
    const dueDate = new Date(invoice.dueDate)
    const isOverdue = now > dueDate && invoice.status !== 'PAID'
    const daysToDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const daysOverdue = isOverdue ? Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
    
    let materaiStatus: 'NOT_REQUIRED' | 'REQUIRED' | 'APPLIED' = 'NOT_REQUIRED'
    if (invoice.materaiRequired) {
      materaiStatus = invoice.materaiApplied ? 'APPLIED' : 'REQUIRED'
    }
    
    return {
      isOverdue,
      daysOverdue,
      daysToDue,
      materaiStatus
    }
  },

  // Add payment to invoice
  addPayment: async (invoiceId: string, paymentData: {
    amount: string | number
    paymentDate: string
    paymentMethod: string
    transactionRef?: string
    bankDetails?: string
  }) => {
    return await paymentsService.createPayment({
      invoiceId,
      ...paymentData
    })
  },

  // Get payment summary for invoice
  getPaymentSummary: async (invoiceId: string) => {
    const [invoice, payments] = await Promise.all([
      invoiceService.getInvoice(invoiceId),
      paymentsService.getPaymentsByInvoice(invoiceId)
    ])
    
    return paymentsService.calculatePaymentSummary(payments, invoice.totalAmount)
  },

  // Check if invoice is fully paid
  isFullyPaid: async (invoiceId: string): Promise<boolean> => {
    const summary = await invoiceService.getPaymentSummary(invoiceId)
    return parseFloat(summary.remainingAmount) <= 0
  },

  // Format invoice amount for display
  formatAmount: (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num)
  },

  // Check if materai is required
  requiresMaterai: (amount: string | number): boolean => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return num > 5000000 // 5 million IDR threshold
  },
}