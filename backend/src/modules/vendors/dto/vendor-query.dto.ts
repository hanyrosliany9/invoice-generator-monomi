import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { VendorType, PKPStatus } from "@prisma/client";

export class VendorQueryDto {
  @ApiPropertyOptional({ description: "Page number", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Items per page", default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Sort by field", default: "name" })
  @IsOptional()
  @IsString()
  sortBy?: string = "name";

  @ApiPropertyOptional({
    description: "Sort order",
    enum: ["asc", "desc"],
    default: "asc",
  })
  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc" = "asc";

  @ApiPropertyOptional({ description: "Search by name, code, email, or phone" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Filter by vendor type",
    enum: VendorType,
  })
  @IsOptional()
  @IsEnum(VendorType)
  type?: VendorType;

  @ApiPropertyOptional({ description: "Filter by PKP status", enum: PKPStatus })
  @IsOptional()
  @IsEnum(PKPStatus)
  pkpStatus?: PKPStatus;

  @ApiPropertyOptional({ description: "Filter by category" })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: "Filter by active status" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Filter by city" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: "Filter by province" })
  @IsOptional()
  @IsString()
  province?: string;
}
