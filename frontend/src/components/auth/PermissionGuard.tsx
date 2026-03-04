/**
 * PermissionGuard Component
 *
 * Conditionally renders children based on user permissions.
 * Hide/show UI elements based on role-based access control.
 *
 * Usage Examples:
 *
 * // Hide button from viewers
 * <PermissionGuard requireEdit>
 *   <Button>Create Quotation</Button>
 * </PermissionGuard>
 *
 * // Show only to financial approvers
 * <PermissionGuard requireFinancialApprover>
 *   <Button>Approve Invoice</Button>
 * </PermissionGuard>
 *
 * // Show only to specific roles
 * <PermissionGuard roles={['SUPER_ADMIN', 'FINANCE_MANAGER']}>
 *   <AdminPanel />
 * </PermissionGuard>
 *
 * // Show fallback if no permission
 * <PermissionGuard requireAdmin fallback={<div>Access Denied</div>}>
 *   <Settings />
 * </PermissionGuard>
 */

import { ReactNode } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import type { UserRole } from '../../types/user';

interface PermissionGuardProps {
  children: ReactNode;
  fallback?: ReactNode;

  // Specific permission checks
  requireFinancialApprover?: boolean;
  requireAccountingAccess?: boolean;
  requireOperationsManagement?: boolean;
  requireEdit?: boolean;
  requireAdmin?: boolean;
  requireUserManagement?: boolean;
  requireSettingsManagement?: boolean;

  // Role-based checks
  roles?: UserRole[];

  // Inverse logic (hide instead of show)
  hideFromViewers?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  fallback = null,
  requireFinancialApprover = false,
  requireAccountingAccess = false,
  requireOperationsManagement = false,
  requireEdit = false,
  requireAdmin = false,
  requireUserManagement = false,
  requireSettingsManagement = false,
  roles = [],
  hideFromViewers = false,
}) => {
  const {
    isAdmin,
    canManageUsers,
    canManageSettings,
    hasAnyRole,
  } = usePermissions();

  // Check specific requirements
  // requireFinancialApprover, requireAccountingAccess, requireOperationsManagement
  // → simplified to requireAdmin (SUPER_ADMIN + ADMIN handle all content)
  if (requireFinancialApprover && !isAdmin()) {
    return <>{fallback}</>;
  }

  if (requireAccountingAccess && !isAdmin()) {
    return <>{fallback}</>;
  }

  if (requireOperationsManagement && !isAdmin()) {
    return <>{fallback}</>;
  }

  if (requireEdit && !isAdmin()) {
    return <>{fallback}</>;
  }

  if (requireAdmin && !isAdmin()) {
    return <>{fallback}</>;
  }

  if (requireUserManagement && !canManageUsers()) {
    return <>{fallback}</>;
  }

  if (requireSettingsManagement && !canManageSettings()) {
    return <>{fallback}</>;
  }

  // Check role list
  if (roles.length > 0 && !hasAnyRole(roles)) {
    return <>{fallback}</>;
  }

  // hideFromViewers: VIDEOGRAPHER is effectively read-only for content
  if (hideFromViewers && !isAdmin()) {
    return <>{fallback}</>;
  }

  // All checks passed, render children
  return <>{children}</>;
};
