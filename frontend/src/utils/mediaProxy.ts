/**
 * Media Proxy Utility
 *
 * Converts direct R2 URLs to Cloudflare Worker URLs for authenticated media delivery
 * with CDN caching and global edge performance.
 */

/**
 * Extract the R2 key from a full R2 URL or backend proxy URL
 * @param url - Full R2 URL or backend proxy URL
 * @returns R2 key (e.g., content/2025-11-11/abc-file.png)
 */
export function extractR2Key(url: string): string | null {
  try {
    // Handle backend proxy URLs: /api/v1/media/proxy/content/2025-11-11/file.jpg
    if (url.startsWith('/api/v1/media/proxy/')) {
      return url.replace('/api/v1/media/proxy/', '');
    }

    // Handle full URLs: https://account-id.r2.cloudflarestorage.com/content/...
    const urlObj = new URL(url);
    // Remove leading slash from pathname
    return urlObj.pathname.substring(1);
  } catch (error) {
    // If URL parsing fails, it might be a relative path already
    if (url.startsWith('/')) {
      // Try to extract key from relative path
      const match = url.match(/\/api\/v1\/media\/proxy\/(.+)/);
      if (match) {
        return match[1];
      }
    }
    console.error('Failed to extract R2 key from URL:', url, error);
    return null;
  }
}

/**
 * Convert R2 URL to Cloudflare Worker URL with media token
 * @param url - Direct R2 URL, backend proxy URL, or already converted URL
 * @param mediaToken - 24h media access token from useMediaToken hook
 * @returns Worker URL with authentication token
 */
export function getWorkerUrl(url: string, mediaToken: string): string {
  // If it's already a worker URL, return as-is
  if (url.includes('media.monomiagency.com/view/')) {
    return url;
  }

  // If it's a blob URL (local preview), return as-is
  if (url.startsWith('blob:')) {
    return url;
  }

  // If it's a data URL, return as-is
  if (url.startsWith('data:')) {
    return url;
  }

  // Handle backend proxy URLs: /api/v1/media/proxy/content/...
  if (url.startsWith('/api/v1/media/proxy/')) {
    const key = url.replace('/api/v1/media/proxy/', '');
    return `https://media.monomiagency.com/view/${mediaToken}/${key}`;
  }

  // Extract R2 key from full URL
  const key = extractR2Key(url);
  if (!key) {
    // If extraction fails, return original URL
    console.warn('Could not extract R2 key, returning original URL:', url);
    return url;
  }

  // Construct worker URL with token
  return `https://media.monomiagency.com/view/${mediaToken}/${key}`;
}

/**
 * Convert R2 URL to proxy URL (worker URL with token, or legacy backend proxy)
 * @param url - Direct R2 URL or already proxied URL
 * @param mediaToken - Optional media access token (if provided, uses worker URL)
 * @returns Worker URL with token, or legacy proxy URL for backward compatibility
 */
export function getProxyUrl(url: string, mediaToken?: string | null): string {
  // If media token is provided, use new worker URL
  if (mediaToken) {
    return getWorkerUrl(url, mediaToken);
  }

  // Fallback to legacy backend proxy (for backward compatibility)
  // If it's already a proxy URL, return as-is
  if (url.includes('/api/v1/media/proxy/')) {
    return url;
  }

  // If it's a blob URL (local preview), return as-is
  if (url.startsWith('blob:')) {
    return url;
  }

  // If it's a data URL, return as-is
  if (url.startsWith('data:')) {
    return url;
  }

  // Extract R2 key from URL
  const key = extractR2Key(url);
  if (!key) {
    return url;
  }

  // Construct legacy proxy URL
  return `/api/v1/media/proxy/${key}`;
}

/**
 * Convert multiple R2 URLs to worker URLs
 * @param urls - Array of R2 URLs
 * @param mediaToken - Media access token
 * @returns Array of worker URLs
 */
export function getWorkerUrls(urls: string[], mediaToken: string): string[] {
  return urls.map(url => getWorkerUrl(url, mediaToken));
}

/**
 * Convert multiple R2 URLs to proxy URLs
 * @param urls - Array of R2 URLs
 * @param mediaToken - Optional media access token
 * @returns Array of proxy URLs
 */
export function getProxyUrls(urls: string[], mediaToken?: string | null): string[] {
  return urls.map(url => getProxyUrl(url, mediaToken));
}
