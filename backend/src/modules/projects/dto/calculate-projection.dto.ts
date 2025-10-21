import { IsOptional, IsArray, ValidateNested } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ProjectItemDto, EstimatedExpenseDto } from "./create-project.dto";

export class CalculateProjectionDto {
  @ApiProperty({
    description: "Daftar produk (revenue items)",
    type: [ProjectItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectItemDto)
  products?: ProjectItemDto[];

  @ApiProperty({
    description: "Daftar estimasi biaya",
    type: [EstimatedExpenseDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EstimatedExpenseDto)
  estimatedExpenses?: EstimatedExpenseDto[];
}
