import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

/** Trim + lowercase emails before validation (stored/looked up lowercased). */
const NormalizeEmail = () =>
  Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  );

// ─── Portal auth ──────────────────────────────────────────────────────────────

export class PortalRequestCodeDto {
  @ApiProperty({ example: "klien@contoh.co.id" })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

/**
 * Deliberately loose: every malformed email/code is answered with the same
 * generic 400 as a wrong code (validated in PortalAuthService), so the
 * response never reveals which part was wrong.
 */
export class PortalVerifyCodeDto {
  @ApiProperty({ example: "klien@contoh.co.id" })
  @IsString()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: "123456", description: "6-digit code from the email" })
  @IsString()
  @MaxLength(16)
  code!: string;
}

// ─── Portal media ─────────────────────────────────────────────────────────────

export class PortalMediaCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @ApiPropertyOptional({ description: "Video timecode in seconds" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timecode?: number;

  @ApiPropertyOptional({ description: "Parent comment id (same asset only)" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  parentId?: string;

  @ApiPropertyOptional({
    description: "Accepted for compatibility with the public share client; IGNORED — the contact's name is used",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  guestName?: string;
}

export const MEDIA_REVIEW_STATUSES = [
  "DRAFT",
  "IN_REVIEW",
  "NEEDS_CHANGES",
  "APPROVED",
  "ARCHIVED",
] as const;

export class PortalAssetStatusDto {
  @ApiProperty({ enum: MEDIA_REVIEW_STATUSES })
  @IsIn(MEDIA_REVIEW_STATUSES as unknown as string[])
  status!: string;
}

export class PortalAssetRatingDto {
  @ApiProperty({ minimum: 0, maximum: 5, description: "0 clears the rating" })
  @IsInt()
  @Min(0)
  @Max(5)
  starRating!: number;
}

// ─── Portal decks ─────────────────────────────────────────────────────────────

export class PortalDeckCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  slideId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  positionX?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  positionY?: number;

  @ApiPropertyOptional({ description: "IGNORED — the contact's name is used" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  guestName?: string;

  @ApiPropertyOptional({ description: "IGNORED — the contact's email is used" })
  @IsOptional()
  @IsString()
  @MaxLength(254)
  guestEmail?: string;
}

// ─── Staff: portal contact management ────────────────────────────────────────

export class CreatePortalContactDto {
  @ApiProperty({ example: "klien@contoh.co.id" })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: "Budi Santoso" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}

export class UpdatePortalContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: "false revokes all of this contact's sessions" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
