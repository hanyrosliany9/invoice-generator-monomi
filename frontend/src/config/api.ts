import axios from 'axios'
import { useAuthStore } from '../store/auth'

// API Configuration
// Dynamically determine backend URL based on environment
const getBaseURL = () => {
  // If VITE_API_URL is set and is absolute, use it
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;

  if (envUrl && envUrl.startsWith('http')) {
    return envUrl + '/v1';
  }

  // If relative URL in production, use it (assumes nginx proxy)
  if (envUrl && envUrl.startsWith('/')) {
    return envUrl + '/v1';
  }

  // Development: Use relative URL to leverage Vite proxy (vite.config.ts proxies /api/* to port 5000)
  // This prevents absolute URLs from bypassing Vite proxy and causing CORS/routing issues
  return '/api/v1';
};

export const API_CONFIG = {
  BASE_URL: getBaseURL(),
  TIMEOUT: 10000, // 10 seconds (reduced for better UX on failed uploads)
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

// Export alias for backward compatibility
export const api = apiClient

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  config => {
    // Get token from Zustand auth store
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Clear auth state using Zustand store
      useAuthStore.getState().logout()
      // Redirect to login (you may need to handle this based on your routing)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
