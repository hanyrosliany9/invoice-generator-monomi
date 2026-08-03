import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'
import { useAuthStore } from '../store/auth'
import i18n from '@/i18n/config'

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
  TIMEOUT: 30000, // 30 seconds for general API calls
}

// Default headers for API requests
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
}

// Create axios instance with interceptors.
// withCredentials: true is required so the browser sends the httpOnly
// accessToken/refreshToken cookies on every request (Hardening 2).
// The Bearer Authorization header is still set by the request interceptor
// below for full backward compatibility.
export const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: DEFAULT_HEADERS,
  withCredentials: true,
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

// Retry/backoff for when the refresh endpoint itself is rate-limited.
// Without this, a 429 on /auth/refresh fails instantly, every queued request
// re-401s, and each one fires its own new refresh -- which is rate-limited
// again, looping until the throttle window resets (incident 2026-08-03: a
// burst of 401/429s with no way out short of a manual reload).
const REFRESH_RETRY_MAX_ATTEMPTS = 3;
const REFRESH_RETRY_BASE_DELAY_MS = 1000;
const REFRESH_RETRY_MAX_DELAY_MS = 10000;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

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
 * Perform token refresh - called only once even with multiple 401s.
 *
 * Hardening 2: The httpOnly refreshToken cookie is sent automatically by the
 * browser (withCredentials: true on the axios instance below).  We still
 * include the stored refreshToken in the request body as a backward-compat
 * fallback for clients that don't have the cookie (e.g. native apps, tests).
 */
const performTokenRefresh = async (): Promise<string> => {
  const { getRefreshToken, updateTokens, logout } = useAuthStore.getState();
  // May be null if refreshToken was stripped from localStorage (new behaviour).
  // That is fine — the httpOnly cookie carries it for browser clients.
  const refreshToken = getRefreshToken();

  let lastError: any;

  for (let attempt = 1; attempt <= REFRESH_RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      // Use plain axios (not apiClient) to avoid interceptor loop.
      // withCredentials ensures the httpOnly refreshToken cookie is sent.
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/auth/refresh`,
        // Include body token only when available (backward compat for non-cookie clients).
        refreshToken ? { refresh_token: refreshToken } : {},
        {
          headers: DEFAULT_HEADERS,
          withCredentials: true,
        },
      );

      // Backend wraps response in ApiResponse { data: {...}, message, status, timestamp }
      const { access_token, refresh_token: new_refresh_token, expires_in } = response.data.data;

      // Update tokens in store atomically
      updateTokens(access_token, new_refresh_token, expires_in);

      console.log('[API] Token refreshed successfully, expires:', new Date(Date.now() + expires_in * 1000).toISOString());
      return access_token;
    } catch (error: any) {
      lastError = error;

      // Rate-limited: back off and retry instead of failing instantly, so a
      // burst of requests expiring at once doesn't cascade into a retry loop.
      if (error.response?.status === 429 && attempt < REFRESH_RETRY_MAX_ATTEMPTS) {
        const retryAfterHeader = error.response?.headers?.['retry-after'];
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : NaN;
        const backoffMs = Number.isFinite(retryAfterMs) && retryAfterMs > 0
          ? Math.min(retryAfterMs, REFRESH_RETRY_MAX_DELAY_MS)
          : Math.min(REFRESH_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), REFRESH_RETRY_MAX_DELAY_MS);
        console.warn(`[API] Token refresh rate-limited (429), retrying in ${backoffMs}ms (attempt ${attempt}/${REFRESH_RETRY_MAX_ATTEMPTS})`);
        await sleep(backoffMs);
        continue;
      }

      break;
    }
  }

  console.error('[API] Token refresh failed:', lastError?.response?.status);

  // Only logout if refresh token is truly invalid (401)
  if (lastError.response?.status === 401 && !isLoggingOut) {
    isLoggingOut = true;
    console.warn('[API] Refresh token invalid, logging out');
    logout();
    window.location.replace('/login?session_expired=true');
    // Reset after a delay to allow page navigation
    setTimeout(() => { isLoggingOut = false; }, 1000);
  } else if (lastError.response?.status === 429) {
    // Retries exhausted — tell the user instead of letting every widget on
    // the page fail silently with no explanation.
    toast.error(i18n.t('contexts.apiConfig.refreshRateLimited', 'Server is busy, please reload the page in a moment.'));
  }

  throw lastError;
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

    // Handle 403 Forbidden — show toast and reject without retry or redirect
    if (error.response?.status === 403) {
      toast.error(i18n.t('contexts.apiConfig.accessDenied', 'Access denied — you do not have permission.'));
      return Promise.reject(error);
    }

    // Skip handling for non-401 errors or missing config
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Skip token refresh for auth endpoints (login, register, refresh)
    // These endpoints don't need token refresh - they ARE the auth flow
    const authEndpoints = ['/auth/login', '/auth/register', '/auth/refresh'];
    if (authEndpoints.some(endpoint => originalRequest.url?.includes(endpoint))) {
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
