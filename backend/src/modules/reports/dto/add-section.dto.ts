import { IsString, IsOptional, MaxLength } from "class-validator";

export class AddSectionDto {
  @IsString()
  title: string; // FREE TEXT: User enters anything they want!

  @IsOptional()
  @IsString()
  description?: string;

  // NO MORE sectionType enum!
  // NO MORE useTemplate flag!
  // System auto-detects column types and suggests visualizations
}

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
