/**
 * Status Utility Helpers
 *
 * Centralized functions for status mapping, colors, and text
 * to eliminate duplication across pages.
 */

import { colors } from '../styles/designTokens'

// ========================================
// QUOTATION STATUS
// ========================================

export type QuotationStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'REVISED'

export const quotationStatusColors: Record<QuotationStatus, string> = {
  DRAFT: colors.status.draft,
  SENT: colors.status.sent,
  APPROVED: colors.status.approved,
  DECLINED: colors.status.declined,
  REVISED: colors.status.revised,
}

export const quotationStatusText: Record<QuotationStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Terkirim',
  APPROVED: 'Disetujui',
  DECLINED: 'Ditolak',
  REVISED: 'Revisi',
}

export const getQuotationStatusColor = (status: string): string => {
  const upperStatus = status.toUpperCase() as QuotationStatus
  return quotationStatusColors[upperStatus] || colors.status.draft
}

export const getQuotationStatusText = (status: string): string => {
  const upperStatus = status.toUpperCase() as QuotationStatus
  return quotationStatusText[upperStatus] || status
}

// ========================================
// INVOICE STATUS
// ========================================

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PENDING'

export const invoiceStatusColors: Record<InvoiceStatus, string> = {
  DRAFT: colors.status.draft,
  SENT: colors.status.sent,
  PAID: colors.status.paid,
  OVERDUE: colors.status.overdue,
  CANCELLED: colors.status.cancelled,
  PENDING: colors.status.pending,
}

export const invoiceStatusText: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Terkirim',
  PAID: 'Lunas',
  OVERDUE: 'Jatuh Tempo',
  CANCELLED: 'Dibatalkan',
  PENDING: 'Tertunda',
}

export const getInvoiceStatusColor = (status: string): string => {
  const upperStatus = status.toUpperCase() as InvoiceStatus
  return invoiceStatusColors[upperStatus] || colors.status.draft
}

export const getInvoiceStatusText = (status: string): string => {
  const upperStatus = status.toUpperCase() as InvoiceStatus
  return invoiceStatusText[upperStatus] || status
}

// ========================================
// CLIENT STATUS
// ========================================

export type ClientStatus = 'active' | 'inactive'

export const clientStatusColors: Record<ClientStatus, string> = {
  active: colors.success[500],
  inactive: colors.error[500],
}

export const clientStatusText: Record<ClientStatus, string> = {
  active: 'Aktif',
  inactive: 'Tidak Aktif',
}

export const getClientStatusColor = (status: string): string => {
  const lowerStatus = status.toLowerCase() as ClientStatus
  return clientStatusColors[lowerStatus] || colors.neutral[500]
}

export const getClientStatusText = (status: string): string => {
  const lowerStatus = status.toLowerCase() as ClientStatus
  return clientStatusText[lowerStatus] || status
}

// ========================================
// PROJECT STATUS
// ========================================

export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'

export const projectStatusColors: Record<ProjectStatus, string> = {
  PLANNING: colors.info[500],
  IN_PROGRESS: colors.warning[500],
  COMPLETED: colors.success[500],
  ON_HOLD: colors.warning[400],
  CANCELLED: colors.error[500],
}

export const projectStatusText: Record<ProjectStatus, string> = {
  PLANNING: 'Perencanaan',
  IN_PROGRESS: 'Sedang Berjalan',
  COMPLETED: 'Selesai',
  ON_HOLD: 'Ditunda',
  CANCELLED: 'Dibatalkan',
}

export const getProjectStatusColor = (status: string): string => {
  const upperStatus = status.toUpperCase() as ProjectStatus
  return projectStatusColors[upperStatus] || colors.neutral[500]
}

export const getProjectStatusText = (status: string): string => {
  const upperStatus = status.toUpperCase() as ProjectStatus
  return projectStatusText[upperStatus] || status
}

// ========================================
// PAYMENT STATUS
// ========================================

export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED'

export const paymentStatusColors: Record<PaymentStatus, string> = {
  PENDING: colors.warning[500],
  CONFIRMED: colors.success[500],
  FAILED: colors.error[500],
  REFUNDED: colors.info[500],
}

export const paymentStatusText: Record<PaymentStatus, string> = {
  PENDING: 'Tertunda',
  CONFIRMED: 'Terkonfirmasi',
  FAILED: 'Gagal',
  REFUNDED: 'Dikembalikan',
}

export const getPaymentStatusColor = (status: string): string => {
  const upperStatus = status.toUpperCase() as PaymentStatus
  return paymentStatusColors[upperStatus] || colors.neutral[500]
}

export const getPaymentStatusText = (status: string): string => {
  const upperStatus = status.toUpperCase() as PaymentStatus
  return paymentStatusText[upperStatus] || status
}

// ========================================
// GENERIC STATUS HELPER
// ========================================

/**
 * Generic status helper that auto-detects status type
 * and returns appropriate color and text
 */
export interface StatusInfo {
  color: string
  text: string
  original: string
}

export const getStatusInfo = (status: string, context?: 'quotation' | 'invoice' | 'client' | 'project' | 'payment'): StatusInfo => {
  const upperStatus = status.toUpperCase()
  const lowerStatus = status.toLowerCase()

  // Auto-detect context if not provided
  if (!context) {
    if (['DRAFT', 'SENT', 'APPROVED', 'DECLINED', 'REVISED'].includes(upperStatus)) {
      context = 'quotation'
    } else if (['PAID', 'OVERDUE', 'CANCELLED'].includes(upperStatus)) {
      context = 'invoice'
    } else if (['active', 'inactive'].includes(lowerStatus)) {
      context = 'client'
    } else if (['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'].includes(upperStatus)) {
      context = 'project'
    } else if (['CONFIRMED', 'FAILED', 'REFUNDED'].includes(upperStatus)) {
      context = 'payment'
    }
  }

  // Get color and text based on context
  let color: string
  let text: string

  switch (context) {
    case 'quotation':
      color = getQuotationStatusColor(status)
      text = getQuotationStatusText(status)
      break
    case 'invoice':
      color = getInvoiceStatusColor(status)
      text = getInvoiceStatusText(status)
      break
    case 'client':
      color = getClientStatusColor(status)
      text = getClientStatusText(status)
      break
    case 'project':
      color = getProjectStatusColor(status)
      text = getProjectStatusText(status)
      break
    case 'payment':
      color = getPaymentStatusColor(status)
      text = getPaymentStatusText(status)
      break
    default:
      color = colors.neutral[500]
      text = status
  }

  return {
    color,
    text,
    original: status,
  }
}
