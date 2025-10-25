/**
 * usePaymentMilestones Hook
 *
 * React Query hooks for managing payment milestones.
 * Provides queries and mutations for CRUD operations on payment milestones.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  paymentMilestonesService,
  CreatePaymentMilestoneDTO,
  UpdatePaymentMilestoneDTO,
} from '../services/payment-milestones'
import { PaymentMilestone } from '../components/quotations'

const QUERY_KEYS = {
  all: ['paymentMilestones'] as const,
  quotation: (quotationId: string) => [...QUERY_KEYS.all, 'quotation', quotationId] as const,
  milestone: (milestoneId: string) => [...QUERY_KEYS.all, 'milestone', milestoneId] as const,
  progress: (quotationId: string) => [...QUERY_KEYS.all, 'progress', quotationId] as const,
  validation: (quotationId: string) => [...QUERY_KEYS.all, 'validation', quotationId] as const,
}

/**
 * Get all payment milestones for a quotation
 */
export function usePaymentMilestones(quotationId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.quotation(quotationId),
    queryFn: () => paymentMilestonesService.getQuotationMilestones(quotationId),
    enabled: !!quotationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Validate milestones for a quotation
 */
export function useValidatePaymentMilestones(quotationId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.validation(quotationId),
    queryFn: () => paymentMilestonesService.validateQuotationMilestones(quotationId),
    enabled: !!quotationId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Get milestone progress summary
 */
export function useMilestoneProgress(quotationId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.progress(quotationId),
    queryFn: () => paymentMilestonesService.getMilestoneProgress(quotationId),
    enabled: !!quotationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Create a new payment milestone
 */
export function useCreatePaymentMilestone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      quotationId,
      data,
    }: {
      quotationId: string
      data: CreatePaymentMilestoneDTO
    }) => paymentMilestonesService.createPaymentMilestone(quotationId, data),
    onSuccess: (data, { quotationId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.quotation(quotationId),
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.validation(quotationId),
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.progress(quotationId),
      })
    },
  })
}

/**
 * Update a payment milestone
 */
export function useUpdatePaymentMilestone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      milestoneId,
      data,
    }: {
      milestoneId: string
      data: UpdatePaymentMilestoneDTO
    }) => paymentMilestonesService.updatePaymentMilestone(milestoneId, data),
    onSuccess: (data) => {
      // Invalidate all milestone queries
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.all,
      })
    },
  })
}

/**
 * Delete a payment milestone
 */
export function useDeletePaymentMilestone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (milestoneId: string) =>
      paymentMilestonesService.deletePaymentMilestone(milestoneId),
    onSuccess: () => {
      // Invalidate all milestone queries
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.all,
      })
    },
  })
}

/**
 * Generate invoice for a payment milestone
 */
export function useGenerateMilestoneInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (milestoneId: string) =>
      paymentMilestonesService.generateMilestoneInvoice(milestoneId),
    onSuccess: () => {
      // Invalidate all milestone and invoice queries
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.all,
      })
      queryClient.invalidateQueries({
        queryKey: ['invoices'],
      })
    },
  })
}
