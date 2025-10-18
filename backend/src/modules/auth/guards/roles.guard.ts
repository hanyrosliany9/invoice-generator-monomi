import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/client";
import {
  UserRole as PermissionUserRole,
  LEGACY_ROLE_MAPPING,
  hasPermission,
  getRoleDisplayName,
} from "../../../common/constants/permissions.constants";

/**
 * Enhanced RolesGuard with RBAC support
 *
 * Features:
 * - Type-safe role checking using Prisma UserRole enum
 * - Legacy role mapping (ADMIN → SUPER_ADMIN, USER → STAFF)
 * - Clear error messages with role information
 * - ~0.1ms authorization time (no DB queries)
 *
 * Usage:
 * @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER)
 * async approveInvoice() { ... }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      "roles",
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (populated by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user is authenticated
    if (!user || !user.role) {
      throw new UnauthorizedException(
        "You must be authenticated to access this resource"
      );
    }

    // Get user's role (may be legacy role)
    const userRole = user.role as UserRole;
    const userRoleStr = userRole as string as PermissionUserRole;

    // Convert Prisma UserRole[] to PermissionUserRole[] for permission check
    const requiredRoleStrs = requiredRoles.map(r => r as string as PermissionUserRole);

    // Check if user has permission (with legacy role mapping)
    const hasAccess = hasPermission(userRoleStr, requiredRoleStrs);

    if (!hasAccess) {
      // Build helpful error message
      const requiredRoleNames = requiredRoleStrs
        .map((role) => getRoleDisplayName(role))
        .join(", ");

      throw new ForbiddenException(
        `Access denied. This action requires one of the following roles: ${requiredRoleNames}. ` +
          `Your current role: ${getRoleDisplayName(userRoleStr)}`
      );
    }

    return true;
  }
}
