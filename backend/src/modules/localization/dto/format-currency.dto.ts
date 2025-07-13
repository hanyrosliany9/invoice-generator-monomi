import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Min } from "class-validator";

export class FormatCurrencyDto {
  @ApiProperty({
    description: "Amount to format as Indonesian currency",
    example: 1500000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;
}
