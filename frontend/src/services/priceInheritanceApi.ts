// Price Inheritance API Service - Indonesian Business Management System
// HTTP client for price inheritance API with error handling and type safety

import { apiClient } from './apiClient'
import {
  PriceSource,
  PriceValidationResult,
  PriceInheritanceConfig,
  PriceInheritanceMode
} from '../components/forms/types/priceInheritance.types'

export interface CreatePriceInheritanceRequest {
  entityType: 'quotation' | 'invoice'
  entityId: string
  mode: PriceInheritanceMode
  currentAmount: number
  sourceId?: string
  inheritedAmount?: number
  trackUserInteraction?: boolean
}

export interface UpdatePriceInheritanceRequest {
  entityType: 'quotation' | 'invoice'
  entityId: string
  mode: PriceInheritanceMode
  currentAmount: number
  sourceId?: string
  inheritedAmount?: number
}

export interface ValidatePriceInheritanceRequest {
  amount: number
  mode: PriceInheritanceMode
  sourceId?: string
  inheritedAmount?: number
}

export interface PriceInheritanceResponse {
  config: PriceInheritanceConfig
  validation: PriceValidationResult
  metadata: {
    entityType: string
    entityId: string
    calculatedAt: string
    version: string
  }
}

export interface MateraiCalculationResponse {
  required: boolean
  amount: number
  regulation: string
  guidance: string
}

export interface BusinessEtiquetteResponse {
  communicationStyle: 'formal' | 'semi-formal' | 'casual'
  suggestedTiming: string
  culturalNotes: string[]
  recommendedChannels: string[]
}

export interface PriceInheritanceAnalytics {
  totalConfigurations: number
  modeDistribution: {
    inherit: number
    custom: number
    partial: number
  }
  averageDeviation: number
  complianceRate: number
  userSatisfaction: number
  dateRange?: {
    from: string
    to: string
  }
}

class PriceInheritanceApiService {
  private readonly baseUrl = '/api/price-inheritance'

  /**
   * Get available price sources for an entity
   */
  async getAvailableSources(
    entityType: 'quotation' | 'invoice',
    entityId: string
  ): Promise<PriceSource[]> {
    try {
      const response = await apiClient.get<PriceSource[]>(`${this.baseUrl}/sources?entityType=${entityType}&entityId=${entityId}`)

      return (response.data as any[]).map((source: any) => ({
        ...source,
        lastUpdated: new Date(source.lastUpdated)
      }))
    } catch (error) {
      console.error('Failed to get price sources:', error)
      throw new Error('Gagal memuat sumber harga')
    }
  }

  /**
   * Validate price inheritance configuration
   */
  async validatePriceInheritance(
    request: ValidatePriceInheritanceRequest
  ): Promise<PriceValidationResult> {
    try {
      const response = await apiClient.post<PriceValidationResult>(`${this.baseUrl}/validate`, request)
      
      return {
        ...(response.data as any),
        validationTimestamp: new Date((response.data as any).validationTimestamp)
      }
    } catch (error) {
      console.error('Price validation failed:', error)
      throw new Error('Validasi harga gagal')
    }
  }

  /**
   * Create price inheritance configuration
   */
  async createPriceInheritance(
    request: CreatePriceInheritanceRequest
  ): Promise<PriceInheritanceResponse> {
    try {
      const response = await apiClient.post<PriceInheritanceResponse>(this.baseUrl, request)
      
      return {
        ...(response.data as any),
        metadata: {
          ...(response.data as any).metadata,
          calculatedAt: new Date((response.data as any).metadata.calculatedAt)
        }
      }
    } catch (error: any) {
      console.error('Failed to create price inheritance:', error)
      
      // Extract error message from response
      const errorMessage = error.response?.data?.message || 'Gagal membuat konfigurasi harga'
      const validationErrors = error.response?.data?.errors || []
      
      if (validationErrors.length > 0) {
        throw new Error(`${errorMessage}: ${validationErrors.map((e: any) => e.message).join(', ')}`)
      }
      
      throw new Error(errorMessage)
    }
  }

  /**
   * Update price inheritance configuration
   */
  async updatePriceInheritance(
    id: string,
    request: UpdatePriceInheritanceRequest
  ): Promise<PriceInheritanceResponse> {
    try {
      const response = await apiClient.put<PriceInheritanceResponse>(`${this.baseUrl}/${id}`, request)
      
      return {
        ...(response.data as any),
        metadata: {
          ...(response.data as any).metadata,
          calculatedAt: new Date((response.data as any).metadata.calculatedAt)
        }
      }
    } catch (error: any) {
      console.error('Failed to update price inheritance:', error)
      
      const errorMessage = error.response?.data?.message || 'Gagal memperbarui konfigurasi harga'
      throw new Error(errorMessage)
    }
  }

  /**
   * Get price inheritance analytics
   */
  async getAnalytics(
    dateFrom?: Date,
    dateTo?: Date,
    userId?: string
  ): Promise<PriceInheritanceAnalytics> {
    try {
      const params: any = {}
      if (dateFrom) params.dateFrom = dateFrom.toISOString()
      if (dateTo) params.dateTo = dateTo.toISOString()
      if (userId) params.userId = userId

      const response = await apiClient.get<PriceInheritanceAnalytics>(`${this.baseUrl}/analytics?${new URLSearchParams(params as Record<string, string>).toString()}`)
      
      return response.data as PriceInheritanceAnalytics
    } catch (error) {
      console.error('Failed to get price inheritance analytics:', error)
      throw new Error('Gagal memuat analytics harga')
    }
  }

  /**
   * Calculate required materai amount
   */
  async calculateMaterai(amount: number): Promise<MateraiCalculationResponse> {
    try {
      const response = await apiClient.post<MateraiCalculationResponse>(`${this.baseUrl}/materai/calculate`, {
        amount
      })
      
      return response.data as MateraiCalculationResponse
    } catch (error) {
      console.error('Failed to calculate materai:', error)
      throw new Error('Gagal menghitung materai')
    }
  }

  /**
   * Get Indonesian business etiquette guidance
   */
  async getBusinessEtiquette(amount: number): Promise<BusinessEtiquetteResponse> {
    try {
      const response = await apiClient.get<BusinessEtiquetteResponse>(`${this.baseUrl}/business-etiquette/${amount}`)
      
      return response.data as BusinessEtiquetteResponse
    } catch (error) {
      console.error('Failed to get business etiquette:', error)
      throw new Error('Gagal memuat panduan etika bisnis')
    }
  }

  /**
   * Health check for price inheritance service
   */
  async healthCheck(): Promise<{
    status: string
    timestamp: string
    version: string
    features: {
      indonesianCompliance: boolean
      materaiValidation: boolean
      businessEtiquette: boolean
      userTracking: boolean
    }
  }> {
    try {
      const response = await apiClient.get<any>(`${this.baseUrl}/health`)
      return response.data as any
    } catch (error) {
      console.error('Price inheritance service health check failed:', error)
      throw new Error('Service tidak tersedia')
    }
  }

  /**
   * Batch validate multiple price configurations
   */
  async batchValidate(
    requests: ValidatePriceInheritanceRequest[]
  ): Promise<PriceValidationResult[]> {
    try {
      const promises = requests.map(request => this.validatePriceInheritance(request))
      const results = await Promise.allSettled(promises)
      
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          console.error(`Batch validation failed for request ${index}:`, result.reason)
          // Return a basic error validation result
          return {
            isValid: false,
            errors: [{
              id: 'batch-error',
              type: 'pricing',
              severity: 'error' as const,
              message: 'Validasi batch gagal',
              isBlocking: true
            }],
            warnings: [],
            suggestions: [],
            validationTimestamp: new Date()
          }
        }
      })
    } catch (error) {
      console.error('Batch validation failed:', error)
      throw new Error('Validasi batch gagal')
    }
  }
}

// Create singleton instance
export const priceInheritanceApi = new PriceInheritanceApiService()

// Export for testing
export { PriceInheritanceApiService }