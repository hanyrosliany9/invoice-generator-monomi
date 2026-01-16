import {
  IsEnum,
  IsNumber,
  IsDate,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { Currency } from "@prisma/client";

export class CreateExchangeRateDto {
  @IsEnum(Currency)
  fromCurrency: Currency;

  @IsEnum(Currency)
  @IsOptional()
  toCurrency?: Currency = Currency.IDR;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsDate()
  @Type(() => Date)
  effectiveDate: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expiryDate?: Date;

  @IsString()
  @IsOptional()
  source?: string;

  @IsBoolean()
  @IsOptional()
  isAutomatic?: boolean = false;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsString()
  createdBy: string;
}
