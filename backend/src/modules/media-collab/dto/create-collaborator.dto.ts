import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CollaboratorRole } from '@prisma/client';

export class CreateCollaboratorDto {
  @ApiProperty({
    description: 'ID of the user to add as collaborator',
    example: 'clk1234567890',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Role for the collaborator',
    enum: CollaboratorRole,
    example: CollaboratorRole.EDITOR,
  })
  @IsEnum(CollaboratorRole)
  role: CollaboratorRole;
}
