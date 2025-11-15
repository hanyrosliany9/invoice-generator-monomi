/**
 * Platform-specific media limits for carousels
 * Mirrors backend constants for client-side validation
 * Updated: 2025-11-11
 */

export type PlatformType = 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK' | 'TWITTER' | 'LINKEDIN' | 'YOUTUBE';

export interface PlatformMediaLimit {
  maxMedia: number;
  allowsMultipleMedia: boolean;
  allowsImages: boolean;
  allowsVideos: boolean;
  description: string;
  icon: string;
  color: string;
}

export const PLATFORM_MEDIA_LIMITS: Record<PlatformType, PlatformMediaLimit> = {
  INSTAGRAM: {
    maxMedia: 10,
    allowsMultipleMedia: true,
    allowsImages: true,
    allowsVideos: true,
    description: 'Instagram carousel: max 10 images/videos',
    icon: '📷',
    color: '#E1306C',
  },
  FACEBOOK: {
    maxMedia: 10,
    allowsMultipleMedia: true,
    allowsImages: true,
    allowsVideos: true,
    description: 'Facebook carousel: max 10 images/videos',
    icon: '📘',
    color: '#1877F2',
  },
  LINKEDIN: {
    maxMedia: 9,
    allowsMultipleMedia: true,
    allowsImages: true,
    allowsVideos: true,
    description: 'LinkedIn carousel: max 9 images/videos',
    icon: '💼',
    color: '#0A66C2',
  },
  TWITTER: {
    maxMedia: 4,
    allowsMultipleMedia: true,
    allowsImages: true,
    allowsVideos: true,
    description: 'Twitter/X: max 4 images or 1 video',
    icon: '🐦',
    color: '#1DA1F2',
  },
  TIKTOK: {
    maxMedia: 1,
    allowsMultipleMedia: false,
    allowsImages: false,
    allowsVideos: true,
    description: 'TikTok: single video only',
    icon: '🎵',
    color: '#000000',
  },
  YOUTUBE: {
    maxMedia: 1,
    allowsMultipleMedia: false,
    allowsImages: false,
    allowsVideos: true,
    description: 'YouTube: single video only',
    icon: '▶️',
    color: '#FF0000',
  },
};

/**
 * Get the most restrictive media limit across all selected platforms
 */
export function getMediaLimitForPlatforms(platforms: PlatformType[]): number {
  if (!platforms || platforms.length === 0) {
    return 10; // Default safe limit
  }

  return Math.min(...platforms.map((p) => PLATFORM_MEDIA_LIMITS[p].maxMedia));
}

/**
 * Validate media count against platform limits
 * Returns validation result with user-friendly error messages
 */
export function validateMediaForPlatforms(
  platforms: PlatformType[],
  mediaCount: number,
): { valid: boolean; error?: string; warnings?: string[] } {
  if (!platforms || platforms.length === 0) {
    return { valid: true };
  }

  const warnings: string[] = [];

  for (const platform of platforms) {
    const limit = PLATFORM_MEDIA_LIMITS[platform];

    // Hard error: exceeds platform limit
    if (mediaCount > limit.maxMedia) {
      return {
        valid: false,
        error: `${limit.icon} ${platform}: ${limit.description}. You have ${mediaCount} media file${mediaCount > 1 ? 's' : ''}.`,
      };
    }

    // Hard error: multiple media not allowed
    if (!limit.allowsMultipleMedia && mediaCount > 1) {
      return {
        valid: false,
        error: `${limit.icon} ${platform} only allows a single video. You have ${mediaCount} media files.`,
      };
    }

    // Soft warning: approaching limit
    if (mediaCount >= limit.maxMedia - 1 && limit.allowsMultipleMedia) {
      warnings.push(`${limit.icon} ${platform}: ${mediaCount}/${limit.maxMedia} media files (at limit)`);
    }
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Get user-friendly platform display info
 */
export function getPlatformInfo(platform: PlatformType): PlatformMediaLimit {
  return PLATFORM_MEDIA_LIMITS[platform];
}

/**
 * Check if platforms allow multiple media
 */
export function platformsAllowMultiple(platforms: PlatformType[]): boolean {
  if (!platforms || platforms.length === 0) return true;
  return platforms.every((p) => PLATFORM_MEDIA_LIMITS[p].allowsMultipleMedia);
}
