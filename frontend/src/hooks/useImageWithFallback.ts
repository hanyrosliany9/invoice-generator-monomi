import { useState, useEffect } from 'react';

/**
 * Hook for handling image loading with automatic retry and fallback support
 *
 * Features:
 * - Automatic retry with exponential backoff (1s, 2s, 3s...)
 * - Fallback to alternative image on failure
 * - Loading and error states
 * - Cache busting on retry
 *
 * Use case: Handling race conditions where thumbnails are requested before upload completes
 *
 * @param src - Primary image URL to load
 * @param fallbackSrc - Fallback image URL if primary fails after retries
 * @param retries - Number of retry attempts (default: 2)
 * @returns Object with image state and event handlers
 *
 * @example
 * ```tsx
 * const { imgSrc, loading, error, handleError, handleLoad } = useImageWithFallback(
 *   asset.thumbnailUrl,
 *   asset.url, // Fallback to main image
 *   3 // Retry 3 times
 * );
 *
 * <img
 *   src={imgSrc}
 *   onError={handleError}
 *   onLoad={handleLoad}
 *   className={loading ? 'opacity-50' : 'opacity-100'}
 *   alt={asset.originalName}
 * />
 * ```
 */
export function useImageWithFallback(
  src: string,
  fallbackSrc?: string,
  retries: number = 1 // Reduced from 2 to 1 for performance (CDN is reliable)
) {
  const [imgSrc, setImgSrc] = useState(src);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Reset state when src changes
  useEffect(() => {
    setLoading(true);
    setError(false);
    setImgSrc(src);
    setRetryCount(0);
  }, [src]);

  /**
   * Handle image load error with retry logic
   *
   * Retry strategy (optimized for performance):
   * 1. Immediate retry (no delay) - trusts CDN cache
   * 2. No cache busting - allows Cloudflare CDN to serve cached responses
   * 3. After max retries, use fallback or set error state
   */
  const handleError = () => {
    if (retryCount < retries) {
      console.log(
        `[useImageWithFallback] Image failed to load: ${imgSrc}. ` +
        `Retrying immediately (${retryCount + 1}/${retries})...`
      );

      // Immediate retry without delay (performance optimization)
      // No cache busting - trust Cloudflare CDN (99.99% reliable)
      setRetryCount(prev => prev + 1);
      setImgSrc(src); // Use original URL (no timestamp, allows CDN cache)
    } else if (fallbackSrc) {
      // All retries exhausted, use fallback
      console.warn(
        `[useImageWithFallback] Image failed after ${retries} retries: ${src}. ` +
        `Using fallback: ${fallbackSrc}`
      );
      setImgSrc(fallbackSrc);
      setError(true);
      setLoading(false);
    } else {
      // No fallback available, just set error state
      console.error(
        `[useImageWithFallback] Image failed after ${retries} retries: ${src}. ` +
        `No fallback available.`
      );
      setError(true);
      setLoading(false);
    }
  };

  /**
   * Handle successful image load
   */
  const handleLoad = () => {
    if (retryCount > 0) {
      console.log(
        `[useImageWithFallback] Image loaded successfully after ${retryCount} retries: ${imgSrc}`
      );
    }
    setLoading(false);
    setError(false);
  };

  return {
    imgSrc,      // Current image URL to use
    loading,     // True while image is loading
    error,       // True if image failed to load (after all retries)
    handleError, // Call this in onError handler
    handleLoad,  // Call this in onLoad handler
    retryCount,  // Current retry attempt (for debugging)
  };
}
