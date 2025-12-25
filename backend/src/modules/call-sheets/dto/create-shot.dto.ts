import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateShotDto {
  @IsInt()
  shotNumber: number;

  @IsOptional() @IsString()
  shotName?: string;

  @IsOptional() @IsString()
  lookReference?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  setupLocation?: string;

  @IsOptional() @IsString()
  estStartTime?: string;

  @IsOptional() @IsInt()
  estDuration?: number;

  @IsOptional() @IsString()
  wardrobeNotes?: string;

  @IsOptional() @IsString()
  hmuNotes?: string;

  @IsOptional() @IsString()
  modelIds?: string; // Comma-separated model IDs

  @IsOptional() @IsInt()
  order?: number;
}

export class UpdateShotDto {
  @IsOptional() @IsInt()
  shotNumber?: number;

  @IsOptional() @IsString()
  shotName?: string;

  @IsOptional() @IsString()
  lookReference?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  setupLocation?: string;

  @IsOptional() @IsString()
  estStartTime?: string;

  @IsOptional() @IsInt()
  estDuration?: number;

  @IsOptional() @IsString()
  wardrobeNotes?: string;

  @IsOptional() @IsString()
  hmuNotes?: string;

  @IsOptional() @IsString()
  modelIds?: string;

  @IsOptional() @IsInt()
  order?: number;
}
