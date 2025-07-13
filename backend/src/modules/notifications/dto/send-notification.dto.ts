import { IsString, IsEmail, IsOptional, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export enum NotificationType {
  QUOTATION_STATUS_CHANGE = "QUOTATION_STATUS_CHANGE",
  INVOICE_GENERATED = "INVOICE_GENERATED",
  QUOTATION_EXPIRING = "QUOTATION_EXPIRING",
  INVOICE_OVERDUE = "INVOICE_OVERDUE",
  MATERAI_REMINDER = "MATERAI_REMINDER",
}

export class SendNotificationDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty()
  @IsEmail()
  to: string;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  template?: string;

  @ApiProperty()
  @IsOptional()
  data?: any;

  @ApiProperty()
  @IsString()
  @IsOptional()
  entityType?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  entityId?: string;
}
