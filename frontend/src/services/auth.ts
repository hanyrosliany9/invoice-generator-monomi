import { apiClient } from '../config/api'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', data)
    if (!response?.data?.data) {
      throw new Error('Login failed')
    }
    return response.data.data
  },

  register: async (data: RegisterRequest) => {
    const response = await apiClient.post('/auth/register', data)
    if (!response?.data?.data) {
      throw new Error('Registration failed')
    }
    return response.data.data
  },

  validateToken: async (token: string) => {
    const response = await apiClient.get('/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!response?.data?.data) {
      throw new Error('Token validation failed')
    }
    return response.data.data
  },

  changePassword: async (data: ChangePasswordRequest): Promise<{ message: string }> => {
    const response = await apiClient.put('/auth/change-password', data)
    if (!response?.data?.data) {
      throw new Error('Password change failed')
    }
    return response.data.data
  },
}