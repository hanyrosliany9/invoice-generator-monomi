import { QuotationStatus } from "@prisma/client";

export class QuotationResponseDto {
  id: string;
  quotationNumber: string;
  date: string;
  validUntil: string;
  amountPerProject: string; // Convert Decimal to string
  totalAmount: string; // Convert Decimal to string
  terms?: string;

  // Business details
  scopeOfWork?: string;
  priceBreakdown?: Record<string, any>;
  paymentType?: string;
  paymentTermsText?: string;

  status: QuotationStatus;

  // Approval audit fields
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;

  createdAt: string;
  updatedAt: string;

  // Client reference
  client: {
    id: string;
    name: string;
    email?: string;
    company?: string;
  };

  // Project reference
  project: {
    id: string;
    number: string;
    description: string;
    type: string;
  };

  // User reference (creator)
  createdBy: {
    id: string;
    name: string;
    email: string;
  };

  // Payment milestones (if milestone-based)
  paymentMilestones?: {
    id: string;
    milestoneNumber: number;
    name: string;
    paymentPercentage: string;
    paymentAmount: string;
    dueDate?: string;
    isInvoiced: boolean;
  }[];

  // Invoices summary
  invoices?: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: string;
  }[];

  // Relations - summary counts only
  _count?: {
    invoices: number;
    paymentMilestones: number;
  };

  // Business status
  businessStatus?: {
    canCreateInvoice: boolean;
    daysUntilExpiry: number;
    isExpired: boolean;
  };
}
