import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === "" ? undefined : value;

export class ListConversationsQueryDto {
  @IsOptional()
  @IsIn(["all", "unread", "mine", "unassigned"])
  filter?: "all" | "unread" | "mine" | "unassigned";

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(["open", "closed"])
  window?: "open" | "closed";

  @IsOptional()
  @IsIn(["OPEN", "ARCHIVED"])
  status?: "OPEN" | "ARCHIVED";

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class MessagesQueryDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  before?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class SendTextDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  text: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  replyToMessageId?: string;
}

export class SendTemplateDto {
  @IsString()
  @Matches(/^[a-z0-9_]{1,512}$/, { message: "Nama template tidak valid" })
  name: string;

  @IsString()
  @Matches(/^[a-z]{2,3}(_[A-Za-z]{2,4})?$/, {
    message: "Kode bahasa tidak valid",
  })
  language: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  params?: string[];
}

export class AssignConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  assignedToId?: string | null;
}

export class LinkConversationLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  leadId?: string | null;
}

export class ConversationStatusDto {
  @IsIn(["OPEN", "ARCHIVED"])
  status: "OPEN" | "ARCHIVED";
}

export class QuickReplyItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  text: string;
}

export class QuickRepliesDto {
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => QuickReplyItemDto)
  items: QuickReplyItemDto[];
}

export class EmbeddedSignupCompleteDto {
  @IsString()
  @MinLength(10)
  @MaxLength(2048)
  @Matches(/^[A-Za-z0-9._#~-]+$/, { message: "Kode tidak valid" })
  code: string;

  @IsString()
  @Matches(/^\d{5,25}$/)
  wabaId: string;

  @IsString()
  @Matches(/^\d{5,25}$/)
  phoneNumberId: string;
}
