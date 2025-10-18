import { api } from '../config/api'
import {
  CreateUserRequest,
  UpdateUserRequest,
  User,
  UserFilters,
  UserResponse,
  UserStats,
} from '../types/user'

export const usersService = {
  // Get all users with optional filters
  async getUsers(filters?: UserFilters): Promise<User[]> {
    try {
      const params = new URLSearchParams()

      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.search) params.append('search', filters.search)
      if (filters?.role) params.append('role', filters.role)
      if (filters?.isActive !== undefined)
        params.append('isActive', filters.isActive.toString())

      const response = await api.get<UserResponse>(`/users?${params.toString()}`)

      if (response.data.status === 'error') {
        throw new Error(response.data.message)
      }

      // Handle nested response structure
      let data = response.data.data

      // Check if data is wrapped in another response object
      if (data && typeof data === 'object' && 'data' in data && 'status' in data) {
        data = (data as any).data
      }

      // Ensure we always return an array
      if (Array.isArray(data)) {
        return data as User[]
      }

      console.error('API returned non-array data:', data)
      return []
    } catch (error) {
      console.error('Failed to fetch users:', error)
      throw error
    }
  },

  // Get user by ID
  async getUserById(id: string): Promise<User> {
    const response = await api.get<UserResponse>(`/users/${id}`)

    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }

    return response.data.data as User
  },

  // Create new user
  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await api.post<UserResponse>('/users', data)

    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }

    return response.data.data as User
  },

  // Update user
  async updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    const response = await api.patch<UserResponse>(`/users/${id}`, data)

    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }

    return response.data.data as User
  },

  // Activate user
  async activateUser(id: string): Promise<User> {
    const response = await api.patch<UserResponse>(`/users/${id}/activate`)

    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }

    return response.data.data as User
  },

  // Deactivate user
  async deactivateUser(id: string): Promise<User> {
    const response = await api.patch<UserResponse>(`/users/${id}/deactivate`)

    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }

    return response.data.data as User
  },

  // Delete user (soft delete)
  async deleteUser(id: string): Promise<void> {
    const response = await api.delete<UserResponse>(`/users/${id}`)

    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
  },

  // Get user statistics
  async getUserStats(): Promise<UserStats> {
    const response = await api.get<UserResponse>('/users/stats')

    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }

    return response.data.data as UserStats
  },

  // Helper functions
  getRoleColor: (role: string): string => {
    switch (role) {
      case 'ADMIN':
        return 'text-red-600 bg-red-50'
      case 'USER':
        return 'text-blue-600 bg-blue-50'
      case 'VIEWER':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  },

  getRoleLabel: (role: string): string => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator'
      case 'USER':
        return 'User'
      case 'VIEWER':
        return 'Viewer'
      default:
        return role
    }
  },

  getStatusColor: (isActive: boolean): string => {
    return isActive ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50'
  },

  getStatusLabel: (isActive: boolean): string => {
    return isActive ? 'Active' : 'Inactive'
  },

  // Filter users by role
  filterUsersByRole: (users: User[], role: string): User[] => {
    return users.filter(user => user.role === role)
  },

  // Filter users by status
  filterUsersByStatus: (users: User[], isActive: boolean): User[] => {
    return users.filter(user => user.isActive === isActive)
  },

  // Search users by name or email
  searchUsers: (users: User[], query: string): User[] => {
    const lowerQuery = query.toLowerCase()
    return users.filter(
      user =>
        user.name.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery)
    )
  },

  // Sort users by different criteria
  sortUsers: (
    users: User[],
    criteria: 'name' | 'email' | 'role' | 'createdAt',
    order: 'asc' | 'desc' = 'asc'
  ): User[] => {
    return [...users].sort((a, b) => {
      let aValue: any = a[criteria]
      let bValue: any = b[criteria]

      if (criteria === 'createdAt') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (order === 'desc') {
        return bValue > aValue ? 1 : -1
      }
      return aValue > bValue ? 1 : -1
    })
  },

  // Get user activity summary
  getUserActivity: (user: User): string => {
    const count = user._count
    if (!count) return 'No activity'

    const total = count.quotations + count.invoices + count.auditLogs
    return `${total} total activities`
  },

  // Validate password strength
  validatePassword: (
    password: string
  ): { isValid: boolean; message?: string } => {
    if (password.length < 8) {
      return {
        isValid: false,
        message: 'Password must be at least 8 characters long',
      }
    }

    if (!/[A-Z]/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one uppercase letter',
      }
    }

    if (!/[a-z]/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one lowercase letter',
      }
    }

    if (!/[0-9]/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one number',
      }
    }

    return { isValid: true }
  },

  // Validate email format
  validateEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },
}

// Export alias for consistency
export const userService = usersService
