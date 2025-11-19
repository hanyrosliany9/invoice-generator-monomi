import { IsOptional, IsString, IsInt, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMetadataDto {
  @ApiPropertyOptional({
    description: 'Camera make (e.g., Canon, Nikon)',
    example: 'Canon',
  })
  @IsOptional()
  @IsString()
  cameraMake?: string;

  @ApiPropertyOptional({
    description: 'Camera model',
    example: 'EOS 5D Mark IV',
  })
  @IsOptional()
  @IsString()
  cameraModel?: string;

  @ApiPropertyOptional({
    description: 'Lens model',
    example: 'EF 24-70mm f/2.8L II USM',
  })
  @IsOptional()
  @IsString()
  lens?: string;

  @ApiPropertyOptional({
    description: 'ISO sensitivity',
    example: 800,
  })
  @IsOptional()
  @IsInt()
  iso?: number;

  @ApiPropertyOptional({
    description: 'Aperture (f-number)',
    example: 2.8,
  })
  @IsOptional()
  @IsNumber()
  aperture?: number;

  @ApiPropertyOptional({
    description: 'Shutter speed',
    example: '1/250',
  })
  @IsOptional()
  @IsString()
  shutterSpeed?: string;

  @ApiPropertyOptional({
    description: 'Focal length in mm',
    example: 50,
  })
  @IsOptional()
  @IsInt()
  focalLength?: number;

  @ApiPropertyOptional({
    description: 'Copyright information',
    example: '© 2025 Photography Studio',
  })
  @IsOptional()
  @IsString()
  copyright?: string;

  @ApiPropertyOptional({
    description: 'GPS latitude',
    example: -6.2088,
  })
  @IsOptional()
  @IsNumber()
  gpsLatitude?: number;

  @ApiPropertyOptional({
    description: 'GPS longitude',
    example: 106.8456,
  })
  @IsOptional()
  @IsNumber()
  gpsLongitude?: number;
}
