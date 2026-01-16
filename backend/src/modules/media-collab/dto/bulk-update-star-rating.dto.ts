import { IsArray, IsString, IsInt, Min, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class BulkUpdateStarRatingDto {
  @ApiProperty({
    description: "Array of asset IDs to update",
    example: ["clk1234567890", "clk0987654321"],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  assetIds: string[];

  @ApiProperty({
    description: "Star rating to apply (0-5, where 0 clears the rating)",
    example: 3,
    minimum: 0,
    maximum: 5,
  })
  @IsInt()
  @Min(0)
  @Max(5)
  starRating: number;
}
