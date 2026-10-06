import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsHexColor,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import {
  CampaignPlatform,
  CampaignSpendSource,
  CampaignStatus,
  LeadSource,
  LeadStageType,
} from "@prisma/client";

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === "" || value === null ? undefined : value;
const toBool = ({ value }: { value: unknown }) =>
  value === true || value === "true" || value === "1";

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export class CreateLeadDto {
  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(120)
  name?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(40)
  phone?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsEmail()
  email?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(120)
  company?: string;

  @IsOptional() @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional() @Transform(emptyToUndefined) @IsString()
  campaignId?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(40)
  campaignCode?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(80)
  adId?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(300)
  ctwaClid?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(4000)
  firstMessage?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString()
  stageId?: string;

  @IsOptional() @Transform(({ value }) => (value === "" || value === null ? undefined : Number(value))) @IsNumber() @Min(0)
  estimatedValue?: number;

  @IsOptional() @Transform(emptyToUndefined) @IsString()
  assignedToId?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsDateString()
  followUpAt?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(300)
  followUpNote?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsDateString()
  firstContactAt?: string;

  /** Landing-page ad click code ("K7QM2X") from the chat; links the click to the new lead. */
  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(12)
  adClickRef?: string;

  /** Save even when another lead has the same phone number. */
  @IsOptional() @Transform(toBool) @IsBoolean()
  allowDuplicate?: boolean;
}

export class UpdateLeadDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120)
  name?: string;

  @IsOptional() @IsString() @MaxLength(40)
  phone?: string | null;

  @IsOptional() @Transform(emptyToUndefined) @IsEmail()
  email?: string;

  @IsOptional() @IsString() @MaxLength(120)
  company?: string | null;

  @IsOptional() @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional() @IsString()
  campaignId?: string | null;

  @IsOptional() @Transform(({ value }) => (value === "" || value === null ? undefined : Number(value))) @IsNumber() @Min(0)
  estimatedValue?: number;
}

export class ListLeadsQueryDto {
  @IsOptional() @Transform(emptyToUndefined) @IsString()
  stageId?: string;

  /** user id, "me" or "unassigned" */
  @IsOptional() @Transform(emptyToUndefined) @IsString()
  assignee?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString()
  campaignId?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional() @Transform(emptyToUndefined) @IsIn(["due", "overdue", "today"])
  followUp?: "due" | "overdue" | "today";

  @IsOptional() @Transform(toBool) @IsBoolean()
  uncontacted?: boolean;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(100)
  q?: string;

  @IsOptional() @Transform(({ value }) => (value === undefined ? undefined : Number(value))) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Transform(({ value }) => (value === undefined ? undefined : Number(value))) @IsInt() @Min(1) @Max(500)
  limit?: number;
}

export class DuplicateQueryDto {
  @IsString() @MinLength(5) @MaxLength(40)
  phone: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString()
  excludeId?: string;
}

export class LinkAdClickDto {
  @IsString() @MaxLength(40)
  code: string;
}

export class QuickAddParseDto {
  @IsString() @MaxLength(6000)
  text: string;
}

export class MoveStageDto {
  @IsString()
  stageId: string;

  @IsOptional() @IsString() @MaxLength(500)
  note?: string;

  @IsOptional() @IsString() @MaxLength(300)
  lostReason?: string;
}

export class AssignLeadDto {
  @IsOptional() @IsString()
  assignedToId?: string | null;
}

export class CreateActivityDto {
  @IsIn(["NOTE", "CALL", "WHATSAPP", "MEETING"])
  type: "NOTE" | "CALL" | "WHATSAPP" | "MEETING";

  @IsOptional() @IsString() @MaxLength(4000)
  body?: string;
}

export class SetFollowUpDto {
  @IsDateString()
  at: string;

  @IsOptional() @IsString() @MaxLength(300)
  note?: string;
}

export class MarkLostDto {
  @IsString() @MinLength(1) @MaxLength(300)
  reason: string;

  @IsOptional() @IsString()
  stageId?: string;
}

export class BulkLeadsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @IsString({ each: true })
  ids: string[];

  @IsOptional() @IsString()
  assignedToId?: string | null;

  @IsOptional() @IsString()
  stageId?: string;
}

export class ConvertLeadDto {
  /** Link this existing client instead of matching / creating one. */
  @IsOptional() @IsString()
  clientId?: string;

  @IsOptional() @Transform(toBool) @IsBoolean()
  createProject?: boolean;

  @IsOptional() @Transform(toBool) @IsBoolean()
  createQuotation?: boolean;

  @IsOptional() @IsString()
  projectTypeId?: string;

  @IsOptional() @IsString() @MaxLength(300)
  projectName?: string;

  @IsOptional() @Transform(({ value }) => (value === "" || value === null ? undefined : Number(value))) @IsNumber() @Min(0)
  amount?: number;
}

export class LinkLeadDto {
  @IsOptional() @IsString()
  clientId?: string | null;

  @IsOptional() @IsString()
  projectId?: string | null;

  @IsOptional() @IsString()
  quotationId?: string | null;
}

// ---------------------------------------------------------------------------
// Campaigns & spend
// ---------------------------------------------------------------------------

export class CreateCampaignDto {
  @IsString() @MinLength(1) @MaxLength(120)
  name: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim().toUpperCase() : value))
  @IsString() @Matches(/^[A-Z0-9][A-Z0-9_-]{1,23}$/, { message: "Kode hanya huruf/angka/-/_ (2-24 karakter)" })
  code: string;

  @IsOptional() @IsEnum(CampaignPlatform)
  platform?: CampaignPlatform;

  @IsOptional() @Transform(emptyToUndefined) @IsDateString()
  startDate?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsDateString()
  endDate?: string;

  @IsOptional() @Transform(({ value }) => (value === "" || value === null ? undefined : Number(value))) @IsNumber() @Min(0)
  budget?: number;

  @IsOptional() @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional() @IsString() @MaxLength(1000)
  prefillMessage?: string;

  /** Meta ad ids (Click-to-WhatsApp referral.source_id) attributed to this campaign. */
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string"
      ? value.split(/[\s,;]+/).map((s: string) => s.trim()).filter(Boolean)
      : value,
  )
  @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @Matches(/^\d{5,25}$/, { each: true, message: "ID iklan Meta harus berupa angka" })
  metaAdIds?: string[];
}

export class UpdateCampaignDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toUpperCase() : value))
  @IsString() @Matches(/^[A-Z0-9][A-Z0-9_-]{1,23}$/)
  code?: string;

  @IsOptional() @IsEnum(CampaignPlatform)
  platform?: CampaignPlatform;

  @IsOptional() @IsDateString()
  startDate?: string | null;

  @IsOptional() @IsDateString()
  endDate?: string | null;

  @IsOptional() @Transform(({ value }) => (value === "" || value === null ? undefined : Number(value))) @IsNumber() @Min(0)
  budget?: number;

  @IsOptional() @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional() @IsString() @MaxLength(1000)
  prefillMessage?: string | null;

  /** Meta ad ids (Click-to-WhatsApp referral.source_id) attributed to this campaign. */
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string"
      ? value.split(/[\s,;]+/).map((s: string) => s.trim()).filter(Boolean)
      : value,
  )
  @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @Matches(/^\d{5,25}$/, { each: true, message: "ID iklan Meta harus berupa angka" })
  metaAdIds?: string[];
}

export class CreateSpendDto {
  @IsDateString()
  dateFrom: string;

  @IsOptional() @Transform(emptyToUndefined) @IsDateString()
  dateTo?: string;

  @Transform(({ value }) => Number(value)) @IsNumber() @Min(0)
  amount: number;

  @IsOptional() @IsString() @MaxLength(300)
  note?: string;

  @IsOptional() @IsEnum(CampaignSpendSource)
  source?: CampaignSpendSource;
}

export class UpdateSpendDto {
  @IsOptional() @IsDateString()
  dateFrom?: string;

  @IsOptional() @IsDateString()
  dateTo?: string;

  @IsOptional() @Transform(({ value }) => Number(value)) @IsNumber() @Min(0)
  amount?: number;

  @IsOptional() @IsString() @MaxLength(300)
  note?: string | null;
}

// ---------------------------------------------------------------------------
// Settings & stages
// ---------------------------------------------------------------------------

export class UpdateCrmSettingsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1440)
  responseThresholdMinutes?: number;
}

export class CreateStageDto {
  @IsString() @MinLength(1) @MaxLength(60)
  name: string;

  @IsOptional() @IsHexColor()
  color?: string;

  @IsOptional() @IsEnum(LeadStageType)
  type?: LeadStageType;

  @IsOptional() @Transform(emptyToUndefined) @IsIn(["LeadSubmitted", "QualifiedLead", "Purchase"])
  metaEvent?: string;
}

export class UpdateStageDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(60)
  name?: string;

  @IsOptional() @IsHexColor()
  color?: string;

  @IsOptional() @IsEnum(LeadStageType)
  type?: LeadStageType;

  @IsOptional() @IsIn(["LeadSubmitted", "QualifiedLead", "Purchase", ""])
  metaEvent?: string | null;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class ReorderStagesDto {
  @IsArray() @ArrayMinSize(1) @IsString({ each: true })
  ids: string[];
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export class StatsQueryDto {
  @IsOptional() @Transform(emptyToUndefined) @IsDateString()
  from?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsDateString()
  to?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString()
  campaignId?: string;
}
