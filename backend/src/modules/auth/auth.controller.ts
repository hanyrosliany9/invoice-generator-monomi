import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
  Res,
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
import { Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Public } from "../../common/decorators/public.decorator";
import { RefreshTokenService } from "./refresh-token.service";

// TTLs must match JwtModule (15 min access, 30 day refresh).
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;       // 15 minutes in ms
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

/** Set the two auth cookies on a response. */
function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProduction = process.env.NODE_ENV === "production";
  const baseOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
  };
  res.cookie("accessToken", accessToken, { ...baseOpts, maxAge: ACCESS_TOKEN_MAX_AGE });
  res.cookie("refreshToken", refreshToken, { ...baseOpts, maxAge: REFRESH_TOKEN_MAX_AGE });
}

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
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceInfo = {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    };
    const result = await this.authService.login(loginDto, deviceInfo);
    // Hardening 2: set httpOnly cookies in addition to returning body tokens.
    setAuthCookies(res, result.access_token, result.refresh_token);
    return result;
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
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
    @Body("refresh_token") bodyRefreshToken: string | undefined,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Hardening 2: accept refresh token from httpOnly cookie first (XSS-safe),
    // fall back to request body for backward compatibility with existing clients.
    const refreshToken: string = req.cookies?.refreshToken ?? bodyRefreshToken;
    const deviceInfo = {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    };
    const result = await this.authService.refreshAccessToken(refreshToken, deviceInfo);
    // Rotate both cookies on refresh.
    setAuthCookies(res, result.access_token, result.refresh_token);
    return result;
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
    @Res({ passthrough: true }) res: Response,
    @Body("refresh_token") bodyRefreshToken?: string,
    @Body("logout_all") logoutAll?: boolean,
  ) {
    // Accept refresh token from cookie (preferred) or body (backward compat).
    const refreshToken: string | undefined =
      req.cookies?.refreshToken ?? bodyRefreshToken;

    await this.authService.logout(
      req.user.id,
      logoutAll ? undefined : refreshToken,
    );

    // Hardening 2: clear both auth cookies on logout.
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });

    return {
      message: logoutAll
        ? "Logout dari semua perangkat berhasil"
        : "Logout berhasil",
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
    const sessions = await this.refreshTokenService.getUserActiveSessions(
      req.user.id,
    );
    return { sessions };
  }

  @UseGuards(JwtAuthGuard)
  @Delete("sessions/:sessionId")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Hapus sesi tertentu (logout dari perangkat tertentu)",
  })
  @ApiResponse({
    status: 200,
    description: "Sesi berhasil dihapus",
  })
  async revokeSession(
    @Request() req: any,
    @Param("sessionId") sessionId: string,
  ) {
    const session = await this.refreshTokenService[
      "prisma"
    ].refreshToken.findFirst({
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
