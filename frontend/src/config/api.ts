import axios from 'axios'
import { useAuthStore } from '../store/auth'

// API Configuration
export const API_CONFIG = {
  BASE_URL: '/api/v1',
  TIMEOUT: 30000, // 30 seconds
}

// Default headers for API requests
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
}

// Create axios instance with interceptors
export const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: DEFAULT_HEADERS,
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from Zustand auth store
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state using Zustand store
      useAuthStore.getState().logout()
      // Redirect to login (you may need to handle this based on your routing)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)