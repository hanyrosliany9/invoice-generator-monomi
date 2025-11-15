import { apiClient } from '../config/api';

export interface SecurityComplianceState {
  overall: {
    score: number;
    status: 'excellent' | 'good' | 'warning' | 'critical';
    lastUpdated: Date;
  };
  xss: {
    score: number;
    threatsBlocked: number;
    lastScan: Date;
    vulnerabilities: number;
  };
  materai: {
    complianceRate: number;
    totalValidations: number;
    exemptionsUsed: number;
    potentialSavings: number;
    lastCheck: Date;
  };
  privacy: {
    dataProtectionScore: number;
    sensitiveDataExposures: number;
    gdprCompliance: number;
    indonesianLawCompliance: number;
  };
  authentication: {
    strongPasswordPolicy: boolean;
    mfaEnabled: boolean;
    sessionSecurity: number;
    csrfProtection: boolean;
  };
  monitoring: {
    realTimeAlerts: boolean;
    logRetention: number;
    anomalyDetection: boolean;
    incidentResponse: boolean;
  };
}

export interface ComplianceAlert {
  id: string;
  type: 'security' | 'privacy' | 'materai' | 'business';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  timestamp: Date;
  indonesianSpecific: boolean;
  resolved: boolean;
  affectedSystems: string[];
}

export interface SecurityAlertsResponse {
  alerts: ComplianceAlert[];
  unresolvedCount: number;
  criticalCount: number;
}

export const securityService = {
  // Get security metrics
  getSecurityMetrics: async (): Promise<SecurityComplianceState> => {
    const response = await apiClient.get('/security/metrics');
    return response?.data?.data;
  },

  // Get security alerts
  getSecurityAlerts: async (): Promise<SecurityAlertsResponse> => {
    const response = await apiClient.get('/security/alerts');
    return response?.data?.data;
  },
};
