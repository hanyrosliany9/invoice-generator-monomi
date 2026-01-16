import { IsString, IsNotEmpty, IsOptional, IsArray } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCollectionDto {
  @ApiProperty({
    description: "Name of the collection",
    example: "Final Approved Shots",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: "Description of the collection",
    example: "All approved shots ready for final export",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Array of asset IDs to add to the collection",
    example: ["clk1234567890", "clk0987654321"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assetIds?: string[];
}
