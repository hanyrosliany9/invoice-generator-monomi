// Business Journey Types - Indonesian Business Management System
// Enhanced with accessibility, performance, and security considerations

export interface BusinessJourneyEvent {
  id: string
  type: BusinessJourneyEventType
  title: string
  description: string
  status: BusinessJourneyEventStatus
  amount?: number
  createdAt: string
  updatedAt: string
  metadata: BusinessJourneyEventMetadata
  relatedEntity?: RelatedEntity
}

export enum BusinessJourneyEventType {
  CLIENT_CREATED = 'client_created',
  PROJECT_STARTED = 'project_started',
  QUOTATION_DRAFT = 'quotation_draft',
  QUOTATION_SENT = 'quotation_sent',
  QUOTATION_APPROVED = 'quotation_approved',
  QUOTATION_DECLINED = 'quotation_declined',
  QUOTATION_REVISED = 'quotation_revised',
  INVOICE_GENERATED = 'invoice_generated',
  INVOICE_SENT = 'invoice_sent',
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_OVERDUE = 'payment_overdue',
  MATERAI_REQUIRED = 'materai_required',
  MATERAI_APPLIED = 'materai_applied',
}

export enum BusinessJourneyEventStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REQUIRES_ATTENTION = 'requires_attention',
}

// Type aliases for backward compatibility
export type BusinessJourneyEventTypeUnion =
  | keyof typeof BusinessJourneyEventType
  | BusinessJourneyEventType
export type BusinessJourneyEventStatusUnion =
  | keyof typeof BusinessJourneyEventStatus
  | BusinessJourneyEventStatus

export interface BusinessJourneyEventMetadata {
  userCreated: string
  userModified?: string
  source: 'system' | 'user' | 'api'
  priority: 'low' | 'medium' | 'high' | 'critical'
  tags: string[]
  relatedDocuments?: string[]
  notes?: string
}

export interface RelatedEntity {
  id: string
  type: 'client' | 'project' | 'quotation' | 'invoice' | 'payment'
  name: string
  number?: string
  url?: string
}

export interface BusinessJourneyTimelineProps {
  clientId: string
  maxEvents?: number
  showFilters?: boolean
  enableVirtualization?: boolean
  userPermissions?: UserPermissions
  dataPrivacyLevel?: 'standard' | 'restricted' | 'anonymized'
  onEventClick?: (event: BusinessJourneyEvent) => void
  onFilterChange?: (filters: BusinessJourneyFilters) => void
  className?: string
}

export interface UserPermissions {
  canViewFinancials: boolean
  canViewPersonalData: boolean
  canEditEvents: boolean
  canDeleteEvents: boolean
  canExportData: boolean
}

export interface BusinessJourneyFilters {
  eventTypes: BusinessJourneyEventType[]
  dateRange: {
    start: string
    end: string
  }
  statusFilter: BusinessJourneyEventStatus[]
  amountRange?: {
    min: number
    max: number
  }
  searchTerm?: string
}

export interface BusinessJourneyData {
  clientId: string
  clientName: string
  totalEvents: number
  totalRevenue: number
  events: BusinessJourneyEvent[]
  summary: BusinessJourneySummary
  materaiCompliance: MateraiComplianceStatus
}

export interface BusinessJourneySummary {
  totalProjects: number
  totalQuotations: number
  totalInvoices: number
  totalPayments: number
  averageProjectValue: number
  averagePaymentDelay: number
  completionRate: number
}

export interface MateraiComplianceStatus {
  required: boolean
  totalRequiredAmount: number
  appliedAmount: number
  pendingAmount: number
  compliancePercentage: number
  nextRequiredDate?: string
}

// Performance tracking interfaces
export interface UXMetrics {
  componentName: string
  loadTime: number
  interactionDelay: number
  renderComplete: number
  userSatisfaction: 'good' | 'needs-improvement' | 'poor'
}

export interface BusinessJourneyTimelinePerformance {
  initialLoadTime: number
  filterResponseTime: number
  scrollPerformance: number
  memoryUsage: number
  renderCount: number
}

// Accessibility interfaces
export interface AccessibilityConfig {
  screenReaderSupport: boolean
  keyboardNavigationEnabled: boolean
  highContrastMode: boolean
  reducedMotion: boolean
  announceChanges: boolean
}

// Indonesian localization specific types
export interface IndonesianBusinessContext {
  materaiThreshold: number
  materaiAmount: number
  businessEtiquette: BusinessEtiquetteGuide
  paymentMethods: IndonesianPaymentMethod[]
  culturalConsiderations: CulturalConsideration[]
}

export interface BusinessEtiquetteGuide {
  greetingStyle: string
  communicationTone: 'formal' | 'semi-formal' | 'informal'
  followUpTimeline: Record<string, number>
  documentDeliveryExpectations: string[]
}

export interface IndonesianPaymentMethod {
  id: string
  name: string
  provider: string
  isPreferred: boolean
  processingTime: string
  fees: number
}

export interface CulturalConsideration {
  id: string
  title: string
  description: string
  applicableEvents: BusinessJourneyEventType[]
  importance: 'low' | 'medium' | 'high'
}

// Error handling types
export interface BusinessJourneyError {
  code: string
  message: string
  details?: string
  timestamp: string
  userId?: string
}

export type BusinessJourneyErrorType =
  | 'DATA_FETCH_ERROR'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

// API response types
export interface BusinessJourneyApiResponse {
  success: boolean
  data?: BusinessJourneyData
  error?: BusinessJourneyError
  meta?: {
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}

// Event handlers
export type BusinessJourneyEventHandler = (event: BusinessJourneyEvent) => void
export type BusinessJourneyFilterHandler = (
  filters: BusinessJourneyFilters
) => void
export type BusinessJourneyErrorHandler = (error: BusinessJourneyError) => void
