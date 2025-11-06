import { BadRequestException } from '@nestjs/common';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID_OFF = 'PAID_OFF',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

const VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  [InvoiceStatus.DRAFT]: [InvoiceStatus.SENT, InvoiceStatus.CANCELLED],
  [InvoiceStatus.SENT]: [InvoiceStatus.PENDING_PAYMENT, InvoiceStatus.PAID_OFF, InvoiceStatus.OVERDUE],
  [InvoiceStatus.PENDING_PAYMENT]: [InvoiceStatus.PAID_OFF, InvoiceStatus.OVERDUE],
  [InvoiceStatus.OVERDUE]: [InvoiceStatus.PAID_OFF],
  [InvoiceStatus.PAID_OFF]: [], // Terminal state
  [InvoiceStatus.CANCELLED]: [], // Terminal state
};

/**
 * Validates if a status transition is allowed for invoices
 * @param currentStatus Current invoice status
 * @param newStatus Desired new status
 * @throws BadRequestException if transition is invalid
 */
export function validateInvoiceStatusTransition(
  currentStatus: InvoiceStatus,
  newStatus: InvoiceStatus,
): void {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];

  if (!allowedTransitions.includes(newStatus)) {
    throw new BadRequestException(
      `Invalid invoice status transition: ${currentStatus} → ${newStatus}. ` +
      `Allowed transitions: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'None (terminal state)'}`,
    );
  }
}
