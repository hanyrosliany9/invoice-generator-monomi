import { IsString, IsOptional, IsInt, IsEnum } from 'class-validator';

export class CreateHmuDto {
  @IsString()
  artistName: string;

  @IsEnum(['HAIR', 'MAKEUP', 'BOTH', 'KEY_STYLIST'])
  artistRole: string;

  @IsOptional() @IsInt()
  stationNumber?: number;

  @IsString()
  callTime: string;

  @IsOptional() @IsString()
  availableFrom?: string;

  @IsOptional() @IsString()
  availableUntil?: string;

  @IsOptional() @IsString()
  assignedModels?: string; // Comma-separated model names/IDs

  @IsOptional() @IsInt()
  order?: number;
}

export class UpdateHmuDto {
  @IsOptional() @IsString()
  artistName?: string;

  @IsOptional() @IsEnum(['HAIR', 'MAKEUP', 'BOTH', 'KEY_STYLIST'])
  artistRole?: string;

  @IsOptional() @IsInt()
  stationNumber?: number;

  @IsOptional() @IsString()
  callTime?: string;

  @IsOptional() @IsString()
  availableFrom?: string;

  @IsOptional() @IsString()
  availableUntil?: string;

  @IsOptional() @IsString()
  assignedModels?: string;

  @IsOptional() @IsInt()
  order?: number;
}
