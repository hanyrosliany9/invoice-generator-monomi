// Navigation Components - Indonesian Business Management System
// Enhanced navigation with relationship context and business flow guidance

// Import navigation styles
import './NavigationStyles.css'

// Legacy navigation components (preserved for compatibility)
export { default as EntityBreadcrumb } from './EntityBreadcrumb'
export { default as RelatedEntitiesPanel } from './RelatedEntitiesPanel'
export { 
  default as BreadcrumbContext, 
  BreadcrumbProvider, 
  useBreadcrumb 
} from './BreadcrumbContext'

// Enhanced navigation components (Phase 1 Week 2)
export { EnhancedBreadcrumb } from './EnhancedBreadcrumb'
export { RelationshipPanel } from './RelationshipPanel'
export { BusinessFlowNavigator } from './BusinessFlowNavigator'
export { MobileNavigation } from './MobileNavigation'

// Type definitions
export type { BreadcrumbItem } from './EntityBreadcrumb' // Legacy
export type {
  // Core navigation types
  BreadcrumbItem as EnhancedBreadcrumbItem,
  BreadcrumbMetadata,
  BreadcrumbProps,
  
  // Business stage and flow types
  BusinessStage,
  BusinessFlowStep,
  BusinessRule,
  
  // Relationship types
  RelationshipContext,
  EntityReference,
  
  // Action types
  NextAction,
  IndonesianBusinessEtiquette,
  
  // Navigation state types
  NavigationState,
  NavigationPermissions,
  
  // Component prop types
  RelationshipPanelProps,
  BusinessFlowNavigatorProps,
  MobileNavigationProps,
  
  // Indonesian workflow types
  IndonesianWorkflowGuide,
  WorkflowRequirement,
  WorkflowRecommendation,
  CulturalNote,
  RequiredDocument,
  
  // Analytics and metrics types
  NavigationMetrics,
  NavigationAnalytics,
  
  // Error handling types
  NavigationError
} from './types/navigation.types'

// Default exports for advanced usage
export { default as EnhancedBreadcrumbDefault } from './EnhancedBreadcrumb'
export { default as RelationshipPanelDefault } from './RelationshipPanel'
export { default as BusinessFlowNavigatorDefault } from './BusinessFlowNavigator'
export { default as MobileNavigationDefault } from './MobileNavigation'