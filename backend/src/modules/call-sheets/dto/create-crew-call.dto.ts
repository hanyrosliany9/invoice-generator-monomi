import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateCrewCallDto {
  @IsString()
  callSheetId: string;

  @IsOptional() @IsInt() order?: number;
  @IsString() department: string;
  @IsString() position: string;
  @IsString() name: string;
  @IsString() callTime: string;

  // === NEW: Staggered Call Time ===
  @IsOptional() @IsInt() callTimeOffset?: number;     // Minutes relative to general call
  @IsOptional() @IsString() reportLocation?: string;  // Where to report

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateCrewCallDto {
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() callTime?: string;
  @IsOptional() @IsInt() callTimeOffset?: number;
  @IsOptional() @IsString() reportLocation?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() notes?: string;
}
