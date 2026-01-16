import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { EventCategory, EventStatus } from "@prisma/client";

export class CreateEventAttendeeDto {
  @IsString()
  userId: string;

  @IsEnum(["PENDING", "ACCEPTED", "DECLINED", "TENTATIVE"])
  @IsOptional()
  status?: string = "PENDING";
}

export class CreateEventReminderDto {
  @Type(() => Number)
  minutes: number;
}

export class CreateCalendarEventDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsBoolean()
  @IsOptional()
  allDay?: boolean = false;

  @IsOptional()
  @IsString()
  timezone?: string = "Asia/Jakarta";

  @IsEnum(EventCategory)
  @IsOptional()
  category?: EventCategory = "OTHER";

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus = "SCHEDULED";

  @IsOptional()
  @IsString()
  color?: string;

  @IsEnum(["LOW", "MEDIUM", "HIGH"])
  @IsOptional()
  priority?: string = "MEDIUM";

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  milestoneId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEventAttendeeDto)
  @IsOptional()
  attendees?: CreateEventAttendeeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEventReminderDto)
  @IsOptional()
  reminders?: CreateEventReminderDto[];

  @IsOptional()
  @IsString()
  recurrence?: string;
}
