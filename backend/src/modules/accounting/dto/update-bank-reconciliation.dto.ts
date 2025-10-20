import { PartialType } from "@nestjs/mapped-types";
import { CreateBankReconciliationDto } from "./create-bank-reconciliation.dto";
import { IsString, IsOptional, IsDate } from "class-validator";
import { Type } from "class-transformer";

export class UpdateBankReconciliationDto extends PartialType(
  CreateBankReconciliationDto,
) {
  @IsString()
  @IsOptional()
  updatedBy?: string;

  @IsString()
  @IsOptional()
  reviewedBy?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  reviewedAt?: Date;

  @IsString()
  @IsOptional()
  approvedBy?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  approvedAt?: Date;
}
