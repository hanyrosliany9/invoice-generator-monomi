import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";

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

  @ApiProperty({ description: "Syarat dan ketentuan", required: false })
  @IsOptional()
  @IsString({ message: "Terms harus berupa string" })
  terms?: string;
}
