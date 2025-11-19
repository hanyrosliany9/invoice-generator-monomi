import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateFrameCommentDto } from './create-frame-comment.dto';

export class UpdateFrameCommentDto extends PartialType(
  OmitType(CreateFrameCommentDto, ['assetId'] as const),
) {}
