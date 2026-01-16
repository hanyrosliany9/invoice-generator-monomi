import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDateString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum CollaboratorRole {
  OWNER = "OWNER",
  EDITOR = "EDITOR",
  COMMENTER = "COMMENTER",
  VIEWER = "VIEWER",
}

export class InviteCollaboratorDto {
  @ApiProperty({ description: "Deck ID" })
  @IsString()
  deckId: string;

  @ApiPropertyOptional({ description: "User ID (for internal users)" })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: "Guest email (for external guests)" })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiPropertyOptional({ description: "Guest name" })
  @IsOptional()
  @IsString()
  guestName?: string;

  @ApiProperty({ description: "Role", enum: CollaboratorRole })
  @IsEnum(CollaboratorRole)
  role: CollaboratorRole;

  @ApiPropertyOptional({ description: "Invite expiration date" })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
