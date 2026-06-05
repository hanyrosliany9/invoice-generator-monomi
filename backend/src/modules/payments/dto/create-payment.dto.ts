import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsEnum,
  IsOptional,
  Min,
} from "class-validator";
import { Transform } from "class-transformer";
import { PaymentMethod } from "@prisma/client";

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  invoiceId!: string;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsDateString()
  paymentDate!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  transactionRef?: string;

  @IsOptional()
  @IsString()
  bankDetails?: string;
}
