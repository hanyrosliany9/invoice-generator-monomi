import { PartialType } from '@nestjs/mapped-types';
import { CreateStripDto } from './create-strip.dto';

export class UpdateStripDto extends PartialType(CreateStripDto) {}
