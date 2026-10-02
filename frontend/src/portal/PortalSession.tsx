import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { httpStatus, onPortalUnauthorized, portalApi, type PortalSession } from './portalApi';

export const PORTAL_ME_KEY = ['portal-me'] as const;
const LAST_CLIENT_KEY = 'monomi.portal.lastClient';

export function readLastClient(): string | null {
  try {
    return localStorage.getItem(LAST_CLIENT_KEY);
  } catch {
    return null;
  }
}

export function rememberClient(clientId: string): void {
  try {
    localStorage.setItem(LAST_CLIENT_KEY, clientId);
  } catch {
    /* storage unavailable (private mode) — ignore */
  }
}

interface PortalSessionContextValue {
  /** undefined while loading, null when logged out. */
  session: PortalSession | null | undefined;
  isLoading: boolean;
  /** Set when the session query failed for a reason other than 401. */
  loadError: boolean;
  refetch: () => void;
  setSession: (s: PortalSession) => void; // eslint-disable-line no-unused-vars
  logout: () => Promise<void>;
}

const Ctx = createContext<PortalSessionContextValue | null>(null);

export function PortalSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const query = useQuery<PortalSession | null>({
    queryKey: PORTAL_ME_KEY,
    queryFn: async () => {
      try {
        return await portalApi.me();
      } catch (e) {
        if (httpStatus(e) === 401) return null; // not logged in
        throw e;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Any 401 from a portal call means the session ended: drop everything
  // cached for the previous contact and go back to login with a message.
  useEffect(
    () =>
      onPortalUnauthorized(() => {
        queryClient.clear();
        queryClient.setQueryData(PORTAL_ME_KEY, null);
        navigate('/login', { replace: true, state: { expired: true } });
      }),
    [queryClient, navigate],
  );

  const setSession = useCallback(
    (s: PortalSession) => {
      queryClient.setQueryData(PORTAL_ME_KEY, s);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await portalApi.logout();
    } catch {
      /* cookie may already be gone — still leave */
    }
    queryClient.clear();
    queryClient.setQueryData(PORTAL_ME_KEY, null);
    navigate('/login', { replace: true });
  }, [queryClient, navigate]);

  const value = useMemo<PortalSessionContextValue>(
    () => ({
      session: query.isLoading ? undefined : (query.data ?? null),
      isLoading: query.isLoading,
      loadError: query.isError,
      refetch: () => void query.refetch(),
      setSession,
      logout,
    }),
    [query, setSession, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePortalSession(): PortalSessionContextValue {
  const v = useContext(Ctx);
  if (v === null) throw new Error('usePortalSession must be used inside PortalSessionProvider');
  return v;
}
