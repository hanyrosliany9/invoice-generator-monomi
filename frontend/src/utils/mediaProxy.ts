/**
 * Media Proxy Utility
 *
 * Converts direct R2 URLs to backend proxy URLs to avoid CORS issues
 */

/**
 * Extract the R2 key from a full R2 URL
 * @param url - Full R2 URL (e.g., https://account-id.r2.cloudflarestorage.com/content/2025-11-11/abc-file.png)
 * @returns R2 key (e.g., content/2025-11-11/abc-file.png)
 */
export function extractR2Key(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Remove leading slash from pathname
    return urlObj.pathname.substring(1);
  } catch (error) {
    console.error('Failed to extract R2 key from URL:', url, error);
    return null;
  }
}

/**
 * Convert R2 URL to backend proxy URL to avoid CORS
 * @param url - Direct R2 URL or already proxied URL
 * @returns Proxy URL through backend
 */
export function getProxyUrl(url: string): string {
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
    // If extraction fails, return original URL (might be a relative path or invalid URL)
    return url;
  }

  // Construct proxy URL
  return `/api/v1/media/proxy/${key}`;
}

/**
 * Convert multiple R2 URLs to proxy URLs
 * @param urls - Array of R2 URLs
 * @returns Array of proxy URLs
 */
export function getProxyUrls(urls: string[]): string[] {
  return urls.map(getProxyUrl);
}
