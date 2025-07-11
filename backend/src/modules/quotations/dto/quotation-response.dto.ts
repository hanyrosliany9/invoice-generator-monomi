import { QuotationStatus } from '@prisma/client'

export class QuotationResponseDto {
  id: string
  quotationNumber: string
  date: string
  validUntil: string
  amountPerProject: string // Convert Decimal to string
  totalAmount: string // Convert Decimal to string
  terms?: string
  status: QuotationStatus
  createdAt: string
  updatedAt: string
  
  // Client reference
  client: {
    id: string
    name: string
    email?: string
    company?: string
  }
  
  // Project reference
  project: {
    id: string
    number: string
    description: string
    type: string
  }
  
  // User reference (creator)
  createdBy: {
    id: string
    name: string
    email: string
  }
  
  // Relations - summary counts only
  _count?: {
    invoices: number
  }
  
  // Business status
  businessStatus?: {
    canCreateInvoice: boolean
    daysUntilExpiry: number
    isExpired: boolean
  }
}