// Feature Flags Configuration for Indonesian Business Management System
// Centralized configuration for safe deployment and rollout management

export interface FeatureFlagConfig {
  id: string;
  name: string;
  description: string;
  environments: {
    development: boolean;
    testing: boolean;
    staging: boolean;
    production: boolean;
  };
  defaultRolloutPercentage: number;
  targetRegions: string[];
  targetBusinessSizes: ("micro" | "small" | "medium")[];
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
  metadata: {
    component: string;
    phase: string;
    businessCritical: boolean;
    culturalValidation: boolean;
    materaiCompliance: boolean;
    whatsappIntegration: boolean;
  };
}

export const INDONESIAN_BUSINESS_FEATURE_FLAGS: Record<
  string,
  FeatureFlagConfig
> = {
  enhanced_accessibility: {
    id: "enhanced_accessibility",
    name: "Enhanced Accessibility (WCAG 2.1 AA)",
    description:
      "Comprehensive accessibility features with Indonesian screen reader support",
    environments: {
      development: true,
      testing: true,
      staging: true,
      production: true,
    },
    defaultRolloutPercentage: 100,
    targetRegions: [],
    targetBusinessSizes: ["micro", "small", "medium"],
    dependencies: [],
    killSwitch: false,
    rollbackConfig: {
      autoRollbackEnabled: false,
      errorThreshold: 0.01,
      performanceThreshold: {
        lcp: 2500,
        fcp: 1800,
        ttfb: 800,
      },
      culturalScoreThreshold: 85,
    },
    metadata: {
      component: "Core Accessibility",
      phase: "Core",
      businessCritical: true,
      culturalValidation: true,
      materaiCompliance: true,
      whatsappIntegration: false,
    },
  },

  cultural_validation: {
    id: "cultural_validation",
    name: "Indonesian Cultural Validation",
    description:
      "Cultural appropriateness validation for Indonesian business context",
    environments: {
      development: true,
      testing: true,
      staging: true,
      production: true,
    },
    defaultRolloutPercentage: 100,
    targetRegions: ["Jakarta", "Yogyakarta", "Surabaya", "Medan", "Bandung"],
    targetBusinessSizes: ["micro", "small", "medium"],
    dependencies: [],
    killSwitch: false,
    rollbackConfig: {
      autoRollbackEnabled: false,
      errorThreshold: 0.02,
      performanceThreshold: {
        lcp: 3000,
        fcp: 2000,
        ttfb: 1000,
      },
      culturalScoreThreshold: 90,
    },
    metadata: {
      component: "Cultural Validation Service",
      phase: "Core",
      businessCritical: true,
      culturalValidation: true,
      materaiCompliance: true,
      whatsappIntegration: false,
    },
  },

  materai_compliance_system: {
    id: "materai_compliance_system",
    name: "Materai Compliance System",
    description:
      "Automated materai validation and reminder system for Indonesian business compliance",
    environments: {
      development: true,
      testing: true,
      staging: true,
      production: true,
    },
    defaultRolloutPercentage: 100,
    targetRegions: [],
    targetBusinessSizes: ["micro", "small", "medium"],
    dependencies: [],
    killSwitch: false,
    rollbackConfig: {
      autoRollbackEnabled: true,
      errorThreshold: 0.01,
      performanceThreshold: {
        lcp: 2500,
        fcp: 1800,
        ttfb: 800,
      },
      culturalScoreThreshold: 80,
    },
    metadata: {
      component: "Materai Compliance Service",
      phase: "Core",
      businessCritical: true,
      culturalValidation: true,
      materaiCompliance: true,
      whatsappIntegration: false,
    },
  },

  enhanced_business_journey: {
    id: "enhanced_business_journey",
    name: "Enhanced Business Journey Timeline",
    description:
      "Advanced business journey visualization with accessibility and performance optimization",
    environments: {
      development: true,
      testing: true,
      staging: true,
      production: false,
    },
    defaultRolloutPercentage: 0,
    targetRegions: ["Jakarta", "Surabaya", "Bandung"],
    targetBusinessSizes: ["small", "medium"],
    dependencies: ["enhanced_accessibility", "cultural_validation"],
    killSwitch: true,
    rollbackConfig: {
      autoRollbackEnabled: true,
      errorThreshold: 0.05,
      performanceThreshold: {
        lcp: 4000,
        fcp: 3000,
        ttfb: 1800,
      },
      culturalScoreThreshold: 75,
    },
    metadata: {
      component: "BusinessJourneyTimeline",
      phase: "Phase 1",
      businessCritical: false,
      culturalValidation: true,
      materaiCompliance: true,
      whatsappIntegration: false,
    },
  },

  price_inheritance_flow: {
    id: "price_inheritance_flow",
    name: "Price Inheritance Flow",
    description:
      "Visual price inheritance system for quotation-to-invoice workflow",
    environments: {
      development: true,
      testing: true,
      staging: true,
      production: false,
    },
    defaultRolloutPercentage: 0,
    targetRegions: ["Jakarta"],
    targetBusinessSizes: ["medium"],
    dependencies: [
      "enhanced_accessibility",
      "cultural_validation",
      "materai_compliance_system",
    ],
    killSwitch: true,
    rollbackConfig: {
      autoRollbackEnabled: true,
      errorThreshold: 0.03,
      performanceThreshold: {
        lcp: 3500,
        fcp: 2500,
        ttfb: 1500,
      },
      culturalScoreThreshold: 80,
    },
    metadata: {
      component: "PriceInheritanceFlow",
      phase: "Phase 2",
      businessCritical: true,
      culturalValidation: true,
      materaiCompliance: true,
      whatsappIntegration: false,
    },
  },

  smart_tables_architecture: {
    id: "smart_tables_architecture",
    name: "Smart Tables Information Architecture",
    description:
      "Enhanced tables with performance benchmarking and Indonesian UX patterns",
    environments: {
      development: true,
      testing: true,
      staging: true,
      production: true,
    },
    defaultRolloutPercentage: 25,
    targetRegions: ["Jakarta", "Surabaya", "Bandung", "Yogyakarta"],
    targetBusinessSizes: ["micro", "small", "medium"],
    dependencies: ["enhanced_accessibility"],
    killSwitch: true,
    rollbackConfig: {
      autoRollbackEnabled: true,
      errorThreshold: 0.04,
      performanceThreshold: {
        lcp: 4000,
        fcp: 3000,
        ttfb: 1800,
      },
      culturalScoreThreshold: 70,
    },
    metadata: {
      component: "SmartTable",
      phase: "Phase 3",
      businessCritical: false,
      culturalValidation: true,
      materaiCompliance: false,
      whatsappIntegration: false,
    },
  },

  mobile_excellence_whatsapp: {
    id: "mobile_excellence_whatsapp",
    name: "Mobile Excellence with WhatsApp Integration",
    description:
      "Mobile-optimized experience with Indonesian WhatsApp Business integration",
    environments: {
      development: true,
      testing: true,
      staging: false,
      production: false,
    },
    defaultRolloutPercentage: 0,
    targetRegions: ["Jakarta", "Yogyakarta", "Surabaya"],
    targetBusinessSizes: ["micro", "small", "medium"],
    dependencies: ["enhanced_accessibility", "cultural_validation"],
    killSwitch: true,
    rollbackConfig: {
      autoRollbackEnabled: true,
      errorThreshold: 0.03,
      performanceThreshold: {
        lcp: 3000,
        fcp: 2000,
        ttfb: 1200,
      },
      culturalScoreThreshold: 85,
    },
    metadata: {
      component: "WhatsAppIntegration",
      phase: "Phase 4",
      businessCritical: false,
      culturalValidation: true,
      materaiCompliance: false,
      whatsappIntegration: true,
    },
  },
};

export const ENVIRONMENT_CONFIG = {
  development: {
    name: "Development",
    safetyChecksEnabled: false,
    autoRollbackEnabled: false,
    monitoringLevel: "basic",
  },
  testing: {
    name: "Testing",
    safetyChecksEnabled: true,
    autoRollbackEnabled: false,
    monitoringLevel: "detailed",
  },
  staging: {
    name: "Staging",
    safetyChecksEnabled: true,
    autoRollbackEnabled: true,
    monitoringLevel: "comprehensive",
  },
  production: {
    name: "Production",
    safetyChecksEnabled: true,
    autoRollbackEnabled: true,
    monitoringLevel: "comprehensive",
  },
};

export const SAFETY_CHECKS_CONFIG = {
  businessHours: {
    enabled: true,
    timezone: "Asia/Jakarta",
    start: "08:00",
    end: "17:00",
    blockOutsideHours: false,
  },
  prayerTime: {
    enabled: true,
    fridayPrayer: {
      start: "11:30",
      end: "13:00",
      blockDeployment: true,
    },
  },
  holidays: {
    enabled: true,
    holidayCalendar: "indonesian_national",
    blockDeploymentOnHolidays: true,
  },
  culturalValidation: {
    enabled: true,
    minimumScore: 70,
    blockOnLowScore: true,
  },
  materaiCompliance: {
    enabled: true,
    threshold: 5000000,
    blockOnComplianceFailure: true,
  },
  performanceThresholds: {
    lcp: { good: 2500, poor: 4000 },
    fcp: { good: 1800, poor: 3000 },
    ttfb: { good: 800, poor: 1800 },
    culturalScoreMinimum: 70,
    materaiComplianceRequired: true,
  },
};

export const INDONESIAN_REGION_ROLLOUT_STRATEGIES = {
  Jakarta: {
    priority: 1,
    rolloutSpeed: "fast",
    businessHours: "08:00-17:00",
    culturalContext: "business-formal",
  },
  Surabaya: {
    priority: 2,
    rolloutSpeed: "medium",
    businessHours: "08:00-17:00",
    culturalContext: "commercial-direct",
  },
  Bandung: {
    priority: 3,
    rolloutSpeed: "medium",
    businessHours: "08:00-17:00",
    culturalContext: "tech-friendly",
  },
  Yogyakarta: {
    priority: 4,
    rolloutSpeed: "slow",
    businessHours: "08:00-17:00",
    culturalContext: "traditional-respectful",
  },
  Medan: {
    priority: 5,
    rolloutSpeed: "medium",
    businessHours: "08:00-17:00",
    culturalContext: "multicultural-inclusive",
  },
};

export const BUSINESS_SIZE_ROLLOUT_CONFIG = {
  medium: {
    priority: 1,
    rolloutPercentage: 100,
    features: ["all"],
  },
  small: {
    priority: 2,
    rolloutPercentage: 75,
    features: ["core", "business_enhancements"],
  },
  micro: {
    priority: 3,
    rolloutPercentage: 50,
    features: ["core"],
  },
};

export const ROLLBACK_TRIGGERS = {
  highErrorRate: {
    threshold: 0.05,
    severity: "critical",
    autoRollback: true,
  },
  culturalValidationFailure: {
    threshold: 60,
    severity: "high",
    autoRollback: true,
  },
  performanceDegradation: {
    lcp: 5000,
    ttfb: 2500,
    severity: "medium",
    autoRollback: true,
  },
  materaiComplianceFailure: {
    severity: "critical",
    autoRollback: true,
  },
};

export const MONITORING_CONFIG = {
  healthCheckInterval: 5, // minutes
  alertThresholds: {
    errorRate: { warning: 0.03, critical: 0.05 },
    culturalScore: { warning: 75, critical: 60 },
    performanceLCP: { warning: 3500, critical: 5000 },
    materaiCompliance: { warning: 0.95, critical: 0.9 },
  },
  notificationChannels: {
    email: ["admin@monomi.id", "cultural-expert@monomi.id"],
    slack: ["#feature-flags", "#indonesian-business"],
    webhook: process.env.FEATURE_FLAGS_WEBHOOK_URL,
  },
};
