import { create } from 'zustand';
import { apiClient } from '../config/api';

interface MediaTokenData {
  token: string;
  expiresIn: number;
  expiresAt: string;
}

interface MediaTokenStore {
  token: string | null;
  isLoading: boolean;
  error: Error | null;
  isFetching: boolean; // Internal flag to prevent duplicate requests
  fetchToken: () => Promise<void>;
  clearToken: () => void;
}

/**
 * Global Media Token Store (Zustand)
 *
 * Manages Cloudflare Workers media access token globally across the entire app.
 * Ensures only ONE token fetch happens at a time, preventing rate limit errors.
 *
 * Features:
 * - Singleton pattern: All components share the same token
 * - Request deduplication: Multiple calls to fetchToken() trigger only ONE API request
 * - localStorage persistence: Token survives page reloads
 * - Auto-refresh: Token refreshes at 90% of lifetime (21.6 hours)
 * - Error recovery: Retries after 5 minutes on failure
 */
export const useMediaTokenStore = create<MediaTokenStore>((set, get) => {
  let refreshTimeout: NodeJS.Timeout | null = null;
  let retryTimeout: NodeJS.Timeout | null = null;

  // Initialize token from localStorage
  const initializeToken = () => {
    const stored = localStorage.getItem('mediaToken');
    const storedExpiry = localStorage.getItem('mediaTokenExpiry');

    if (stored && storedExpiry) {
      const expiry = new Date(storedExpiry).getTime();
      const now = Date.now();

      if (expiry > now) {
        // Token is still valid
        set({ token: stored, isLoading: false, error: null });

        // Schedule auto-refresh at 90% of remaining lifetime
        const lifetime = expiry - now;
        const refreshTime = lifetime * 0.9;

        refreshTimeout = setTimeout(() => {
          get().fetchToken();
        }, refreshTime);

        return stored;
      } else {
        // Token expired, clear it
        localStorage.removeItem('mediaToken');
        localStorage.removeItem('mediaTokenExpiry');
      }
    }

    return null;
  };

  const token = initializeToken();

  return {
    token,
    isLoading: !token, // If no token, we're loading
    error: null,
    isFetching: false,

    fetchToken: async () => {
      const state = get();

      // CRITICAL: Prevent duplicate requests
      // If already fetching, return immediately (request deduplication)
      if (state.isFetching) {
        console.log('[MediaToken] Already fetching, skipping duplicate request');
        return;
      }

      // If token exists and is valid, no need to fetch
      const storedExpiry = localStorage.getItem('mediaTokenExpiry');
      if (state.token && storedExpiry) {
        const expiry = new Date(storedExpiry).getTime();
        const now = Date.now();
        if (expiry > now) {
          console.log('[MediaToken] Token still valid, skipping fetch');
          return;
        }
      }

      // Clear any existing timeouts
      if (refreshTimeout) clearTimeout(refreshTimeout);
      if (retryTimeout) clearTimeout(retryTimeout);

      set({ isLoading: true, error: null, isFetching: true });

      try {
        console.log('[MediaToken] Fetching new token...');
        const response = await apiClient.post<{ data: { success: boolean; data: MediaTokenData } }>('/media/access-token');

        // Backend returns: { data: { success: true, data: { token, expiresIn, expiresAt } } }
        const responseData = response.data?.data?.data || response.data?.data;

        if (responseData && responseData.token && responseData.expiresAt) {
          const { token, expiresAt } = responseData;

          // Store token and expiry
          localStorage.setItem('mediaToken', token);
          localStorage.setItem('mediaTokenExpiry', expiresAt);

          set({ token, isLoading: false, error: null, isFetching: false });

          console.log('[MediaToken] Token fetched successfully, expires:', expiresAt);

          // Schedule auto-refresh at 90% of token lifetime (21.6 hours)
          const expiryTime = new Date(expiresAt).getTime();
          const now = Date.now();
          const lifetime = expiryTime - now;
          const refreshTime = lifetime * 0.9;

          refreshTimeout = setTimeout(() => {
            get().fetchToken();
          }, refreshTime);

          console.log(`[MediaToken] Auto-refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes`);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch media token');
        set({ error, isLoading: false, isFetching: false });
        console.error('[MediaToken] Failed to fetch token:', error);

        // Retry after 5 minutes on failure
        retryTimeout = setTimeout(() => {
          get().fetchToken();
        }, 5 * 60 * 1000);

        console.log('[MediaToken] Retry scheduled in 5 minutes');
      }
    },

    clearToken: () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      if (retryTimeout) clearTimeout(retryTimeout);

      localStorage.removeItem('mediaToken');
      localStorage.removeItem('mediaTokenExpiry');

      set({ token: null, isLoading: false, error: null, isFetching: false });

      console.log('[MediaToken] Token cleared');
    },
  };
});

// NOTE: Auto-initialization removed to prevent 401 errors on public pages.
// Token fetch is now triggered auth-aware from App.tsx after login.
// Public pages use their own tokens from URL parameters.
