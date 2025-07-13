export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export interface Invoice {
  id: string
  invoiceNumber: string
  number?: string
  creationDate: string
  dueDate: string
  quotationId?: string
  clientId: string
  projectId: string
  amountPerProject: string | number
  totalAmount: string | number
  amount?: string | number
  paymentInfo: string
  materaiRequired: boolean
  materaiApplied: boolean
  terms: string
  signature?: string
  status: InvoiceStatus
  createdBy: string
  createdAt: string
  updatedAt: string
  paidAt?: string

  // Payment tracking
  paymentSummary?: {
    totalPaid: string
    remainingAmount: string
    paymentCount: number
    lastPaymentDate?: string
  }

  // Business status
  businessStatus?: {
    isOverdue: boolean
    daysOverdue: number
    daysToDue: number
    materaiStatus: 'NOT_REQUIRED' | 'REQUIRED' | 'APPLIED'
  }

  clientName?: string
  projectName?: string
  client?: {
    id: string
    name: string
    company: string
    email: string
  }
  project?: {
    id: string
    number: string
    description: string
    type: string
  }
  user?: {
    id: string
    name: string
    email: string
  }
  quotation?: {
    id: string
    quotationNumber: string
    status: string
  }
  payments?: Array<{
    id: string
    amount: string
    paymentDate: string
    paymentMethod: string
    status: string
  }>
}
