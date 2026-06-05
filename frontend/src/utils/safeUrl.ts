/**
 * safeUrl — URL-scheme allow-list guard against XSS via javascript: / data:text/html URLs.
 *
 * Returns the original URL string if it begins with an allowed scheme (case-insensitive),
 * otherwise returns '' (empty string), which is safe to use as an img src or anchor href.
 *
 * Allowed schemes:
 *   - http://   — plain HTTP remote resource
 *   - https://  — TLS-secured remote resource
 *   - data:image/ — inline base64 image (safe; does NOT allow data:text/html, data:text/javascript, etc.)
 */
export function safeUrl(url?: string | null): string {
  if (!url) return '';
  const lower = url.trimStart().toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('data:image/')
  ) {
    return url;
  }
  return '';
}

/**
 * safeHref — like safeUrl but for anchor href values.
 * Does NOT allow data: URIs (only http/https).
 */
export function safeHref(url?: string | null): string {
  if (!url) return '';
  const lower = url.trimStart().toLowerCase();
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return url;
  }
  return '';
}
