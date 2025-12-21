import { IsArray, IsString } from 'class-validator';

export class ReorderShotsDto {
  @IsArray()
  @IsString({ each: true })
  shotIds: string[];
}
