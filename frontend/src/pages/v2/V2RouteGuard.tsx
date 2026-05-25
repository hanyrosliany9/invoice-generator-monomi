import { Navigate, useLocation } from 'react-router-dom';

/**
 * v2 paths that HAVE been migrated. Update this list when a new page graduates.
 * Format: '/v2/path' (must include the /v2 prefix).
 */
export const V2_MIGRATED_PATHS: ReadonlyArray<string> = [
  '/v2',
  '/v2/login',
  '/v2/style-guide',
  '/v2/invoices',
  '/v2/quotations',
  '/v2/clients',
];

/**
 * Wrap each v2 Route element with this. If the route isn't in V2_MIGRATED_PATHS,
 * we redirect to the classic version (strip /v2 prefix). This way, a user who
 * has v2 mode enabled but clicks a not-yet-migrated link lands on the working
 * classic page instead of a 404.
 */
export function V2Guard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  if (!V2_MIGRATED_PATHS.includes(pathname)) {
    const classic = pathname.replace(/^\/v2/, '') || '/';
    return <Navigate to={classic} replace />;
  }
  return <>{children}</>;
}
