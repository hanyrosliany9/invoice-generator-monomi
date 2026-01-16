import { IsString, IsInt, IsOptional } from "class-validator";

export class CreateBackgroundDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsInt()
  quantity?: number;

  @IsString()
  callTime: string;

  @IsOptional()
  @IsString()
  reportLocation?: string;

  @IsOptional()
  @IsString()
  wardrobeNotes?: string;

  @IsOptional()
  @IsString()
  scenes?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBackgroundDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  quantity?: number;

  @IsOptional()
  @IsString()
  callTime?: string;

  @IsOptional()
  @IsString()
  reportLocation?: string;

  @IsOptional()
  @IsString()
  wardrobeNotes?: string;

  @IsOptional()
  @IsString()
  scenes?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
