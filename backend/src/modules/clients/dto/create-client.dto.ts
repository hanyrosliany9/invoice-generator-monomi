import {
  IsString,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsIn,
  Matches,
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
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: "Format email tidak valid" })
  email?: string;

  @ApiProperty({
    description: "Nomor telepon klien",
    example: "+62812345678",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Nomor telepon harus berupa string" })
  phone?: string;

  @ApiProperty({
    description: "Alamat klien",
    example: "Jl. Sudirman No. 123, Jakarta",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Alamat harus berupa string" })
  address?: string;

  @ApiProperty({
    description: "Nama perusahaan klien",
    example: "PT. Contoh Indonesia",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Nama perusahaan harus berupa string" })
  company?: string;

  @ApiProperty({
    description: "Nama kontak person",
    example: "John Doe",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Nama kontak person harus berupa string" })
  contactPerson?: string;

  @ApiProperty({
    description: "Syarat pembayaran default",
    example: "Net 30",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Syarat pembayaran harus berupa string" })
  paymentTerms?: string;

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
  @Matches(/^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/, {
    message: "Format NPWP tidak valid (XX.XXX.XXX.X-XXX.XXX)",
  })
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

  @ApiProperty({
    description: "Instagram handle untuk pratinjau konten (mis. @brandklien)",
    required: false,
  })
  @IsOptional()
  @IsString()
  instagramHandle?: string;

  @ApiProperty({ description: "URL foto profil Instagram", required: false })
  @IsOptional()
  @IsString()
  instagramAvatarUrl?: string;

  @ApiProperty({ description: "Bio profil Instagram", required: false })
  @IsOptional()
  @IsString()
  instagramBio?: string;

  @ApiProperty({
    description: "TikTok handle untuk pratinjau konten (mis. @brandklien)",
    required: false,
  })
  @IsOptional()
  @IsString()
  tiktokHandle?: string;

  @ApiProperty({ description: "URL foto profil TikTok", required: false })
  @IsOptional()
  @IsString()
  tiktokAvatarUrl?: string;

  @ApiProperty({ description: "Bio profil TikTok", required: false })
  @IsOptional()
  @IsString()
  tiktokBio?: string;
}
