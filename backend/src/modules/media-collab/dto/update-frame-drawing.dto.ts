import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateFrameDrawingDto } from "./create-frame-drawing.dto";

export class UpdateFrameDrawingDto extends PartialType(
  OmitType(CreateFrameDrawingDto, ["assetId"] as const),
) {}
