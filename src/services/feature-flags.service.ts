// Feature Flags Service for Indonesian Business Management System
// Provides safe deployment, gradual rollout, and rollback capabilities

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetUsers?: string[];
  targetRegions?: string[];
  businessSize?: ('micro' | 'small' | 'medium')[];
  startDate?: Date;
  endDate?: Date;
  conditions?: FeatureFlagCondition[];
  metadata?: Record<string, any>;
}

export interface FeatureFlagCondition {
  type: 'user_id' | 'region' | 'business_size' | 'user_type' | 'custom';
  operator: 'equals' | 'contains' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
}

export interface RolloutConfig {
  strategy: 'instant' | 'gradual' | 'canary' | 'blue_green';
  duration?: number; // in minutes for gradual rollout
  canaryPercentage?: number; // percentage for canary deployments
  healthChecks?: string[]; // health check endpoints to monitor
  successThreshold?: number; // success rate threshold (0-1)
  errorThreshold?: number; // error rate threshold (0-1)
}

export interface FeatureFlagUser {
  id: string;
  email: string;
  region: string;
  businessSize: 'micro' | 'small' | 'medium';
  userType: 'admin' | 'staff' | 'client';
  registrationDate: Date;
  preferences: {
    language: string;
    timezone: string;
    currency: string;
  };
}

export class FeatureFlagsService {
  private flags: Map<string, FeatureFlag> = new Map();
  private rolloutConfigs: Map<string, RolloutConfig> = new Map();
  private userCache: Map<string, FeatureFlagUser> = new Map();
  private metricsCollector: MetricsCollector;

  // Indonesian Business Management System specific feature flags
  private readonly INDONESIAN_BUSINESS_FLAGS: FeatureFlag[] = [
    {
      id: 'enhanced_business_journey',
      name: 'Enhanced Business Journey Timeline',
      description: 'Advanced business journey visualization with accessibility and performance optimization',
      enabled: false,
      rolloutPercentage: 0,
      targetRegions: ['Jakarta', 'Surabaya', 'Bandung'],
      businessSize: ['small', 'medium'],
      metadata: {
        component: 'BusinessJourneyTimeline',
        phase: 'Phase 1',
        culturalValidation: true
      }
    },
    {
      id: 'price_inheritance_flow',
      name: 'Price Inheritance Flow',
      description: 'Visual price inheritance system for quotation-to-invoice workflow',
      enabled: false,
      rolloutPercentage: 0,
      targetRegions: ['Jakarta'],
      businessSize: ['medium'],
      metadata: {
        component: 'PriceInheritanceFlow',
        phase: 'Phase 2',
        businessCritical: true
      }
    },
    {
      id: 'smart_tables_architecture',
      name: 'Smart Tables Information Architecture',
      description: 'Enhanced tables with performance benchmarking and Indonesian UX patterns',
      enabled: false,
      rolloutPercentage: 0,
      metadata: {
        component: 'SmartTables',
        phase: 'Phase 3',
        performanceOptimized: true
      }
    },
    {
      id: 'mobile_excellence_whatsapp',
      name: 'Mobile Excellence with WhatsApp Integration',
      description: 'Mobile-optimized experience with Indonesian WhatsApp Business integration',
      enabled: false,
      rolloutPercentage: 0,
      targetRegions: ['Jakarta', 'Yogyakarta', 'Surabaya'],
      metadata: {
        component: 'MobileExcellence',
        phase: 'Phase 4',
        whatsappIntegration: true,
        culturalOptimization: true
      }
    },
    {
      id: 'enhanced_accessibility',
      name: 'Enhanced Accessibility (WCAG 2.1 AA)',
      description: 'Comprehensive accessibility features with Indonesian screen reader support',
      enabled: true, // Always enabled for compliance
      rolloutPercentage: 100,
      metadata: {
        component: 'AccessibilityProvider',
        compliance: 'WCAG 2.1 AA',
        indonesianScreenReader: true
      }
    },
    {
      id: 'performance_monitoring',
      name: 'Advanced Performance Monitoring',
      description: 'Core Web Vitals tracking optimized for Indonesian network conditions',
      enabled: true,
      rolloutPercentage: 100,
      metadata: {
        component: 'PerformanceMonitoring',
        networkOptimization: 'Indonesian',
        coreWebVitals: true
      }
    },
    {
      id: 'cultural_validation',
      name: 'Indonesian Cultural Validation',
      description: 'Cultural appropriateness validation for Indonesian business context',
      enabled: true,
      rolloutPercentage: 100,
      targetRegions: ['Jakarta', 'Yogyakarta', 'Surabaya', 'Medan', 'Bandung'],
      metadata: {
        component: 'CulturalValidation',
        businessEtiquette: true,
        honorificValidation: true,
        formalLanguage: true
      }
    },
    {
      id: 'materai_compliance_system',
      name: 'Materai Compliance System',
      description: 'Automated materai validation and reminder system for Indonesian business compliance',
      enabled: true,
      rolloutPercentage: 100,
      metadata: {
        component: 'MateraiCompliance',
        threshold: 5000000,
        compliance: 'Indonesian Financial Regulation'
      }
    }
  ];

  constructor() {
    this.metricsCollector = new MetricsCollector();
    this.initializeFlags();
  }

  /**
   * Initialize feature flags with Indonesian business context
   */
  private initializeFlags(): void {
    this.INDONESIAN_BUSINESS_FLAGS.forEach(flag => {
      this.flags.set(flag.id, flag);
    });

    // Load flags from persistent storage
    this.loadFlagsFromStorage();
  }

  /**
   * Check if a feature is enabled for a specific user
   */
  async isFeatureEnabled(flagId: string, user: FeatureFlagUser): Promise<boolean> {
    const flag = this.flags.get(flagId);
    
    if (!flag) {
      console.warn(`Feature flag '${flagId}' not found`);
      return false;
    }

    // Check if flag is globally disabled
    if (!flag.enabled) {
      return false;
    }

    // Check date conditions
    if (flag.startDate && new Date() < flag.startDate) {
      return false;
    }

    if (flag.endDate && new Date() > flag.endDate) {
      return false;
    }

    // Check target users
    if (flag.targetUsers && flag.targetUsers.length > 0) {
      if (!flag.targetUsers.includes(user.id)) {
        return false;
      }
    }

    // Check target regions (Indonesian business context)
    if (flag.targetRegions && flag.targetRegions.length > 0) {
      if (!flag.targetRegions.includes(user.region)) {
        return false;
      }
    }

    // Check business size targeting
    if (flag.businessSize && flag.businessSize.length > 0) {
      if (!flag.businessSize.includes(user.businessSize)) {
        return false;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const userHash = this.hashUser(user.id, flagId);
      if (userHash > flag.rolloutPercentage) {
        return false;
      }
    }

    // Check custom conditions
    if (flag.conditions && flag.conditions.length > 0) {
      const conditionsMet = await this.evaluateConditions(flag.conditions, user);
      if (!conditionsMet) {
        return false;
      }
    }

    // Track feature usage for Indonesian business metrics
    await this.trackFeatureUsage(flagId, user, true);

    return true;
  }

  /**
   * Get multiple feature flags for a user (bulk operation)
   */
  async getFeatureFlags(flagIds: string[], user: FeatureFlagUser): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const flagId of flagIds) {
      results[flagId] = await this.isFeatureEnabled(flagId, user);
    }

    return results;
  }

  /**
   * Enable feature flag with gradual rollout
   */
  async enableFeature(flagId: string, rolloutConfig: RolloutConfig): Promise<void> {
    const flag = this.flags.get(flagId);
    
    if (!flag) {
      throw new Error(`Feature flag '${flagId}' not found`);
    }

    this.rolloutConfigs.set(flagId, rolloutConfig);

    switch (rolloutConfig.strategy) {
      case 'instant':
        await this.instantRollout(flag);
        break;
      case 'gradual':
        await this.gradualRollout(flag, rolloutConfig);
        break;
      case 'canary':
        await this.canaryRollout(flag, rolloutConfig);
        break;
      case 'blue_green':
        await this.blueGreenRollout(flag, rolloutConfig);
        break;
    }

    await this.persistFlags();
  }

  /**
   * Disable feature flag (immediate rollback)
   */
  async disableFeature(flagId: string, reason?: string): Promise<void> {
    const flag = this.flags.get(flagId);
    
    if (!flag) {
      throw new Error(`Feature flag '${flagId}' not found`);
    }

    flag.enabled = false;
    flag.rolloutPercentage = 0;

    // Log rollback for Indonesian business compliance
    await this.logRollback(flagId, reason || 'Manual disable', {
      timestamp: new Date(),
      previousState: { enabled: true, rolloutPercentage: flag.rolloutPercentage }
    });

    await this.persistFlags();
    
    console.log(`🔄 Feature '${flagId}' disabled for Indonesian Business Management System`);
  }

  /**
   * Update feature flag rollout percentage
   */
  async updateRolloutPercentage(flagId: string, percentage: number): Promise<void> {
    const flag = this.flags.get(flagId);
    
    if (!flag) {
      throw new Error(`Feature flag '${flagId}' not found`);
    }

    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    const previousPercentage = flag.rolloutPercentage;
    flag.rolloutPercentage = percentage;

    // Monitor health during rollout
    if (percentage > previousPercentage) {
      await this.monitorRolloutHealth(flagId);
    }

    await this.persistFlags();
    
    console.log(`📊 Feature '${flagId}' rollout updated: ${previousPercentage}% → ${percentage}%`);
  }

  /**
   * Get feature flag statistics for Indonesian business analytics
   */
  async getFeatureStatistics(flagId: string): Promise<any> {
    const metrics = await this.metricsCollector.getFeatureMetrics(flagId);
    
    return {
      flagId,
      enabled: this.flags.get(flagId)?.enabled || false,
      rolloutPercentage: this.flags.get(flagId)?.rolloutPercentage || 0,
      totalUsers: metrics.totalUsers,
      enabledUsers: metrics.enabledUsers,
      successRate: metrics.successRate,
      errorRate: metrics.errorRate,
      indonesianRegions: metrics.regionBreakdown,
      businessSizeBreakdown: metrics.businessSizeBreakdown,
      culturalValidationScore: metrics.culturalValidationScore,
      performanceImpact: metrics.performanceImpact
    };
  }

  /**
   * Indonesian business context validation for feature rollouts
   */
  async validateIndonesianBusinessContext(flagId: string): Promise<boolean> {
    const flag = this.flags.get(flagId);
    
    if (!flag) {
      return false;
    }

    // Check if feature is appropriate for Indonesian business hours
    const currentHour = new Date().getHours();
    if (currentHour < 8 || currentHour > 17) {
      console.warn(`⚠️ Feature rollout outside Indonesian business hours (08:00-17:00 WIB)`);
    }

    // Check if it's Friday prayer time
    const currentDay = new Date().getDay();
    if (currentDay === 5 && currentHour >= 11 && currentHour <= 13) {
      console.warn(`🕌 Feature rollout during Friday prayer time - consider rescheduling`);
      return false;
    }

    // Validate cultural requirements
    if (flag.metadata?.culturalValidation) {
      const culturalScore = await this.validateCulturalCompliance(flagId);
      if (culturalScore < 70) {
        console.error(`❌ Cultural validation failed for '${flagId}' (score: ${culturalScore}/100)`);
        return false;
      }
    }

    // Check materai compliance if applicable
    if (flag.metadata?.materaiCompliance) {
      const materaiValid = await this.validateMateraiCompliance(flagId);
      if (!materaiValid) {
        console.error(`❌ Materai compliance validation failed for '${flagId}'`);
        return false;
      }
    }

    return true;
  }

  // Private helper methods

  private async instantRollout(flag: FeatureFlag): Promise<void> {
    flag.enabled = true;
    flag.rolloutPercentage = 100;
    
    console.log(`🚀 Instant rollout: ${flag.name} enabled for Indonesian Business Management System`);
  }

  private async gradualRollout(flag: FeatureFlag, config: RolloutConfig): Promise<void> {
    const duration = config.duration || 60; // Default 60 minutes
    const steps = 10; // Rollout in 10% increments
    const stepDuration = duration / steps;

    flag.enabled = true;
    
    for (let step = 1; step <= steps; step++) {
      const percentage = (step / steps) * 100;
      flag.rolloutPercentage = percentage;
      
      console.log(`📈 Gradual rollout: ${flag.name} at ${percentage}% for Indonesian users`);
      
      // Monitor health at each step
      await this.monitorRolloutHealth(flag.id);
      
      // Wait before next step
      if (step < steps) {
        await new Promise(resolve => setTimeout(resolve, stepDuration * 60 * 1000));
      }
    }
  }

  private async canaryRollout(flag: FeatureFlag, config: RolloutConfig): Promise<void> {
    const canaryPercentage = config.canaryPercentage || 5;
    
    // Start with canary percentage
    flag.enabled = true;
    flag.rolloutPercentage = canaryPercentage;
    
    console.log(`🐤 Canary rollout: ${flag.name} starting at ${canaryPercentage}% for Indonesian business users`);
    
    // Monitor canary deployment
    const canaryHealth = await this.monitorCanaryHealth(flag.id, 30); // Monitor for 30 minutes
    
    if (canaryHealth.success) {
      // Proceed with full rollout
      flag.rolloutPercentage = 100;
      console.log(`✅ Canary successful: ${flag.name} fully deployed`);
    } else {
      // Rollback canary
      flag.enabled = false;
      flag.rolloutPercentage = 0;
      console.log(`❌ Canary failed: ${flag.name} rolled back`);
      throw new Error(`Canary deployment failed: ${canaryHealth.reason}`);
    }
  }

  private async blueGreenRollout(flag: FeatureFlag, config: RolloutConfig): Promise<void> {
    // Blue-green deployment for critical Indonesian business features
    console.log(`🔄 Blue-Green deployment: ${flag.name} for Indonesian Business Management System`);
    
    // This would typically involve deploying to a parallel environment
    // and switching traffic after validation
    flag.enabled = true;
    flag.rolloutPercentage = 100;
    
    console.log(`✅ Blue-Green deployment completed: ${flag.name}`);
  }

  private async monitorRolloutHealth(flagId: string): Promise<void> {
    const metrics = await this.metricsCollector.getFeatureMetrics(flagId);
    
    // Indonesian business specific health checks
    if (metrics.errorRate > 0.05) { // 5% error threshold
      console.warn(`⚠️ High error rate detected for ${flagId}: ${metrics.errorRate * 100}%`);
    }
    
    if (metrics.culturalValidationScore < 70) {
      console.warn(`⚠️ Cultural validation score below threshold for ${flagId}: ${metrics.culturalValidationScore}/100`);
    }
    
    if (metrics.performanceImpact.lcp > 4000) { // Indonesian network threshold
      console.warn(`⚠️ Performance impact detected for ${flagId}: LCP ${metrics.performanceImpact.lcp}ms`);
    }
  }

  private async monitorCanaryHealth(flagId: string, durationMinutes: number): Promise<{ success: boolean; reason?: string }> {
    console.log(`🔍 Monitoring canary deployment for ${flagId} (${durationMinutes} minutes)`);
    
    // Simulate monitoring period
    await new Promise(resolve => setTimeout(resolve, durationMinutes * 60 * 1000));
    
    const metrics = await this.metricsCollector.getFeatureMetrics(flagId);
    
    // Indonesian business context validation
    if (metrics.errorRate > 0.02) { // 2% threshold for canary
      return { success: false, reason: `Error rate too high: ${metrics.errorRate * 100}%` };
    }
    
    if (metrics.culturalValidationScore < 80) { // Higher threshold for canary
      return { success: false, reason: `Cultural validation score too low: ${metrics.culturalValidationScore}/100` };
    }
    
    return { success: true };
  }

  private hashUser(userId: string, flagId: string): number {
    // Simple hash function for consistent user bucketing
    const combined = userId + flagId;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }

  private async evaluateConditions(conditions: FeatureFlagCondition[], user: FeatureFlagUser): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, user);
      if (!result) {
        return false;
      }
    }
    return true;
  }

  private async evaluateCondition(condition: FeatureFlagCondition, user: FeatureFlagUser): Promise<boolean> {
    let targetValue: any;
    
    switch (condition.type) {
      case 'user_id':
        targetValue = user.id;
        break;
      case 'region':
        targetValue = user.region;
        break;
      case 'business_size':
        targetValue = user.businessSize;
        break;
      case 'user_type':
        targetValue = user.userType;
        break;
      default:
        return true; // Unknown condition type, default to true
    }

    switch (condition.operator) {
      case 'equals':
        return targetValue === condition.value;
      case 'contains':
        return String(targetValue).includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(targetValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(targetValue);
      default:
        return false;
    }
  }

  private async trackFeatureUsage(flagId: string, user: FeatureFlagUser, enabled: boolean): Promise<void> {
    await this.metricsCollector.trackFeatureUsage(flagId, {
      userId: user.id,
      region: user.region,
      businessSize: user.businessSize,
      enabled,
      timestamp: new Date()
    });
  }

  private async logRollback(flagId: string, reason: string, metadata: any): Promise<void> {
    const rollbackLog = {
      flagId,
      reason,
      timestamp: new Date(),
      metadata,
      context: 'Indonesian Business Management System'
    };
    
    // Log to persistent storage for audit trail
    console.log('🔄 Rollback logged:', rollbackLog);
  }

  private async loadFlagsFromStorage(): Promise<void> {
    // Load from persistent storage (database, file system, etc.)
    // This would typically load from a database or configuration service
    console.log('📚 Loading feature flags from storage for Indonesian Business Management System');
  }

  private async persistFlags(): Promise<void> {
    // Persist to storage
    const flagsData = Array.from(this.flags.values());
    console.log('💾 Persisting feature flags for Indonesian Business Management System', flagsData.length);
  }

  private async validateCulturalCompliance(flagId: string): Promise<number> {
    // Mock cultural validation score
    return 85; // Would integrate with CulturalValidationHelper
  }

  private async validateMateraiCompliance(flagId: string): Promise<boolean> {
    // Mock materai compliance validation
    return true; // Would validate against Indonesian tax regulations
  }
}

// Metrics collector for Indonesian business analytics
class MetricsCollector {
  async getFeatureMetrics(flagId: string): Promise<any> {
    // Mock metrics - would integrate with actual analytics service
    return {
      totalUsers: 1000,
      enabledUsers: 850,
      successRate: 0.98,
      errorRate: 0.02,
      regionBreakdown: {
        Jakarta: 400,
        Surabaya: 200,
        Bandung: 150,
        Yogyakarta: 100,
        Others: 150
      },
      businessSizeBreakdown: {
        micro: 300,
        small: 500,
        medium: 200
      },
      culturalValidationScore: 87,
      performanceImpact: {
        lcp: 2800,
        fcp: 1600,
        ttfb: 900
      }
    };
  }

  async trackFeatureUsage(flagId: string, data: any): Promise<void> {
    // Track usage metrics for Indonesian business analytics
    console.log(`📊 Tracking feature usage: ${flagId}`, data);
  }
}

export default FeatureFlagsService;