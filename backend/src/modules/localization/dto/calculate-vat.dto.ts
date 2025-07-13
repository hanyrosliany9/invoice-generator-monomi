import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Min } from "class-validator";

export class CalculateVATDto {
  @ApiProperty({
    description: "Amount to calculate VAT for",
    example: 1000000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;
}
