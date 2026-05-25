import { Navigate, useLocation } from 'react-router-dom';

/**
 * Exact-match migrated paths. Add when a list/static page graduates to v2.
 */
const MIGRATED_EXACT = new Set<string>([
  '/v2',
  '/v2/login',
  '/v2/style-guide',
  '/v2/invoices',
  '/v2/quotations',
  '/v2/clients',
]);

/**
 * Parameterized routes (e.g. /v2/invoices/:id). Each regex matches one shape.
 * Sub-pages like /v2/invoices/new are explicitly NOT yet migrated — keep them
 * out of the patterns OR list them in NOT_YET_MIGRATED so they fall back to
 * the classic create/edit forms.
 */
const MIGRATED_PATTERNS: ReadonlyArray<RegExp> = [
  /^\/v2\/invoices\/[^/]+$/,
  /^\/v2\/quotations\/[^/]+$/,
  /^\/v2\/clients\/[^/]+$/,
];

/**
 * Paths that LOOK migrated by the patterns above but aren't actually — usually
 * /new (create form) or other sub-pages that still need a classic redirect.
 */
const NOT_YET_MIGRATED = new Set<string>([
  '/v2/invoices/new',
  '/v2/quotations/new',
  '/v2/clients/new',
]);

export function isV2Migrated(pathname: string): boolean {
  if (NOT_YET_MIGRATED.has(pathname)) return false;
  if (MIGRATED_EXACT.has(pathname)) return true;
  return MIGRATED_PATTERNS.some((rx) => rx.test(pathname));
}

/**
 * Back-compat export so anything still reading the old constant gets the
 * static exact-match list (used by UiVersionToggle / tests / etc.).
 */
export const V2_MIGRATED_PATHS: ReadonlyArray<string> = Array.from(MIGRATED_EXACT);

/**
 * Wrap each v2 Route element with this. If the route isn't migrated, redirect
 * to the classic version (strip /v2 prefix) so a user with v2 mode enabled
 * lands on the working classic page instead of a 404.
 */
export function V2Guard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  if (!isV2Migrated(pathname)) {
    const classic = pathname.replace(/^\/v2/, '') || '/';
    return <Navigate to={classic} replace />;
  }
  return <>{children}</>;
}
