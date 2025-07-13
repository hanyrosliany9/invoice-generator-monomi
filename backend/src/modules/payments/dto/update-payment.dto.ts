import { PartialType } from "@nestjs/mapped-types";
import { IsEnum, IsOptional, IsDateString } from "class-validator";
import { PaymentStatus } from "@prisma/client";
import { CreatePaymentDto } from "./create-payment.dto";

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsDateString()
  confirmedAt?: string;
}
