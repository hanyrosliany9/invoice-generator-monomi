import { IsString, IsNumber, IsDateString, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateQuotationDto {
  @ApiProperty({ description: 'ID klien' })
  @IsUUID('4', { message: 'Client ID harus berupa UUID yang valid' })
  clientId: string;

  @ApiProperty({ description: 'ID proyek' })
  @IsUUID('4', { message: 'Project ID harus berupa UUID yang valid' })
  projectId: string;

  @ApiProperty({ description: 'Jumlah per proyek', example: 5000000 })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'Jumlah per proyek harus berupa angka' })
  @Min(0, { message: 'Jumlah per proyek harus lebih besar dari 0' })
  amountPerProject: number;

  @ApiProperty({ description: 'Total jumlah', example: 5000000 })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'Total jumlah harus berupa angka' })
  @Min(0, { message: 'Total jumlah harus lebih besar dari 0' })
  totalAmount: number;

  @ApiProperty({ description: 'Tanggal berlaku hingga' })
  @IsDateString({}, { message: 'Valid until harus berupa tanggal yang valid' })
  validUntil: string;

  @ApiProperty({ description: 'Syarat dan ketentuan', required: false })
  @IsOptional()
  @IsString({ message: 'Terms harus berupa string' })
  terms?: string;
}