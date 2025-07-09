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
  taxNumber?: string
  bankAccount?: string
  notes?: string
  status?: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
  // Statistics (optional for compatibility)
  totalQuotations?: number
  totalInvoices?: number
  totalPaid?: number
  totalPending?: number
  lastTransaction?: string
}

export interface CreateClientRequest {
  name: string
  email: string
  phone: string
  address: string
  company: string
  contactPerson: string
  paymentTerms: string
  taxNumber?: string
  bankAccount?: string
  notes?: string
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {}

export const clientService = {
  // Get all clients
  getClients: async (): Promise<Client[]> => {
    const response = await apiClient.get('/clients')
    return response.data.data
  },

  // Get client by ID
  getClient: async (id: string): Promise<Client> => {
    const response = await apiClient.get(`/clients/${id}`)
    return response.data
  },

  // Create new client
  createClient: async (data: CreateClientRequest): Promise<Client> => {
    const response = await apiClient.post('/clients', data)
    return response.data
  },

  // Update existing client
  updateClient: async (id: string, data: UpdateClientRequest): Promise<Client> => {
    const response = await apiClient.patch(`/clients/${id}`, data)
    return response.data
  },

  // Delete client
  deleteClient: async (id: string): Promise<void> => {
    await apiClient.delete(`/clients/${id}`)
  },

  // Get client statistics
  getClientStats: async () => {
    const response = await apiClient.get('/clients/stats')
    return response.data
  },
}