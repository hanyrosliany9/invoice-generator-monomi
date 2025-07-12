import { apiClient } from '../config/api'

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  address: string
  company: string
  contactPerson: string
  paymentTerms: string
  status?: string
  taxNumber?: string
  bankAccount?: string
  notes?: string
  lastTransaction?: string
  totalPaid?: number
  totalPending?: number
  totalQuotations?: number
  totalInvoices?: number
  totalProjects?: number
  pendingQuotations?: number
  overdueInvoices?: number
  createdAt: string
  updatedAt: string
  _count?: {
    quotations: number
    invoices: number
    projects: number
  }
}

export interface CreateClientRequest {
  name: string
  email: string
  phone: string
  address: string
  company: string
  contactPerson: string
  paymentTerms: string
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {
  status?: string
}

export const clientService = {
  // Get all clients
  getClients: async (): Promise<Client[]> => {
    const response = await apiClient.get('/clients')
    return response?.data?.data || []
  },

  // Get client by ID
  getClient: async (id: string): Promise<Client> => {
    const response = await apiClient.get(`/clients/${id}`)
    if (!response?.data?.data) {
      throw new Error('Client not found')
    }
    return response.data.data
  },

  // Create new client
  createClient: async (data: CreateClientRequest): Promise<Client> => {
    const response = await apiClient.post('/clients', data)
    if (!response?.data?.data) {
      throw new Error('Client creation failed')
    }
    return response.data.data
  },

  // Update existing client
  updateClient: async (id: string, data: UpdateClientRequest): Promise<Client> => {
    const response = await apiClient.patch(`/clients/${id}`, data)
    if (!response?.data?.data) {
      throw new Error('Client update failed')
    }
    return response.data.data
  },

  // Delete client
  deleteClient: async (id: string): Promise<void> => {
    await apiClient.delete(`/clients/${id}`)
  },

  // Get client statistics
  getClientStats: async () => {
    const response = await apiClient.get('/clients/stats')
    return response?.data?.data || {}
  },
}