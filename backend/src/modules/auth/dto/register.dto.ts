import {
  IsEmail,
  IsString,
  MinLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
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
}
