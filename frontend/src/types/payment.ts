export interface Payment {
  id: string
  invoiceId: string
  amount: string
  paymentDate: string
  paymentMethod: PaymentMethod
  transactionRef?: string
  bankDetails?: string
  status: PaymentStatus
  confirmedAt?: string
  createdAt: string
  updatedAt: string

  // Relations
  invoice?: {
    id: string
    invoiceNumber: string
    totalAmount: string
    client: {
      id: string
      name: string
      email?: string
    }
  }
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  OTHER = 'OTHER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface CreatePaymentRequest {
  invoiceId: string
  amount: string | number
  paymentDate: string
  paymentMethod: PaymentMethod
  transactionRef?: string
  bankDetails?: string
}

export interface UpdatePaymentRequest {
  amount?: string | number
  paymentDate?: string
  paymentMethod?: PaymentMethod
  transactionRef?: string
  bankDetails?: string
  status?: PaymentStatus
  confirmedAt?: string
}

export interface PaymentStats {
  [key: string]: {
    count: number
    total: string
  }
}

export interface PaymentSummary {
  totalPaid: string
  remainingAmount: string
  paymentCount: number
  lastPaymentDate?: string
}

export interface PaymentResponse {
  data: Payment | Payment[] | PaymentStats | null
  message: string
  status: 'success' | 'error'
}
