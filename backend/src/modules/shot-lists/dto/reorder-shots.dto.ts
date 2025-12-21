import { IsArray, IsUUID } from 'class-validator';

export class ReorderShotsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  shotIds: string[];
}
