import { Test, TestingModule } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { RolesGuard } from "./roles.guard";
import { UserRole } from "@prisma/client";

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  // Mock ExecutionContext
  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe("Basic Functionality", () => {
    it("should be defined", () => {
      expect(guard).toBeDefined();
    });

    it("should allow access when no roles are required", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.STAFF,
      });
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it("should allow access when roles array is empty", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.STAFF,
      });
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([]);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });
  });

  describe("Authentication Checks", () => {
    it("should throw UnauthorizedException when user is not authenticated", () => {
      const mockContext = createMockExecutionContext(null);
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN]);

      expect(() => guard.canActivate(mockContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.canActivate(mockContext)).toThrow(
        "You must be authenticated to access this resource",
      );
    });

    it("should throw UnauthorizedException when user has no role", () => {
      const mockContext = createMockExecutionContext({ id: "1" });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN]);

      expect(() => guard.canActivate(mockContext)).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("SUPER_ADMIN Role Tests", () => {
    it("should allow SUPER_ADMIN to access SUPER_ADMIN protected endpoints", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.SUPER_ADMIN,
        email: "super.admin@monomi.id",
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN]);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it("should allow SUPER_ADMIN to access endpoints that explicitly list SUPER_ADMIN", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.SUPER_ADMIN,
      });
      // In real endpoints, both roles are listed: @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER)
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER]);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });
  });

  describe("FINANCE_MANAGER Role Tests", () => {
    it("should allow FINANCE_MANAGER to access financial approval endpoints", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.FINANCE_MANAGER,
        email: "finance.manager@monomi.id",
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER]);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it("should deny FINANCE_MANAGER access to SUPER_ADMIN only endpoints", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.FINANCE_MANAGER,
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN]);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(/Super Admin/);
    });
  });

  describe("ACCOUNTANT Role Tests", () => {
    it("should allow ACCOUNTANT to access accounting endpoints", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.ACCOUNTANT,
        email: "accountant@monomi.id",
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([
          UserRole.SUPER_ADMIN,
          UserRole.FINANCE_MANAGER,
          UserRole.ACCOUNTANT,
        ]);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it("should deny ACCOUNTANT access to financial approval endpoints", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.ACCOUNTANT,
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER]);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(/Accountant/);
    });
  });

  describe("PROJECT_MANAGER Role Tests", () => {
    it("should allow PROJECT_MANAGER to access operations endpoints", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.PROJECT_MANAGER,
        email: "project.manager@monomi.id",
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER]);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it("should deny PROJECT_MANAGER access to financial approval endpoints", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.PROJECT_MANAGER,
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER]);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });

  describe("STAFF Role Tests", () => {
    it("should allow STAFF to access editor endpoints", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.STAFF,
        email: "staff@monomi.id",
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([
          UserRole.SUPER_ADMIN,
          UserRole.FINANCE_MANAGER,
          UserRole.PROJECT_MANAGER,
          UserRole.ACCOUNTANT,
          UserRole.STAFF,
        ]);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it("should deny STAFF access to financial approval endpoints", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.STAFF,
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER]);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(/Staff/);
    });

    it("should deny STAFF access to user management endpoints", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.STAFF,
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN]);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });

  describe("VIEWER Role Tests", () => {
    it("should deny VIEWER access to editor endpoints", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.VIEWER,
        email: "viewer@monomi.id",
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.STAFF]);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(/Viewer/);
    });

    it("should deny VIEWER access to financial approval endpoints", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.VIEWER,
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER]);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });

  describe("Legacy Role Mapping Tests", () => {
    it("should map legacy ADMIN role to SUPER_ADMIN", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: "ADMIN" as UserRole,
        email: "admin@monomi.id",
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN]);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it("should map legacy USER role to STAFF", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: "USER" as UserRole,
        email: "user@bisnis.co.id",
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.STAFF]);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it("should deny legacy USER role access to admin endpoints", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: "USER" as UserRole,
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN]);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });

  describe("Multi-Role Authorization Tests", () => {
    it("should allow access when user has one of multiple required roles", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.ACCOUNTANT,
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([
          UserRole.SUPER_ADMIN,
          UserRole.FINANCE_MANAGER,
          UserRole.ACCOUNTANT,
        ]);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it("should deny access when user does not have any of the required roles", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.VIEWER,
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([
          UserRole.SUPER_ADMIN,
          UserRole.FINANCE_MANAGER,
          UserRole.ACCOUNTANT,
        ]);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });

  describe("Error Message Tests", () => {
    it("should include required roles in error message", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.STAFF,
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER]);

      expect(() => guard.canActivate(mockContext)).toThrow(
        /Super Admin, Finance Manager/,
      );
    });

    it("should include current role in error message", () => {
      const mockContext = createMockExecutionContext({
        id: "1",
        role: UserRole.STAFF,
      });
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN]);

      expect(() => guard.canActivate(mockContext)).toThrow(
        /Your current role: Staff/,
      );
    });
  });

  describe("Real-World Scenario Tests", () => {
    it("should allow FINANCE_MANAGER to approve quotations", () => {
      const mockContext = createMockExecutionContext({
        id: "fm-123",
        role: UserRole.FINANCE_MANAGER,
        email: "finance.manager@monomi.id",
      });
      // Simulating @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER) on approveQuotation endpoint
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER]);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it("should deny ACCOUNTANT from approving quotations", () => {
      const mockContext = createMockExecutionContext({
        id: "acc-456",
        role: UserRole.ACCOUNTANT,
        email: "accountant@monomi.id",
      });
      // Simulating @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER) on approveQuotation endpoint
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER]);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        /Super Admin, Finance Manager/,
      );
      expect(() => guard.canActivate(mockContext)).toThrow(
        /Your current role: Accountant/,
      );
    });

    it("should allow SUPER_ADMIN to manage users", () => {
      const mockContext = createMockExecutionContext({
        id: "sa-789",
        role: UserRole.SUPER_ADMIN,
        email: "super.admin@monomi.id",
      });
      // Simulating @Roles(UserRole.SUPER_ADMIN) on user management endpoints
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN]);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it("should deny PROJECT_MANAGER from managing users", () => {
      const mockContext = createMockExecutionContext({
        id: "pm-321",
        role: UserRole.PROJECT_MANAGER,
        email: "project.manager@monomi.id",
      });
      // Simulating @Roles(UserRole.SUPER_ADMIN) on user management endpoints
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.SUPER_ADMIN]);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(/Super Admin/);
      expect(() => guard.canActivate(mockContext)).toThrow(
        /Your current role: Project Manager/,
      );
    });
  });
});
