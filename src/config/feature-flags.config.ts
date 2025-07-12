// Feature Flags Configuration for Indonesian Business Management System
// Centralized configuration management for safe deployment and rollback

export interface FeatureFlagEnvironmentConfig {
  development: boolean;
  testing: boolean;
  staging: boolean;
  production: boolean;
}

export interface FeatureFlagMetadata {
  component: string;
  phase: string;
  businessCritical?: boolean;
  culturalValidation?: boolean;
  performanceOptimized?: boolean;
  whatsappIntegration?: boolean;
  culturalOptimization?: boolean;
  compliance?: string;
  indonesianScreenReader?: boolean;
  networkOptimization?: string;
  coreWebVitals?: boolean;
  businessEtiquette?: boolean;
  honorificValidation?: boolean;
  formalLanguage?: boolean;
  threshold?: number;
  materaiCompliance?: boolean;
}

export interface FeatureFlagConfig {
  id: string;
  name: string;
  description: string;
  environments: FeatureFlagEnvironmentConfig;
  defaultRolloutPercentage: number;
  targetRegions: string[];
  targetBusinessSizes: ('micro' | 'small' | 'medium')[];
  dependencies: string[];
  killSwitch: boolean;
  rollbackConfig: {
    autoRollbackEnabled: boolean;
    errorThreshold: number;
    performanceThreshold: {
      lcp: number;
      fcp: number;
      ttfb: number;
    };
    culturalScoreThreshold: number;
  };
  monitoring: {
    healthChecks: string[];
    alertThresholds: {
      errorRate: number;
      responseTime: number;
      culturalScore: number;
    };
  };
  metadata: FeatureFlagMetadata;
}

/**
 * Indonesian Business Management System Feature Flags Configuration
 */
export const INDONESIAN_BUSINESS_FEATURE_FLAGS: Record<string, FeatureFlagConfig> = {
  enhanced_business_journey: {
    id: 'enhanced_business_journey',
    name: 'Enhanced Business Journey Timeline',
    description: 'Advanced business journey visualization with accessibility and performance optimization',
    environments: {
      development: true,
      testing: true,
      staging: false,
      production: false
    },
    defaultRolloutPercentage: 0,
    targetRegions: ['Jakarta', 'Surabaya', 'Bandung'],
    targetBusinessSizes: ['small', 'medium'],
    dependencies: ['enhanced_accessibility', 'performance_monitoring'],
    killSwitch: true,
    rollbackConfig: {
      autoRollbackEnabled: true,
      errorThreshold: 0.05, // 5%
      performanceThreshold: {
        lcp: 4000, // 4 seconds for Indonesian networks
        fcp: 3000, // 3 seconds
        ttfb: 1800 // 1.8 seconds
      },
      culturalScoreThreshold: 70
    },
    monitoring: {
      healthChecks: [
        '/api/health/business-journey',
        '/api/metrics/performance',
        '/api/validation/cultural'
      ],
      alertThresholds: {
        errorRate: 0.03,
        responseTime: 2000,
        culturalScore: 75
      }
    },
    metadata: {
      component: 'BusinessJourneyTimeline',
      phase: 'Phase 1',
      culturalValidation: true,
      performanceOptimized: true,
      businessCritical: false
    }
  },

  price_inheritance_flow: {
    id: 'price_inheritance_flow',
    name: 'Price Inheritance Flow',
    description: 'Visual price inheritance system for quotation-to-invoice workflow',
    environments: {
      development: true,
      testing: true,
      staging: false,
      production: false
    },
    defaultRolloutPercentage: 0,
    targetRegions: ['Jakarta'],
    targetBusinessSizes: ['medium'],
    dependencies: ['enhanced_accessibility', 'cultural_validation'],
    killSwitch: true,
    rollbackConfig: {
      autoRollbackEnabled: true,
      errorThreshold: 0.02, // 2% (stricter for business critical)
      performanceThreshold: {
        lcp: 3500,
        fcp: 2500,
        ttfb: 1500
      },
      culturalScoreThreshold: 80
    },
    monitoring: {
      healthChecks: [
        '/api/health/price-inheritance',
        '/api/quotations/health',
        '/api/invoices/health'
      ],
      alertThresholds: {
        errorRate: 0.02,
        responseTime: 1500,
        culturalScore: 80
      }
    },
    metadata: {
      component: 'PriceInheritanceFlow',
      phase: 'Phase 2',
      businessCritical: true,
      culturalValidation: true,
      performanceOptimized: true
    }
  },

  smart_tables_architecture: {
    id: 'smart_tables_architecture',
    name: 'Smart Tables Information Architecture',
    description: 'Enhanced tables with performance benchmarking and Indonesian UX patterns',
    environments: {
      development: true,
      testing: true,
      staging: true,
      production: false
    },
    defaultRolloutPercentage: 10,
    targetRegions: ['Jakarta', 'Surabaya', 'Bandung', 'Yogyakarta'],
    targetBusinessSizes: ['micro', 'small', 'medium'],
    dependencies: ['performance_monitoring'],
    killSwitch: true,
    rollbackConfig: {
      autoRollbackEnabled: true,
      errorThreshold: 0.03,
      performanceThreshold: {
        lcp: 3000,
        fcp: 2000,
        ttfb: 1200
      },
      culturalScoreThreshold: 70
    },
    monitoring: {
      healthChecks: [
        '/api/health/smart-tables',
        '/api/data/performance'
      ],
      alertThresholds: {
        errorRate: 0.025,
        responseTime: 1200,
        culturalScore: 70
      }
    },
    metadata: {
      component: 'SmartTables',
      phase: 'Phase 3',
      performanceOptimized: true,
      businessCritical: false
    }
  },

  mobile_excellence_whatsapp: {
    id: 'mobile_excellence_whatsapp',
    name: 'Mobile Excellence with WhatsApp Integration',
    description: 'Mobile-optimized experience with Indonesian WhatsApp Business integration',
    environments: {
      development: true,
      testing: true,
      staging: false,
      production: false
    },
    defaultRolloutPercentage: 0,
    targetRegions: ['Jakarta', 'Yogyakarta', 'Surabaya'],
    targetBusinessSizes: ['micro', 'small', 'medium'],
    dependencies: ['cultural_validation', 'enhanced_accessibility'],
    killSwitch: true,
    rollbackConfig: {
      autoRollbackEnabled: true,
      errorThreshold: 0.03,
      performanceThreshold: {
        lcp: 4500, // Mobile networks in Indonesia
        fcp: 3500,
        ttfb: 2000
      },
      culturalScoreThreshold: 85 // Higher threshold for WhatsApp integration
    },
    monitoring: {
      healthChecks: [
        '/api/health/mobile',
        '/api/whatsapp/health',
        '/api/integration/whatsapp-business'
      ],
      alertThresholds: {
        errorRate: 0.025,
        responseTime: 2000,
        culturalScore: 85
      }
    },
    metadata: {
      component: 'MobileExcellence',
      phase: 'Phase 4',
      whatsappIntegration: true,
      culturalOptimization: true,
      performanceOptimized: true
    }
  },

  enhanced_accessibility: {
    id: 'enhanced_accessibility',
    name: 'Enhanced Accessibility (WCAG 2.1 AA)',
    description: 'Comprehensive accessibility features with Indonesian screen reader support',
    environments: {
      development: true,
      testing: true,
      staging: true,
      production: true // Always enabled for compliance
    },
    defaultRolloutPercentage: 100,
    targetRegions: [], // All regions
    targetBusinessSizes: ['micro', 'small', 'medium'],
    dependencies: [],
    killSwitch: false, // Never disable accessibility
    rollbackConfig: {
      autoRollbackEnabled: false, // Manual rollback only for compliance features
      errorThreshold: 0.01,
      performanceThreshold: {
        lcp: 5000,
        fcp: 4000,
        ttfb: 2500
      },
      culturalScoreThreshold: 90
    },
    monitoring: {
      healthChecks: [
        '/api/health/accessibility',
        '/api/validation/wcag',
        '/api/screen-reader/indonesian'
      ],
      alertThresholds: {
        errorRate: 0.01,
        responseTime: 3000,
        culturalScore: 90
      }
    },
    metadata: {
      component: 'AccessibilityProvider',
      phase: 'Core',
      compliance: 'WCAG 2.1 AA',
      indonesianScreenReader: true,
      businessCritical: true
    }
  },

  performance_monitoring: {
    id: 'performance_monitoring',
    name: 'Advanced Performance Monitoring',
    description: 'Core Web Vitals tracking optimized for Indonesian network conditions',
    environments: {
      development: true,
      testing: true,
      staging: true,
      production: true
    },
    defaultRolloutPercentage: 100,
    targetRegions: [], // All regions
    targetBusinessSizes: ['micro', 'small', 'medium'],
    dependencies: [],
    killSwitch: false,
    rollbackConfig: {
      autoRollbackEnabled: false,
      errorThreshold: 0.02,
      performanceThreshold: {
        lcp: 6000,
        fcp: 5000,
        ttfb: 3000
      },
      culturalScoreThreshold: 60
    },
    monitoring: {
      healthChecks: [
        '/api/health/performance',
        '/api/metrics/core-web-vitals',
        '/api/network/indonesian-conditions'
      ],
      alertThresholds: {
        errorRate: 0.015,
        responseTime: 4000,
        culturalScore: 60
      }
    },
    metadata: {
      component: 'PerformanceMonitoring',
      phase: 'Core',
      networkOptimization: 'Indonesian',
      coreWebVitals: true
    }
  },

  cultural_validation: {
    id: 'cultural_validation',
    name: 'Indonesian Cultural Validation',
    description: 'Cultural appropriateness validation for Indonesian business context',
    environments: {
      development: true,
      testing: true,
      staging: true,
      production: true
    },
    defaultRolloutPercentage: 100,
    targetRegions: ['Jakarta', 'Yogyakarta', 'Surabaya', 'Medan', 'Bandung'],
    targetBusinessSizes: ['micro', 'small', 'medium'],
    dependencies: [],
    killSwitch: false,
    rollbackConfig: {
      autoRollbackEnabled: false,
      errorThreshold: 0.02,
      performanceThreshold: {
        lcp: 4000,
        fcp: 3000,
        ttfb: 2000
      },
      culturalScoreThreshold: 95 // Very high threshold for cultural validation
    },
    monitoring: {
      healthChecks: [
        '/api/health/cultural-validation',
        '/api/validation/indonesian-business',
        '/api/validation/honorific-usage'
      ],
      alertThresholds: {
        errorRate: 0.015,
        responseTime: 2000,
        culturalScore: 95
      }
    },
    metadata: {
      component: 'CulturalValidation',
      phase: 'Core',
      businessEtiquette: true,
      honorificValidation: true,
      formalLanguage: true,
      culturalValidation: true
    }
  },

  materai_compliance_system: {
    id: 'materai_compliance_system',
    name: 'Materai Compliance System',
    description: 'Automated materai validation and reminder system for Indonesian business compliance',
    environments: {
      development: true,
      testing: true,
      staging: true,
      production: true
    },
    defaultRolloutPercentage: 100,
    targetRegions: [], // All Indonesian regions
    targetBusinessSizes: ['micro', 'small', 'medium'],
    dependencies: ['cultural_validation'],
    killSwitch: false, // Critical for Indonesian tax compliance
    rollbackConfig: {
      autoRollbackEnabled: false, // Manual only for compliance
      errorThreshold: 0.01,
      performanceThreshold: {
        lcp: 3000,
        fcp: 2000,
        ttfb: 1500
      },
      culturalScoreThreshold: 90
    },
    monitoring: {
      healthChecks: [
        '/api/health/materai-compliance',
        '/api/validation/materai-threshold',
        '/api/compliance/indonesian-tax'
      ],
      alertThresholds: {
        errorRate: 0.005, // Very strict for compliance
        responseTime: 1500,
        culturalScore: 90
      }
    },
    metadata: {
      component: 'MateraiCompliance',
      phase: 'Core',
      threshold: 5000000,
      compliance: 'Indonesian Financial Regulation',
      materaiCompliance: true,
      businessCritical: true
    }
  }
};

/**
 * Environment-specific configuration
 */
export const ENVIRONMENT_CONFIG = {
  development: {
    autoRollbackEnabled: false,
    errorThreshold: 0.1, // More lenient in development
    performanceThreshold: {
      lcp: 8000,
      fcp: 6000,
      ttfb: 4000
    },
    culturalScoreThreshold: 60
  },
  testing: {
    autoRollbackEnabled: true,
    errorThreshold: 0.05,
    performanceThreshold: {
      lcp: 6000,
      fcp: 4000,
      ttfb: 3000
    },
    culturalScoreThreshold: 70
  },
  staging: {
    autoRollbackEnabled: true,
    errorThreshold: 0.03,
    performanceThreshold: {
      lcp: 4000,
      fcp: 3000,
      ttfb: 2000
    },
    culturalScoreThreshold: 80
  },
  production: {
    autoRollbackEnabled: true,
    errorThreshold: 0.02,
    performanceThreshold: {
      lcp: 4000,
      fcp: 3000,
      ttfb: 1800
    },
    culturalScoreThreshold: 85
  }
};

/**
 * Indonesian region-specific rollout strategies
 */
export const INDONESIAN_REGION_ROLLOUT_STRATEGIES = {
  Jakarta: {
    priority: 1,
    initialRolloutPercentage: 10,
    businessStyle: 'fast-paced',
    formality: 'formal',
    networkConditions: 'excellent'
  },
  Surabaya: {
    priority: 2,
    initialRolloutPercentage: 8,
    businessStyle: 'commercial',
    formality: 'formal',
    networkConditions: 'good'
  },
  Bandung: {
    priority: 3,
    initialRolloutPercentage: 5,
    businessStyle: 'tech-savvy',
    formality: 'semi-formal',
    networkConditions: 'good'
  },
  Yogyakarta: {
    priority: 4,
    initialRolloutPercentage: 3,
    businessStyle: 'traditional',
    formality: 'very-formal',
    networkConditions: 'moderate'
  },
  Medan: {
    priority: 5,
    initialRolloutPercentage: 3,
    businessStyle: 'multicultural',
    formality: 'formal',
    networkConditions: 'moderate'
  }
};

/**
 * Business size-specific rollout configurations
 */
export const BUSINESS_SIZE_ROLLOUT_CONFIG = {
  medium: {
    priority: 1,
    initialRolloutPercentage: 15,
    riskTolerance: 'moderate',
    performanceExpectations: 'high'
  },
  small: {
    priority: 2,
    initialRolloutPercentage: 10,
    riskTolerance: 'low',
    performanceExpectations: 'moderate'
  },
  micro: {
    priority: 3,
    initialRolloutPercentage: 5,
    riskTolerance: 'very-low',
    performanceExpectations: 'basic'
  }
};

/**
 * Safety checks configuration for Indonesian business context
 */
export const SAFETY_CHECKS_CONFIG = {
  businessHours: {
    enabled: true,
    timezone: 'Asia/Jakarta',
    start: '08:00',
    end: '17:00',
    blockDeploymentOutsideHours: false, // Allow but warn
    blockRollbackOutsideHours: false
  },
  prayerTime: {
    enabled: true,
    fridayPrayer: {
      start: '11:30',
      end: '13:00',
      blockDeployment: true
    }
  },
  holidays: {
    enabled: true,
    checkIndonesianHolidays: true,
    blockDeploymentOnHolidays: true
  },
  culturalValidation: {
    enabled: true,
    minimumScore: 70,
    blockOnLowScore: true
  },
  materaiCompliance: {
    enabled: true,
    blockOnComplianceFailure: true
  }
};

export default {
  INDONESIAN_BUSINESS_FEATURE_FLAGS,
  ENVIRONMENT_CONFIG,
  INDONESIAN_REGION_ROLLOUT_STRATEGIES,
  BUSINESS_SIZE_ROLLOUT_CONFIG,
  SAFETY_CHECKS_CONFIG
};