import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsBoolean,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";

export class CreateUserDto {
  @ApiProperty({
    description: "Email pengguna",
    example: "user@example.com",
  })
  @IsEmail({}, { message: "Format email tidak valid" })
  email: string;

  @ApiProperty({
    description: "Password pengguna",
    example: "password123",
    minLength: 6,
  })
  @IsString({ message: "Password harus berupa string" })
  @MinLength(6, { message: "Password minimal 6 karakter" })
  password: string;

  @ApiProperty({
    description: "Nama lengkap pengguna",
    example: "John Doe",
  })
  @IsString({ message: "Nama harus berupa string" })
  name: string;

  @ApiProperty({
    description: "Role pengguna",
    enum: UserRole,
    example: UserRole.USER,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: "Role tidak valid" })
  role?: UserRole;

  @ApiProperty({
    description: "Status aktif pengguna",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: "Status aktif harus berupa boolean" })
  isActive?: boolean;
}
