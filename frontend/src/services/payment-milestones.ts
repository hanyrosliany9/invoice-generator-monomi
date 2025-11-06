/**
 * Payment Milestones Service
 *
 * API client for managing payment milestones in quotations.
 * Integrates with backend PaymentMilestonesService and QuotationsService.
 */

import { apiClient } from '../config/api'
import type { PaymentMilestone } from '../types/payment-milestones'

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
      `/quotations/${quotationId}/payment-milestones`
    )
    return ((response.data as any).data as PaymentMilestone[]) || []
  },

  /**
   * Create a new payment milestone for a quotation
   */
  async createPaymentMilestone(
    quotationId: string,
    data: CreatePaymentMilestoneDTO
  ): Promise<PaymentMilestone> {
    const response = await apiClient.post(
      `/quotations/${quotationId}/payment-milestones`,
      data
    )
    return (response.data as any).data as PaymentMilestone
  },

  /**
   * Update a payment milestone
   */
  async updatePaymentMilestone(
    paymentMilestoneId: string,
    data: UpdatePaymentMilestoneDTO
  ): Promise<PaymentMilestone> {
    const response = await (apiClient as any).patch(
      `/quotations/payment-milestones/${paymentMilestoneId}`,
      data
    )
    return (response.data as any).data as PaymentMilestone
  },

  /**
   * Delete a payment milestone
   */
  async deletePaymentMilestone(paymentMilestoneId: string): Promise<void> {
    await apiClient.delete(
      `/quotations/payment-milestones/${paymentMilestoneId}`
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
      `/quotations/${quotationId}/payment-milestones/validate`
    )
    return (response.data as any).data as PaymentMilestoneValidationResponse
  },

  /**
   * Generate invoice for a specific payment milestone
   */
  async generateMilestoneInvoice(
    quotationId: string,
    paymentMilestoneId: string
  ): Promise<any> {
    const response = await apiClient.post(
      `/quotations/${quotationId}/payment-milestones/${paymentMilestoneId}/generate-invoice`
    )
    return (response.data as any).data
  },

  /**
   * Get progress summary for all milestones in a quotation
   */
  async getMilestoneProgress(quotationId: string): Promise<any> {
    const response = await apiClient.get(
      `/quotations/${quotationId}/milestone-progress`
    )
    return (response.data as any).data
  },
}
