/**
 * RBAC System - Permission Constants
 *
 * Simplified 3-role system for Monomi creative agency.
 * Permissions are derived from roles at runtime (no DB lookups).
 *
 * Roles:
 * - SUPER_ADMIN: Full system access (users, settings, content, media)
 * - ADMIN: Content access (invoices, projects, clients, accounting, media)
 * - VIDEOGRAPHER: Media-collab only (upload + edit assets)
 */

// ============================================
// ROLE DEFINITIONS
// ============================================

/**
 * All available roles in the system
 * These match the UserRole enum in Prisma schema
 */
export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  VIDEOGRAPHER = "VIDEOGRAPHER",
}

/**
 * Role hierarchy (higher numbers = more privileges)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.ADMIN]: 80,
  [UserRole.VIDEOGRAPHER]: 10,
};

// ============================================
// PERMISSION GROUPS
// ============================================

/**
 * System admin roles — users and system settings
 */
export const SYSTEM_ADMIN_ROLES = [UserRole.SUPER_ADMIN] as const;

/**
 * Admin roles — content management (invoices, projects, clients, accounting)
 */
export const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN] as const;

/**
 * Media roles — media-collab access
 */
export const MEDIA_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.VIDEOGRAPHER,
] as const;

/**
 * All roles
 */
export const ALL_ROLES = Object.values(UserRole);

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if a role has permission to perform an action
 */
export function hasPermission(
  userRole: UserRole,
  allowedRoles: readonly UserRole[],
): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Get human-readable role name
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: "Super Admin",
    [UserRole.ADMIN]: "Admin",
    [UserRole.VIDEOGRAPHER]: "Videographer",
  };

  return displayNames[role] || role;
}

/**
 * Get Indonesian role name
 */
export function getRoleDisplayNameId(role: UserRole): string {
  const displayNamesId: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: "Super Admin",
    [UserRole.ADMIN]: "Admin",
    [UserRole.VIDEOGRAPHER]: "Videografer",
  };

  return displayNamesId[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: "Akses penuh sistem - Pemilik/IT Admin",
    [UserRole.ADMIN]:
      "Akses konten - invoice, proyek, klien, akuntansi, media",
    [UserRole.VIDEOGRAPHER]: "Akses media-collab saja - upload dan edit aset",
  };

  return descriptions[role] || role;
}

/**
 * Check if user can approve their own submission (segregation of duties)
 * Only SUPER_ADMIN can approve their own submissions
 */
export function canApproveOwnSubmission(userRole: UserRole): boolean {
  return userRole === UserRole.SUPER_ADMIN;
}
