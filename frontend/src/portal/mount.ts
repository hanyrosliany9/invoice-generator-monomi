/**
 * Decides whether this page load is the client portal.
 *
 *  - Portal host (VITE_PORTAL_HOST, default portal.monomiagency.com): the
 *    portal owns "/" and the staff app is never loaded.
 *  - Any other host: the same portal is reachable under "/portal/*" (dev and
 *    fallback). Everything else is the staff app.
 *
 * Kept dependency-free so main.tsx can call it before loading either app.
 */
const envHost = (import.meta.env.VITE_PORTAL_HOST as string | undefined)?.trim().toLowerCase();
export const PORTAL_HOST: string = envHost !== undefined && envHost !== '' ? envHost : 'portal.monomiagency.com';

export interface PortalMount {
  /** Router basename: '' on the portal host, '/portal' as a path fallback. */
  basename: string;
}

export function getPortalMount(loc: Pick<Location, 'hostname' | 'pathname'> = window.location): PortalMount | null {
  if (loc.hostname.toLowerCase() === PORTAL_HOST) return { basename: '' };
  if (loc.pathname === '/portal' || loc.pathname.startsWith('/portal/')) return { basename: '/portal' };
  return null;
}
