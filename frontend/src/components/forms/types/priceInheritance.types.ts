// Price Inheritance Types - Indonesian Business Management System
// Comprehensive type definitions for price inheritance flow with Indonesian compliance

export type PriceInheritanceMode = 'inherit' | 'custom' | 'partial'
export type PriceDeviationType = 'none' | 'minor' | 'significant' | 'extreme'
export type ValidationSeverity = 'info' | 'warning' | 'error' | 'success'
export type IndonesianBusinessRule = 'materai' | 'tax_compliance' | 'business_etiquette'

export interface PriceSource {
  id: string
  type: 'project' | 'quotation' | 'template' | 'manual'
  entityName: string
  entityNumber?: string
  originalAmount: number
  lastUpdated: Date
  metadata?: {
    createdBy?: string
    approvedBy?: string
    notes?: string
  }
}

export interface PriceInheritanceConfig {
  mode: PriceInheritanceMode
  source: PriceSource | null
  currentAmount: number
  inheritedAmount?: number
  deviationPercentage?: number
  deviationType: PriceDeviationType
  isLocked?: boolean
  requiresApproval?: boolean
}

export interface PriceValidationRule {
  id: string
  type: IndonesianBusinessRule | 'pricing' | 'business_logic'
  severity: ValidationSeverity
  message: string
  indonesianContext?: string
  suggestedAction?: string
  isBlocking?: boolean
  metadata?: {
    threshold?: number
    calculatedValue?: number
    requiredDocuments?: string[]
  }
}

export interface PriceValidationResult {
  isValid: boolean
  warnings: PriceValidationRule[]
  errors: PriceValidationRule[]
  suggestions: PriceValidationRule[]
  materaiCompliance?: {
    required: boolean
    amount: number
    reason: string
  }
  businessEtiquette?: {
    suggestedTiming: string
    communicationStyle: 'formal' | 'semi-formal' | 'casual'
    culturalNotes: string[]
  }
}

export interface PriceInheritanceFlowProps {
  // Core configuration
  sourceEntity: {
    id: string
    type: 'project' | 'quotation'
    name: string
    number?: string
  }
  currentAmount: number
  onAmountChange: (amount: number, config: PriceInheritanceConfig) => void
  
  // Inheritance options
  availableSources?: PriceSource[]
  defaultMode?: PriceInheritanceMode
  allowCustomOverride?: boolean
  
  // Validation and rules
  validationRules?: PriceValidationRule[]
  enableMateraiValidation?: boolean
  enableBusinessEtiquette?: boolean
  
  // UI configuration
  showVisualIndicators?: boolean
  showDeviationWarnings?: boolean
  compactMode?: boolean
  className?: string
  
  // Event handlers
  onModeChange?: (mode: PriceInheritanceMode) => void
  onSourceChange?: (source: PriceSource) => void
  onValidationChange?: (result: PriceValidationResult) => void
  
  // Indonesian localization
  indonesianLocale?: boolean
  currencyLocale?: string
  
  // Accessibility
  ariaLabel?: string
  ariaDescribedBy?: string
  
  // Testing and analytics
  testId?: string
  trackUserInteraction?: boolean
}

export interface PriceDeviationAnalysis {
  percentage: number
  deviationType: PriceDeviationType
  reasons: string[]
  recommendations: string[]
  businessImpact: {
    profitMargin: number
    competitiveness: 'low' | 'medium' | 'high'
    riskLevel: 'low' | 'medium' | 'high'
  }
  indonesianContext?: {
    marketStandards: string
    negotiationTips: string[]
    culturalConsiderations: string[]
  }
}

export interface UserTestingMetrics {
  componentId: string
  userId: string
  sessionId: string
  interactions: {
    modeChanges: number
    amountEdits: number
    validationTriggered: number
    helpViewed: number
  }
  timeMetrics: {
    timeToUnderstand: number // milliseconds
    timeToComplete: number
    hesitationPoints: string[]
  }
  errorMetrics: {
    validationErrors: number
    userErrors: number
    recoveryTime: number
  }
  satisfactionScore?: number // 1-10
  usabilityScore?: number // SUS score
  comments?: string[]
}

// Form integration types
export interface FormFieldConfig {
  fieldName: string
  label: string
  isRequired: boolean
  validation: PriceValidationRule[]
  helpText?: string
  placeholder?: string
}

export interface PriceInheritanceFormState {
  config: PriceInheritanceConfig
  validationResult: PriceValidationResult
  userTesting?: UserTestingMetrics
  formErrors: Record<string, string>
  isDirty: boolean
  isSubmitting: boolean
}

// Analytics and monitoring types
export interface PriceInheritanceAnalytics {
  featureUsage: {
    inheritanceMode: Record<PriceInheritanceMode, number>
    sourceTypes: Record<string, number>
    deviationFrequency: Record<PriceDeviationType, number>
  }
  userBehavior: {
    averageTimeToDecision: number
    commonErrorPatterns: string[]
    successRate: number
    abandonmentRate: number
  }
  businessImpact: {
    pricingAccuracy: number
    errorReduction: number
    timeToComplete: number
    userSatisfaction: number
  }
}

// Export commonly used utility types
export type PriceInheritanceEvent = 
  | { type: 'mode_changed'; mode: PriceInheritanceMode }
  | { type: 'amount_changed'; amount: number }
  | { type: 'source_selected'; source: PriceSource }
  | { type: 'validation_triggered'; result: PriceValidationResult }
  | { type: 'user_interaction'; action: string; metadata?: any }

export type PriceInheritanceState = {
  config: PriceInheritanceConfig
  validation: PriceValidationResult
  isLoading: boolean
  error?: string
}