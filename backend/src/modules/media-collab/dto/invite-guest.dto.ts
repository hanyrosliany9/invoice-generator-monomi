import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { CollaboratorRole } from "@prisma/client";

export class InviteGuestDto {
  @ApiProperty({
    description: "Guest email address",
    example: "guest@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Guest display name",
    example: "John Doe",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Role for the guest collaborator (cannot be OWNER)",
    enum: ["VIEWER", "COMMENTER", "EDITOR"],
    example: "VIEWER",
  })
  @IsEnum(["VIEWER", "COMMENTER", "EDITOR"])
  role: "VIEWER" | "COMMENTER" | "EDITOR";

  @ApiProperty({
    description: "Number of days until invite expires (default: 30)",
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number;
}
