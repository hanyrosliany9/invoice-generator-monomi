import { PartialType } from "@nestjs/mapped-types";
import { CreateCallSheetDto } from "./create-call-sheet.dto";
import { IsOptional, IsEnum } from "class-validator";

export class UpdateCallSheetDto extends PartialType(CreateCallSheetDto) {
  @IsOptional()
  @IsEnum(["DRAFT", "READY", "SENT", "UPDATED"])
  status?: string;
}
