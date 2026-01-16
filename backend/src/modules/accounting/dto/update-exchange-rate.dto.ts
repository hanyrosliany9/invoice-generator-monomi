import { PartialType } from "@nestjs/mapped-types";
import { CreateExchangeRateDto } from "./create-exchange-rate.dto";
import { IsString, IsOptional } from "class-validator";

export class UpdateExchangeRateDto extends PartialType(CreateExchangeRateDto) {
  @IsString()
  @IsOptional()
  updatedBy?: string;
}
