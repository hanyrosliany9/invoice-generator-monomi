import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateElementDto } from "./create-element.dto";

export class UpdateElementDto extends PartialType(
  OmitType(CreateElementDto, ["slideId"] as const),
) {}
