import { Test, TestingModule } from "@nestjs/testing";
import { AuthController, extractRefreshToken } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RefreshTokenService } from "./refresh-token.service";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { PrismaService } from "../prisma/prisma.service";
import { UnauthorizedException } from "@nestjs/common";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    validateToken: jest.fn(),
    refreshAccessToken: jest.fn(),
    logout: jest.fn(),
  };

  const mockRefreshTokenService = {
    getUserActiveSessions: jest.fn(),
    revokeToken: jest.fn(),
  };

  const mockResponse = () =>
    ({ cookie: jest.fn(), clearCookie: jest.fn() }) as any;

  const mockRequest = {
    headers: { "user-agent": "test-agent" },
    ip: "127.0.0.1",
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: RefreshTokenService,
          useValue: mockRefreshTokenService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("login", () => {
    it("should return access token for valid credentials", async () => {
      const loginDto = {
        email: "admin@bisnis.co.id",
        password: "password123",
      };

      const expectedResult = {
        access_token: "jwt-token",
        user: {
          id: "user-id",
          email: "admin@bisnis.co.id",
          name: "Admin User",
          role: "ADMIN",
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto, mockRequest, { cookie: jest.fn(), clearCookie: jest.fn() } as any);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto, {
        userAgent: "test-agent",
        ipAddress: "127.0.0.1",
      });
    });

    it("should throw UnauthorizedException for invalid credentials", async () => {
      const loginDto = {
        email: "admin@bisnis.co.id",
        password: "wrongpassword",
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException("Email atau password salah"),
      );

      await expect(controller.login(loginDto, mockRequest, { cookie: jest.fn(), clearCookie: jest.fn() } as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const registerDto = {
        email: "newuser@bisnis.co.id",
        password: "password123",
        name: "New User",
      };

      const expectedResult = {
        id: "user-id",
        email: "newuser@bisnis.co.id",
        name: "New User",
        role: "USER",
        isActive: true,
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it("should throw error for duplicate email", async () => {
      const registerDto = {
        email: "admin@bisnis.co.id",
        password: "password123",
        name: "Test User",
      };

      mockAuthService.register.mockRejectedValue(
        new UnauthorizedException("Email sudah terdaftar"),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("refresh", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return 401 (UnauthorizedException) when no refresh token is supplied", async () => {
      const res = mockResponse();

      await expect(
        controller.refresh(undefined, { ...mockRequest, cookies: {} }, res),
      ).rejects.toThrow(UnauthorizedException);

      // Must never reach the service/Prisma with `token: undefined`
      expect(mockAuthService.refreshAccessToken).not.toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    it("should return 401 when cookies are absent entirely and body token is empty", async () => {
      await expect(
        controller.refresh("", { ...mockRequest }, mockResponse()),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockAuthService.refreshAccessToken).not.toHaveBeenCalled();
    });

    it("should return 401 when the body token is not a string", async () => {
      await expect(
        controller.refresh(
          { not: "x" },
          { ...mockRequest, cookies: {} },
          mockResponse(),
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockAuthService.refreshAccessToken).not.toHaveBeenCalled();
    });

    it("should prefer the httpOnly cookie token and rotate cookies", async () => {
      const tokens = {
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 900,
      };
      mockAuthService.refreshAccessToken.mockResolvedValue(tokens);
      const res = mockResponse();

      const result = await controller.refresh(
        "body-token",
        { ...mockRequest, cookies: { refreshToken: "cookie-token" } },
        res,
      );

      expect(result).toEqual(tokens);
      expect(mockAuthService.refreshAccessToken).toHaveBeenCalledWith(
        "cookie-token",
        { userAgent: "test-agent", ipAddress: "127.0.0.1" },
      );
      expect(res.cookie).toHaveBeenCalledTimes(2);
    });

    it("should fall back to the body token when the cookie is empty", async () => {
      mockAuthService.refreshAccessToken.mockResolvedValue({
        access_token: "a",
        refresh_token: "r",
        expires_in: 900,
      });

      await controller.refresh(
        "body-token",
        { ...mockRequest, cookies: { refreshToken: "" } },
        mockResponse(),
      );

      expect(mockAuthService.refreshAccessToken).toHaveBeenCalledWith(
        "body-token",
        expect.any(Object),
      );
    });
  });

  describe("extractRefreshToken", () => {
    it("only accepts non-empty strings", () => {
      expect(extractRefreshToken(undefined, undefined)).toBeUndefined();
      expect(extractRefreshToken("", "")).toBeUndefined();
      expect(extractRefreshToken({ not: "x" }, ["a"])).toBeUndefined();
      expect(extractRefreshToken(undefined, "b")).toBe("b");
      expect(extractRefreshToken("c", "b")).toBe("c");
    });
  });

  describe("logout", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should not forward a non-string body token (would be a Prisma filter)", async () => {
      await controller.logout(
        { user: { id: "user-id" }, cookies: {} },
        mockResponse(),
        { not: "x" },
        undefined,
      );

      // Falls back to the existing "no token" behaviour, scoped to the caller
      expect(mockAuthService.logout).toHaveBeenCalledWith("user-id", undefined);
    });
  });

  describe("getProfile", () => {
    it("should return user profile", async () => {
      const mockUser = {
        id: "user-id",
        email: "admin@bisnis.co.id",
        name: "Admin User",
        role: "ADMIN",
      };

      const req = { user: mockUser };
      const result = await controller.getProfile(req);

      expect(result).toEqual(mockUser);
    });
  });
});
