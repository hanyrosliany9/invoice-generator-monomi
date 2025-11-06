import { apiClient } from '../config/api'

export interface Quotation {
  id: string
  quotationNumber: string
  date: string
  validUntil: string
  clientId: string
  projectId: string
  amountPerProject: number
  totalAmount: number
  scopeOfWork?: string // Narrative description of work scope (inherited from project or custom)
  terms: string
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'REVISED'
  createdBy: string
  createdAt: string
  updatedAt: string
  priceBreakdown?: {
    products: Array<{
      name: string
      description?: string
      price: number
      quantity: number
      subtotal: number
    }>
    total: number
    calculatedAt: string
  }
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
  user?: {
    id: string
    name: string
    email: string
  }
  invoices?: {
    id: string
    invoiceNumber: string
    status: string
  }[]
}

export interface CreateQuotationRequest {
  clientId: string
  projectId: string
  amountPerProject: number
  totalAmount: number
  scopeOfWork?: string // Narrative description of work scope (inherited from project or custom)
  terms: string
  validUntil: string
  priceBreakdown?: {
    products: Array<{
      name: string
      description?: string
      price: number
      quantity: number
      subtotal: number
    }>
    total: number
    calculatedAt: string
  }
}

export interface UpdateQuotationRequest
  extends Partial<CreateQuotationRequest> {
  status?: 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'REVISED'
}

export const quotationService = {
  // Get all quotations
  getQuotations: async (filters?: {
    page?: number
    limit?: number
    status?: string
    month?: number
    year?: number
  }): Promise<Quotation[]> => {
    const params = new URLSearchParams()
    
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.status) params.append('status', filters.status)
    if (filters?.month) params.append('month', filters.month.toString())
    if (filters?.year) params.append('year', filters.year.toString())
    
    const queryString = params.toString()
    const url = queryString ? `/quotations?${queryString}` : '/quotations'
    
    const response = await apiClient.get(url)
    return response?.data?.data || []
  },

  // Get quotation by ID
  getQuotation: async (id: string): Promise<Quotation> => {
    const response = await apiClient.get(`/quotations/${id}`)
    if (!response?.data?.data) {
      throw new Error('Quotation not found')
    }
    return response.data.data
  },

  // Create new quotation
  createQuotation: async (data: CreateQuotationRequest): Promise<Quotation> => {
    const response = await apiClient.post('/quotations', data)
    if (!response?.data?.data) {
      throw new Error('Failed to create quotation')
    }
    return response.data.data
  },

  // Update existing quotation
  updateQuotation: async (
    id: string,
    data: UpdateQuotationRequest
  ): Promise<Quotation> => {
    const response = await apiClient.patch(`/quotations/${id}`, data)
    if (!response?.data?.data) {
      throw new Error('Failed to update quotation')
    }
    return response.data.data
  },

  // Delete quotation
  deleteQuotation: async (id: string): Promise<void> => {
    await apiClient.delete(`/quotations/${id}`)
  },

  // Update quotation status
  updateStatus: async (id: string, status: string): Promise<Quotation> => {
    const response = await apiClient.patch(`/quotations/${id}/status`, {
      status,
    })
    if (!response?.data?.data) {
      throw new Error('Failed to update quotation status')
    }
    return response.data.data
  },

  // Generate invoice from quotation
  generateInvoice: async (
    id: string
  ): Promise<{
    invoiceId: string
    message: string
    isExisting: boolean
    invoice: {
      id: string
      invoiceNumber: string
      status: string
      totalAmount: string
      createdAt: string
    }
  }> => {
    const response = await apiClient.post(`/quotations/${id}/generate-invoice`)
    if (!response?.data) {
      throw new Error('Failed to generate invoice')
    }
    return response.data.data || response.data
  },

  // Get quotation statistics
  getQuotationStats: async () => {
    const response = await apiClient.get('/quotations/stats')
    return response?.data?.data || {}
  },

  // Get recent quotations
  getRecentQuotations: async (limit: number = 5) => {
    const response = await apiClient.get(`/quotations/recent?limit=${limit}`)
    return response?.data?.data || []
  },

  // Download quotation PDF
  downloadQuotationPDF: async (id: string, continuous: boolean = true): Promise<Blob> => {
    const response = await apiClient.get(`/pdf/quotation/${id}`, {
      params: { continuous: continuous.toString() },
      responseType: 'blob',
    })
    if (!response?.data) {
      throw new Error('Failed to download quotation PDF')
    }
    return response.data
  },

  // Preview quotation PDF
  previewQuotationPDF: async (id: string, continuous: boolean = true): Promise<Blob> => {
    const response = await apiClient.get(`/pdf/quotation/${id}/preview`, {
      params: { continuous: continuous.toString() },
      responseType: 'blob',
    })
    if (!response?.data) {
      throw new Error('Failed to preview quotation PDF')
    }
    return response.data
  },
}
