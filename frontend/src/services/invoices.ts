import { apiClient } from '../config/api'

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
    return response.data.data
  },

  // Get invoice by ID
  getInvoice: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get(`/invoices/${id}`)
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
    
    return response.data.data;
  },

  // Update existing invoice
  updateInvoice: async (id: string, data: UpdateInvoiceRequest): Promise<Invoice> => {
    const response = await apiClient.patch(`/invoices/${id}`, data)
    return response.data.data
  },

  // Delete invoice
  deleteInvoice: async (id: string): Promise<void> => {
    await apiClient.delete(`/invoices/${id}`)
  },

  // Update invoice status
  updateStatus: async (id: string, status: string): Promise<Invoice> => {
    const response = await apiClient.patch(`/invoices/${id}/status`, { status })
    return response.data.data
  },

  // Mark invoice as paid
  markAsPaid: async (id: string): Promise<Invoice> => {
    const response = await apiClient.patch(`/invoices/${id}/mark-paid`)
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
    return response.data.data
  },

  // Get recent invoices
  getRecentInvoices: async (limit: number = 5) => {
    const response = await apiClient.get(`/invoices/recent?limit=${limit}`)
    return response.data.data
  },

  // Get overdue invoices
  getOverdueInvoices: async () => {
    const response = await apiClient.get('/invoices/overdue')
    return response.data.data
  },
}