// Feature Flags DTOs for Indonesian Business Management System
// Data Transfer Objects for API validation and type safety

import {
  IsString,
  IsBoolean,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  IsObject,
  Min,
  Max,
  IsDate,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum RolloutStrategy {
  INSTANT = "instant",
  GRADUAL = "gradual",
  CANARY = "canary",
  BLUE_GREEN = "blue_green",
}

export enum BusinessSize {
  MICRO = "micro",
  SMALL = "small",
  MEDIUM = "medium",
}

export enum Severity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export class CreateFeatureFlagDto {
  @ApiProperty({ description: "Unique feature flag identifier" })
  @IsString()
  flagId: string;

  @ApiProperty({ description: "Human-readable feature flag name" })
  @IsString()
  name: string;

  @ApiProperty({ description: "Feature flag description" })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: "Whether the flag is enabled by default",
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean = false;

  @ApiPropertyOptional({
    description: "Initial rollout percentage",
    minimum: 0,
    maximum: 100,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  rolloutPercentage?: number = 0;

  @ApiPropertyOptional({
    description: "Target Indonesian regions",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetRegions?: string[] = [];

  @ApiPropertyOptional({
    description: "Target business sizes",
    enum: BusinessSize,
    isArray: true,
  })
  @IsArray()
  @IsEnum(BusinessSize, { each: true })
  @IsOptional()
  targetBusinessSizes?: BusinessSize[] = [];

  @ApiPropertyOptional({
    description: "Feature flag dependencies",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dependencies?: string[] = [];

  @ApiPropertyOptional({
    description: "Whether kill switch is enabled",
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  killSwitch?: boolean = true;

  @ApiPropertyOptional({ description: "Feature flag metadata", type: "object" })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any> = {};
}

export class UpdateFeatureFlagDto {
  @ApiPropertyOptional({ description: "Human-readable feature flag name" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: "Feature flag description" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "Target Indonesian regions",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetRegions?: string[];

  @ApiPropertyOptional({
    description: "Target business sizes",
    enum: BusinessSize,
    isArray: true,
  })
  @IsArray()
  @IsEnum(BusinessSize, { each: true })
  @IsOptional()
  targetBusinessSizes?: BusinessSize[];

  @ApiPropertyOptional({
    description: "Feature flag dependencies",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dependencies?: string[];

  @ApiPropertyOptional({ description: "Whether kill switch is enabled" })
  @IsBoolean()
  @IsOptional()
  killSwitch?: boolean;

  @ApiPropertyOptional({ description: "Feature flag metadata", type: "object" })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class RolloutConfigDto {
  @ApiProperty({ description: "Rollout strategy", enum: RolloutStrategy })
  @IsEnum(RolloutStrategy)
  strategy: RolloutStrategy;

  @ApiPropertyOptional({
    description: "Rollout duration in minutes (for gradual rollout)",
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({
    description: "Canary rollout percentage",
    minimum: 1,
    maximum: 50,
  })
  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  canaryPercentage?: number;

  @ApiPropertyOptional({
    description: "Health check endpoints",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  healthChecks?: string[];

  @ApiPropertyOptional({
    description: "Success rate threshold (0-1)",
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  successThreshold?: number;

  @ApiPropertyOptional({
    description: "Error rate threshold (0-1)",
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  errorThreshold?: number;
}

export class FeatureFlagQueryDto {
  @ApiPropertyOptional({
    description: "Specific flag IDs to retrieve",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  flagIds?: string[];

  @ApiPropertyOptional({ description: "Filter by enabled status" })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: "Filter by target region" })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({
    description: "Filter by business size",
    enum: BusinessSize,
  })
  @IsEnum(BusinessSize)
  @IsOptional()
  businessSize?: BusinessSize;

  @ApiPropertyOptional({ description: "Include Indonesian business context" })
  @IsBoolean()
  @IsOptional()
  includeIndonesianContext?: boolean = true;
}

export class EmergencyRollbackDto {
  @ApiProperty({ description: "Reason for emergency rollback" })
  @IsString()
  reason: string;

  @ApiProperty({ description: "Severity level", enum: Severity })
  @IsEnum(Severity)
  severity: Severity;

  @ApiPropertyOptional({ description: "Additional context", type: "object" })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}

export class FeatureFlagStatsDto {
  @ApiProperty({ description: "Operation success status" })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: "Feature flag statistics data", type: "object" })
  @IsObject()
  data: {
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
    indonesianBusinessMetrics?: {
      regionBreakdown: Record<string, number>;
      businessSizeDistribution: Record<string, number>;
      culturalValidationScore: number;
      materaiComplianceRate: number;
      whatsappIntegrationUsage: number;
    };
  };
}

export class SafetyCheckDto {
  @ApiProperty({ description: "Whether safety checks passed" })
  @IsBoolean()
  safe: boolean;

  @ApiProperty({ description: "Warning messages", type: [String] })
  @IsArray()
  @IsString({ each: true })
  warnings: string[];

  @ApiProperty({ description: "Blocking issues", type: [String] })
  @IsArray()
  @IsString({ each: true })
  blockers: string[];

  @ApiProperty({ description: "Recommendations", type: [String] })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[];

  @ApiPropertyOptional({
    description: "Indonesian business context checks",
    type: "object",
  })
  @IsObject()
  @IsOptional()
  indonesianBusinessChecks?: {
    businessHours: boolean;
    prayerTime: boolean;
    holiday: boolean;
    culturalValidation: boolean;
    materaiCompliance: boolean;
  };
}

export class FeatureFlagHealthDto {
  @ApiProperty({ description: "Feature flag ID" })
  @IsString()
  flagId: string;

  @ApiProperty({ description: "Overall health status" })
  @IsBoolean()
  healthy: boolean;

  @ApiProperty({ description: "Error rate (0-1)" })
  @IsNumber()
  errorRate: number;

  @ApiProperty({ description: "Success rate (0-1)" })
  @IsNumber()
  successRate: number;

  @ApiProperty({ description: "Performance metrics", type: "object" })
  @IsObject()
  performanceMetrics: {
    lcp: number;
    fcp: number;
    ttfb: number;
    responseTime: number;
  };

  @ApiProperty({ description: "Cultural validation score (0-100)" })
  @IsNumber()
  @Min(0)
  @Max(100)
  culturalValidationScore: number;

  @ApiProperty({ description: "Materai compliance rate (0-1)" })
  @IsNumber()
  @Min(0)
  @Max(1)
  materaiComplianceRate: number;

  @ApiProperty({ description: "Last health check timestamp" })
  @Type(() => Date)
  @IsDate()
  lastChecked: Date;

  @ApiPropertyOptional({
    description: "Health recommendations",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  recommendations?: string[];
}

export class IndonesianValidationDto {
  @ApiProperty({ description: "Feature flag ID" })
  @IsString()
  flagId: string;

  @ApiProperty({ description: "Cultural validation score (0-100)" })
  @IsNumber()
  @Min(0)
  @Max(100)
  culturalScore: number;

  @ApiProperty({ description: "Materai compliance status" })
  @IsBoolean()
  materaiCompliant: boolean;

  @ApiProperty({ description: "Business hours check" })
  @IsBoolean()
  businessHoursCheck: boolean;

  @ApiProperty({ description: "Prayer time consideration" })
  @IsBoolean()
  prayerTimeCheck: boolean;

  @ApiProperty({ description: "Holiday check" })
  @IsBoolean()
  holidayCheck: boolean;

  @ApiPropertyOptional({
    description: "Regional compliance details",
    type: "object",
  })
  @IsObject()
  @IsOptional()
  regionalCompliance?: {
    jakarta: boolean;
    surabaya: boolean;
    bandung: boolean;
    yogyakarta: boolean;
    medan: boolean;
  };

  @ApiPropertyOptional({
    description: "Business etiquette validation",
    type: "object",
  })
  @IsObject()
  @IsOptional()
  businessEtiquette?: {
    formalLanguage: boolean;
    honorificUsage: boolean;
    politenessLevel: number;
  };
}

export class AuditLogQueryDto {
  @ApiPropertyOptional({
    description: "Number of records to return",
    default: 50,
  })
  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({ description: "Number of records to skip", default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  offset?: number = 0;

  @ApiPropertyOptional({ description: "Start date for audit log filter" })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ description: "End date for audit log filter" })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({ description: "Filter by event type" })
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiPropertyOptional({ description: "Filter by user ID" })
  @IsString()
  @IsOptional()
  userId?: string;
}

export class FeatureFlagTestDto {
  @ApiPropertyOptional({
    description: "Test users for feature flag validation",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  testUsers?: string[];

  @ApiPropertyOptional({
    description: "Test regions for feature flag validation",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  testRegions?: string[];

  @ApiPropertyOptional({
    description: "Run in dry-run mode without actual changes",
  })
  @IsBoolean()
  @IsOptional()
  dryRun?: boolean = true;

  @ApiPropertyOptional({
    description: "Include Indonesian business context validation",
  })
  @IsBoolean()
  @IsOptional()
  includeIndonesianValidation?: boolean = true;

  @ApiPropertyOptional({
    description: "Test specific business sizes",
    enum: BusinessSize,
    isArray: true,
  })
  @IsArray()
  @IsEnum(BusinessSize, { each: true })
  @IsOptional()
  testBusinessSizes?: BusinessSize[];
}

export class FeatureFlagUserContextDto {
  @ApiProperty({ description: "User ID" })
  @IsString()
  id: string;

  @ApiProperty({ description: "User email" })
  @IsString()
  email: string;

  @ApiProperty({ description: "Indonesian region" })
  @IsString()
  region: string;

  @ApiProperty({ description: "Business size", enum: BusinessSize })
  @IsEnum(BusinessSize)
  businessSize: BusinessSize;

  @ApiProperty({ description: "User type" })
  @IsString()
  userType: string;

  @ApiProperty({ description: "User preferences", type: "object" })
  @IsObject()
  preferences: {
    language: string;
    timezone: string;
    currency: string;
  };

  @ApiPropertyOptional({
    description: "Indonesian business context",
    type: "object",
  })
  @IsObject()
  @IsOptional()
  indonesianContext?: {
    businessStyle: string;
    formalityLevel: string;
    communicationPreference: string;
    culturalRegion: string;
  };
}

export class RolloutUpdateDto {
  @ApiProperty({
    description: "New rollout percentage",
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiPropertyOptional({ description: "Reason for rollout update" })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: "Schedule the update (future timestamp)",
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  scheduledFor?: Date;

  @ApiPropertyOptional({ description: "Include safety checks before update" })
  @IsBoolean()
  @IsOptional()
  performSafetyChecks?: boolean = true;
}

export default {
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  RolloutConfigDto,
  FeatureFlagQueryDto,
  EmergencyRollbackDto,
  FeatureFlagStatsDto,
  SafetyCheckDto,
  FeatureFlagHealthDto,
  IndonesianValidationDto,
  AuditLogQueryDto,
  FeatureFlagTestDto,
  FeatureFlagUserContextDto,
  RolloutUpdateDto,
};
