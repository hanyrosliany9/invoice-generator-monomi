// Business Journey DTOs - Indonesian Business Management System
// Enhanced with validation, security, and Indonesian compliance

import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsDateString,
  IsUUID,
  Min,
  Max,
  ValidateNested,
  IsJSON,
  Matches,
  Length,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// Enums from Prisma
export enum BusinessJourneyEventType {
  CLIENT_CREATED = "CLIENT_CREATED",
  PROJECT_STARTED = "PROJECT_STARTED",
  QUOTATION_DRAFT = "QUOTATION_DRAFT",
  QUOTATION_SENT = "QUOTATION_SENT",
  QUOTATION_APPROVED = "QUOTATION_APPROVED",
  QUOTATION_DECLINED = "QUOTATION_DECLINED",
  QUOTATION_REVISED = "QUOTATION_REVISED",
  INVOICE_GENERATED = "INVOICE_GENERATED",
  INVOICE_SENT = "INVOICE_SENT",
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
  PAYMENT_OVERDUE = "PAYMENT_OVERDUE",
  MATERAI_REQUIRED = "MATERAI_REQUIRED",
  MATERAI_APPLIED = "MATERAI_APPLIED",
}

export enum BusinessJourneyEventStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REQUIRES_ATTENTION = "REQUIRES_ATTENTION",
}

export enum BusinessJourneyEventSource {
  SYSTEM = "SYSTEM",
  USER = "USER",
  API = "API",
  WEBHOOK = "WEBHOOK",
}

export enum BusinessJourneyPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

// Business Journey Event Metadata DTO
export class CreateBusinessJourneyEventMetadataDto {
  @ApiProperty({
    description: "User who created the event",
  })
  @IsString()
  userCreated: string;

  @ApiPropertyOptional({
    description: "User who modified the event",
  })
  @IsOptional()
  @IsString()
  userModified?: string;

  @ApiPropertyOptional({
    enum: BusinessJourneyEventSource,
    description: "Event source",
    default: BusinessJourneyEventSource.SYSTEM,
  })
  @IsOptional()
  @IsEnum(BusinessJourneyEventSource)
  source?: BusinessJourneyEventSource;

  @ApiPropertyOptional({
    enum: BusinessJourneyPriority,
    description: "Event priority",
    default: BusinessJourneyPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(BusinessJourneyPriority)
  priority?: BusinessJourneyPriority;

  @ApiPropertyOptional({
    description: "Event tags",
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: "Related document IDs",
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedDocuments?: string[];

  @ApiPropertyOptional({
    description: "Additional notes",
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;

  @ApiPropertyOptional({
    description: "IP address of the user",
  })
  @IsOptional()
  @IsString()
  @Matches(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^::1$|^localhost$/)
  ipAddress?: string;

  @ApiPropertyOptional({
    description: "User agent string",
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({
    description: "Whether materai is required for this event",
  })
  @IsOptional()
  @IsBoolean()
  materaiRequired?: boolean;

  @ApiPropertyOptional({
    description: "Materai amount in IDR",
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  materaiAmount?: number;

  @ApiPropertyOptional({
    description: "Indonesian compliance status",
  })
  @IsOptional()
  @IsString()
  complianceStatus?: string;
}

// Create Business Journey Event DTO
export class CreateBusinessJourneyEventDto {
  @ApiProperty({
    enum: BusinessJourneyEventType,
    description: "Type of business journey event",
  })
  @IsEnum(BusinessJourneyEventType)
  type: BusinessJourneyEventType;

  @ApiProperty({
    description: "Event title",
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiProperty({
    description: "Event description",
    minLength: 1,
    maxLength: 1000,
  })
  @IsString()
  @Length(1, 1000)
  description: string;

  @ApiPropertyOptional({
    enum: BusinessJourneyEventStatus,
    description: "Event status",
    default: BusinessJourneyEventStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(BusinessJourneyEventStatus)
  status?: BusinessJourneyEventStatus;

  @ApiPropertyOptional({
    description: "Event amount in IDR",
    minimum: 0,
    maximum: 999999999999,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999)
  amount?: number;

  @ApiPropertyOptional({
    description: "Related client ID",
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    description: "Related project ID",
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    description: "Related quotation ID",
  })
  @IsOptional()
  @IsUUID()
  quotationId?: string;

  @ApiPropertyOptional({
    description: "Related invoice ID",
  })
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @ApiPropertyOptional({
    description: "Related payment ID",
  })
  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @ApiPropertyOptional({
    description: "Event metadata",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateBusinessJourneyEventMetadataDto)
  metadata?: CreateBusinessJourneyEventMetadataDto;
}

// Update Business Journey Event Metadata DTO
export class UpdateBusinessJourneyEventMetadataDto {
  @ApiPropertyOptional({
    description: "User who modified the event",
  })
  @IsOptional()
  @IsString()
  userModified?: string;

  @ApiPropertyOptional({
    enum: BusinessJourneyPriority,
    description: "Event priority",
  })
  @IsOptional()
  @IsEnum(BusinessJourneyPriority)
  priority?: BusinessJourneyPriority;

  @ApiPropertyOptional({
    description: "Event tags",
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: "Related document IDs",
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedDocuments?: string[];

  @ApiPropertyOptional({
    description: "Additional notes",
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;

  @ApiPropertyOptional({
    description: "Whether materai is required for this event",
  })
  @IsOptional()
  @IsBoolean()
  materaiRequired?: boolean;

  @ApiPropertyOptional({
    description: "Materai amount in IDR",
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  materaiAmount?: number;

  @ApiPropertyOptional({
    description: "Indonesian compliance status",
  })
  @IsOptional()
  @IsString()
  complianceStatus?: string;
}

// Update Business Journey Event DTO
export class UpdateBusinessJourneyEventDto {
  @ApiPropertyOptional({
    description: "Event title",
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string;

  @ApiPropertyOptional({
    description: "Event description",
    minLength: 1,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  description?: string;

  @ApiPropertyOptional({
    enum: BusinessJourneyEventStatus,
    description: "Event status",
  })
  @IsOptional()
  @IsEnum(BusinessJourneyEventStatus)
  status?: BusinessJourneyEventStatus;

  @ApiPropertyOptional({
    description: "Event amount in IDR",
    minimum: 0,
    maximum: 999999999999,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999)
  amount?: number;

  @ApiPropertyOptional({
    description: "Event metadata updates",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateBusinessJourneyEventMetadataDto)
  metadata?: UpdateBusinessJourneyEventMetadataDto;
}

// Business Journey Filters DTO
export class BusinessJourneyFiltersDto {
  @ApiPropertyOptional({
    description: "Event types to filter by",
    isArray: true,
    enum: BusinessJourneyEventType,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(BusinessJourneyEventType, { each: true })
  eventTypes?: BusinessJourneyEventType[];

  @ApiPropertyOptional({
    description: "Event statuses to filter by",
    isArray: true,
    enum: BusinessJourneyEventStatus,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(BusinessJourneyEventStatus, { each: true })
  statusFilter?: BusinessJourneyEventStatus[];

  @ApiPropertyOptional({
    description: "Start date for date range filter",
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: "End date for date range filter",
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: "Minimum amount filter",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({
    description: "Maximum amount filter",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({
    description: "Search term for title and description",
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  searchTerm?: string;

  @ApiPropertyOptional({
    description: "Page number for pagination",
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page for pagination",
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;

  @ApiPropertyOptional({
    description: "Sort field",
    enum: ["createdAt", "type", "status", "amount"],
    default: "createdAt",
  })
  @IsOptional()
  @IsString()
  sortBy?: string = "createdAt";

  @ApiPropertyOptional({
    description: "Sort order",
    enum: ["asc", "desc"],
    default: "desc",
  })
  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc" = "desc";
}

// Business Journey Summary DTO
export class BusinessJourneySummaryDto {
  @ApiProperty({
    description: "Total number of projects",
  })
  totalProjects: number;

  @ApiProperty({
    description: "Total number of quotations",
  })
  totalQuotations: number;

  @ApiProperty({
    description: "Total number of invoices",
  })
  totalInvoices: number;

  @ApiProperty({
    description: "Total number of payments",
  })
  totalPayments: number;

  @ApiProperty({
    description: "Average project value in IDR",
  })
  averageProjectValue: number;

  @ApiProperty({
    description: "Average payment delay in days",
  })
  averagePaymentDelay: number;

  @ApiProperty({
    description: "Completion rate percentage",
  })
  completionRate: number;
}

// Materai Compliance Status DTO
export class MateraiComplianceStatusDto {
  @ApiProperty({
    description: "Whether materai is required",
  })
  required: boolean;

  @ApiProperty({
    description: "Total required materai amount in IDR",
  })
  totalRequiredAmount: number;

  @ApiProperty({
    description: "Applied materai amount in IDR",
  })
  appliedAmount: number;

  @ApiProperty({
    description: "Pending materai amount in IDR",
  })
  pendingAmount: number;

  @ApiProperty({
    description: "Compliance percentage",
  })
  compliancePercentage: number;

  @ApiPropertyOptional({
    description: "Next required date for materai application",
  })
  nextRequiredDate?: Date;
}

// Business Journey Timeline Response DTO
export class BusinessJourneyTimelineResponseDto {
  @ApiProperty({
    description: "Client ID",
  })
  clientId: string;

  @ApiProperty({
    description: "Client name",
  })
  clientName: string;

  @ApiProperty({
    description: "Total number of events",
  })
  totalEvents: number;

  @ApiProperty({
    description: "Total revenue in IDR",
  })
  totalRevenue: number;

  @ApiProperty({
    description: "Business journey events",
    isArray: true,
  })
  events: BusinessJourneyEventResponseDto[];

  @ApiProperty({
    description: "Business journey summary",
  })
  summary: BusinessJourneySummaryDto;

  @ApiProperty({
    description: "Materai compliance status",
  })
  materaiCompliance: MateraiComplianceStatusDto;
}

// Business Journey Event Metadata Response DTO
export class BusinessJourneyEventMetadataResponseDto {
  @ApiProperty()
  userCreated: string;

  @ApiPropertyOptional()
  userModified?: string;

  @ApiProperty({ enum: BusinessJourneyEventSource })
  source: BusinessJourneyEventSource;

  @ApiProperty({ enum: BusinessJourneyPriority })
  priority: BusinessJourneyPriority;

  @ApiProperty({ isArray: true, type: String })
  tags: string[];

  @ApiProperty({ isArray: true, type: String })
  relatedDocuments: string[];

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  materaiRequired: boolean;

  @ApiPropertyOptional()
  materaiAmount?: number;

  @ApiPropertyOptional()
  complianceStatus?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// Business Journey Event Response DTO
export class BusinessJourneyEventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: BusinessJourneyEventType })
  type: BusinessJourneyEventType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: BusinessJourneyEventStatus })
  status: BusinessJourneyEventStatus;

  @ApiPropertyOptional()
  amount?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  clientId?: string;

  @ApiPropertyOptional()
  projectId?: string;

  @ApiPropertyOptional()
  quotationId?: string;

  @ApiPropertyOptional()
  invoiceId?: string;

  @ApiPropertyOptional()
  paymentId?: string;

  @ApiPropertyOptional()
  metadata?: BusinessJourneyEventMetadataResponseDto;

  // Related entity information
  @ApiPropertyOptional()
  relatedEntity?: {
    id: string;
    type: string;
    name: string;
    number?: string;
  };
}

// UX Metrics DTO
export class CreateUXMetricsDto {
  @ApiProperty({
    description: "Component name",
  })
  @IsString()
  componentName: string;

  @ApiProperty({
    description: "Event type (render, interaction, error)",
  })
  @IsString()
  eventType: string;

  @ApiProperty({
    description: "Metric name",
  })
  @IsString()
  metricName: string;

  @ApiProperty({
    description: "Metric value",
  })
  @IsNumber()
  value: number;

  @ApiPropertyOptional({
    description: "User ID",
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: "Session ID",
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: "Client ID",
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: "URL where the metric was recorded",
  })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({
    description: "User agent string",
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({
    description: "Additional performance data",
    type: "object",
  })
  @IsOptional()
  @IsJSON()
  performanceData?: any;
}
