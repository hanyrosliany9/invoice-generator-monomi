import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
} from "class-validator";

export class CreateMaintenanceDto {
  @IsString()
  @IsNotEmpty()
  maintenanceType: string;

  @IsDateString()
  @IsNotEmpty()
  performedDate: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  performedBy?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  cost?: number;

  @IsDateString()
  @IsOptional()
  nextMaintenanceDate?: string;
}
