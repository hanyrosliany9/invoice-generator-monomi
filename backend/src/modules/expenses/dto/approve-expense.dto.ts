import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, MaxLength } from "class-validator";

export class ApproveExpenseDto {
  @ApiPropertyOptional({ description: "Approval comments" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;

  @ApiPropertyOptional({ description: "Indonesian approval comments" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  commentsId?: string;

  @ApiPropertyOptional({ description: "English approval comments" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  commentsEn?: string;
}

export class RejectExpenseDto {
  @ApiProperty({ description: "Rejection reason (required)" })
  @IsString()
  @MaxLength(1000)
  rejectionReason: string;

  @ApiPropertyOptional({ description: "Additional comments" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;

  @ApiPropertyOptional({ description: "Indonesian comments" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  commentsId?: string;
}

export class MarkPaidDto {
  @ApiProperty({ description: "Payment date" })
  paymentDate: Date;

  @ApiProperty({ description: "Payment method" })
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ description: "Payment reference number" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentReference?: string;

  @ApiPropertyOptional({ description: "Payment notes" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
