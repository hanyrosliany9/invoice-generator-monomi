import { IsInt, Min, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateStarRatingDto {
  @ApiProperty({
    description: "Star rating (0-5, where 0 clears the rating)",
    example: 4,
    minimum: 0,
    maximum: 5,
  })
  @IsInt()
  @Min(0)
  @Max(5)
  starRating: number;
}
