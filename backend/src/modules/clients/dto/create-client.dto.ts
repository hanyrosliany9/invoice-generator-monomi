import {
  IsString,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsIn,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateClientDto {
  @ApiProperty({
    description: "Nama klien",
    example: "John Doe",
  })
  @IsString({ message: "Nama harus berupa string" })
  name: string;

  @ApiProperty({
    description: "Email klien",
    example: "contact@contoh.com",
  })
  @IsEmail({}, { message: "Format email tidak valid" })
  email: string;

  @ApiProperty({
    description: "Nomor telepon klien",
    example: "+62812345678",
  })
  @IsString({ message: "Nomor telepon harus berupa string" })
  phone: string;

  @ApiProperty({
    description: "Alamat klien",
    example: "Jl. Sudirman No. 123, Jakarta",
  })
  @IsString({ message: "Alamat harus berupa string" })
  address: string;

  @ApiProperty({
    description: "Nama perusahaan klien",
    example: "PT. Contoh Indonesia",
  })
  @IsString({ message: "Nama perusahaan harus berupa string" })
  company: string;

  @ApiProperty({
    description: "Nama kontak person",
    example: "John Doe",
  })
  @IsString({ message: "Nama kontak person harus berupa string" })
  contactPerson: string;

  @ApiProperty({
    description: "Syarat pembayaran default",
    example: "Net 30",
  })
  @IsString({ message: "Syarat pembayaran harus berupa string" })
  paymentTerms: string;

  @ApiProperty({
    description: "Status klien",
    example: "active",
    enum: ["active", "inactive"],
    required: false,
    default: "active",
  })
  @IsOptional()
  @IsIn(["active", "inactive"], {
    message: "Status harus berupa active atau inactive",
  })
  status?: string;

  @ApiProperty({
    description: "NPWP / Tax Number",
    example: "01.234.567.8-901.000",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "NPWP harus berupa string" })
  taxNumber?: string;

  @ApiProperty({
    description: "Bank account information",
    example: "Bank BCA: 123-456-789 a.n. John Doe",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Bank account harus berupa string" })
  bankAccount?: string;

  @ApiProperty({
    description: "Additional notes",
    example: "VIP customer",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Notes harus berupa string" })
  notes?: string;
}
