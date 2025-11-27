import { useMediaTokenStore } from '../stores/mediaTokenStore';

interface UseMediaTokenReturn {
  mediaToken: string | null;
  isLoading: boolean;
  error: Error | null;
  refreshToken: () => Promise<void>;
}

/**
 * Hook to manage Cloudflare Workers media access token
 *
 * This is now a lightweight wrapper around the global Zustand store.
 * The store ensures only ONE token fetch happens globally, preventing
 * rate limit errors when multiple components use this hook.
 *
 * Features:
 * - Global singleton: All components share the same token
 * - Request deduplication: No duplicate API calls
 * - Auto-refresh: Token refreshes at 90% of lifetime (21.6 hours)
 * - localStorage persistence: Token survives page reloads
 *
 * @example
 * ```tsx
 * const { mediaToken, isLoading, error } = useMediaToken();
 *
 * if (mediaToken) {
 *   const url = buildMediaUrl(file.key, mediaToken);
 * }
 * ```
 */
export function useMediaToken(): UseMediaTokenReturn {
  const { token, isLoading, error, fetchToken } = useMediaTokenStore();

  return {
    mediaToken: token,
    isLoading,
    error,
    refreshToken: fetchToken,
  };
}
