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

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', data)
    return response.data.data
  },

  register: async (data: RegisterRequest) => {
    const response = await apiClient.post('/auth/register', data)
    return response.data.data
  },

  validateToken: async (token: string) => {
    const response = await apiClient.get('/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data.data
  },
}