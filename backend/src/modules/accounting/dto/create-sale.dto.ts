import { Type } from "class-transformer";
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

/** Where the sale's value lands at record time. */
export enum SalePaymentMethod {
  PIUTANG = "PIUTANG", // on credit → DR 1-2010 AR, Sales Report shows UNPAID
  CASH = "CASH", // paid to Kas → DR 1-1010, immediately PAID
  BANK = "BANK", // paid to Bank → DR 1-1020, immediately PAID
}

export class SaleLineItemDto {
  /** Nama Item (free text, or picked from asset data on the form). */
  @IsString()
  @MinLength(1)
  itemName: string;

  /** Revenue COA account to credit (4-xxxx). */
  @IsString()
  @MinLength(1)
  accountCode: string;

  /** Satuan (unit label, e.g. "UNIT", "jam"). */
  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  /** Harga (unit price, before discount/tax). */
  @IsNumber()
  @Min(0)
  unitPrice: number;

  /** Diskon % (0–100). */
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;

  /** Tax rate as a fraction: 0 = Tanpa Pajak, 0.11 = PPN 11%. */
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  taxRate?: number;
}

export class CreateSaleDto {
  /** Existing client (Customer). Either this or `clientName` is required. */
  @IsString()
  @IsOptional()
  clientId?: string;

  /** New client name typed inline; the service finds-or-creates it. */
  @IsString()
  @MinLength(1)
  @IsOptional()
  clientName?: string;

  /** Issued date (Tanggal). */
  @IsDate()
  @Type(() => Date)
  issuedDate: Date;

  /** Due date (Jatuh Tempo). */
  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  /** Optional reference — stored as the journal documentNumber. */
  @IsString()
  @IsOptional()
  reference?: string;

  @IsEnum(SalePaymentMethod)
  paymentMethod: SalePaymentMethod;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleLineItemDto)
  lineItems: SaleLineItemDto[];
}
