import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateCompanyMoveDto {
  @IsString()
  departTime: string;

  @IsString()
  fromLocation: string;

  @IsString()
  toLocation: string;

  @IsOptional()
  @IsInt()
  travelTime?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCompanyMoveDto {
  @IsOptional()
  @IsString()
  departTime?: string;

  @IsOptional()
  @IsString()
  fromLocation?: string;

  @IsOptional()
  @IsString()
  toLocation?: string;

  @IsOptional()
  @IsInt()
  travelTime?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
