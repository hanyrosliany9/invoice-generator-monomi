/**
 * User Role Enum - Matches backend Prisma schema
 *
 * Production Roles:
 * - SUPER_ADMIN: Owner/IT Admin - Full system access
 * - FINANCE_MANAGER: Financial Controller - Approve transactions
 * - ACCOUNTANT: Bookkeeper - Accounting ops, no approvals
 * - PROJECT_MANAGER: Operations - CRUD ops, submit for approval
 * - STAFF: Basic User - Create drafts, own data only
 * - VIEWER: Read-Only - View data only
 *
 * Legacy Roles (backward compatibility):
 * - ADMIN: Maps to SUPER_ADMIN
 * - USER: Maps to STAFF
 */
export type UserRole =
  // New production roles
  | 'SUPER_ADMIN'
  | 'FINANCE_MANAGER'
  | 'ACCOUNTANT'
  | 'PROJECT_MANAGER'
  | 'STAFF'
  | 'VIEWER'
  // Legacy roles (backward compatibility)
  | 'ADMIN'
  | 'USER';

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string

  // Relations - summary counts only
  _count?: {
    quotations: number
    invoices: number
    auditLogs: number
  }

  // User preferences
  preferences?: {
    timezone: string
    language: string
    emailNotifications: boolean
    pushNotifications: boolean
    theme: string
  }
}

export interface CreateUserRequest {
  email: string
  password: string
  name: string
  role?: UserRole
  isActive?: boolean
}

export interface UpdateUserRequest {
  email?: string
  password?: string
  name?: string
  role?: UserRole
  isActive?: boolean
}

export interface UserFilters {
  page?: number
  limit?: number
  search?: string
  role?: string
  isActive?: boolean
}

export interface UserStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  roleDistribution: {
    [key: string]: number
  }
  recentUsers: Array<{
    id: string
    name: string
    email: string
    role: string
    createdAt: string
  }>
}

export interface UserResponse {
  data: User | User[] | UserStats | null
  message: string
  status: 'success' | 'error'
}
