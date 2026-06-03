import { IsEnum, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CollaboratorRole } from "@prisma/client";

export class UpdateCollaboratorDto {
  @ApiPropertyOptional({
    description: "New role for the collaborator",
    enum: CollaboratorRole,
    example: CollaboratorRole.VIEWER,
    default: CollaboratorRole.VIEWER,
  })
  @IsOptional()
  @IsEnum(CollaboratorRole)
  role?: CollaboratorRole;
}
