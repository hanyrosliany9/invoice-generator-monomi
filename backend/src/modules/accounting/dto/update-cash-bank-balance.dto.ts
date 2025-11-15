import { PartialType } from "@nestjs/mapped-types";
import { CreateCashBankBalanceDto } from "./create-cash-bank-balance.dto";
import { IsString, IsOptional } from "class-validator";

export class UpdateCashBankBalanceDto extends PartialType(
  CreateCashBankBalanceDto,
) {
  @IsString()
  @IsOptional()
  updatedBy?: string;
}
