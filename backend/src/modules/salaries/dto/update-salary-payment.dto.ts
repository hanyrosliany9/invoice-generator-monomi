import { PartialType } from "@nestjs/swagger";
import { CreateSalaryPaymentDto } from "./create-salary-payment.dto";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { SalaryPaymentStatus } from "@prisma/client";

export class UpdateSalaryPaymentDto extends PartialType(
  CreateSalaryPaymentDto,
) {
  @ApiPropertyOptional({
    description: "Payment status",
    enum: SalaryPaymentStatus,
  })
  @IsOptional()
  @IsEnum(SalaryPaymentStatus)
  status?: SalaryPaymentStatus;
}
