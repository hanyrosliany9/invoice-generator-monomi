import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateSlideDto } from "./create-slide.dto";

export class UpdateSlideDto extends PartialType(
  OmitType(CreateSlideDto, ["deckId"] as const),
) {}
