import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateSpecialReqDto {
  @IsEnum(['STUNTS', 'MINORS', 'ANIMALS', 'VEHICLES', 'SFX_PYRO', 'WATER_WORK', 'AERIAL_DRONE', 'WEAPONS', 'NUDITY', 'OTHER'])
  reqType: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  safetyNotes?: string;

  @IsOptional()
  @IsString()
  scenes?: string;
}

export class UpdateSpecialReqDto {
  @IsOptional()
  @IsEnum(['STUNTS', 'MINORS', 'ANIMALS', 'VEHICLES', 'SFX_PYRO', 'WATER_WORK', 'AERIAL_DRONE', 'WEAPONS', 'NUDITY', 'OTHER'])
  reqType?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  safetyNotes?: string;

  @IsOptional()
  @IsString()
  scenes?: string;
}
