export interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'USER' | 'VIEWER'
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
  role?: 'ADMIN' | 'USER' | 'VIEWER'
  isActive?: boolean
}

export interface UpdateUserRequest {
  email?: string
  password?: string
  name?: string
  role?: 'ADMIN' | 'USER' | 'VIEWER'
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
