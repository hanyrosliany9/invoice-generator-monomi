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
  '/v2/projects',
  '/v2/expenses',
  '/v2/vendors',
  '/v2/users',
  '/v2/settings',
  '/v2/assets',
  '/v2/reports',
  '/v2/reports/social-media',
  '/v2/reports/builder',
  '/v2/calendar',
  '/v2/calendar/content',
]);

/**
 * Parameterized routes (e.g. /v2/invoices/:id). Each regex matches one shape.
 * Sub-pages like /v2/invoices/new are explicitly NOT yet migrated — keep them
 * out of the patterns OR list them in NOT_YET_MIGRATED so they fall back to
 * the classic create/edit forms.
 */
const MIGRATED_PATTERNS: ReadonlyArray<RegExp> = [
  // detail
  /^\/v2\/invoices\/[^/]+$/,
  /^\/v2\/quotations\/[^/]+$/,
  /^\/v2\/clients\/[^/]+$/,
  /^\/v2\/projects\/[^/]+$/,
  /^\/v2\/expenses\/[^/]+$/,
  /^\/v2\/vendors\/[^/]+$/,
  /^\/v2\/assets\/[^/]+$/,
  /^\/v2\/reports\/[^/]+$/,
  // edit
  /^\/v2\/invoices\/[^/]+\/edit$/,
  /^\/v2\/quotations\/[^/]+\/edit$/,
  /^\/v2\/clients\/[^/]+\/edit$/,
  /^\/v2\/projects\/[^/]+\/edit$/,
  /^\/v2\/expenses\/[^/]+\/edit$/,
  /^\/v2\/vendors\/[^/]+\/edit$/,
  /^\/v2\/users\/[^/]+\/edit$/,
  /^\/v2\/assets\/[^/]+\/edit$/,
  /^\/v2\/reports\/[^/]+\/edit$/,
];

/**
 * Paths that LOOK migrated by the patterns above but aren't actually.
 * Empty for now — /new and /:id/edit are all wired in Wave 3.
 */
const NOT_YET_MIGRATED = new Set<string>([]);

const MIGRATED_NEW_PATHS = new Set<string>([
  '/v2/invoices/new',
  '/v2/quotations/new',
  '/v2/clients/new',
  '/v2/projects/new',
  '/v2/expenses/new',
  '/v2/expenses/categories',
  '/v2/vendors/new',
  '/v2/users/new',
  '/v2/assets/new',
]);

export function isV2Migrated(pathname: string): boolean {
  if (NOT_YET_MIGRATED.has(pathname)) return false;
  if (MIGRATED_EXACT.has(pathname)) return true;
  if (MIGRATED_NEW_PATHS.has(pathname)) return true;
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
