/**
 * Payment Milestones Service
 *
 * API client for managing payment milestones in quotations.
 * Integrates with backend PaymentMilestonesService and QuotationsService.
 */

import { apiClient } from './apiClient'
import { PaymentMilestone } from '../components/quotations'

export interface CreatePaymentMilestoneDTO {
  milestoneNumber: number
  name: string
  nameId?: string
  description?: string
  descriptionId?: string
  paymentPercentage: number
  paymentAmount: number
  dueDate?: string
  dueDaysFromPrev?: number
  deliverables?: string[]
}

export interface UpdatePaymentMilestoneDTO extends Partial<CreatePaymentMilestoneDTO> {}

export interface PaymentMilestoneValidationResponse {
  valid: boolean
  totalPercentage: number
  errors: string[]
}

export const paymentMilestonesService = {
  /**
   * Get all payment milestones for a quotation
   */
  async getQuotationMilestones(quotationId: string): Promise<PaymentMilestone[]> {
    const response = await apiClient.get(
      `/api/quotations/${quotationId}/payment-milestones`
    )
    return response.data
  },

  /**
   * Create a new payment milestone for a quotation
   */
  async createPaymentMilestone(
    quotationId: string,
    data: CreatePaymentMilestoneDTO
  ): Promise<PaymentMilestone> {
    const response = await apiClient.post(
      `/api/quotations/${quotationId}/payment-milestones`,
      data
    )
    return response.data
  },

  /**
   * Update a payment milestone
   */
  async updatePaymentMilestone(
    paymentMilestoneId: string,
    data: UpdatePaymentMilestoneDTO
  ): Promise<PaymentMilestone> {
    const response = await apiClient.patch(
      `/api/quotations/payment-milestones/${paymentMilestoneId}`,
      data
    )
    return response.data
  },

  /**
   * Delete a payment milestone
   */
  async deletePaymentMilestone(paymentMilestoneId: string): Promise<void> {
    await apiClient.delete(
      `/api/quotations/payment-milestones/${paymentMilestoneId}`
    )
  },

  /**
   * Validate all milestones for a quotation
   * Ensures total percentage = 100%, all amounts match, etc.
   */
  async validateQuotationMilestones(
    quotationId: string
  ): Promise<PaymentMilestoneValidationResponse> {
    const response = await apiClient.post(
      `/api/quotations/${quotationId}/payment-milestones/validate`
    )
    return response.data
  },

  /**
   * Generate invoice for a specific payment milestone
   */
  async generateMilestoneInvoice(paymentMilestoneId: string): Promise<any> {
    const response = await apiClient.post(
      `/api/quotations/payment-milestones/${paymentMilestoneId}/generate-invoice`
    )
    return response.data
  },

  /**
   * Get progress summary for all milestones in a quotation
   */
  async getMilestoneProgress(quotationId: string): Promise<any> {
    const response = await apiClient.get(
      `/api/quotations/${quotationId}/milestone-progress`
    )
    return response.data
  },
}
