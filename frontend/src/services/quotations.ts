import { apiClient } from '../config/api'

export interface Quotation {
  id: string
  quotationNumber: string
  date: string
  validUntil: string
  clientId: string
  projectId: string
  amountPerProject: string | number
  totalAmount: string | number
  terms: string
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'REVISED'
  createdBy: string
  createdAt: string
  updatedAt: string
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
}

export interface CreateQuotationRequest {
  clientId: string
  projectId: string
  amountPerProject: string | number
  totalAmount: string | number
  terms: string
  validUntil: string
}

export interface UpdateQuotationRequest extends Partial<CreateQuotationRequest> {
  status?: 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'REVISED'
}

export const quotationService = {
  // Get all quotations
  getQuotations: async (): Promise<Quotation[]> => {
    const response = await apiClient.get('/quotations')
    return response.data.data
  },

  // Get quotation by ID
  getQuotation: async (id: string): Promise<Quotation> => {
    const response = await apiClient.get(`/quotations/${id}`)
    return response.data.data
  },

  // Create new quotation
  createQuotation: async (data: CreateQuotationRequest): Promise<Quotation> => {
    const response = await apiClient.post('/quotations', data)
    return response.data.data
  },

  // Update existing quotation
  updateQuotation: async (id: string, data: UpdateQuotationRequest): Promise<Quotation> => {
    const response = await apiClient.patch(`/quotations/${id}`, data)
    return response.data.data
  },

  // Delete quotation
  deleteQuotation: async (id: string): Promise<void> => {
    await apiClient.delete(`/quotations/${id}`)
  },

  // Update quotation status
  updateStatus: async (id: string, status: string): Promise<Quotation> => {
    const response = await apiClient.patch(`/quotations/${id}/status`, { status })
    return response.data.data
  },

  // Generate invoice from quotation
  generateInvoice: async (id: string): Promise<{ invoiceId: string }> => {
    const response = await apiClient.post(`/quotations/${id}/generate-invoice`)
    return response.data.data
  },

  // Get quotation statistics
  getQuotationStats: async () => {
    const response = await apiClient.get('/quotations/stats')
    return response.data.data
  },

  // Get recent quotations
  getRecentQuotations: async (limit: number = 5) => {
    const response = await apiClient.get(`/quotations/recent?limit=${limit}`)
    return response.data.data
  },
}