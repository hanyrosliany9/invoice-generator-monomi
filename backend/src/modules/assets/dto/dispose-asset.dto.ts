import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from "class-validator";

export class DisposeAssetDto {
  /** Proceeds received on disposal (cash/bank). Defaults to 0 if omitted. */
  @IsNumber()
  @IsOptional()
  @Min(0)
  proceeds?: number;

  /** ISO date string for the disposal date. Defaults to today if omitted. */
  @IsDateString()
  @IsOptional()
  disposalDate?: string;
}
