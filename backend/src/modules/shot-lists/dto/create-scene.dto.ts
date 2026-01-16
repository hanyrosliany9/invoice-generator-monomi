import { IsString, IsOptional, IsInt } from "class-validator";

export class CreateSceneDto {
  @IsString()
  shotListId: string;

  @IsString()
  sceneNumber: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  intExt?: string;

  @IsOptional()
  @IsString()
  dayNight?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
