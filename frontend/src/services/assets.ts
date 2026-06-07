import { apiClient } from '../config/api'

/* ------------------------------------------------------------------ */
/*  Depreciation Schedule Types (PSAK 16)                              */
/* ------------------------------------------------------------------ */

export interface DepreciationPeriodRow {
  period: string        // YYYY-MM
  periodDate: string    // ISO date
  openingValue: number  // Saldo Awal
  depreciation: number  // Perhitungan Depresiasi
  accumulated: number   // Akumulasi Depresiasi
  closingValue: number  // Saldo Akhir
}

export interface DepreciationScheduleInfo {
  id: string
  method: string
  purchasePrice: number
  residualValue: number
  depreciableAmount: number
  usefulLifeMonths: number
  usefulLifeYears: number
  depreciationPerMonth: number
  depreciationPerYear: number
  annualRate: number
  startDate: string
  endDate: string
}

export interface DepreciationCalculationTable {
  assetId: string
  assetCode: string
  assetName: string
  hasSchedule: boolean
  schedule: DepreciationScheduleInfo | null
  fullTable: DepreciationPeriodRow[]
  firstPeriod: DepreciationPeriodRow | null
  lastPeriod: DepreciationPeriodRow | null
  totalPeriods: number
}

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
  usefulLifeYears?: number
  residualValue?: number | string
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

export interface CreateMaintenanceRequest {
  maintenanceType: string
  performedDate: string   // ISO date string
  description: string
  performedBy?: string
  cost?: number
  nextMaintenanceDate?: string  // ISO date string
}

export interface MaintenanceRecord {
  id: string
  assetId: string
  maintenanceType: string
  performedDate: string
  performedBy?: string | null
  cost?: number | null
  description: string
  nextMaintenanceDate?: string | null
  createdAt: string
  updatedAt: string
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
  paymentSource?: 'CASH' | 'BANK' | 'CREDIT'
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
      const response = await apiClient.get('/assets', { params: { limit: 1000 } })

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

  disposeAsset: async (id: string, proceeds?: number, disposalDate?: string): Promise<any> => {
    const response = await apiClient.post(`/assets/${id}/dispose`, { proceeds, disposalDate })
    return response.data.data
  },

  updateStatus: async (
    id: string,
    status: Asset['status'],
    condition?: Asset['condition'],
    notes?: string,
  ): Promise<Asset> => {
    const response = await apiClient.patch(`/assets/${id}`, { status, condition, notes })
    if (!response?.data?.data) throw new Error('Status update failed')
    return response.data.data
  },

  getAssetStats: async () => {
    const response = await apiClient.get('/assets/stats')
    return response?.data?.data || {}
  },

  addMaintenance: async (id: string, data: CreateMaintenanceRequest): Promise<MaintenanceRecord> => {
    const response = await apiClient.post(`/assets/${id}/maintenance`, data)
    return response.data.data
  },

  /**
   * Get PSAK 16 depreciation calculation table for a specific asset.
   * Returns firstPeriod and lastPeriod for "Perhitungan Depresiasi" display.
   */
  getDepreciationCalculation: async (assetId: string): Promise<DepreciationCalculationTable> => {
    const response = await apiClient.get(`/accounting/depreciation/calculation/${assetId}`)
    if (!response?.data?.data) {
      throw new Error('Depreciation calculation not found')
    }
    return response.data.data
  },
}
