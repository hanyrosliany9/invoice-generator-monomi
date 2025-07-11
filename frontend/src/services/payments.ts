import { api } from '../config/api'
import { 
  Payment, 
  CreatePaymentRequest, 
  UpdatePaymentRequest, 
  PaymentStats, 
  PaymentResponse,
  PaymentStatus 
} from '../types/payment'

export const paymentsService = {
  // Create a new payment
  async createPayment(data: CreatePaymentRequest): Promise<Payment> {
    const response = await api.post<PaymentResponse>('/payments', data)
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    return response.data.data as Payment
  },

  // Get all payments (optionally filtered by invoice)
  async getPayments(invoiceId?: string): Promise<Payment[]> {
    const params = invoiceId ? { invoiceId } : {}
    const response = await api.get<PaymentResponse>('/payments', { params })
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return (response.data.data as Payment[]) || []
  },

  // Get payment by ID
  async getPaymentById(id: string): Promise<Payment> {
    const response = await api.get<PaymentResponse>(`/payments/${id}`)
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as Payment
  },

  // Update payment
  async updatePayment(id: string, data: UpdatePaymentRequest): Promise<Payment> {
    const response = await api.patch<PaymentResponse>(`/payments/${id}`, data)
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as Payment
  },

  // Delete payment
  async deletePayment(id: string): Promise<void> {
    const response = await api.delete<PaymentResponse>(`/payments/${id}`)
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
  },

  // Get payments for specific invoice
  async getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    const response = await api.get<PaymentResponse>(`/payments/invoice/${invoiceId}`)
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return (response.data.data as Payment[]) || []
  },

  // Confirm payment
  async confirmPayment(id: string): Promise<Payment> {
    const response = await api.patch<PaymentResponse>(`/payments/${id}/confirm`)
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data as Payment
  },

  // Get payment statistics
  async getPaymentStats(invoiceId?: string): Promise<PaymentStats> {
    const params = invoiceId ? { invoiceId } : {}
    const response = await api.get<PaymentResponse>('/payments/stats', { params })
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return (response.data.data as PaymentStats) || {}
  },

  // Calculate payment summary for an invoice
  calculatePaymentSummary(payments: Payment[], invoiceTotal: string | number): {
    totalPaid: string
    remainingAmount: string
    paymentCount: number
    lastPaymentDate?: string
  } {
    const confirmedPayments = payments.filter(p => p.status === PaymentStatus.CONFIRMED)
    
    const totalPaid = confirmedPayments.reduce((sum, payment) => {
      return sum + parseFloat(payment.amount)
    }, 0)
    
    const invoiceAmount = typeof invoiceTotal === 'string' ? parseFloat(invoiceTotal) : invoiceTotal
    const remainingAmount = Math.max(0, invoiceAmount - totalPaid)
    
    const lastPayment = confirmedPayments
      .sort((a, b) => new Date(b.confirmedAt || b.createdAt).getTime() - new Date(a.confirmedAt || a.createdAt).getTime())
      .at(0)
    
    const lastDate = lastPayment?.confirmedAt || lastPayment?.createdAt
    return {
      totalPaid: totalPaid.toFixed(2),
      remainingAmount: remainingAmount.toFixed(2),
      paymentCount: confirmedPayments.length,
      ...(lastDate && { lastPaymentDate: lastDate })
    }
  },

  // Format payment amount for display
  formatPaymentAmount(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num)
  },

  // Validate payment amount
  validatePaymentAmount(amount: string | number, invoiceTotal: string | number, existingPayments: Payment[]): {
    isValid: boolean
    error?: string
  } {
    const paymentAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    const invoiceAmount = typeof invoiceTotal === 'string' ? parseFloat(invoiceTotal) : invoiceTotal
    
    if (paymentAmount <= 0) {
      return { isValid: false, error: 'Jumlah pembayaran harus lebih dari 0' }
    }
    
    const totalPaid = existingPayments
      .filter(p => p.status === PaymentStatus.CONFIRMED)
      .reduce((sum, payment) => sum + parseFloat(payment.amount), 0)
    
    if (totalPaid + paymentAmount > invoiceAmount) {
      return { isValid: false, error: 'Total pembayaran melebihi jumlah invoice' }
    }
    
    return { isValid: true }
  }
}