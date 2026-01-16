import { IsString, IsOptional, IsInt, IsEnum } from "class-validator";

export class CreateModelDto {
  @IsString()
  modelName: string;

  @IsOptional()
  @IsString()
  modelNumber?: string; // #1, #2 for reference

  @IsOptional()
  @IsString()
  agencyName?: string;

  @IsEnum(["CAMERA_READY", "STYLED"])
  arrivalType: string;

  @IsString()
  arrivalTime: string;

  @IsOptional()
  @IsString()
  hmuStartTime?: string;

  @IsOptional()
  @IsString()
  cameraReadyTime?: string;

  @IsOptional()
  @IsString()
  hmuArtist?: string;

  @IsOptional()
  @IsInt()
  hmuDuration?: number;

  @IsOptional()
  @IsString()
  wardrobeSizes?: string;

  @IsOptional()
  @IsString()
  shotNumbers?: string; // Comma-separated shot numbers

  @IsOptional()
  @IsInt()
  order?: number;
}

export class UpdateModelDto {
  @IsOptional()
  @IsString()
  modelName?: string;

  @IsOptional()
  @IsString()
  modelNumber?: string;

  @IsOptional()
  @IsString()
  agencyName?: string;

  @IsOptional()
  @IsEnum(["CAMERA_READY", "STYLED"])
  arrivalType?: string;

  @IsOptional()
  @IsString()
  arrivalTime?: string;

  @IsOptional()
  @IsString()
  hmuStartTime?: string;

  @IsOptional()
  @IsString()
  cameraReadyTime?: string;

  @IsOptional()
  @IsString()
  hmuArtist?: string;

  @IsOptional()
  @IsInt()
  hmuDuration?: number;

  @IsOptional()
  @IsString()
  wardrobeSizes?: string;

  @IsOptional()
  @IsString()
  shotNumbers?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
