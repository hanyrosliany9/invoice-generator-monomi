import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
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
  };

  const mockRequest = {
    headers: { 'user-agent': 'test-agent' },
    ip: '127.0.0.1',
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

      const result = await controller.login(loginDto, mockRequest);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto, {
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
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

      await expect(controller.login(loginDto, mockRequest)).rejects.toThrow(
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
