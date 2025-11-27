import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
  Delete,
  Param,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Public } from "../../common/decorators/public.decorator";
import { RefreshTokenService } from "./refresh-token.service";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute (brute force protection)
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login pengguna" })
  @ApiResponse({
    status: 200,
    description: "Login berhasil",
    schema: {
      type: "object",
      properties: {
        access_token: { type: "string" },
        user: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            name: { type: "string" },
            role: { type: "string" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Email atau password salah",
  })
  async login(@Body() loginDto: LoginDto, @Request() req: any) {
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
    return this.authService.login(loginDto, deviceInfo);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 registrations per hour (spam protection)
  @Post("register")
  @ApiOperation({ summary: "Registrasi pengguna baru" })
  @ApiResponse({
    status: 201,
    description: "Registrasi berhasil",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        email: { type: "string" },
        name: { type: "string" },
        role: { type: "string" },
        isActive: { type: "boolean" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Data registrasi tidak valid",
  })
  @ApiResponse({
    status: 409,
    description: "Email sudah terdaftar",
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mendapatkan profile pengguna" })
  @ApiResponse({
    status: 200,
    description: "Profile pengguna",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        email: { type: "string" },
        name: { type: "string" },
        role: { type: "string" },
        isActive: { type: "boolean" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Token tidak valid",
  })
  async getProfile(@Request() req: any) {
    return req.user;
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token menggunakan refresh token" })
  @ApiResponse({
    status: 200,
    description: "Token berhasil di-refresh",
    schema: {
      type: "object",
      properties: {
        access_token: { type: "string" },
        refresh_token: { type: "string" },
        expires_in: { type: "number" },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Refresh token tidak valid atau kedaluwarsa",
  })
  async refresh(
    @Body("refresh_token") refreshToken: string,
    @Request() req: any,
  ) {
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
    return this.authService.refreshAccessToken(refreshToken, deviceInfo);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout pengguna" })
  @ApiResponse({
    status: 200,
    description: "Logout berhasil",
    schema: {
      type: "object",
      properties: {
        message: { type: "string" },
      },
    },
  })
  async logout(
    @Request() req: any,
    @Body("refresh_token") refreshToken?: string,
    @Body("logout_all") logoutAll?: boolean,
  ) {
    await this.authService.logout(
      req.user.id,
      logoutAll ? undefined : refreshToken
    );
    return {
      message: logoutAll ? "Logout dari semua perangkat berhasil" : "Logout berhasil",
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get("sessions")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mendapatkan sesi aktif (perangkat yang login)" })
  @ApiResponse({
    status: 200,
    description: "Daftar sesi aktif",
  })
  async getSessions(@Request() req: any) {
    const sessions = await this.refreshTokenService.getUserActiveSessions(req.user.id);
    return { sessions };
  }

  @UseGuards(JwtAuthGuard)
  @Delete("sessions/:sessionId")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Hapus sesi tertentu (logout dari perangkat tertentu)" })
  @ApiResponse({
    status: 200,
    description: "Sesi berhasil dihapus",
  })
  async revokeSession(
    @Request() req: any,
    @Param("sessionId") sessionId: string,
  ) {
    const session = await this.refreshTokenService['prisma'].refreshToken.findFirst({
      where: { id: sessionId, userId: req.user.id },
    });

    if (!session) {
      return {
        success: false,
        message: "Sesi tidak ditemukan",
      };
    }

    await this.refreshTokenService.revokeToken(session.token, "manual_revoke");

    return {
      success: true,
      message: "Sesi berhasil dihapus",
    };
  }
}
