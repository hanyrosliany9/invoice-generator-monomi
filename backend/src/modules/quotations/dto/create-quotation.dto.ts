import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  IsObject,
  IsArray,
  ValidateNested,
  IsBoolean,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";

export class CreateQuotationDto {
  @ApiProperty({ description: "ID klien" })
  @IsString({ message: "Client ID harus berupa string yang valid" })
  clientId: string;

  @ApiProperty({ description: "ID proyek" })
  @IsString({ message: "Project ID harus berupa string yang valid" })
  projectId: string;

  @ApiProperty({ description: "Jumlah per proyek", example: 5000000 })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: "Jumlah per proyek harus berupa angka" })
  @Min(0.01, { message: "Jumlah per proyek harus lebih besar dari 0" })
  amountPerProject: number;

  @ApiProperty({ description: "Total jumlah", example: 5000000 })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: "Total jumlah harus berupa angka" })
  @Min(0.01, { message: "Total jumlah harus lebih besar dari 0" })
  totalAmount: number;

  @ApiProperty({ description: "Tanggal berlaku hingga" })
  @IsDateString({}, { message: "Valid until harus berupa tanggal yang valid" })
  validUntil: string;

  @ApiProperty({ description: "Apakah termasuk pajak (PPN 11%)", required: false, default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean({ message: "Include tax harus berupa boolean" })
  includeTax?: boolean;

  @ApiProperty({ description: "Subtotal sebelum pajak", required: false, example: 5000000 })
  @IsOptional()
  @Transform(({ value }) => value !== undefined && value !== null ? parseFloat(value) : undefined)
  subtotalAmount?: number;

  @ApiProperty({ description: "Persentase pajak (PPN)", required: false, example: 11 })
  @IsOptional()
  @Transform(({ value }) => value !== undefined && value !== null ? parseFloat(value) : undefined)
  taxRate?: number;

  @ApiProperty({ description: "Jumlah pajak yang dihitung", required: false, example: 550000 })
  @IsOptional()
  @Transform(({ value }) => value !== undefined && value !== null ? parseFloat(value) : undefined)
  taxAmount?: number;

  @ApiProperty({
    description:
      "Scope of Work - Deskripsi naratif ruang lingkup pekerjaan (diturunkan dari proyek atau custom)",
    required: false,
    example:
      "Proyek pengembangan website meliputi:\n1. Design UI/UX\n2. Development frontend dan backend\n3. Testing dan deployment\n\nTimeline: 3 bulan\nDeliverables: Website responsive, dokumentasi, training",
  })
  @IsOptional()
  @IsString({ message: "Scope of Work harus berupa string" })
  scopeOfWork?: string;

  @ApiProperty({
    description: "Detail breakdown harga (opsional, diturunkan dari proyek)",
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

  @ApiProperty({ description: "Syarat dan ketentuan", required: false })
  @IsOptional()
  @IsString({ message: "Terms harus berupa string" })
  terms?: string;

  @ApiProperty({
    description: "Payment milestones (optional, for milestone-based payments)",
    required: false,
    type: "array",
    example: [
      {
        milestoneNumber: 1,
        name: "Down Payment",
        nameId: "DP 50%",
        paymentPercentage: 50,
        paymentAmount: 5000000,
      },
    ],
  })
  @IsOptional()
  @IsArray({ message: "Payment milestones harus berupa array" })
  paymentMilestones?: any[];
}
