import { BadRequestException } from '@nestjs/common';

export enum QuotationStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

const VALID_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  [QuotationStatus.DRAFT]: [QuotationStatus.SENT, QuotationStatus.CANCELLED],
  [QuotationStatus.SENT]: [QuotationStatus.APPROVED, QuotationStatus.DECLINED, QuotationStatus.EXPIRED],
  [QuotationStatus.APPROVED]: [], // Terminal state
  [QuotationStatus.DECLINED]: [QuotationStatus.DRAFT], // Allow revision
  [QuotationStatus.EXPIRED]: [QuotationStatus.DRAFT], // Allow renewal
  [QuotationStatus.CANCELLED]: [], // Terminal state
};

/**
 * Validates if a status transition is allowed for quotations
 * @param currentStatus Current quotation status
 * @param newStatus Desired new status
 * @throws BadRequestException if transition is invalid
 */
export function validateStatusTransition(
  currentStatus: QuotationStatus,
  newStatus: QuotationStatus,
): void {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];

  if (!allowedTransitions.includes(newStatus)) {
    throw new BadRequestException(
      `Invalid status transition: ${currentStatus} → ${newStatus}. ` +
      `Allowed transitions: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'None (terminal state)'}`,
    );
  }
}
