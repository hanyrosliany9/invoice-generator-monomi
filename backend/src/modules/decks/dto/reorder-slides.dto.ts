import { IsArray, IsString, ArrayMinSize } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ReorderSlidesDto {
  @ApiProperty({ description: "Array of slide IDs in new order" })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  slideIds: string[];
}
