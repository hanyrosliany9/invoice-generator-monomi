import { IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { CollaboratorRole } from "@prisma/client";

export class UpdateCollaboratorDto {
  @ApiProperty({
    description: "New role for the collaborator",
    enum: CollaboratorRole,
    example: CollaboratorRole.VIEWER,
  })
  @IsEnum(CollaboratorRole)
  role: CollaboratorRole;
}
