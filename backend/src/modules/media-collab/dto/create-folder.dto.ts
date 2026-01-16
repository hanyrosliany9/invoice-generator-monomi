import { IsString, IsOptional, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateFolderDto {
  @ApiProperty({
    description: "Folder name",
    example: "Raw Footage",
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: "Folder description",
    example: "All raw video footage from the shoot",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "Project ID this folder belongs to",
    example: "cmi2bfiz30003bcnso9b0890a",
  })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({
    description: "Parent folder ID (null for root level folders)",
    example: "cmi2bfiz30003bcnso9b0891b",
  })
  @IsString()
  @IsOptional()
  parentId?: string;
}
