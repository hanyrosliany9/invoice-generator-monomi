import { IsString, IsOptional, IsUUID, IsInt, IsNumber, IsEnum } from 'class-validator';

export class CreateStripDto {
  @IsUUID()
  shootDayId: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsEnum(['SCENE', 'BANNER'])
  stripType: string;

  // Scene fields
  @IsOptional() @IsUUID() sceneId?: string;
  @IsOptional() @IsString() sceneNumber?: string;
  @IsOptional() @IsString() sceneName?: string;
  @IsOptional() @IsString() intExt?: string;
  @IsOptional() @IsString() dayNight?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsNumber() pageCount?: number;
  @IsOptional() @IsInt() estimatedTime?: number;

  // Banner fields
  @IsOptional() @IsEnum(['DAY_BREAK', 'MEAL_BREAK', 'COMPANY_MOVE', 'NOTE']) bannerType?: string;
  @IsOptional() @IsString() bannerText?: string;
  @IsOptional() @IsString() bannerColor?: string;
}
