import { IsString, IsOptional, IsUUID, IsInt } from 'class-validator';

export class CreateShotDto {
  @IsUUID()
  sceneId: string;

  @IsString()
  shotNumber: string;

  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsString() shotSize?: string;
  @IsOptional() @IsString() shotType?: string;
  @IsOptional() @IsString() cameraAngle?: string;
  @IsOptional() @IsString() cameraMovement?: string;
  @IsOptional() @IsString() lens?: string;
  @IsOptional() @IsString() frameRate?: string;
  @IsOptional() @IsString() camera?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsString() dialogue?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsInt() setupNumber?: number;
  @IsOptional() @IsInt() estimatedTime?: number;
  @IsOptional() @IsString() vfx?: string;
  @IsOptional() @IsString() sfx?: string;
}
