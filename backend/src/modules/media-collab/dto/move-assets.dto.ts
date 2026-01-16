import { IsArray, IsString, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MoveAssetsDto {
  @ApiProperty({
    description: "Array of asset IDs to move",
    example: ["cmi2bfiz30003bcnso9b0890a", "cmi2bfiz30003bcnso9b0891b"],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  assetIds: string[];

  @ApiPropertyOptional({
    description: "Target folder ID (null to move to root level)",
    example: "cmi2bfiz30003bcnso9b0892c",
  })
  @IsString()
  @IsOptional()
  folderId?: string;
}
