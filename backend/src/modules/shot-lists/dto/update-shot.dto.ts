import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateShotDto } from './create-shot.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateShotDto extends PartialType(OmitType(CreateShotDto, ['sceneId'])) {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  storyboardUrl?: string;

  @IsOptional()
  @IsString()
  storyboardKey?: string;
}
