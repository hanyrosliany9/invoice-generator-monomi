import { IsString, IsEmail, IsOptional, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({
    description: 'Nama klien',
    example: 'PT. Contoh Indonesia',
  })
  @IsString({ message: 'Nama harus berupa string' })
  name: string;

  @ApiProperty({
    description: 'Email klien',
    example: 'contact@contoh.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  email?: string;

  @ApiProperty({
    description: 'Nomor telepon klien',
    example: '+62812345678',
  })
  @IsString({ message: 'Nomor telepon harus berupa string' })
  phone: string;

  @ApiProperty({
    description: 'Alamat klien',
    example: 'Jl. Sudirman No. 123, Jakarta',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Alamat harus berupa string' })
  address?: string;

  @ApiProperty({
    description: 'Nama perusahaan klien',
    example: 'PT. Contoh Indonesia',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Nama perusahaan harus berupa string' })
  company?: string;

  @ApiProperty({
    description: 'Nama kontak person',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Nama kontak person harus berupa string' })
  contactPerson?: string;

  @ApiProperty({
    description: 'Syarat pembayaran default',
    example: 'NET 30',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Syarat pembayaran harus berupa string' })
  paymentTerms?: string;
}