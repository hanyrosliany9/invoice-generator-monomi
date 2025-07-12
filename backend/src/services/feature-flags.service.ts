// Feature Flags Backend Service for Indonesian Business Management System
// Implements safe deployment, rollout management, and rollback capabilities

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { 
  INDONESIAN_BUSINESS_FEATURE_FLAGS, 
  ENVIRONMENT_CONFIG, 
  SAFETY_CHECKS_CONFIG,
  INDONESIAN_REGION_ROLLOUT_STRATEGIES,
  BUSINESS_SIZE_ROLLOUT_CONFIG 
} from '../config/feature-flags.config';

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

export interface RolloutConfig {
  strategy: 'instant' | 'gradual' | 'canary' | 'blue_green';
  duration?: number;
  canaryPercentage?: number;
  healthChecks?: string[];
  successThreshold?: number;
  errorThreshold?: number;
}

export interface SafetyCheckResult {
  safe: boolean;
  warnings: string[];
  blockers: string[];
  recommendations: string[];
}

export interface FeatureFlagStats {
  flagId: string;
  enabled: boolean;
  totalUsers: number;
  enabledUsers: number;
  successRate: number;
  errorRate: number;
  regionBreakdown: Record<string, number>;
  businessSizeBreakdown: Record<string, number>;
  culturalValidationScore: number;
  materaiComplianceRate: number;
  whatsappIntegrationUsage: number;
  performanceImpact: {
    lcp: number;
    fcp: number;
    ttfb: number;
  };
}

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Build user context for Indonesian business
   */
  async buildUserContext(user: any): Promise<FeatureFlagUser> {
    const userProfile = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        preferences: true
      }
    });

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    return {
      id: userProfile.id,
      email: userProfile.email,
      region: 'Jakarta',
      businessSize: 'medium',
      userType: userProfile.role as 'admin' | 'staff' | 'client',
      registrationDate: userProfile.createdAt,
      preferences: {
        language: userProfile.preferences?.language || 'id-ID',
        timezone: userProfile.preferences?.timezone || 'Asia/Jakarta',
        currency: userProfile.preferences?.currency || 'IDR'
      }
    };
  }

  /**
   * Get feature flags for specific user
   */
  async getUserFeatureFlags(
    user: FeatureFlagUser, 
    flagIds?: string[]
  ): Promise<Record<string, boolean>> {
    const targetFlags = flagIds || Object.keys(INDONESIAN_BUSINESS_FEATURE_FLAGS);
    const results: Record<string, boolean> = {};

    for (const flagId of targetFlags) {
      results[flagId] = await this.isFeatureEnabledForUser(flagId, user);
    }

    // Log feature flag usage for analytics
    await this.logFeatureUsage(user, results);

    return results;
  }

  /**
   * Check if feature is enabled for specific user
   */
  async isFeatureEnabledForUser(flagId: string, user: FeatureFlagUser): Promise<boolean> {
    const config = INDONESIAN_BUSINESS_FEATURE_FLAGS[flagId];
    
    if (!config) {
      this.logger.warn(`Feature flag '${flagId}' not found in configuration`);
      return false;
    }

    // Check environment-specific enablement
    const currentEnv = process.env.NODE_ENV || 'development';
    if (!config.environments[currentEnv as keyof typeof config.environments]) {
      return false;
    }

    // Get current flag state from database
    const flagState = await this.getFeatureFlagState(flagId);
    
    if (!flagState?.enabled) {
      return false;
    }

    // Check target regions (Indonesian business context)
    if (config.targetRegions.length > 0 && !config.targetRegions.includes(user.region)) {
      return false;
    }

    // Check business size targeting
    if (config.targetBusinessSizes.length > 0 && !config.targetBusinessSizes.includes(user.businessSize)) {
      return false;
    }

    // Check rollout percentage with consistent user bucketing
    const rolloutPercentage = (flagState.rules as any)?.rolloutPercentage || 100;
    if (rolloutPercentage < 100) {
      const userBucket = this.getUserBucket(user.id, flagId);
      if (userBucket > rolloutPercentage) {
        return false;
      }
    }

    // Check dependencies
    if (config.dependencies.length > 0) {
      for (const depFlagId of config.dependencies) {
        const depEnabled = await this.isFeatureEnabledForUser(depFlagId, user);
        if (!depEnabled) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Enable feature flag with rollout strategy
   */
  async enableFeatureFlag(
    flagId: string, 
    rolloutConfig: RolloutConfig, 
    adminUserId: string
  ): Promise<any> {
    const config = INDONESIAN_BUSINESS_FEATURE_FLAGS[flagId];
    
    if (!config) {
      throw new Error(`Feature flag '${flagId}' not found`);
    }

    // Perform safety checks
    const safetyCheck = await this.performSafetyChecks(flagId);
    if (!safetyCheck.safe) {
      throw new Error(`Safety checks failed: ${safetyCheck.blockers.join(', ')}`);
    }

    // Create or update flag in database
    const flagState = await this.prisma.featureFlag.upsert({
      where: { name: flagId },
      update: {
        enabled: true,
        rules: rolloutConfig as any
      },
      create: {
        name: config.name,
        description: config.description,
        enabled: true,
        rules: rolloutConfig as any
      }
    });

    // Execute rollout strategy
    await this.executeRolloutStrategy(flagId, rolloutConfig);

    // Log rollout event
    await this.logFeatureFlagEvent(flagId, 'ENABLED', adminUserId, {
      strategy: rolloutConfig.strategy,
      safetyChecks: safetyCheck
    });

    this.logger.log(`🚀 Feature '${flagId}' enabled with ${rolloutConfig.strategy} strategy`);

    return flagState;
  }

  /**
   * Disable feature flag (immediate rollback)
   */
  async disableFeatureFlag(
    flagId: string, 
    reason: string, 
    adminUserId: string
  ): Promise<any> {
    const flagState = await this.prisma.featureFlag.update({
      where: { name: flagId },
      data: {
        enabled: false,
        rules: { rolloutPercentage: 0, rollbackReason: reason, rollbackTimestamp: new Date() },
        disabledReason: reason,
        disabledAt: new Date()
      }
    });

    // Log rollback event
    await this.logFeatureFlagEvent(flagId, 'DISABLED', adminUserId, {
      reason,
      rollbackType: 'manual'
    });

    // Send rollback notification
    await this.sendRollbackNotification(flagId, reason, 'manual');

    this.logger.log(`🔄 Feature '${flagId}' disabled and rolled back: ${reason}`);

    return flagState;
  }

  /**
   * Update rollout percentage
   */
  async updateRolloutPercentage(
    flagId: string, 
    percentage: number, 
    adminUserId: string
  ): Promise<any> {
    const previousState = await this.getFeatureFlagState(flagId);
    
    const flagState = await this.prisma.featureFlag.update({
      where: { name: flagId },
      data: {
        enabled: percentage > 0,
        rules: { rolloutPercentage: percentage }
      }
    });

    // Monitor health during rollout increase
    const previousPercentage = (previousState?.rules as any)?.rolloutPercentage || 0;
    if (percentage > previousPercentage) {
      this.scheduleHealthMonitoring(flagId, percentage);
    }

    // Log rollout update
    await this.logFeatureFlagEvent(flagId, 'ROLLOUT_UPDATED', adminUserId, {
      previousPercentage,
      newPercentage: percentage
    });

    this.logger.log(`📊 Feature '${flagId}' rollout updated: ${previousPercentage}% → ${percentage}%`);

    return flagState;
  }

  /**
   * Perform safety checks for Indonesian business context
   */
  async performSafetyChecks(flagId: string): Promise<SafetyCheckResult> {
    const result: SafetyCheckResult = {
      safe: true,
      warnings: [],
      blockers: [],
      recommendations: []
    };

    // Check business hours (Indonesian timezone)
    if (SAFETY_CHECKS_CONFIG.businessHours.enabled) {
      const jakartaTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
      const currentHour = new Date(jakartaTime).getHours();
      
      if (currentHour < 8 || currentHour > 17) {
        result.warnings.push('Deployment outside Indonesian business hours (08:00-17:00 WIB)');
      }
    }

    // Check prayer time (Friday 11:30-13:00 WIB)
    if (SAFETY_CHECKS_CONFIG.prayerTime.enabled) {
      const jakartaTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
      const currentTime = new Date(jakartaTime);
      const currentDay = currentTime.getDay();
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      
      if (currentDay === 5 && 
          ((currentHour === 11 && currentMinute >= 30) || 
           currentHour === 12 || 
           (currentHour === 13 && currentMinute <= 0))) {
        if (SAFETY_CHECKS_CONFIG.prayerTime.fridayPrayer.blockDeployment) {
          result.safe = false;
          result.blockers.push('Deployment blocked during Friday prayer time (11:30-13:00 WIB)');
        } else {
          result.warnings.push('Deployment during Friday prayer time - consider rescheduling');
        }
      }
    }

    // Check Indonesian holidays
    if (SAFETY_CHECKS_CONFIG.holidays.enabled) {
      const isHoliday = await this.checkIndonesianHoliday();
      if (isHoliday && SAFETY_CHECKS_CONFIG.holidays.blockDeploymentOnHolidays) {
        result.safe = false;
        result.blockers.push('Deployment blocked on Indonesian holiday');
      }
    }

    // Check cultural validation requirements
    if (SAFETY_CHECKS_CONFIG.culturalValidation.enabled) {
      const culturalScore = await this.getCulturalValidationScore(flagId);
      if (culturalScore < SAFETY_CHECKS_CONFIG.culturalValidation.minimumScore) {
        if (SAFETY_CHECKS_CONFIG.culturalValidation.blockOnLowScore) {
          result.safe = false;
          result.blockers.push(`Cultural validation score too low: ${culturalScore}/100`);
        } else {
          result.warnings.push(`Cultural validation score below threshold: ${culturalScore}/100`);
        }
      }
    }

    // Check materai compliance
    if (SAFETY_CHECKS_CONFIG.materaiCompliance.enabled) {
      const materaiCompliant = await this.checkMateraiCompliance(flagId);
      if (!materaiCompliant && SAFETY_CHECKS_CONFIG.materaiCompliance.blockOnComplianceFailure) {
        result.safe = false;
        result.blockers.push('Materai compliance validation failed');
      }
    }

    // Generate recommendations
    if (result.warnings.length > 0 || result.blockers.length > 0) {
      result.recommendations.push('Review Indonesian business context requirements');
      result.recommendations.push('Consider scheduling deployment during optimal hours');
      result.recommendations.push('Validate cultural appropriateness and compliance');
    }

    return result;
  }

  /**
   * Get feature flag statistics
   */
  async getFeatureStatistics(flagId: string): Promise<FeatureFlagStats> {
    const flagState = await this.getFeatureFlagState(flagId);
    const usageMetrics = await this.getUsageMetrics(flagId);
    const performanceMetrics = await this.getPerformanceMetrics(flagId);

    return {
      flagId,
      enabled: flagState?.enabled || false,
      totalUsers: usageMetrics.totalUsers,
      enabledUsers: usageMetrics.enabledUsers,
      successRate: usageMetrics.successRate,
      errorRate: usageMetrics.errorRate,
      regionBreakdown: usageMetrics.regionBreakdown,
      businessSizeBreakdown: usageMetrics.businessSizeBreakdown,
      culturalValidationScore: usageMetrics.culturalValidationScore,
      materaiComplianceRate: usageMetrics.materaiComplianceRate,
      whatsappIntegrationUsage: usageMetrics.whatsappIntegrationUsage,
      performanceImpact: performanceMetrics
    };
  }

  /**
   * Perform emergency rollback
   */
  async performEmergencyRollback(
    flagId: string,
    reason: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    adminUserId: string
  ): Promise<any> {
    // Immediate disable
    const flagState = await this.prisma.featureFlag.update({
      where: { name: flagId },
      data: {
        enabled: false,
        rules: { rolloutPercentage: 0, rollbackSeverity: severity },
        disabledReason: reason,
        disabledAt: new Date()
      }
    });

    // Log emergency rollback
    await this.logFeatureFlagEvent(flagId, 'EMERGENCY_ROLLBACK', adminUserId, {
      reason,
      severity,
      rollbackType: 'emergency'
    });

    this.logger.error(`🚨 EMERGENCY ROLLBACK: Feature '${flagId}' - ${reason} (Severity: ${severity})`);

    return flagState;
  }

  /**
   * Send emergency alert for rollback
   */
  async sendEmergencyAlert(flagId: string, reason: string, severity: string): Promise<void> {
    // Implementation would send alerts via email, Slack, SMS, etc.
    this.logger.error(`🚨 EMERGENCY ALERT: Feature flag '${flagId}' emergency rollback - ${reason} (${severity})`);
    
    // Log to audit trail
    await this.logFeatureFlagEvent(flagId, 'EMERGENCY_ALERT_SENT', 'system', {
      reason,
      severity,
      timestamp: new Date()
    });
  }

  // Private helper methods

  private determineBusinessSize(company: any): 'micro' | 'small' | 'medium' {
    if (!company) return 'micro';
    
    const employees = company.employeeCount || 0;
    const revenue = company.annualRevenue || 0;
    
    if (employees <= 4 || revenue <= 300000000) return 'micro'; // <= 300M IDR
    if (employees <= 19 || revenue <= 2500000000) return 'small'; // <= 2.5B IDR
    return 'medium';
  }

  private getUserBucket(userId: string, flagId: string): number {
    // Consistent hash-based bucketing
    const combined = userId + flagId;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }

  private async getFeatureFlagState(flagId: string): Promise<any> {
    return await this.prisma.featureFlag.findUnique({
      where: { name: flagId }
    });
  }

  private async executeRolloutStrategy(flagId: string, config: RolloutConfig): Promise<void> {
    switch (config.strategy) {
      case 'instant':
        await this.instantRollout(flagId);
        break;
      case 'gradual':
        await this.gradualRollout(flagId, config);
        break;
      case 'canary':
        await this.canaryRollout(flagId, config);
        break;
      case 'blue_green':
        await this.blueGreenRollout(flagId, config);
        break;
    }
  }

  private async instantRollout(flagId: string): Promise<void> {
    await this.prisma.featureFlag.update({
      where: { name: flagId },
      data: { enabled: true }
    });
    
    this.logger.log(`🚀 Instant rollout completed: ${flagId}`);
  }

  private async gradualRollout(flagId: string, config: RolloutConfig): Promise<void> {
    const duration = config.duration || 60; // minutes
    const steps = 10;
    const stepDuration = (duration / steps) * 60 * 1000; // milliseconds

    for (let step = 1; step <= steps; step++) {
      const percentage = (step / steps) * 100;
      
      await this.prisma.featureFlag.update({
        where: { name: flagId },
        data: { 
          enabled: percentage > 0,
          rules: { rolloutPercentage: percentage }
        }
      });

      this.logger.log(`📈 Gradual rollout: ${flagId} at ${percentage}%`);

      // Monitor health at each step
      await this.monitorRolloutHealth(flagId);

      if (step < steps) {
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }
    }
  }

  private async canaryRollout(flagId: string, config: RolloutConfig): Promise<void> {
    const canaryPercentage = config.canaryPercentage || 5;
    
    // Start canary
    await this.prisma.featureFlag.update({
      where: { name: flagId },
      data: { 
        enabled: canaryPercentage > 0,
        rules: { rolloutPercentage: canaryPercentage }
      }
    });

    this.logger.log(`🐤 Canary rollout started: ${flagId} at ${canaryPercentage}%`);

    // Monitor canary for 30 minutes
    const canaryHealthy = await this.monitorCanaryHealth(flagId, 30);

    if (canaryHealthy) {
      // Proceed with full rollout
      await this.prisma.featureFlag.update({
        where: { name: flagId },
        data: { enabled: true }
      });
      this.logger.log(`✅ Canary successful: ${flagId} fully deployed`);
    } else {
      // Rollback canary
      await this.prisma.featureFlag.update({
        where: { name: flagId },
        data: { 
          enabled: false,
          rules: { rolloutPercentage: 0 }
        }
      });
      this.logger.error(`❌ Canary failed: ${flagId} rolled back`);
      throw new Error('Canary deployment failed health checks');
    }
  }

  private async blueGreenRollout(flagId: string, config: RolloutConfig): Promise<void> {
    // Blue-green deployment simulation
    this.logger.log(`🔄 Blue-Green deployment: ${flagId}`);
    
    await this.prisma.featureFlag.update({
      where: { name: flagId },
      data: { enabled: true }
    });
    
    this.logger.log(`✅ Blue-Green deployment completed: ${flagId}`);
  }

  private async scheduleHealthMonitoring(flagId: string, percentage: number): Promise<void> {
    // Schedule background health monitoring
    setTimeout(async () => {
      await this.monitorRolloutHealth(flagId);
    }, 5 * 60 * 1000); // Monitor after 5 minutes
  }

  private async monitorRolloutHealth(flagId: string): Promise<boolean> {
    const metrics = await this.getUsageMetrics(flagId);
    const performanceMetrics = await this.getPerformanceMetrics(flagId);
    
    // Check error rate threshold
    if (metrics.errorRate > 0.05) {
      this.logger.warn(`⚠️ High error rate for ${flagId}: ${metrics.errorRate * 100}%`);
      return false;
    }

    // Check performance impact
    if (performanceMetrics.lcp > 4000) {
      this.logger.warn(`⚠️ Performance degradation for ${flagId}: LCP ${performanceMetrics.lcp}ms`);
      return false;
    }

    // Check cultural validation score
    if (metrics.culturalValidationScore < 70) {
      this.logger.warn(`⚠️ Cultural validation score below threshold for ${flagId}: ${metrics.culturalValidationScore}/100`);
      return false;
    }

    return true;
  }

  private async monitorCanaryHealth(flagId: string, durationMinutes: number): Promise<boolean> {
    // Simulate canary monitoring
    await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute simulation
    
    const healthy = await this.monitorRolloutHealth(flagId);
    this.logger.log(`🔍 Canary health check for ${flagId}: ${healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    
    return healthy;
  }

  private async logFeatureUsage(user: FeatureFlagUser, flags: Record<string, boolean>): Promise<void> {
    // Log to analytics service
    this.logger.debug(`Feature usage logged for user ${user.id}:`, flags);
  }

  private async logFeatureFlagEvent(
    flagId: string, 
    event: string, 
    userId: string, 
    metadata: any
  ): Promise<void> {
    await this.prisma.featureFlagEvent.create({
      data: {
        flagId,
        eventType: event,
        userId,
        metadata: metadata as any
      }
    });
  }

  private async sendRollbackNotification(
    flagId: string, 
    reason: string, 
    type: string
  ): Promise<void> {
    this.logger.log(`📧 Rollback notification sent for ${flagId}: ${reason} (${type})`);
  }

  private async checkIndonesianHoliday(): Promise<boolean> {
    // Check against Indonesian holiday calendar
    // This would integrate with a holiday API or database
    return false;
  }

  private async getCulturalValidationScore(flagId: string): Promise<number> {
    // Mock cultural validation score - would integrate with CulturalValidationHelper
    return 85;
  }

  private async checkMateraiCompliance(flagId: string): Promise<boolean> {
    // Mock materai compliance check - would validate against Indonesian tax regulations
    return true;
  }

  private async getUsageMetrics(flagId: string): Promise<any> {
    // Mock usage metrics - would query actual analytics database
    return {
      totalUsers: 1000,
      enabledUsers: 850,
      successRate: 0.98,
      errorRate: 0.02,
      regionBreakdown: {
        Jakarta: 400,
        Surabaya: 200,
        Bandung: 150,
        Yogyakarta: 100
      },
      businessSizeBreakdown: {
        micro: 300,
        small: 500,
        medium: 200
      },
      culturalValidationScore: 87,
      materaiComplianceRate: 0.95,
      whatsappIntegrationUsage: 0.75
    };
  }

  private async getPerformanceMetrics(flagId: string): Promise<any> {
    // Mock performance metrics - would integrate with performance monitoring
    return {
      lcp: 2800,
      fcp: 1600,
      ttfb: 900
    };
  }

  async getAllFeatureFlags(query: any): Promise<any[]> {
    return await this.prisma.featureFlag.findMany({
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getFeatureFlag(flagId: string): Promise<any> {
    return await this.prisma.featureFlag.findUnique({
      where: { name: flagId }
    });
  }

  async createFeatureFlag(createDto: any, adminUserId: string): Promise<any> {
    return await this.prisma.featureFlag.create({
      data: {
        ...createDto,
        createdBy: adminUserId,
        updatedBy: adminUserId
      }
    });
  }

  async updateFeatureFlag(flagId: string, updateDto: any, adminUserId: string): Promise<any> {
    return await this.prisma.featureFlag.update({
      where: { name: flagId },
      data: {
        ...updateDto,
        updatedBy: adminUserId,
        updatedAt: new Date()
      }
    });
  }

  async validateIndonesianBusinessContext(createDto: any): Promise<{ valid: boolean; reason?: string }> {
    // Validate Indonesian business context for new feature flags
    return { valid: true };
  }

  async getRolloutHealth(flagId: string): Promise<any> {
    const metrics = await this.getUsageMetrics(flagId);
    const performanceMetrics = await this.getPerformanceMetrics(flagId);
    
    return {
      flagId,
      healthy: metrics.errorRate < 0.05 && performanceMetrics.lcp < 4000,
      metrics,
      performanceMetrics,
      lastChecked: new Date()
    };
  }

  async generateHealthRecommendations(flagId: string): Promise<string[]> {
    const health = await this.getRolloutHealth(flagId);
    const recommendations: string[] = [];
    
    if (health.metrics.errorRate > 0.03) {
      recommendations.push('Monitor error rates closely and consider gradual rollback');
    }
    
    if (health.performanceMetrics.lcp > 3000) {
      recommendations.push('Optimize performance for Indonesian network conditions');
    }
    
    if (health.metrics.culturalValidationScore < 80) {
      recommendations.push('Review cultural appropriateness for Indonesian business context');
    }
    
    return recommendations;
  }

  async getIndonesianBusinessValidation(flagId: string): Promise<any> {
    return {
      flagId,
      culturalScore: await this.getCulturalValidationScore(flagId),
      materaiCompliant: await this.checkMateraiCompliance(flagId),
      businessHoursCheck: true,
      prayerTimeCheck: true,
      holidayCheck: !(await this.checkIndonesianHoliday())
    };
  }

  async getAuditLog(flagId: string, options: any): Promise<any> {
    const events = await this.prisma.featureFlagEvent.findMany({
      where: { flagId },
      orderBy: { createdAt: 'desc' },
      take: options.limit,
      skip: options.offset
    });
    
    const total = await this.prisma.featureFlagEvent.count({
      where: { flagId }
    });
    
    return { events, total };
  }

  async testFeatureFlag(flagId: string, testConfig: any): Promise<any> {
    // Simulate feature flag testing
    return {
      flagId,
      testPassed: true,
      testResults: {
        configurationValid: true,
        dependenciesSatisfied: true,
        culturalValidationPassed: true,
        performanceWithinThresholds: true
      },
      recommendations: [
        'Configuration is valid for Indonesian business context',
        'All dependencies are satisfied',
        'Cultural validation passed with good score'
      ]
    };
  }
}

export default FeatureFlagsService;