import { PartialType } from '@nestjs/swagger';
import { CreateMediaProjectDto } from './create-media-project.dto';

export class UpdateMediaProjectDto extends PartialType(CreateMediaProjectDto) {}
