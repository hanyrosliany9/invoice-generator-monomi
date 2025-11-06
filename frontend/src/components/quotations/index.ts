/**
 * Quotations Components
 *
 * UI components for quotation management, including:
 * - Milestone payment terms builder
 * - Milestone progress tracking
 * - Payment term templates (Indonesian business practices)
 */

export { MilestonePaymentTerms } from './MilestonePaymentTerms'
export { MilestoneProgressTracker } from './MilestoneProgressTracker'
export { PaymentMilestoneForm } from './PaymentMilestoneForm'

// Re-export types from centralized types file to prevent circular dependencies
export type { PaymentMilestone, PaymentMilestoneFormItem, MilestoneProgress } from '../../types/payment-milestones'
