import type { PaymentMilestone } from './payment-milestones';

export enum QuotationStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  REVISED = 'REVISED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  clientId: string;
  projectId?: string;
  status: QuotationStatus;
  validUntil?: string;
  totalAmount: string | number;
  scopeOfWork?: string;
  priceBreakdown?: Record<string, any>;
  paymentType?: string;
  paymentTermsText?: string;

  // Approval/rejection audit fields
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;

  // Relations
  client?: {
    id: string;
    name: string;
    company?: string;
    email?: string;
    phone: string;
  };
  project?: {
    id: string;
    projectNumber: string;
    name: string;
    description?: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };

  // Payment milestones
  paymentMilestones?: PaymentMilestone[];

  // Invoices summary
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
  }>;

  // Audit fields
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Form values for creating/editing quotations
 */
export interface QuotationFormValues {
  quotationNumber: string;
  clientId: string;
  projectId?: string;
  validUntil: Date | string;
  totalAmount: number | string;
  includePPN: boolean;
  scopeOfWork?: string;
  priceBreakdown?: Record<string, number>;
  paymentType?: 'FULL' | 'MILESTONE';
  paymentTermsText?: string;
  paymentMilestones: PaymentMilestone[];
}

/**
 * DTO for updating quotation status
 */
export interface UpdateQuotationStatusDto {
  status: QuotationStatus;
}
