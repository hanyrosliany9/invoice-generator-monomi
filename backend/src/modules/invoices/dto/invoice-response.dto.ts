import { InvoiceStatus } from "@prisma/client";

export class InvoiceResponseDto {
  id: string;
  invoiceNumber: string;
  creationDate: string;
  dueDate: string;
  amountPerProject: string; // Convert Decimal to string
  totalAmount: string; // Convert Decimal to string
  paymentInfo: string;

  // Business details
  scopeOfWork?: string;
  priceBreakdown?: Record<string, any>;

  // Materai fields
  materaiRequired: boolean;
  materaiApplied: boolean;
  materaiAmount?: string;
  materaiAppliedAt?: string;
  materaiAppliedBy?: string;

  terms?: string;
  signature?: string;
  status: InvoiceStatus;
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

  // Quotation reference (if exists)
  quotationId?: string; // Flattened for easy access
  quotation?: {
    id: string;
    quotationNumber: string;
    date: string;
  };

  // Payment Milestone reference (if exists)
  paymentMilestone?: {
    id: string;
    milestoneNumber: number;
    name: string;
    nameId?: string;
    description?: string;
    descriptionId?: string;
    paymentPercentage: string;
    paymentAmount: string;
    dueDate?: string;
    deliverables?: any;
    isInvoiced: boolean;
  };

  // User reference (creator)
  createdBy: {
    id: string;
    name: string;
    email: string;
  };

  // Payment summary
  paymentSummary: {
    totalPaid: string;
    remainingAmount: string;
    paymentCount: number;
    lastPaymentDate?: string;
  };

  // Business status
  businessStatus?: {
    isOverdue: boolean;
    daysOverdue: number;
    daysToDue: number;
    materaiStatus: "NOT_REQUIRED" | "REQUIRED" | "APPLIED";
  };
}
