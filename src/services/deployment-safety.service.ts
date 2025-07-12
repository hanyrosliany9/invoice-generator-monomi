// Deployment Safety Service for Indonesian Business Management System
// Automated safety checks and rollback mechanisms for feature flag deployments

export interface SafetyCheck {
  id: string;
  name: string;
  description: string;
  critical: boolean;
  indonesianBusinessContext: boolean;
  execute: () => Promise<SafetyCheckResult>;
}

export interface SafetyCheckResult {
  passed: boolean;
  score: number; // 0-100
  message: string;
  details: string[];
  recommendations: string[];
  metadata?: Record<string, any>;
}

export interface DeploymentSafetyReport {
  flagId: string;
  timestamp: Date;
  overallSafety: 'SAFE' | 'WARNING' | 'UNSAFE';
  overallScore: number;
  checks: Array<{
    checkId: string;
    name: string;
    result: SafetyCheckResult;
    critical: boolean;
  }>;
  blockers: string[];
  warnings: string[];
  recommendations: string[];
  indonesianBusinessCompliance: {
    culturalScore: number;
    materaiCompliant: boolean;
    businessHoursCheck: boolean;
    holidayCheck: boolean;
    prayerTimeCheck: boolean;
  };
}

export interface RollbackTrigger {
  id: string;
  name: string;
  condition: string;
  threshold: any;
  autoRollback: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  indonesianContext: boolean;
}

export class DeploymentSafetyService {
  private safetyChecks: Map<string, SafetyCheck> = new Map();
  private rollbackTriggers: Map<string, RollbackTrigger> = new Map();
  private activeMonitoring: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeSafetyChecks();
    this.initializeRollbackTriggers();
  }

  /**
   * Perform comprehensive safety checks for Indonesian business context
   */
  async performSafetyChecks(flagId: string): Promise<DeploymentSafetyReport> {
    const timestamp = new Date();
    const checkResults: Array<{
      checkId: string;
      name: string;
      result: SafetyCheckResult;
      critical: boolean;
    }> = [];

    let overallScore = 0;
    let totalWeight = 0;
    const blockers: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Execute all safety checks
    for (const [checkId, check] of this.safetyChecks) {
      try {
        const result = await check.execute();
        const weight = check.critical ? 2 : 1;
        
        checkResults.push({
          checkId,
          name: check.name,
          result,
          critical: check.critical
        });

        overallScore += result.score * weight;
        totalWeight += weight;

        if (!result.passed) {
          if (check.critical) {
            blockers.push(`${check.name}: ${result.message}`);
          } else {
            warnings.push(`${check.name}: ${result.message}`);
          }
        }

        recommendations.push(...result.recommendations);
      } catch (error) {
        const errorResult: SafetyCheckResult = {
          passed: false,
          score: 0,
          message: `Safety check failed: ${error.message}`,
          details: [],
          recommendations: ['Review safety check implementation']
        };

        checkResults.push({
          checkId,
          name: check.name,
          result: errorResult,
          critical: check.critical
        });

        if (check.critical) {
          blockers.push(`${check.name}: Check execution failed`);
        }
      }
    }

    const finalScore = totalWeight > 0 ? overallScore / totalWeight : 0;
    const overallSafety = this.determineOverallSafety(finalScore, blockers.length, warnings.length);

    // Generate Indonesian business compliance summary
    const indonesianCompliance = await this.getIndonesianBusinessCompliance(flagId);

    return {
      flagId,
      timestamp,
      overallSafety,
      overallScore: Math.round(finalScore),
      checks: checkResults,
      blockers,
      warnings,
      recommendations: [...new Set(recommendations)], // Remove duplicates
      indonesianBusinessCompliance: indonesianCompliance
    };
  }

  /**
   * Start automated monitoring for a feature flag
   */
  async startAutomatedMonitoring(flagId: string): Promise<void> {
    // Stop existing monitoring if any
    this.stopAutomatedMonitoring(flagId);

    console.log(`🔍 Starting automated monitoring for feature flag: ${flagId}`);

    // Monitor every 2 minutes
    const monitoringInterval = setInterval(async () => {
      await this.performAutomatedChecks(flagId);
    }, 2 * 60 * 1000);

    this.activeMonitoring.set(flagId, monitoringInterval);
  }

  /**
   * Stop automated monitoring for a feature flag
   */
  stopAutomatedMonitoring(flagId: string): void {
    const existingInterval = this.activeMonitoring.get(flagId);
    if (existingInterval) {
      clearInterval(existingInterval);
      this.activeMonitoring.delete(flagId);
      console.log(`⏹️ Stopped automated monitoring for feature flag: ${flagId}`);
    }
  }

  /**
   * Perform automated rollback if triggers are met
   */
  async performAutomatedRollback(
    flagId: string, 
    triggerReason: string, 
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<void> {
    console.log(`🚨 AUTOMATED ROLLBACK INITIATED: ${flagId} - ${triggerReason}`);

    try {
      // Stop monitoring during rollback
      this.stopAutomatedMonitoring(flagId);

      // Log rollback event
      await this.logRollbackEvent(flagId, triggerReason, severity, 'automated');

      // Perform the actual rollback (would integrate with feature flags service)
      await this.executeRollback(flagId, triggerReason);

      // Send alerts
      await this.sendRollbackAlert(flagId, triggerReason, severity, 'automated');

      console.log(`✅ Automated rollback completed for: ${flagId}`);
    } catch (error) {
      console.error(`❌ Automated rollback failed for ${flagId}:`, error);
      
      // Send critical alert if automated rollback fails
      await this.sendCriticalAlert(flagId, `Automated rollback failed: ${error.message}`);
    }
  }

  // Private methods

  private initializeSafetyChecks(): void {
    // Indonesian Business Hours Check
    this.safetyChecks.set('business_hours', {
      id: 'business_hours',
      name: 'Indonesian Business Hours',
      description: 'Check if deployment occurs during Indonesian business hours (08:00-17:00 WIB)',
      critical: false,
      indonesianBusinessContext: true,
      execute: async (): Promise<SafetyCheckResult> => {
        const jakartaTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
        const currentHour = new Date(jakartaTime).getHours();
        const isBusinessHours = currentHour >= 8 && currentHour < 17;

        return {
          passed: true, // Always pass but provide warnings
          score: isBusinessHours ? 100 : 70,
          message: isBusinessHours 
            ? 'Deployment during Indonesian business hours' 
            : 'Deployment outside Indonesian business hours (08:00-17:00 WIB)',
          details: [
            `Current Jakarta time: ${jakartaTime}`,
            `Business hours: 08:00-17:00 WIB`,
            `Deployment time assessment: ${isBusinessHours ? 'Optimal' : 'Suboptimal'}`
          ],
          recommendations: isBusinessHours 
            ? ['Good timing for Indonesian business deployment']
            : ['Consider scheduling during business hours for better support coverage']
        };
      }
    });

    // Prayer Time Check (Friday 11:30-13:00 WIB)
    this.safetyChecks.set('prayer_time', {
      id: 'prayer_time',
      name: 'Friday Prayer Time',
      description: 'Check if deployment conflicts with Friday prayer time (11:30-13:00 WIB)',
      critical: false,
      indonesianBusinessContext: true,
      execute: async (): Promise<SafetyCheckResult> => {
        const jakartaTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
        const currentTime = new Date(jakartaTime);
        const currentDay = currentTime.getDay(); // 0 = Sunday, 5 = Friday
        const currentHour = currentTime.getHours();
        const currentMinute = currentTime.getMinutes();

        const isFriday = currentDay === 5;
        const isPrayerTime = isFriday && 
          ((currentHour === 11 && currentMinute >= 30) || 
           currentHour === 12 || 
           (currentHour === 13 && currentMinute <= 0));

        return {
          passed: !isPrayerTime,
          score: isPrayerTime ? 30 : 100,
          message: isPrayerTime 
            ? 'Deployment during Friday prayer time - not recommended' 
            : 'No prayer time conflict',
          details: [
            `Current day: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDay]}`,
            `Current time: ${currentTime.toLocaleTimeString('id-ID')}`,
            `Friday prayer time: 11:30-13:00 WIB`
          ],
          recommendations: isPrayerTime 
            ? ['Reschedule deployment to avoid Friday prayer time (11:30-13:00 WIB)']
            : ['Prayer time consideration satisfied']
        };
      }
    });

    // Indonesian Holiday Check
    this.safetyChecks.set('indonesian_holiday', {
      id: 'indonesian_holiday',
      name: 'Indonesian Holiday Check',
      description: 'Check if deployment occurs on Indonesian national holidays',
      critical: false,
      indonesianBusinessContext: true,
      execute: async (): Promise<SafetyCheckResult> => {
        const isHoliday = await this.checkIndonesianHoliday();
        
        return {
          passed: !isHoliday,
          score: isHoliday ? 40 : 100,
          message: isHoliday 
            ? 'Deployment on Indonesian national holiday - not recommended' 
            : 'No Indonesian holiday conflict',
          details: [
            `Holiday check date: ${new Date().toLocaleDateString('id-ID')}`,
            `Indonesian holiday calendar consulted`
          ],
          recommendations: isHoliday 
            ? ['Consider rescheduling deployment to avoid Indonesian holiday']
            : ['Holiday consideration satisfied']
        };
      }
    });

    // Cultural Validation Check
    this.safetyChecks.set('cultural_validation', {
      id: 'cultural_validation',
      name: 'Indonesian Cultural Validation',
      description: 'Validate cultural appropriateness for Indonesian business context',
      critical: true,
      indonesianBusinessContext: true,
      execute: async (): Promise<SafetyCheckResult> => {
        const culturalScore = await this.getCulturalValidationScore();
        const passed = culturalScore >= 70;

        return {
          passed,
          score: culturalScore,
          message: passed 
            ? `Cultural validation passed (${culturalScore}/100)` 
            : `Cultural validation failed (${culturalScore}/100)`,
          details: [
            `Cultural appropriateness score: ${culturalScore}/100`,
            'Includes: Language formality, honorific usage, business etiquette',
            'Indonesian business communication standards applied'
          ],
          recommendations: passed 
            ? ['Cultural validation meets Indonesian business standards']
            : [
                'Review Indonesian business communication patterns',
                'Ensure proper honorific usage (Bapak/Ibu)',
                'Use formal Bahasa Indonesia for business context'
              ]
        };
      }
    });

    // Materai Compliance Check
    this.safetyChecks.set('materai_compliance', {
      id: 'materai_compliance',
      name: 'Materai Compliance Validation',
      description: 'Validate Indonesian materai tax compliance for business documents',
      critical: true,
      indonesianBusinessContext: true,
      execute: async (): Promise<SafetyCheckResult> => {
        const materaiCompliant = await this.checkMateraiCompliance();

        return {
          passed: materaiCompliant,
          score: materaiCompliant ? 100 : 0,
          message: materaiCompliant 
            ? 'Materai compliance validation passed' 
            : 'Materai compliance validation failed',
          details: [
            'Indonesian tax regulation compliance (materai ≥ Rp 5.000.000)',
            'Document stamping requirements validated',
            'Business document legal compliance checked'
          ],
          recommendations: materaiCompliant 
            ? ['Materai compliance meets Indonesian tax regulations']
            : [
                'Review materai requirements for Indonesian business documents',
                'Ensure proper tax stamp calculations',
                'Validate document value thresholds'
              ]
        };
      }
    });

    // Performance Impact Check
    this.safetyChecks.set('performance_impact', {
      id: 'performance_impact',
      name: 'Performance Impact (Indonesian Networks)',
      description: 'Check performance impact on Indonesian network conditions',
      critical: true,
      indonesianBusinessContext: true,
      execute: async (): Promise<SafetyCheckResult> => {
        const performanceMetrics = await this.getPerformanceMetrics();
        const passed = performanceMetrics.lcp <= 4000 && performanceMetrics.ttfb <= 1800;

        return {
          passed,
          score: this.calculatePerformanceScore(performanceMetrics),
          message: passed 
            ? 'Performance impact acceptable for Indonesian networks' 
            : 'Performance impact concerns for Indonesian network conditions',
          details: [
            `LCP (Largest Contentful Paint): ${performanceMetrics.lcp}ms (threshold: 4000ms)`,
            `TTFB (Time To First Byte): ${performanceMetrics.ttfb}ms (threshold: 1800ms)`,
            `FCP (First Contentful Paint): ${performanceMetrics.fcp}ms`,
            'Adjusted thresholds for Indonesian 3G/4G network conditions'
          ],
          recommendations: passed 
            ? ['Performance meets Indonesian network requirements']
            : [
                'Optimize for Indonesian 3G/4G network conditions',
                'Consider CDN implementation for Indonesian regions',
                'Implement progressive loading for slower connections'
              ]
        };
      }
    });

    // Security Validation Check
    this.safetyChecks.set('security_validation', {
      id: 'security_validation',
      name: 'Security Validation',
      description: 'Validate security compliance for Indonesian business data',
      critical: true,
      indonesianBusinessContext: true,
      execute: async (): Promise<SafetyCheckResult> => {
        const securityScore = await this.getSecurityValidationScore();
        const passed = securityScore >= 80;

        return {
          passed,
          score: securityScore,
          message: passed 
            ? `Security validation passed (${securityScore}/100)` 
            : `Security validation failed (${securityScore}/100)`,
          details: [
            'Indonesian financial data protection requirements',
            'Business document security compliance',
            'User data privacy regulations (Indonesian context)'
          ],
          recommendations: passed 
            ? ['Security compliance meets Indonesian business requirements']
            : [
                'Review Indonesian data protection requirements',
                'Strengthen business document security',
                'Ensure compliance with local privacy regulations'
              ]
        };
      }
    });
  }

  private initializeRollbackTriggers(): void {
    // High Error Rate Trigger
    this.rollbackTriggers.set('high_error_rate', {
      id: 'high_error_rate',
      name: 'High Error Rate',
      condition: 'error_rate > threshold',
      threshold: 0.05, // 5%
      autoRollback: true,
      severity: 'high',
      indonesianContext: false
    });

    // Cultural Validation Failure
    this.rollbackTriggers.set('cultural_validation_failure', {
      id: 'cultural_validation_failure',
      name: 'Cultural Validation Failure',
      condition: 'cultural_score < threshold',
      threshold: 60,
      autoRollback: true,
      severity: 'high',
      indonesianContext: true
    });

    // Performance Degradation (Indonesian Networks)
    this.rollbackTriggers.set('performance_degradation_indonesian', {
      id: 'performance_degradation_indonesian',
      name: 'Performance Degradation (Indonesian Networks)',
      condition: 'lcp > threshold OR ttfb > threshold',
      threshold: { lcp: 5000, ttfb: 2500 }, // More lenient for Indonesian conditions
      autoRollback: true,
      severity: 'medium',
      indonesianContext: true
    });

    // Materai Compliance Failure
    this.rollbackTriggers.set('materai_compliance_failure', {
      id: 'materai_compliance_failure',
      name: 'Materai Compliance Failure',
      condition: 'materai_compliance = false',
      threshold: false,
      autoRollback: true,
      severity: 'critical',
      indonesianContext: true
    });

    // User Satisfaction Drop
    this.rollbackTriggers.set('user_satisfaction_drop', {
      id: 'user_satisfaction_drop',
      name: 'User Satisfaction Drop',
      condition: 'user_satisfaction < threshold',
      threshold: 0.7, // 70%
      autoRollback: false, // Manual review required
      severity: 'medium',
      indonesianContext: true
    });
  }

  private async performAutomatedChecks(flagId: string): Promise<void> {
    try {
      // Get current metrics
      const metrics = await this.getCurrentMetrics(flagId);
      
      // Check each rollback trigger
      for (const [triggerId, trigger] of this.rollbackTriggers) {
        const triggerActivated = await this.evaluateTrigger(trigger, metrics);
        
        if (triggerActivated && trigger.autoRollback) {
          const reason = `Automated rollback triggered: ${trigger.name}`;
          await this.performAutomatedRollback(flagId, reason, trigger.severity);
          break; // Stop after first rollback
        } else if (triggerActivated && !trigger.autoRollback) {
          // Send alert for manual review
          await this.sendManualReviewAlert(flagId, trigger.name, trigger.severity);
        }
      }
    } catch (error) {
      console.error(`Automated monitoring failed for ${flagId}:`, error);
    }
  }

  private determineOverallSafety(
    score: number, 
    blockerCount: number, 
    warningCount: number
  ): 'SAFE' | 'WARNING' | 'UNSAFE' {
    if (blockerCount > 0 || score < 60) {
      return 'UNSAFE';
    } else if (warningCount > 0 || score < 80) {
      return 'WARNING';
    } else {
      return 'SAFE';
    }
  }

  private async getIndonesianBusinessCompliance(flagId: string): Promise<any> {
    return {
      culturalScore: await this.getCulturalValidationScore(),
      materaiCompliant: await this.checkMateraiCompliance(),
      businessHoursCheck: await this.checkBusinessHours(),
      holidayCheck: !(await this.checkIndonesianHoliday()),
      prayerTimeCheck: !(await this.checkPrayerTime())
    };
  }

  private calculatePerformanceScore(metrics: any): number {
    // Weight different metrics for Indonesian network conditions
    const lcpScore = Math.max(0, 100 - (metrics.lcp - 2000) / 40); // 2000ms baseline
    const ttfbScore = Math.max(0, 100 - (metrics.ttfb - 800) / 20); // 800ms baseline
    const fcpScore = Math.max(0, 100 - (metrics.fcp - 1500) / 30); // 1500ms baseline
    
    return Math.round((lcpScore * 0.4 + ttfbScore * 0.4 + fcpScore * 0.2));
  }

  // Mock implementations (would be replaced with actual integrations)
  private async checkIndonesianHoliday(): Promise<boolean> {
    // Integration with Indonesian holiday API
    return false;
  }

  private async getCulturalValidationScore(): Promise<number> {
    // Integration with cultural validation service
    return 85;
  }

  private async checkMateraiCompliance(): Promise<boolean> {
    // Integration with materai compliance service
    return true;
  }

  private async checkBusinessHours(): Promise<boolean> {
    const jakartaTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const currentHour = new Date(jakartaTime).getHours();
    return currentHour >= 8 && currentHour < 17;
  }

  private async checkPrayerTime(): Promise<boolean> {
    const jakartaTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const currentTime = new Date(jakartaTime);
    const currentDay = currentTime.getDay();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();

    return currentDay === 5 && 
      ((currentHour === 11 && currentMinute >= 30) || 
       currentHour === 12 || 
       (currentHour === 13 && currentMinute <= 0));
  }

  private async getPerformanceMetrics(): Promise<any> {
    // Integration with performance monitoring service
    return {
      lcp: 2800,
      fcp: 1600,
      ttfb: 900
    };
  }

  private async getSecurityValidationScore(): Promise<number> {
    // Integration with security validation service
    return 90;
  }

  private async getCurrentMetrics(flagId: string): Promise<any> {
    // Integration with metrics collection service
    return {
      errorRate: 0.02,
      culturalScore: 85,
      performanceMetrics: {
        lcp: 2800,
        ttfb: 900
      },
      materaiCompliance: true,
      userSatisfaction: 0.85
    };
  }

  private async evaluateTrigger(trigger: RollbackTrigger, metrics: any): Promise<boolean> {
    switch (trigger.id) {
      case 'high_error_rate':
        return metrics.errorRate > trigger.threshold;
      case 'cultural_validation_failure':
        return metrics.culturalScore < trigger.threshold;
      case 'performance_degradation_indonesian':
        return metrics.performanceMetrics.lcp > trigger.threshold.lcp || 
               metrics.performanceMetrics.ttfb > trigger.threshold.ttfb;
      case 'materai_compliance_failure':
        return !metrics.materaiCompliance;
      case 'user_satisfaction_drop':
        return metrics.userSatisfaction < trigger.threshold;
      default:
        return false;
    }
  }

  private async logRollbackEvent(
    flagId: string, 
    reason: string, 
    severity: string, 
    type: string
  ): Promise<void> {
    console.log(`📝 Rollback event logged: ${flagId} - ${reason} (${severity}, ${type})`);
  }

  private async executeRollback(flagId: string, reason: string): Promise<void> {
    // Integration with feature flags service to perform actual rollback
    console.log(`🔄 Executing rollback for ${flagId}: ${reason}`);
  }

  private async sendRollbackAlert(
    flagId: string, 
    reason: string, 
    severity: string, 
    type: string
  ): Promise<void> {
    console.log(`🚨 Rollback alert sent: ${flagId} - ${reason} (${severity}, ${type})`);
  }

  private async sendCriticalAlert(flagId: string, message: string): Promise<void> {
    console.log(`🆘 CRITICAL ALERT: ${flagId} - ${message}`);
  }

  private async sendManualReviewAlert(
    flagId: string, 
    triggerName: string, 
    severity: string
  ): Promise<void> {
    console.log(`👨‍💼 Manual review alert: ${flagId} - ${triggerName} (${severity})`);
  }
}

export default DeploymentSafetyService;