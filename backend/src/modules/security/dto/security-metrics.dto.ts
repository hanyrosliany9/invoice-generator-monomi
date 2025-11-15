import { ApiProperty } from '@nestjs/swagger';

export class XssMetricsDto {
  @ApiProperty({ example: 92, description: 'XSS protection score (0-100)' })
  score: number;

  @ApiProperty({ example: 156, description: 'Number of XSS threats blocked in last 24h' })
  threatsBlocked: number;

  @ApiProperty({ description: 'Last scan timestamp' })
  lastScan: Date;

  @ApiProperty({ example: 2, description: 'Active vulnerabilities count' })
  vulnerabilities: number;
}

export class MateraiMetricsDto {
  @ApiProperty({ example: 94, description: 'Materai compliance rate percentage' })
  complianceRate: number;

  @ApiProperty({ example: 1284, description: 'Total materai validations performed' })
  totalValidations: number;

  @ApiProperty({ example: 142, description: 'Number of exemptions used' })
  exemptionsUsed: number;

  @ApiProperty({ example: 1420000, description: 'Potential savings in IDR' })
  potentialSavings: number;

  @ApiProperty({ description: 'Last compliance check timestamp' })
  lastCheck: Date;
}

export class PrivacyMetricsDto {
  @ApiProperty({ example: 89, description: 'Data protection score (0-100)' })
  dataProtectionScore: number;

  @ApiProperty({ example: 0, description: 'Sensitive data exposures detected' })
  sensitiveDataExposures: number;

  @ApiProperty({ example: 85, description: 'GDPR compliance score' })
  gdprCompliance: number;

  @ApiProperty({ example: 91, description: 'Indonesian law compliance score (UU 27/2022)' })
  indonesianLawCompliance: number;
}

export class AuthenticationMetricsDto {
  @ApiProperty({ example: true, description: 'Strong password policy enabled' })
  strongPasswordPolicy: boolean;

  @ApiProperty({ example: true, description: 'Multi-factor authentication enabled' })
  mfaEnabled: boolean;

  @ApiProperty({ example: 88, description: 'Session security score (0-100)' })
  sessionSecurity: number;

  @ApiProperty({ example: true, description: 'CSRF protection enabled' })
  csrfProtection: boolean;
}

export class MonitoringMetricsDto {
  @ApiProperty({ example: true, description: 'Real-time alerts enabled' })
  realTimeAlerts: boolean;

  @ApiProperty({ example: 365, description: 'Log retention period in days' })
  logRetention: number;

  @ApiProperty({ example: true, description: 'Anomaly detection enabled' })
  anomalyDetection: boolean;

  @ApiProperty({ example: true, description: 'Incident response enabled' })
  incidentResponse: boolean;
}

export class OverallSecurityDto {
  @ApiProperty({ example: 87, description: 'Overall security score (0-100)' })
  score: number;

  @ApiProperty({
    enum: ['excellent', 'good', 'warning', 'critical'],
    example: 'good',
    description: 'Overall security status'
  })
  status: 'excellent' | 'good' | 'warning' | 'critical';

  @ApiProperty({ description: 'Last update timestamp' })
  lastUpdated: Date;
}

export class SecurityMetricsResponseDto {
  @ApiProperty({ type: OverallSecurityDto })
  overall: OverallSecurityDto;

  @ApiProperty({ type: XssMetricsDto })
  xss: XssMetricsDto;

  @ApiProperty({ type: MateraiMetricsDto })
  materai: MateraiMetricsDto;

  @ApiProperty({ type: PrivacyMetricsDto })
  privacy: PrivacyMetricsDto;

  @ApiProperty({ type: AuthenticationMetricsDto })
  authentication: AuthenticationMetricsDto;

  @ApiProperty({ type: MonitoringMetricsDto })
  monitoring: MonitoringMetricsDto;
}

export class ComplianceAlertDto {
  @ApiProperty({ example: 'alert_001' })
  id: string;

  @ApiProperty({ enum: ['security', 'privacy', 'materai', 'business'], example: 'materai' })
  type: 'security' | 'privacy' | 'materai' | 'business';

  @ApiProperty({ enum: ['critical', 'high', 'medium', 'low'], example: 'medium' })
  severity: 'critical' | 'high' | 'medium' | 'low';

  @ApiProperty({ example: 'Materai Compliance Check Required' })
  title: string;

  @ApiProperty({ example: '15 transaksi memerlukan validasi materai dalam 24 jam terakhir' })
  description: string;

  @ApiProperty({ example: 'Review dan validasi perhitungan materai untuk transaksi di atas Rp 5 juta' })
  recommendation: string;

  @ApiProperty({ description: 'Alert timestamp' })
  timestamp: Date;

  @ApiProperty({ example: true, description: 'Whether this is specific to Indonesian regulations' })
  indonesianSpecific: boolean;

  @ApiProperty({ example: false, description: 'Whether the alert has been resolved' })
  resolved: boolean;

  @ApiProperty({ example: ['quotation', 'invoice'], description: 'Affected systems' })
  affectedSystems: string[];
}

export class SecurityAlertsResponseDto {
  @ApiProperty({ type: [ComplianceAlertDto] })
  alerts: ComplianceAlertDto[];

  @ApiProperty({ example: 3, description: 'Total unresolved alerts' })
  unresolvedCount: number;

  @ApiProperty({ example: 1, description: 'Critical alerts count' })
  criticalCount: number;
}
