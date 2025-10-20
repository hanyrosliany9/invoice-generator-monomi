import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class ApprovePurchaseOrderDto {
  @ApiPropertyOptional({ description: "Approval comments" })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({ description: "Indonesian approval comments" })
  @IsOptional()
  @IsString()
  commentsId?: string;
}

export class RejectPurchaseOrderDto {
  @ApiPropertyOptional({ description: "Rejection reason" })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: "Rejection comments" })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class CancelPurchaseOrderDto {
  @ApiPropertyOptional({ description: "Cancellation reason" })
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @ApiPropertyOptional({ description: "Cancellation comments" })
  @IsOptional()
  @IsString()
  comments?: string;
}
