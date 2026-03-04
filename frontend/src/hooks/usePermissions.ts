/**
 * usePermissions Hook
 *
 * Simplified 3-role permission checking for UI components.
 *
 * Roles:
 * - SUPER_ADMIN: Full system access (users, settings, content, media)
 * - ADMIN: Content access (invoices, projects, clients, accounting, media)
 * - VIDEOGRAPHER: Media-collab only (upload and edit assets)
 */

import { useAuthStore } from '../store/auth';
import type { UserRole } from '../types/user';

// Permission role groups (matches backend constants)
const SYSTEM_ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN'];
const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN'];
const MEDIA_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'VIDEOGRAPHER'];

export const usePermissions = () => {
  const { user } = useAuthStore();

  /**
   * Check if user has a specific role
   */
  const hasRole = (role: UserRole): boolean => {
    if (!user?.role) return false;
    return user.role === role;
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!user?.role) return false;
    return roles.includes(user.role as UserRole);
  };

  /**
   * Check if user is SUPER_ADMIN
   */
  const isSuperAdmin = (): boolean => {
    return hasAnyRole(SYSTEM_ADMIN_ROLES);
  };

  /**
   * Check if user is SUPER_ADMIN or ADMIN
   */
  const isAdmin = (): boolean => {
    return hasAnyRole(ADMIN_ROLES);
  };

  /**
   * Check if user can manage users (SUPER_ADMIN only)
   */
  const canManageUsers = (): boolean => {
    return isSuperAdmin();
  };

  /**
   * Check if user can manage company settings (SUPER_ADMIN only)
   */
  const canManageSettings = (): boolean => {
    return isSuperAdmin();
  };

  /**
   * Check if user can access media-collab
   */
  const canAccessMedia = (): boolean => {
    return hasAnyRole(MEDIA_ROLES);
  };

  /**
   * Get human-readable role display name
   */
  const getRoleDisplayName = (role?: UserRole): string => {
    const roleToDisplay = role || (user?.role as UserRole | undefined);
    if (!roleToDisplay) return 'Unknown';

    const displayNames: Record<UserRole, string> = {
      'SUPER_ADMIN': 'Super Admin',
      'ADMIN': 'Admin',
      'VIDEOGRAPHER': 'Videographer',
    };

    return displayNames[roleToDisplay] || roleToDisplay;
  };

  /**
   * Get Indonesian role display name
   */
  const getRoleDisplayNameId = (role?: UserRole): string => {
    const roleToDisplay = role || (user?.role as UserRole | undefined);
    if (!roleToDisplay) return 'Tidak Diketahui';

    const displayNamesId: Record<UserRole, string> = {
      'SUPER_ADMIN': 'Super Admin',
      'ADMIN': 'Admin',
      'VIDEOGRAPHER': 'Videografer',
    };

    return displayNamesId[roleToDisplay] || roleToDisplay;
  };

  /**
   * Get role description
   */
  const getRoleDescription = (role?: UserRole): string => {
    const roleToDisplay = role || (user?.role as UserRole | undefined);
    if (!roleToDisplay) return '';

    const descriptions: Record<UserRole, string> = {
      'SUPER_ADMIN': 'Akses penuh sistem - Pemilik/IT Admin',
      'ADMIN': 'Akses konten - invoice, proyek, klien, akuntansi, media',
      'VIDEOGRAPHER': 'Akses media-collab saja - upload dan edit aset',
    };

    return descriptions[roleToDisplay] || '';
  };

  /**
   * Get badge color for role
   */
  const getRoleBadgeColor = (role?: UserRole): string => {
    const roleToDisplay = role || (user?.role as UserRole | undefined);
    if (!roleToDisplay) return 'default';

    const colors: Record<UserRole, string> = {
      'SUPER_ADMIN': 'red',
      'ADMIN': 'blue',
      'VIDEOGRAPHER': 'purple',
    };

    return colors[roleToDisplay] || 'default';
  };

  /**
   * Get list of all available roles (for dropdowns)
   */
  const getAllRoles = (): { value: UserRole; label: string; description: string }[] => {
    return [
      {
        value: 'SUPER_ADMIN',
        label: 'Super Admin',
        description: 'Akses penuh sistem - Pemilik/IT Admin',
      },
      {
        value: 'ADMIN',
        label: 'Admin',
        description: 'Akses konten - invoice, proyek, klien, akuntansi',
      },
      {
        value: 'VIDEOGRAPHER',
        label: 'Videographer',
        description: 'Akses media-collab saja',
      },
    ];
  };

  return {
    // Current user info
    user,
    userRole: user?.role,

    // Role checking
    hasRole,
    hasAnyRole,

    // Permission checking
    isSuperAdmin,
    isAdmin,
    canManageUsers,
    canManageSettings,
    canAccessMedia,

    // Utility functions
    getRoleDisplayName,
    getRoleDisplayNameId,
    getRoleDescription,
    getRoleBadgeColor,
    getAllRoles,
  };
};
