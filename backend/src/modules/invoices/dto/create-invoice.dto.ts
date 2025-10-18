import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsPositive,
  IsBoolean,
  IsNumber,
  IsObject,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { InvoiceStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { FinancialTransform } from "../../../common/dto/financial-data.dto";

export class CreateInvoiceDto {
  @ApiProperty({
    description: "Nomor invoice",
    example: "INV-2024-001",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Nomor invoice harus berupa string" })
  invoiceNumber?: string;

  @ApiProperty({
    description: "Tanggal jatuh tempo",
    example: "2024-02-15",
  })
  @IsDateString({}, { message: "Format tanggal jatuh tempo tidak valid" })
  dueDate: string;

  @ApiProperty({
    description: "ID quotation (opsional)",
    example: "clx123456789",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "ID quotation harus berupa string yang valid" })
  quotationId?: string;

  @ApiProperty({
    description: "ID klien",
    example: "clx123456789",
  })
  @IsString({ message: "ID klien harus berupa string yang valid" })
  clientId: string;

  @ApiProperty({
    description: "ID proyek",
    example: "clx123456789",
  })
  @IsString({ message: "ID proyek harus berupa string yang valid" })
  projectId: string;

  @ApiProperty({
    description: "Jumlah per proyek",
    example: 5000000,
  })
  @FinancialTransform()
  @IsPositive({ message: "Jumlah per proyek harus lebih dari 0" })
  amountPerProject: number;

  @ApiProperty({
    description: "Total jumlah",
    example: 5000000,
  })
  @FinancialTransform()
  @IsPositive({ message: "Total jumlah harus lebih dari 0" })
  totalAmount: number;

  @ApiProperty({
    description: "Informasi pembayaran",
    example: "Transfer ke rekening BCA 123456789 a.n. PT Contoh",
  })
  @IsString({ message: "Informasi pembayaran harus berupa string" })
  paymentInfo: string;

  @ApiProperty({
    description: "Apakah materai diperlukan",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: "Materai required harus berupa boolean" })
  materaiRequired?: boolean;

  @ApiProperty({
    description:
      "Scope of Work - Deskripsi naratif ruang lingkup pekerjaan (diturunkan dari quotation/proyek atau custom)",
    required: false,
    example:
      "Invoice ini mencakup:\n1. Pengembangan website e-commerce\n2. Integrasi payment gateway\n3. Training tim internal\n\nDeliverables: Website fully functional, dokumentasi lengkap",
  })
  @IsOptional()
  @IsString({ message: "Scope of Work harus berupa string" })
  scopeOfWork?: string;

  @ApiProperty({
    description:
      "Detail breakdown harga (opsional, diturunkan dari quotation atau proyek)",
    required: false,
    example: {
      products: [
        {
          name: "Website Development",
          description: "Responsive website with 5 pages",
          price: 15000000,
          quantity: 1,
          subtotal: 15000000,
        },
      ],
      total: 15000000,
      calculatedAt: "2025-10-15T11:45:55.000Z",
    },
  })
  @IsOptional()
  @IsObject({ message: "Price breakdown harus berupa object" })
  priceBreakdown?: any;

  @ApiProperty({
    description: "Syarat dan ketentuan",
    example: "Pembayaran dalam 30 hari",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Syarat dan ketentuan harus berupa string" })
  terms?: string;

  @ApiProperty({
    description: "Apakah materai sudah ditempel",
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: "Materai applied harus berupa boolean" })
  materaiApplied?: boolean;

  @ApiProperty({
    description: "Status invoice",
    enum: InvoiceStatus,
    example: InvoiceStatus.DRAFT,
    required: false,
  })
  @IsOptional()
  @IsEnum(InvoiceStatus, { message: "Status invoice tidak valid" })
  status?: InvoiceStatus;

  @ApiProperty({
    description: "ID pembuat invoice",
    example: "clx123456789",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "ID pembuat harus berupa string yang valid" })
  createdBy?: string;
}
