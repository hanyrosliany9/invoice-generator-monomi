import { IsArray, IsString, ValidateNested, IsInt } from "class-validator";
import { Type } from "class-transformer";

class StripPosition {
  @IsString()
  stripId: string;

  @IsString()
  shootDayId: string;

  @IsInt()
  order: number;
}

export class ReorderStripsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StripPosition)
  strips: StripPosition[];
}
