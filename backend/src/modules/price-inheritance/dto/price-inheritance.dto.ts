// Price Inheritance DTOs - Indonesian Business Management System
// Data Transfer Objects for price inheritance API endpoints

import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDate,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsUUID,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// Enums
export enum PriceInheritanceMode {
  INHERIT = "inherit",
  CUSTOM = "custom",
  PARTIAL = "partial",
}

export enum EntityType {
  QUOTATION = "quotation",
  INVOICE = "invoice",
}

export enum PriceSourceType {
  PROJECT = "project",
  QUOTATION = "quotation",
  TEMPLATE = "template",
  MANUAL = "manual",
}

export enum ValidationSeverity {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  SUCCESS = "success",
}

export enum IndonesianBusinessRule {
  MATERAI = "materai",
  TAX_COMPLIANCE = "tax_compliance",
  BUSINESS_ETIQUETTE = "business_etiquette",
}

export enum CommunicationStyle {
  FORMAL = "formal",
  SEMI_FORMAL = "semi-formal",
  CASUAL = "casual",
}

// Base DTOs

export class PriceSourceMetadataDto {
  @ApiPropertyOptional({ description: "Entity creator" })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ description: "Entity approver" })
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @ApiPropertyOptional({ description: "Additional notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PriceSourceDto {
  @ApiProperty({ description: "Unique identifier for the price source" })
  @IsUUID()
  id: string;

  @ApiProperty({ enum: PriceSourceType, description: "Type of price source" })
  @IsEnum(PriceSourceType)
  type: PriceSourceType;

  @ApiProperty({ description: "Name of the source entity" })
  @IsString()
  entityName: string;

  @ApiPropertyOptional({ description: "Number or code of the source entity" })
  @IsOptional()
  @IsString()
  entityNumber?: string;

  @ApiProperty({ description: "Original amount from the source", minimum: 0 })
  @IsNumber()
  @Min(0)
  originalAmount: number;

  @ApiProperty({ description: "Last updated timestamp" })
  @IsDate()
  @Type(() => Date)
  lastUpdated: Date;

  @ApiPropertyOptional({ type: PriceSourceMetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PriceSourceMetadataDto)
  metadata?: PriceSourceMetadataDto;
}

export class ValidationRuleMetadataDto {
  @ApiPropertyOptional({ description: "Threshold value for validation" })
  @IsOptional()
  @IsNumber()
  threshold?: number;

  @ApiPropertyOptional({ description: "Calculated value during validation" })
  @IsOptional()
  @IsNumber()
  calculatedValue?: number;

  @ApiPropertyOptional({ description: "Required documents for compliance" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredDocuments?: string[];
}

export class PriceValidationRuleDto {
  @ApiProperty({ description: "Unique identifier for the validation rule" })
  @IsString()
  id: string;

  @ApiProperty({ description: "Type of validation rule" })
  @IsString()
  type: string;

  @ApiProperty({ enum: ValidationSeverity, description: "Severity level" })
  @IsEnum(ValidationSeverity)
  severity: ValidationSeverity;

  @ApiProperty({ description: "Validation message" })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: "Indonesian business context" })
  @IsOptional()
  @IsString()
  indonesianContext?: string;

  @ApiPropertyOptional({ description: "Suggested action to resolve" })
  @IsOptional()
  @IsString()
  suggestedAction?: string;

  @ApiPropertyOptional({ description: "Whether this rule blocks progression" })
  @IsOptional()
  @IsBoolean()
  isBlocking?: boolean;

  @ApiPropertyOptional({ type: ValidationRuleMetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ValidationRuleMetadataDto)
  metadata?: ValidationRuleMetadataDto;
}

export class TaxComplianceDto {
  @ApiProperty({ description: "Whether PPN (VAT) is required" })
  @IsBoolean()
  ppnRequired: boolean;

  @ApiProperty({ description: "PPN rate percentage", minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  ppnRate: number;

  @ApiProperty({ description: "Whether PPh (Income Tax) is required" })
  @IsBoolean()
  pphRequired: boolean;

  @ApiProperty({ description: "PPh rate percentage", minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  pphRate: number;
}

export class BusinessEtiquetteDto {
  @ApiProperty({ description: "Suggested timing for business communication" })
  @IsString()
  suggestedTiming: string;

  @ApiProperty({
    enum: CommunicationStyle,
    description: "Recommended communication style",
  })
  @IsEnum(CommunicationStyle)
  communicationStyle: CommunicationStyle;

  @ApiProperty({
    description: "Cultural notes for Indonesian business context",
  })
  @IsArray()
  @IsString({ each: true })
  culturalNotes: string[];
}

export class IndonesianComplianceDto {
  @ApiProperty({ description: "Whether materai (stamp duty) is required" })
  @IsBoolean()
  materaiRequired: boolean;

  @ApiProperty({ description: "Required materai amount in IDR", minimum: 0 })
  @IsNumber()
  @Min(0)
  materaiAmount: number;

  @ApiProperty({ type: TaxComplianceDto })
  @ValidateNested()
  @Type(() => TaxComplianceDto)
  taxCompliance: TaxComplianceDto;

  @ApiProperty({ type: BusinessEtiquetteDto })
  @ValidateNested()
  @Type(() => BusinessEtiquetteDto)
  businessEtiquette: BusinessEtiquetteDto;
}

export class PriceValidationResponseDto {
  @ApiProperty({ description: "Whether the price configuration is valid" })
  @IsBoolean()
  isValid: boolean;

  @ApiProperty({
    type: [PriceValidationRuleDto],
    description: "Validation errors",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceValidationRuleDto)
  errors: PriceValidationRuleDto[];

  @ApiProperty({
    type: [PriceValidationRuleDto],
    description: "Validation warnings",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceValidationRuleDto)
  warnings: PriceValidationRuleDto[];

  @ApiProperty({
    type: [PriceValidationRuleDto],
    description: "Validation suggestions",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceValidationRuleDto)
  suggestions: PriceValidationRuleDto[];

  @ApiProperty({ type: IndonesianComplianceDto })
  @ValidateNested()
  @Type(() => IndonesianComplianceDto)
  compliance: IndonesianComplianceDto;

  @ApiProperty({ description: "Total number of rules applied" })
  @IsNumber()
  totalRules: number;

  @ApiProperty({ description: "Timestamp when validation was performed" })
  @IsDate()
  @Type(() => Date)
  validationTimestamp: Date;
}

// Request DTOs

export class CreatePriceInheritanceDto {
  @ApiProperty({ enum: EntityType, description: "Type of entity" })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({ description: "ID of the entity" })
  @IsUUID()
  entityId: string;

  @ApiProperty({
    enum: PriceInheritanceMode,
    description: "Price inheritance mode",
  })
  @IsEnum(PriceInheritanceMode)
  mode: PriceInheritanceMode;

  @ApiProperty({
    description: "Current amount",
    minimum: 0,
    maximum: 999999999999,
  })
  @IsNumber()
  @Min(0)
  @Max(999999999999)
  currentAmount: number;

  @ApiPropertyOptional({ description: "ID of the price source" })
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @ApiPropertyOptional({
    description: "Inherited amount from source",
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  inheritedAmount?: number;

  @ApiPropertyOptional({
    description: "Whether to track user interaction",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  trackUserInteraction?: boolean = true;

  @ApiPropertyOptional({ description: "Additional configuration options" })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdatePriceInheritanceDto {
  @ApiProperty({ enum: EntityType, description: "Type of entity" })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({ description: "ID of the entity" })
  @IsUUID()
  entityId: string;

  @ApiProperty({
    enum: PriceInheritanceMode,
    description: "Price inheritance mode",
  })
  @IsEnum(PriceInheritanceMode)
  mode: PriceInheritanceMode;

  @ApiProperty({
    description: "Current amount",
    minimum: 0,
    maximum: 999999999999,
  })
  @IsNumber()
  @Min(0)
  @Max(999999999999)
  currentAmount: number;

  @ApiPropertyOptional({ description: "ID of the price source" })
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @ApiPropertyOptional({
    description: "Inherited amount from source",
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  inheritedAmount?: number;
}

export class GetPriceSourcesQueryDto {
  @ApiProperty({ enum: EntityType, description: "Type of entity" })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({ description: "ID of the entity" })
  @IsUUID()
  entityId: string;
}

export class ValidatePriceInheritanceDto {
  @ApiProperty({
    description: "Amount to validate",
    minimum: 0,
    maximum: 999999999999,
  })
  @IsNumber()
  @Min(0)
  @Max(999999999999)
  amount: number;

  @ApiProperty({
    enum: PriceInheritanceMode,
    description: "Price inheritance mode",
  })
  @IsEnum(PriceInheritanceMode)
  mode: PriceInheritanceMode;

  @ApiPropertyOptional({ description: "ID of the price source" })
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @ApiPropertyOptional({
    description: "Inherited amount from source",
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  inheritedAmount?: number;
}

// Response DTOs

export class PriceInheritanceConfigDto {
  @ApiProperty({ enum: PriceInheritanceMode })
  mode: PriceInheritanceMode;

  @ApiPropertyOptional()
  sourceId?: string;

  @ApiProperty({ minimum: 0 })
  currentAmount: number;

  @ApiPropertyOptional({ minimum: 0 })
  inheritedAmount?: number;

  @ApiProperty({ minimum: 0, maximum: 1000 })
  deviationPercentage: number;

  @ApiProperty()
  requiresApproval: boolean;

  @ApiProperty()
  createdBy?: string;

  @ApiProperty()
  updatedBy?: string;

  @ApiProperty()
  @Type(() => Date)
  createdAt?: Date;

  @ApiProperty()
  @Type(() => Date)
  updatedAt?: Date;
}

export class PriceInheritanceMetadataDto {
  @ApiProperty({ enum: EntityType })
  entityType: EntityType;

  @ApiProperty()
  entityId: string;

  @ApiProperty()
  @Type(() => Date)
  calculatedAt: Date;

  @ApiProperty()
  version: string;
}

export class PriceInheritanceResponseDto {
  @ApiProperty({ type: PriceInheritanceConfigDto })
  @ValidateNested()
  @Type(() => PriceInheritanceConfigDto)
  config: PriceInheritanceConfigDto;

  @ApiProperty({ type: PriceValidationResponseDto })
  @ValidateNested()
  @Type(() => PriceValidationResponseDto)
  validation: PriceValidationResponseDto;

  @ApiProperty({ type: PriceInheritanceMetadataDto })
  @ValidateNested()
  @Type(() => PriceInheritanceMetadataDto)
  metadata: PriceInheritanceMetadataDto;
}

export class PriceInheritanceAnalyticsDto {
  @ApiProperty({ description: "Total configurations created" })
  @IsNumber()
  totalConfigurations: number;

  @ApiProperty({ description: "Distribution of inheritance modes" })
  modeDistribution: {
    inherit: number;
    custom: number;
    partial: number;
  };

  @ApiProperty({ description: "Average price deviation percentage" })
  @IsNumber()
  averageDeviation: number;

  @ApiProperty({ description: "Indonesian compliance rate" })
  @IsNumber()
  complianceRate: number;

  @ApiProperty({ description: "User satisfaction score" })
  @IsNumber()
  userSatisfaction: number;

  @ApiPropertyOptional({ description: "Date range for analytics" })
  @IsOptional()
  dateRange?: {
    from: Date;
    to: Date;
  };
}

// Error DTOs

export class PriceInheritanceErrorDto {
  @ApiProperty({ description: "Error message" })
  @IsString()
  message: string;

  @ApiProperty({ description: "Error code" })
  @IsString()
  code: string;

  @ApiPropertyOptional({
    type: [PriceValidationRuleDto],
    description: "Validation errors",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceValidationRuleDto)
  errors?: PriceValidationRuleDto[];

  @ApiPropertyOptional({
    description: "Suggested actions to resolve the error",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestedActions?: string[];

  @ApiPropertyOptional({ description: "Indonesian context for the error" })
  @IsOptional()
  @IsString()
  indonesianContext?: string;
}
