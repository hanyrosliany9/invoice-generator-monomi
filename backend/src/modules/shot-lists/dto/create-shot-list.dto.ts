import { IsString, IsOptional } from 'class-validator';

export class CreateShotListDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  projectId: string;
}
