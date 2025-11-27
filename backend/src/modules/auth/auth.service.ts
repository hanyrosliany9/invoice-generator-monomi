import { Injectable, UnauthorizedException ,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import * as bcrypt from "bcryptjs";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { getErrorMessage } from "../../common/utils/error-handling.util";
import { RefreshTokenService } from "./refresh-token.service";

interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
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

  async login(
    loginDto: LoginDto,
    deviceInfo?: DeviceInfo
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: { id: string; email: string; name: string; role: string };
  }> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException("Email atau password salah");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Akun Anda telah dinonaktifkan");
    }

    // Generate access token (15 minutes)
    const payload = { email: user.email, sub: user.id, role: user.role };
    const access_token = this.jwtService.sign(payload);

    // Generate refresh token (30 days)
    const { token: refresh_token } = await this.refreshTokenService.generateRefreshToken(
      user.id,
      deviceInfo
    );

    return {
      access_token,
      refresh_token,
      expires_in: 900, // 15 minutes in seconds
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

  async refreshAccessToken(
    refreshToken: string,
    deviceInfo?: DeviceInfo
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    // Validate and rotate refresh token
    const { token: new_refresh_token, userId } = await this.refreshTokenService.rotateRefreshToken(
      refreshToken,
      deviceInfo
    );

    // Get user
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    // Generate new access token
    const payload = { email: user.email, sub: user.id, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      refresh_token: new_refresh_token,
      expires_in: 900, // 15 minutes
    };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Logout from this device only
      await this.refreshTokenService.revokeToken(refreshToken, 'logout');
    } else {
      // Logout from all devices
      await this.refreshTokenService.revokeAllUserTokens(userId, 'logout');
    }
  }
}
