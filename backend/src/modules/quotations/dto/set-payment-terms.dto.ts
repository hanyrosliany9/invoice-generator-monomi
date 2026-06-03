import {
  IsEnum,
  IsArray,
  IsString,
  IsNumber,
  IsOptional,
  ValidateNested,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { PaymentType } from "@prisma/client";

export class PaymentTermMilestoneDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  nameId?: string;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  paymentPercentage: number;
}

export class SetPaymentTermsDto {
  @IsEnum(PaymentType, {
    message: "Payment type harus FULL_PAYMENT atau MILESTONE_BASED",
  })
  paymentType: PaymentType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentTermMilestoneDto)
  milestones?: PaymentTermMilestoneDto[];
}
