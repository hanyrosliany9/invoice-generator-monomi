import { apiClient } from '../config/api'

export interface Asset {
  id: string
  assetCode: string
  name: string
  category: string
  subcategory?: string
  manufacturer?: string
  model?: string
  serialNumber?: string
  specifications?: any
  purchaseDate: string
  purchasePrice: number | string // Backend returns Decimal as string
  supplier?: string
  invoiceNumber?: string
  warrantyExpiration?: string
  status: 'AVAILABLE' | 'RESERVED' | 'CHECKED_OUT' | 'IN_MAINTENANCE' | 'BROKEN' | 'RETIRED'
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'BROKEN'
  location?: string
  photos?: string[]
  documents?: string[]
  qrCode?: string
  rfidTag?: string
  tags?: string[]
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy?: any
  _count?: {
    reservations: number
    maintenanceRecords: number
  }
  reservations?: any[]
  maintenanceRecords?: any[]
  maintenanceSchedules?: any[]
}

export interface CreateAssetRequest {
  name: string
  category: string
  subcategory?: string
  manufacturer?: string
  model?: string
  serialNumber?: string
  purchaseDate: string
  purchasePrice: number
  supplier?: string
  location?: string
  notes?: string
}

export interface UpdateAssetRequest extends Partial<CreateAssetRequest> {
  status?: Asset['status']
  condition?: Asset['condition']
}

export const assetService = {
  getAssets: async (): Promise<Asset[]> => {
    try {
      const response = await apiClient.get('/assets')

      // Handle nested response structure
      let data = response?.data?.data

      // Check if data is wrapped in another response object
      if (data && typeof data === 'object' && 'data' in data && 'pagination' in data) {
        // Backend returns { data: [], pagination: {} }
        data = (data as any).data
      }

      // Ensure we always return an array
      if (Array.isArray(data)) {
        return data as Asset[]
      }

      console.error('Assets API returned non-array data:', response?.data)
      return []
    } catch (error) {
      console.error('Failed to fetch assets:', error)
      return []
    }
  },

  getAsset: async (id: string): Promise<Asset> => {
    const response = await apiClient.get(`/assets/${id}`)
    if (!response?.data?.data) {
      throw new Error('Asset not found')
    }
    return response.data.data
  },

  createAsset: async (data: CreateAssetRequest): Promise<Asset> => {
    const response = await apiClient.post('/assets', data)
    if (!response?.data?.data) {
      throw new Error('Asset creation failed')
    }
    return response.data.data
  },

  updateAsset: async (id: string, data: UpdateAssetRequest): Promise<Asset> => {
    const response = await apiClient.patch(`/assets/${id}`, data)
    if (!response?.data?.data) {
      throw new Error('Asset update failed')
    }
    return response.data.data
  },

  deleteAsset: async (id: string): Promise<void> => {
    await apiClient.delete(`/assets/${id}`)
  },

  reserveAsset: async (id: string, reservationData: any): Promise<any> => {
    const response = await apiClient.post(`/assets/${id}/reserve`, reservationData)
    return response.data.data
  },

  checkOutAsset: async (id: string, userId: string, projectId?: string): Promise<any> => {
    const response = await apiClient.post(`/assets/${id}/checkout`, { userId, projectId })
    return response.data.data
  },

  checkInAsset: async (id: string, condition?: string, notes?: string): Promise<any> => {
    const response = await apiClient.post(`/assets/${id}/checkin`, { condition, notes })
    return response.data.data
  },

  getAssetStats: async () => {
    const response = await apiClient.get('/assets/stats')
    return response?.data?.data || {}
  },
}
