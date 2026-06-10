import { Type } from "class-transformer";
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

/** How the purchase is paid at record time. */
export enum PurchasePaymentMethod {
  HUTANG = "HUTANG", // on credit → CR 2-1010, Purchase Report shows UNPAID
  CASH = "CASH", // paid from Kas → CR 1-1010, immediately PAID
  BANK = "BANK", // paid from Bank → CR 1-1020, immediately PAID
}

export class PurchaseLineItemDto {
  /** COA account to debit (expense / asset / prepaid). */
  @IsString()
  @MinLength(1)
  accountCode: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreatePurchaseDto {
  /** Existing vendor (Kontak). Either this or `vendorName` must be provided. */
  @IsString()
  @IsOptional()
  vendorId?: string;

  /**
   * New vendor name (Kontak) typed inline on the form. When no `vendorId` is
   * given, the service finds a vendor with this exact name or creates one.
   */
  @IsString()
  @MinLength(1)
  @IsOptional()
  vendorName?: string;

  @IsDate()
  @Type(() => Date)
  date: Date;

  /** Optional reference (Referensi) — stored as the journal documentNumber. */
  @IsString()
  @IsOptional()
  reference?: string;

  @IsEnum(PurchasePaymentMethod)
  paymentMethod: PurchasePaymentMethod;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseLineItemDto)
  lineItems: PurchaseLineItemDto[];
}
