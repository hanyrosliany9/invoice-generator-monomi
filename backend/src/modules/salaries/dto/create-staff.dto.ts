import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEmail,
  IsDateString,
  Min,
  MaxLength,
} from "class-validator";
import { Type, Transform } from "class-transformer";

// Optional form fields arrive as "" (empty string) from the UI, not undefined —
// so @IsOptional() wouldn't skip them and @IsEmail()/@IsDateString() would 400.
// Normalise blanks to undefined before validation.
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export class CreateStaffDto {
  @ApiProperty({ description: "Staff full name" })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: "Job position / role title" })
  @IsString()
  @MaxLength(200)
  position: string;

  @ApiPropertyOptional({ description: "Email address" })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: "Phone number" })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: "Date joined (ISO 8601)" })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsDateString()
  joinedDate?: string;

  @ApiProperty({ description: "Base monthly salary in IDR", example: 5000000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  baseSalary: number;

  @ApiPropertyOptional({ description: "Bank name for payroll" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @ApiPropertyOptional({ description: "Bank account number" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankAccount?: string;

  @ApiPropertyOptional({ description: "Additional notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Whether staff is active", default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
