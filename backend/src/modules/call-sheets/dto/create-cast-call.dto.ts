import { IsString, IsOptional, IsInt, IsEnum } from 'class-validator';

export class CreateCastCallDto {
  @IsString()
  callSheetId: string;

  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsString() castNumber?: string;
  @IsString() actorName: string;
  @IsOptional() @IsString() character?: string;
  @IsOptional() @IsString() pickupTime?: string;
  @IsString() callTime: string;
  @IsOptional() @IsString() onSetTime?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateCastCallDto {
  @IsOptional() @IsString() castNumber?: string;
  @IsOptional() @IsString() actorName?: string;
  @IsOptional() @IsString() character?: string;
  @IsOptional() @IsString() pickupTime?: string;
  @IsOptional() @IsString() callTime?: string;
  @IsOptional() @IsString() onSetTime?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsEnum(['PENDING', 'CONFIRMED', 'ON_SET', 'WRAPPED']) status?: string;
}
