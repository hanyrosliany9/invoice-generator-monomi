/**
 * Composite Auth Decorators
 *
 * These decorators combine multiple guards and metadata setters for common
 * authorization patterns. They simplify controller code and ensure consistent
 * security across the application.
 *
 * Usage example:
 * @RequireFinancialApprover()
 * async approveInvoice(@Body() dto: ApproveInvoiceDto) { ... }
 */

import { applyDecorators, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "./roles.decorator";
import {
  FINANCIAL_APPROVER_ROLES,
  ACCOUNTING_ROLES,
  OPERATIONS_ROLES,
  EDITOR_ROLES,
  ALL_ROLES,
} from "../../../common/constants/permissions.constants";

// ============================================
// PUBLIC ENDPOINTS
// ============================================

/**
 * Mark endpoint as public (no authentication required)
 * Use sparingly - most endpoints should require authentication
 */
export function Public() {
  // This is a placeholder - actual implementation depends on your auth strategy
  // You may need to set metadata that JwtAuthGuard checks
  return applyDecorators();
}

// ============================================
// AUTHENTICATED ENDPOINTS (ANY ROLE)
// ============================================

/**
 * Require authentication but allow any authenticated user
 */
export function RequireAuth() {
  return applyDecorators(
    UseGuards(JwtAuthGuard),
  );
}

/**
 * Require authentication and any valid role
 */
export function RequireAnyRole() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...ALL_ROLES),
  );
}

// ============================================
// FINANCIAL PERMISSIONS
// ============================================

/**
 * Require financial approver role (SUPER_ADMIN, FINANCE_MANAGER, ADMIN)
 * Use for: Approving quotations, marking invoices paid, approving expenses
 */
export function RequireFinancialApprover() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...FINANCIAL_APPROVER_ROLES),
  );
}

/**
 * Require accounting role (SUPER_ADMIN, FINANCE_MANAGER, ACCOUNTANT, ADMIN)
 * Use for: Viewing/creating journal entries, viewing reports
 */
export function RequireAccountingRole() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...ACCOUNTING_ROLES),
  );
}

// ============================================
// OPERATIONAL PERMISSIONS
// ============================================

/**
 * Require operations role (SUPER_ADMIN, FINANCE_MANAGER, PROJECT_MANAGER, ADMIN)
 * Use for: Managing projects, clients, operations
 */
export function RequireOperationsRole() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...OPERATIONS_ROLES),
  );
}

/**
 * Require editor role (all roles except VIEWER)
 * Use for: Creating/editing content
 */
export function RequireEditorRole() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...EDITOR_ROLES),
  );
}

// ============================================
// ADMIN PERMISSIONS
// ============================================

/**
 * Require super admin role
 * Use for: System settings, user management, critical operations
 */
export function RequireSuperAdmin() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN), // Include legacy ADMIN
  );
}

/**
 * Require admin role (SUPER_ADMIN or legacy ADMIN)
 * Use for: Administrative functions
 */
export function RequireAdmin() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  );
}

// ============================================
// SPECIFIC FEATURE PERMISSIONS
// ============================================

/**
 * Quotation approval permission
 * Use for: Approving/declining quotations
 */
export function RequireQuotationApprover() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...FINANCIAL_APPROVER_ROLES),
  );
}

/**
 * Invoice management permission
 * Use for: Marking invoices as paid, cancelling invoices
 */
export function RequireInvoiceManager() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...FINANCIAL_APPROVER_ROLES),
  );
}

/**
 * Expense approval permission
 * Use for: Approving/rejecting expenses
 */
export function RequireExpenseApprover() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...FINANCIAL_APPROVER_ROLES),
  );
}

/**
 * Project management permission
 * Use for: Creating/updating projects
 */
export function RequireProjectManager() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...OPERATIONS_ROLES),
  );
}

/**
 * Client management permission
 * Use for: Creating/updating clients
 */
export function RequireClientManager() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...OPERATIONS_ROLES),
  );
}

/**
 * User management permission
 * Use for: Creating/updating/deleting users
 */
export function RequireUserManager() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  );
}

/**
 * Settings management permission
 * Use for: Editing company/system settings
 */
export function RequireSettingsManager() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  );
}

/**
 * Accounting period close permission
 * Use for: Closing fiscal periods, posting journal entries
 */
export function RequireAccountingManager() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER, UserRole.ADMIN),
  );
}

// ============================================
// CUSTOM ROLE COMBINATIONS
// ============================================

/**
 * Custom role combination
 * Use when none of the predefined decorators fit your needs
 *
 * @param roles - Array of allowed UserRole values
 *
 * Example:
 * @RequireRoles([UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER])
 * async customOperation() { ... }
 */
export function RequireRoles(roles: UserRole[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...roles),
  );
}
