import { IsString, IsNotEmpty, IsDecimal, IsDateString, IsEnum, IsOptional } from 'class-validator'
import { Transform } from 'class-transformer'
import { PaymentMethod } from '@prisma/client'

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  invoiceId: string

  @Transform(({ value }) => parseFloat(value))
  @IsDecimal({ decimal_digits: '2' })
  amount: number

  @IsDateString()
  paymentDate: string

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod

  @IsOptional()
  @IsString()
  transactionRef?: string

  @IsOptional()
  @IsString()
  bankDetails?: string
}