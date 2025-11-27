import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
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

// ============================================================================
// Token Refresh Queue Pattern (2025 Best Practice)
// Based on: https://github.com/Flyrell/axios-auth-refresh
// and https://medium.com/@sina.alizadeh120/repeating-failed-requests-after-token-refresh-in-axios-interceptors-for-react-js-apps-50feb54ddcbc
// ============================================================================

// Queue to hold failed requests while token is being refreshed
type FailedRequest = {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
};
let failedRequestsQueue: FailedRequest[] = [];

// Flag to track if token refresh is in progress
let isRefreshing = false;

// Flag to prevent multiple logouts
let isLoggingOut = false;

/**
 * Process all queued requests with the new token
 */
const processQueue = (error: Error | null, token: string | null = null) => {
  failedRequestsQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedRequestsQueue = [];
};

/**
 * Perform token refresh - called only once even with multiple 401s
 */
const performTokenRefresh = async (): Promise<string> => {
  const { getRefreshToken, updateTokens, logout } = useAuthStore.getState();
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    // Use axios directly (not apiClient) to avoid interceptor loop
    // This is the recommended pattern per axios-auth-refresh docs
    const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    }, {
      headers: DEFAULT_HEADERS,
    });

    const { access_token, refresh_token: new_refresh_token, expires_in } = response.data;

    // Update tokens in store atomically
    updateTokens(access_token, new_refresh_token, expires_in);

    console.log('[API] Token refreshed successfully, expires:', new Date(Date.now() + expires_in * 1000).toISOString());
    return access_token;
  } catch (error: any) {
    console.error('[API] Token refresh failed:', error?.response?.status);

    // Only logout if refresh token is truly invalid (401)
    if (error.response?.status === 401 && !isLoggingOut) {
      isLoggingOut = true;
      console.warn('[API] Refresh token invalid, logging out');
      logout();
      window.location.replace('/login?session_expired=true');
      // Reset after a delay to allow page navigation
      setTimeout(() => { isLoggingOut = false; }, 1000);
    }

    throw error;
  }
};

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  config => {
    // Get access token from tokenData - always get fresh from store
    const tokenData = useAuthStore.getState().tokenData
    if (tokenData?.accessToken) {
      config.headers.Authorization = `Bearer ${tokenData.accessToken}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors with token refresh
// Implements the "subscriber queue" pattern for handling concurrent 401s
apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Skip handling for non-401 errors or missing config
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Skip if this is already a retry (prevent infinite loops)
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // If we're already refreshing, queue this request
    if (isRefreshing) {
      console.log('[API] Token refresh in progress, queuing request:', originalRequest.url);
      return new Promise<string>((resolve, reject) => {
        failedRequestsQueue.push({ resolve, reject });
      })
        .then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch(err => {
          return Promise.reject(err);
        });
    }

    // Mark as retry and start refreshing
    originalRequest._retry = true;
    isRefreshing = true;

    console.log('[API] 401 received, starting token refresh for:', originalRequest.url);

    try {
      const newToken = await performTokenRefresh();

      // Process all queued requests with new token
      processQueue(null, newToken);

      // Retry original request with new token
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);

    } catch (refreshError: any) {
      // Process all queued requests with error
      processQueue(refreshError, null);

      // Network errors should NOT cause logout - user might be temporarily offline
      if (!refreshError.response) {
        console.error('[API] Refresh failed with network error, user may retry:', refreshError.message);
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
)

// ============================================================================
// Export helper for token refresh service to use
// ============================================================================
export const refreshAuthToken = performTokenRefresh;
