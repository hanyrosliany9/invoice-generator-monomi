/**
 * Composite Auth Decorators
 *
 * Simplified decorators for 3-role system:
 * - SUPER_ADMIN: Full system access
 * - ADMIN: Content management access
 * - VIDEOGRAPHER: Media-collab access only
 */

import { applyDecorators, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "./roles.decorator";

// ============================================
// PUBLIC ENDPOINTS
// ============================================

/**
 * Mark endpoint as public (no authentication required)
 */
export function Public() {
  return applyDecorators();
}

// ============================================
// AUTHENTICATED ENDPOINTS
// ============================================

/**
 * Require authentication but allow any authenticated user
 */
export function RequireAuth() {
  return applyDecorators(UseGuards(JwtAuthGuard));
}

// ============================================
// ROLE-BASED PERMISSIONS
// ============================================

/**
 * Require SUPER_ADMIN role only
 * Use for: User management, system settings, critical operations
 */
export function RequireSuperAdmin() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.SUPER_ADMIN),
  );
}

/**
 * Require SUPER_ADMIN or ADMIN role
 * Use for: Content management (invoices, projects, clients, accounting)
 */
export function RequireAdmin() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  );
}

/**
 * Require any authenticated role (SUPER_ADMIN, ADMIN, or VIDEOGRAPHER)
 * Use for: Media-collab endpoints (upload, edit assets)
 */
export function RequireMediaRole() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIDEOGRAPHER),
  );
}

// ============================================
// CUSTOM ROLE COMBINATIONS
// ============================================

/**
 * Custom role combination
 * Use when none of the predefined decorators fit
 */
export function RequireRoles(roles: UserRole[]) {
  return applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), Roles(...roles));
}
