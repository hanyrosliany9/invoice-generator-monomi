import { PartialType } from "@nestjs/mapped-types";
import { CreateJournalEntryDto } from "./create-journal-entry.dto";
import { IsString, IsOptional } from "class-validator";

export class UpdateJournalEntryDto extends PartialType(CreateJournalEntryDto) {
  @IsString()
  @IsOptional()
  updatedBy?: string;
}
