// Feature Flags Provider for Indonesian Business Management System
// React context and hooks for safe feature rollout and rollback

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import FeatureFlagsService, { FeatureFlag, FeatureFlagUser, RolloutConfig } from '../services/feature-flags.service';

interface FeatureFlagsContextType {
  // Feature flag checking
  isFeatureEnabled: (flagId: string) => boolean;
  getFeatureFlags: (flagIds: string[]) => Record<string, boolean>;
  
  // Rollout management
  enableFeature: (flagId: string, config: RolloutConfig) => Promise<void>;
  disableFeature: (flagId: string, reason?: string) => Promise<void>;
  updateRolloutPercentage: (flagId: string, percentage: number) => Promise<void>;
  
  // Monitoring and analytics
  getFeatureStatistics: (flagId: string) => Promise<any>;
  refreshFlags: () => Promise<void>;
  
  // Indonesian business context
  validateIndonesianBusinessContext: (flagId: string) => Promise<boolean>;
  
  // State
  loading: boolean;
  error: string | null;
  user: FeatureFlagUser | null;
  flags: Record<string, boolean>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined);

interface FeatureFlagsProviderProps {
  children: React.ReactNode;
  user?: FeatureFlagUser;
  onFeatureToggle?: (flagId: string, enabled: boolean) => void;
  onRollback?: (flagId: string, reason: string) => void;
}

export const FeatureFlagsProvider: React.FC<FeatureFlagsProviderProps> = ({
  children,
  user,
  onFeatureToggle,
  onRollback
}) => {
  const [featureFlagsService] = useState(() => new FeatureFlagsService());
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FeatureFlagUser | null>(user || null);

  // Indonesian Business Management System specific feature flags
  const INDONESIAN_BUSINESS_FLAGS = [
    'enhanced_business_journey',
    'price_inheritance_flow', 
    'smart_tables_architecture',
    'mobile_excellence_whatsapp',
    'enhanced_accessibility',
    'performance_monitoring',
    'cultural_validation',
    'materai_compliance_system'
  ];

  /**
   * Load user context for Indonesian business
   */
  useEffect(() => {
    const loadUserContext = async () => {
      if (!currentUser) {
        // Load user from authentication context or localStorage
        const storedUser = localStorage.getItem('indonesian_business_user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setCurrentUser(parsedUser);
          } catch (e) {
            console.warn('Failed to parse stored user context');
          }
        }
      }
    };

    loadUserContext();
  }, [currentUser]);

  /**
   * Initialize feature flags for Indonesian business context
   */
  useEffect(() => {
    const initializeFlags = async () => {
      if (!currentUser) return;

      setLoading(true);
      setError(null);

      try {
        // Load all Indonesian business feature flags
        const flagResults = await featureFlagsService.getFeatureFlags(
          INDONESIAN_BUSINESS_FLAGS,
          currentUser
        );

        setFlags(flagResults);
        
        console.log('🇮🇩 Indonesian Business feature flags initialized:', flagResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load feature flags');
        console.error('❌ Feature flags initialization failed:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeFlags();
  }, [currentUser, featureFlagsService]);

  /**
   * Check if a feature is enabled
   */
  const isFeatureEnabled = useCallback((flagId: string): boolean => {
    if (loading || !currentUser) {
      return false;
    }

    // Always enable accessibility and cultural validation for compliance
    if (flagId === 'enhanced_accessibility' || flagId === 'cultural_validation') {
      return true;
    }

    return flags[flagId] || false;
  }, [flags, loading, currentUser]);

  /**
   * Get multiple feature flags
   */
  const getFeatureFlags = useCallback((flagIds: string[]): Record<string, boolean> => {
    const result: Record<string, boolean> = {};
    
    flagIds.forEach(flagId => {
      result[flagId] = isFeatureEnabled(flagId);
    });

    return result;
  }, [isFeatureEnabled]);

  /**
   * Enable feature with rollout configuration
   */
  const enableFeature = useCallback(async (flagId: string, config: RolloutConfig): Promise<void> => {
    if (!currentUser) {
      throw new Error('User context required for feature rollout');
    }

    try {
      // Validate Indonesian business context
      const contextValid = await featureFlagsService.validateIndonesianBusinessContext(flagId);
      if (!contextValid) {
        throw new Error(`Indonesian business context validation failed for '${flagId}'`);
      }

      await featureFlagsService.enableFeature(flagId, config);
      
      // Refresh flags
      await refreshFlags();
      
      // Notify callback
      onFeatureToggle?.(flagId, true);
      
      console.log(`✅ Feature '${flagId}' enabled with ${config.strategy} strategy`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enable feature';
      setError(errorMessage);
      throw err;
    }
  }, [currentUser, featureFlagsService, onFeatureToggle]);

  /**
   * Disable feature (immediate rollback)
   */
  const disableFeature = useCallback(async (flagId: string, reason?: string): Promise<void> => {
    try {
      await featureFlagsService.disableFeature(flagId, reason);
      
      // Refresh flags
      await refreshFlags();
      
      // Notify callbacks
      onFeatureToggle?.(flagId, false);
      onRollback?.(flagId, reason || 'Manual disable');
      
      console.log(`🔄 Feature '${flagId}' disabled: ${reason || 'Manual disable'}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable feature';
      setError(errorMessage);
      throw err;
    }
  }, [featureFlagsService, onFeatureToggle, onRollback]);

  /**
   * Update rollout percentage
   */
  const updateRolloutPercentage = useCallback(async (flagId: string, percentage: number): Promise<void> => {
    try {
      await featureFlagsService.updateRolloutPercentage(flagId, percentage);
      
      // Refresh flags
      await refreshFlags();
      
      console.log(`📊 Feature '${flagId}' rollout updated to ${percentage}%`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update rollout';
      setError(errorMessage);
      throw err;
    }
  }, [featureFlagsService]);

  /**
   * Get feature statistics
   */
  const getFeatureStatistics = useCallback(async (flagId: string): Promise<any> => {
    return await featureFlagsService.getFeatureStatistics(flagId);
  }, [featureFlagsService]);

  /**
   * Validate Indonesian business context
   */
  const validateIndonesianBusinessContext = useCallback(async (flagId: string): Promise<boolean> => {
    return await featureFlagsService.validateIndonesianBusinessContext(flagId);
  }, [featureFlagsService]);

  /**
   * Refresh all feature flags
   */
  const refreshFlags = useCallback(async (): Promise<void> => {
    if (!currentUser) return;

    try {
      const flagResults = await featureFlagsService.getFeatureFlags(
        INDONESIAN_BUSINESS_FLAGS,
        currentUser
      );
      setFlags(flagResults);
    } catch (err) {
      console.error('Failed to refresh feature flags:', err);
    }
  }, [currentUser, featureFlagsService]);

  const value: FeatureFlagsContextType = {
    isFeatureEnabled,
    getFeatureFlags,
    enableFeature,
    disableFeature,
    updateRolloutPercentage,
    getFeatureStatistics,
    refreshFlags,
    validateIndonesianBusinessContext,
    loading,
    error,
    user: currentUser,
    flags
  };

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

/**
 * Hook for accessing feature flags context
 */
export const useFeatureFlags = (): FeatureFlagsContextType => {
  const context = useContext(FeatureFlagsContext);
  
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  
  return context;
};

/**
 * Hook for checking a specific feature flag
 */
export const useFeatureFlag = (flagId: string): boolean => {
  const { isFeatureEnabled } = useFeatureFlags();
  return isFeatureEnabled(flagId);
};

/**
 * Hook for Indonesian business specific features
 */
export const useIndonesianBusinessFeatures = () => {
  const { getFeatureFlags } = useFeatureFlags();
  
  const businessFeatures = getFeatureFlags([
    'enhanced_business_journey',
    'price_inheritance_flow',
    'smart_tables_architecture',
    'mobile_excellence_whatsapp',
    'materai_compliance_system'
  ]);

  return {
    enhancedBusinessJourney: businessFeatures.enhanced_business_journey,
    priceInheritanceFlow: businessFeatures.price_inheritance_flow,
    smartTablesArchitecture: businessFeatures.smart_tables_architecture,
    mobileExcellenceWhatsApp: businessFeatures.mobile_excellence_whatsapp,
    materaiComplianceSystem: businessFeatures.materai_compliance_system
  };
};

/**
 * Hook for accessibility and compliance features (always enabled)
 */
export const useComplianceFeatures = () => {
  const { getFeatureFlags } = useFeatureFlags();
  
  const complianceFeatures = getFeatureFlags([
    'enhanced_accessibility',
    'cultural_validation',
    'performance_monitoring'
  ]);

  return {
    enhancedAccessibility: complianceFeatures.enhanced_accessibility,
    culturalValidation: complianceFeatures.cultural_validation,
    performanceMonitoring: complianceFeatures.performance_monitoring
  };
};

/**
 * Component for conditionally rendering features
 */
interface FeatureGateProps {
  flagId: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ 
  flagId, 
  fallback = null, 
  children 
}) => {
  const enabled = useFeatureFlag(flagId);
  
  return enabled ? <>{children}</> : <>{fallback}</>;
};

/**
 * HOC for feature flag protection
 */
export function withFeatureFlag<P extends object>(
  flagId: string,
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<P>
) {
  return function FeatureProtectedComponent(props: P) {
    const enabled = useFeatureFlag(flagId);
    
    if (enabled) {
      return <Component {...props} />;
    }
    
    if (fallback) {
      const FallbackComponent = fallback;
      return <FallbackComponent {...props} />;
    }
    
    return null;
  };
}

export default FeatureFlagsProvider;