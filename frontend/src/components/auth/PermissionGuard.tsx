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
    canApproveFinancial,
    canAccessAccounting,
    canManageOperations,
    canEditContent,
    isAdmin,
    canManageUsers,
    canManageSettings,
    isReadOnly,
    hasAnyRole,
  } = usePermissions();

  // Check specific requirements
  if (requireFinancialApprover && !canApproveFinancial()) {
    return <>{fallback}</>;
  }

  if (requireAccountingAccess && !canAccessAccounting()) {
    return <>{fallback}</>;
  }

  if (requireOperationsManagement && !canManageOperations()) {
    return <>{fallback}</>;
  }

  if (requireEdit && !canEditContent()) {
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

  // Hide from viewers
  if (hideFromViewers && isReadOnly()) {
    return <>{fallback}</>;
  }

  // All checks passed, render children
  return <>{children}</>;
};
