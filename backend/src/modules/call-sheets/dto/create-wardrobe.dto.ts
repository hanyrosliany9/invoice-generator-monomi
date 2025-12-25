import { IsString, IsOptional, IsInt, IsEnum } from 'class-validator';

export class CreateWardrobeDto {
  @IsString()
  itemName: string;

  @IsOptional() @IsString()
  brand?: string;

  @IsOptional() @IsString()
  size?: string;

  @IsOptional() @IsString()
  color?: string;

  @IsOptional() @IsString()
  providedBy?: string; // "Client", "Stylist", "Model"

  @IsOptional() @IsString()
  forModel?: string;

  @IsOptional() @IsString()
  forShot?: string;

  @IsOptional() @IsEnum(['PENDING', 'CONFIRMED', 'ON_SET', 'IN_USE', 'WRAPPED'])
  status?: string;

  @IsOptional() @IsInt()
  order?: number;
}

export class UpdateWardrobeDto {
  @IsOptional() @IsString()
  itemName?: string;

  @IsOptional() @IsString()
  brand?: string;

  @IsOptional() @IsString()
  size?: string;

  @IsOptional() @IsString()
  color?: string;

  @IsOptional() @IsString()
  providedBy?: string;

  @IsOptional() @IsString()
  forModel?: string;

  @IsOptional() @IsString()
  forShot?: string;

  @IsOptional() @IsEnum(['PENDING', 'CONFIRMED', 'ON_SET', 'IN_USE', 'WRAPPED'])
  status?: string;

  @IsOptional() @IsInt()
  order?: number;
}
