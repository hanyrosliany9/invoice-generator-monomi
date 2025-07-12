// Enhanced Navigation Types - Indonesian Business Management System
// Comprehensive navigation with relationship context and business flow guidance

export interface BreadcrumbItem {
  id: string
  label: string
  href?: string
  icon?: string
  isActive?: boolean
  isClickable?: boolean
  entityType: 'client' | 'project' | 'quotation' | 'invoice' | 'payment' | 'home'
  entityId?: string
  metadata?: BreadcrumbMetadata
}

export interface BreadcrumbMetadata {
  number?: string // Entity number (project number, invoice number, etc.)
  status?: string
  amount?: number
  date?: string
  description?: string
  businessStage?: BusinessStage
  complianceStatus?: 'compliant' | 'warning' | 'error'
  materaiRequired?: boolean
}

export type BusinessStage = 
  | 'prospect' 
  | 'quotation' 
  | 'approved' 
  | 'invoicing' 
  | 'payment' 
  | 'completed'
  | 'cancelled'

export interface RelationshipContext {
  parentEntity?: EntityReference
  childEntities?: EntityReference[]
  relatedEntities?: EntityReference[]
  businessFlow?: BusinessFlowStep[]
  nextPossibleActions?: NextAction[]
}

export interface EntityReference {
  id: string
  type: 'client' | 'project' | 'quotation' | 'invoice' | 'payment'
  name: string
  number?: string
  status?: string
  href?: string
  icon?: string
  metadata?: any
}

export interface BusinessFlowStep {
  id: string
  stage: BusinessStage
  title: string
  description?: string
  isCompleted: boolean
  isCurrent: boolean
  isAvailable: boolean
  expectedDuration?: string
  businessRules?: BusinessRule[]
}

export interface BusinessRule {
  id: string
  type: 'requirement' | 'suggestion' | 'warning'
  message: string
  indonesianContext?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export interface NextAction {
  id: string
  label: string
  description?: string
  icon?: string
  href?: string
  onClick?: () => void
  priority: 'high' | 'medium' | 'low'
  category: 'create' | 'edit' | 'approve' | 'decline' | 'payment' | 'export'
  indonesianEtiquette?: IndonesianBusinessEtiquette
}

export interface IndonesianBusinessEtiquette {
  suggestedTiming?: string
  culturalConsiderations?: string[]
  communicationStyle?: 'formal' | 'semi-formal' | 'friendly'
  preferredChannels?: ('email' | 'whatsapp' | 'phone' | 'meeting')[]
}

export interface NavigationState {
  currentPath: BreadcrumbItem[]
  relationshipContext: RelationshipContext
  businessStage: BusinessStage
  userPermissions: NavigationPermissions
  mobileView: boolean
  showRelationships: boolean
}

export interface NavigationPermissions {
  canViewClients: boolean
  canCreateProjects: boolean
  canCreateQuotations: boolean
  canApproveQuotations: boolean
  canCreateInvoices: boolean
  canViewPayments: boolean
  canExportData: boolean
  canAccessReports: boolean
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  relationshipContext?: RelationshipContext
  onItemClick?: (item: BreadcrumbItem) => void
  onRelationshipClick?: (entity: EntityReference) => void
  showRelationships?: boolean
  showBusinessFlow?: boolean
  maxItems?: number
  separator?: string
  className?: string
  mobileOptimized?: boolean
  indonesianLocale?: boolean
}

export interface RelationshipPanelProps {
  context: RelationshipContext
  currentEntity: EntityReference
  onEntityClick?: (entity: EntityReference) => void
  onActionClick?: (action: NextAction) => void
  showBusinessFlow?: boolean
  showNextActions?: boolean
  indonesianBusinessRules?: boolean
  className?: string
}

export interface BusinessFlowNavigatorProps {
  currentStage: BusinessStage
  steps: BusinessFlowStep[]
  onStageClick?: (stage: BusinessStage) => void
  showProgress?: boolean
  showETA?: boolean
  indonesianContext?: boolean
  className?: string
}

export interface MobileNavigationProps {
  currentEntity: EntityReference
  breadcrumbs: BreadcrumbItem[]
  quickActions: NextAction[]
  onBreadcrumbClick?: (item: BreadcrumbItem) => void
  onActionClick?: (action: NextAction) => void
  className?: string
}

// Indonesian Business Workflow Types
export interface IndonesianWorkflowGuide {
  stage: BusinessStage
  title: string
  description: string
  requirements: WorkflowRequirement[]
  recommendations: WorkflowRecommendation[]
  culturalNotes: CulturalNote[]
  documents: RequiredDocument[]
}

export interface WorkflowRequirement {
  id: string
  title: string
  description: string
  isMandatory: boolean
  isCompleted: boolean
  deadline?: string
  indonesianRegulation?: string
}

export interface WorkflowRecommendation {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  effort: 'easy' | 'moderate' | 'complex'
  businessBenefit: string
}

export interface CulturalNote {
  id: string
  category: 'etiquette' | 'timing' | 'communication' | 'documentation'
  title: string
  description: string
  examples?: string[]
}

export interface RequiredDocument {
  id: string
  name: string
  description: string
  template?: string
  isRequired: boolean
  materaiRequired?: boolean
  deadline?: string
  formatRequirements?: string[]
}

// Navigation Analytics Types
export interface NavigationMetrics {
  componentName: string
  action: 'breadcrumb_click' | 'relationship_view' | 'flow_navigation' | 'mobile_swipe'
  entityType?: string
  entityId?: string
  fromStage?: BusinessStage
  toStage?: BusinessStage
  timestamp: number
  userId?: string
  sessionId?: string
}

export interface NavigationAnalytics {
  trackBreadcrumbUsage: (item: BreadcrumbItem) => void
  trackRelationshipExploration: (from: EntityReference, to: EntityReference) => void
  trackBusinessFlowNavigation: (from: BusinessStage, to: BusinessStage) => void
  trackMobileGesture: (gesture: 'swipe' | 'tap' | 'pinch') => void
}

// Error Handling Types
export interface NavigationError {
  code: string
  message: string
  indonesianMessage?: string
  recovery?: {
    action: string
    href?: string
    onClick?: () => void
  }
}