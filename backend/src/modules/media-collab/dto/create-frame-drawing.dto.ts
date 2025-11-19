import { IsString, IsNotEmpty, IsInt, Min, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFrameDrawingDto {
  @ApiProperty({
    description: 'ID of the asset this drawing belongs to',
    example: 'clk1234567890',
  })
  @IsString()
  @IsNotEmpty()
  assetId: string;

  @ApiProperty({
    description: 'Timecode in seconds for video drawings',
    example: 30,
  })
  @IsInt()
  @Min(0)
  timecode: number;

  @ApiProperty({
    description: 'Drawing data as JSON (fabric.js format)',
    example: {
      type: 'path',
      path: 'M 0 0 L 100 100',
      stroke: '#ff0000',
      strokeWidth: 2,
    },
  })
  @IsObject()
  drawingData: Record<string, any>;
}
