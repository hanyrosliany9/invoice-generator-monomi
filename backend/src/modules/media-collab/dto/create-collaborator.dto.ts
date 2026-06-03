import { IsString, IsNotEmpty, IsEnum, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CollaboratorRole } from "@prisma/client";

export class CreateCollaboratorDto {
  @ApiPropertyOptional({
    description: "ID of the user to add as collaborator (null for guest collaborators)",
    example: "clk1234567890",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userId?: string;

  @ApiPropertyOptional({
    description: "Role for the collaborator",
    enum: CollaboratorRole,
    example: CollaboratorRole.EDITOR,
    default: CollaboratorRole.VIEWER,
  })
  @IsOptional()
  @IsEnum(CollaboratorRole)
  role?: CollaboratorRole;
}
