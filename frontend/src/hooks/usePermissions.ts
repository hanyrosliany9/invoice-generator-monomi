/**
 * usePermissions Hook
 *
 * Provides role-based permission checking for UI components.
 * Matches backend permission system for consistent authorization.
 *
 * Usage:
 * const { canApproveFinancial, hasRole, isAdmin } = usePermissions();
 *
 * if (canApproveFinancial()) {
 *   // Show approve button
 * }
 */

import { useAuthStore } from '../store/auth';
import type { UserRole } from '../types/user';

// Permission role groups (matches backend constants)
const FINANCIAL_APPROVER_ROLES: UserRole[] = ['SUPER_ADMIN', 'FINANCE_MANAGER', 'ADMIN'];
const ACCOUNTING_ROLES: UserRole[] = ['SUPER_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT', 'ADMIN'];
const OPERATIONS_ROLES: UserRole[] = ['SUPER_ADMIN', 'FINANCE_MANAGER', 'PROJECT_MANAGER', 'ADMIN'];
const EDITOR_ROLES: UserRole[] = ['SUPER_ADMIN', 'FINANCE_MANAGER', 'PROJECT_MANAGER', 'ACCOUNTANT', 'STAFF', 'ADMIN', 'USER'];
const VIEWER_ROLES: UserRole[] = ['VIEWER'];
const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN'];

// Legacy role mapping
const LEGACY_ROLE_MAPPING: Record<string, UserRole> = {
  'ADMIN': 'SUPER_ADMIN',
  'USER': 'STAFF',
};

export const usePermissions = () => {
  const { user } = useAuthStore();

  /**
   * Map legacy roles to new roles
   */
  const getMappedRole = (role: UserRole): UserRole => {
    return LEGACY_ROLE_MAPPING[role] || role;
  };

  /**
   * Check if user has a specific role
   */
  const hasRole = (role: UserRole): boolean => {
    if (!user || !user.role) return false;

    const userRole = getMappedRole(user.role as UserRole);
    const requiredRole = getMappedRole(role);

    return userRole === requiredRole;
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!user) return false;

    return roles.some(role => hasRole(role));
  };

  /**
   * Check if user can approve financial transactions
   * (Quotations, Invoices, Expenses)
   */
  const canApproveFinancial = (): boolean => {
    return hasAnyRole(FINANCIAL_APPROVER_ROLES);
  };

  /**
   * Check if user can access accounting features
   * (Journal entries, reports, accounting operations)
   */
  const canAccessAccounting = (): boolean => {
    return hasAnyRole(ACCOUNTING_ROLES);
  };

  /**
   * Check if user can manage operations
   * (Projects, clients, operational tasks)
   */
  const canManageOperations = (): boolean => {
    return hasAnyRole(OPERATIONS_ROLES);
  };

  /**
   * Check if user can edit content
   * (Create/update documents, all roles except VIEWER)
   */
  const canEditContent = (): boolean => {
    return hasAnyRole(EDITOR_ROLES);
  };

  /**
   * Check if user is read-only
   */
  const isReadOnly = (): boolean => {
    return hasAnyRole(VIEWER_ROLES);
  };

  /**
   * Check if user is admin (SUPER_ADMIN or legacy ADMIN)
   */
  const isAdmin = (): boolean => {
    return hasAnyRole(ADMIN_ROLES);
  };

  /**
   * Check if user can manage users
   */
  const canManageUsers = (): boolean => {
    return isAdmin();
  };

  /**
   * Check if user can manage company settings
   */
  const canManageSettings = (): boolean => {
    return isAdmin();
  };

  /**
   * Check if user can close accounting periods
   */
  const canCloseAccountingPeriod = (): boolean => {
    return hasAnyRole(['SUPER_ADMIN', 'FINANCE_MANAGER', 'ADMIN']);
  };

  /**
   * Get human-readable role display name
   */
  const getRoleDisplayName = (role?: UserRole): string => {
    const roleToDisplay = role || user?.role;
    if (!roleToDisplay) return 'Unknown';

    const displayNames: Record<UserRole, string> = {
      'SUPER_ADMIN': 'Super Admin',
      'FINANCE_MANAGER': 'Finance Manager',
      'ACCOUNTANT': 'Accountant',
      'PROJECT_MANAGER': 'Project Manager',
      'STAFF': 'Staff',
      'VIEWER': 'Viewer',
      'ADMIN': 'Admin (Legacy)',
      'USER': 'User (Legacy)',
    };

    return displayNames[roleToDisplay as UserRole] || roleToDisplay;
  };

  /**
   * Get Indonesian role display name
   */
  const getRoleDisplayNameId = (role?: UserRole): string => {
    const roleToDisplay = role || user?.role;
    if (!roleToDisplay) return 'Tidak Diketahui';

    const displayNamesId: Record<UserRole, string> = {
      'SUPER_ADMIN': 'Super Admin',
      'FINANCE_MANAGER': 'Manajer Keuangan',
      'ACCOUNTANT': 'Akuntan',
      'PROJECT_MANAGER': 'Manajer Proyek',
      'STAFF': 'Staff',
      'VIEWER': 'Peninjau',
      'ADMIN': 'Admin (Lama)',
      'USER': 'Pengguna (Lama)',
    };

    return displayNamesId[roleToDisplay as UserRole] || roleToDisplay;
  };

  /**
   * Get role description
   */
  const getRoleDescription = (role?: UserRole): string => {
    const roleToDisplay = role || user?.role;
    if (!roleToDisplay) return '';

    const descriptions: Record<UserRole, string> = {
      'SUPER_ADMIN': 'Full system access - Owner/IT Admin',
      'FINANCE_MANAGER': 'Approve financial transactions and manage accounting',
      'ACCOUNTANT': 'Accounting operations and reports (no approval authority)',
      'PROJECT_MANAGER': 'Manage projects and operations (submit for approval)',
      'STAFF': 'Create drafts and manage own data',
      'VIEWER': 'Read-only access to data',
      'ADMIN': 'Legacy admin role (maps to Super Admin)',
      'USER': 'Legacy user role (maps to Staff)',
    };

    return descriptions[roleToDisplay as UserRole] || '';
  };

  /**
   * Get badge color for role
   */
  const getRoleBadgeColor = (role?: UserRole): string => {
    const roleToDisplay = role || user?.role;
    if (!roleToDisplay) return 'default';

    const colors: Record<UserRole, string> = {
      'SUPER_ADMIN': 'red',
      'FINANCE_MANAGER': 'purple',
      'ACCOUNTANT': 'blue',
      'PROJECT_MANAGER': 'cyan',
      'STAFF': 'green',
      'VIEWER': 'default',
      'ADMIN': 'red',
      'USER': 'green',
    };

    return colors[roleToDisplay as UserRole] || 'default';
  };

  /**
   * Get list of all available roles (for dropdowns)
   */
  const getAllRoles = (): { value: UserRole; label: string; description: string }[] => {
    return [
      {
        value: 'SUPER_ADMIN',
        label: 'Super Admin',
        description: 'Full system access',
      },
      {
        value: 'FINANCE_MANAGER',
        label: 'Finance Manager',
        description: 'Approve financial transactions',
      },
      {
        value: 'ACCOUNTANT',
        label: 'Accountant',
        description: 'Accounting operations, no approvals',
      },
      {
        value: 'PROJECT_MANAGER',
        label: 'Project Manager',
        description: 'Manage projects and operations',
      },
      {
        value: 'STAFF',
        label: 'Staff',
        description: 'Create drafts, basic operations',
      },
      {
        value: 'VIEWER',
        label: 'Viewer',
        description: 'Read-only access',
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
    canApproveFinancial,
    canAccessAccounting,
    canManageOperations,
    canEditContent,
    isReadOnly,
    isAdmin,
    canManageUsers,
    canManageSettings,
    canCloseAccountingPeriod,

    // Utility functions
    getRoleDisplayName,
    getRoleDisplayNameId,
    getRoleDescription,
    getRoleBadgeColor,
    getAllRoles,
  };
};
