/**
 * Media URL builder for read-only content-planner views.
 *
 * `shareRef` identifies where the read-only data comes from:
 *   - a plain public share token  -> /content-calendar/public/:token/media
 *   - `portal:<clientId>`         -> /portal/clients/:clientId/content/media
 *     (client portal; authenticated by the httpOnly portal_session cookie)
 */
export const PORTAL_SHARE_PREFIX = 'portal:';

export function portalShareRef(clientId: string): string {
  return `${PORTAL_SHARE_PREFIX}${clientId}`;
}

export function contentShareMediaUrl(shareRef: string, key: string): string {
  const k = encodeURIComponent(key);
  if (shareRef.startsWith(PORTAL_SHARE_PREFIX)) {
    const clientId = encodeURIComponent(shareRef.slice(PORTAL_SHARE_PREFIX.length));
    return `/api/v1/portal/clients/${clientId}/content/media?key=${k}`;
  }
  return `/api/v1/content-calendar/public/${shareRef}/media?key=${k}`;
}
