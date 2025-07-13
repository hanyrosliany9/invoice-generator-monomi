import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEnum, IsNotEmpty, IsString } from "class-validator";
import { InvoiceStatus } from "@prisma/client";

export class BulkUpdateStatusDto {
  @ApiProperty({
    description: "Array of invoice IDs to update",
    type: [String],
    example: ["inv-001", "inv-002", "inv-003"],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids: string[];

  @ApiProperty({
    description: "New status for all invoices",
    enum: InvoiceStatus,
    example: InvoiceStatus.SENT,
  })
  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;
}
