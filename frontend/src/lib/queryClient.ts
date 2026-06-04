import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton QueryClient shared across the application.
 *
 * Exporting from a dedicated module (instead of creating it inline in main.tsx)
 * allows non-React code (e.g. the auth store) to call queryClient.clear() on
 * logout without creating circular imports.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
