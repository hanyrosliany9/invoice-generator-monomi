import { Injectable, UnauthorizedException ,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import * as bcrypt from "bcryptjs";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { getErrorMessage } from "../../common/utils/error-handling.util";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmailForAuth(email);

    if (user) {
      try {
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
          // Remove password from response
          const { password: userPassword, ...result } = user;
          return result;
        }
      } catch (error) {
        this.logger.error("bcrypt.compare failed:", getErrorMessage(error));
        return null;
      }
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<{
    access_token: string;
    user: { id: string; email: string; name: string; role: string };
  }> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException("Email atau password salah");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Akun Anda telah dinonaktifkan");
    }

    const payload = { email: user.email, sub: user.id, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<any> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new UnauthorizedException("Email sudah terdaftar");
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    // Create user
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    // Password already filtered out by service
    return user;
  }

  async validateToken(userId: string): Promise<any> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Token tidak valid");
    }

    // Password already filtered out by service
    return user;
  }
}
