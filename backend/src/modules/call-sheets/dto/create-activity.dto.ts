import {
  IsString,
  IsInt,
  IsOptional,
  IsEnum,
  IsBoolean,
} from "class-validator";

export class CreateActivityDto {
  @IsEnum([
    "GENERAL",
    "PREPARATION",
    "STANDBY",
    "BRIEFING",
    "REHEARSAL",
    "TRANSPORT",
    "TECHNICAL",
    "CUSTOM",
  ])
  @IsOptional()
  activityType?: string;

  @IsString()
  activityName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  startTime: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  duration?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  personnel?: string;

  @IsOptional()
  @IsString()
  responsibleParty?: string;

  @IsOptional()
  @IsString()
  technicalNotes?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isHighlighted?: boolean;
}

export class UpdateActivityDto {
  @IsOptional()
  @IsEnum([
    "GENERAL",
    "PREPARATION",
    "STANDBY",
    "BRIEFING",
    "REHEARSAL",
    "TRANSPORT",
    "TECHNICAL",
    "CUSTOM",
  ])
  activityType?: string;

  @IsOptional()
  @IsString()
  activityName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  duration?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  personnel?: string;

  @IsOptional()
  @IsString()
  responsibleParty?: string;

  @IsOptional()
  @IsString()
  technicalNotes?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isHighlighted?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}
