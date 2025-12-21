import { IsArray, IsUUID, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class StripPosition {
  @IsUUID()
  stripId: string;

  @IsUUID()
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
