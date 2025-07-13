export interface DashboardStats {
  totalQuotations: number
  totalInvoices: number
  totalClients: number
  totalProjects: number
  totalRevenue: number
  pendingPayments: number
}

export interface QuotationStats {
  total: number
  byStatus: {
    DRAFT?: number
    SENT?: number
    APPROVED?: number
    DECLINED?: number
  }
}

export interface InvoiceStats {
  total: number
  byStatus: {
    DRAFT?: number
    SENT?: number
    PAID?: number
    OVERDUE?: number
    PENDING?: number
  }
  totalRevenue: string
  overdueCount: number
}

export interface ClientStats {
  total: number
  recent: Array<{
    id: string
    name: string
    email: string
    phone: string
    address: string
    company: string
    contactPerson: string
    paymentTerms: string
    createdAt: string
    updatedAt: string
    _count: {
      quotations: number
      invoices: number
    }
  }>
}

export interface ProjectStats {
  total: number
  byStatus: {
    PLANNING?: number
    IN_PROGRESS?: number
    COMPLETED?: number
    CANCELLED?: number
  }
  byType: {
    PRODUCTION?: number
    SOCIAL_MEDIA?: number
    CONSULTING?: number
    OTHER?: number
  }
}

export interface RecentQuotation {
  id: string
  quotationNumber: string
  date: string
  validUntil: string
  clientId: string
  projectId: string
  amountPerProject: string
  totalAmount: string
  terms: string
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED'
  createdBy: string
  createdAt: string
  updatedAt: string
  client: {
    id: string
    name: string
    email: string
    phone: string
    address: string
    company: string
    contactPerson: string
    paymentTerms: string
    createdAt: string
    updatedAt: string
  }
  project: {
    id: string
    number: string
    description: string
    output: string
    type: string
    clientId: string
    startDate: string
    endDate: string
    basePrice: string
    status: string
    createdAt: string
    updatedAt: string
  }
}

export interface RecentInvoice {
  id: string
  invoiceNumber: string
  creationDate: string
  dueDate: string
  quotationId: string | null
  clientId: string
  projectId: string
  amountPerProject: string
  totalAmount: string
  paymentInfo: string
  materaiRequired: boolean
  materaiApplied: boolean
  terms: string
  signature: string | null
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'PENDING'
  createdBy: string
  createdAt: string
  updatedAt: string
  client: {
    id: string
    name: string
    email: string
    phone: string
    address: string
    company: string
    contactPerson: string
    paymentTerms: string
    createdAt: string
    updatedAt: string
  }
  project: {
    id: string
    number: string
    description: string
    output: string
    type: string
    clientId: string
    startDate: string
    endDate: string
    basePrice: string
    status: string
    createdAt: string
    updatedAt: string
  }
}

export interface DashboardData {
  stats: DashboardStats
  recentQuotations: RecentQuotation[]
  recentInvoices: RecentInvoice[]
}

export interface ApiResponse<T> {
  data: T
  message: string
  status: 'success' | 'error'
}
