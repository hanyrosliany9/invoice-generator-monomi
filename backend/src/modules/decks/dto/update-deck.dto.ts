import { PartialType } from '@nestjs/swagger';
import { CreateDeckDto } from './create-deck.dto';
import { IsEnum, IsOptional } from 'class-validator';

export enum DeckStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export class UpdateDeckDto extends PartialType(CreateDeckDto) {
  @IsOptional()
  @IsEnum(DeckStatus)
  status?: DeckStatus;
}
