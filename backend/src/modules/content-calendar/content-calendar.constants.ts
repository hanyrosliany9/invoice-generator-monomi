import { ContentPlatform } from "@prisma/client";

/**
 * Platform-specific media limits for carousels
 * Based on each platform's API and UX guidelines (2025)
 */
export const PLATFORM_MEDIA_LIMITS: Record<ContentPlatform, {
  maxMedia: number;
  allowsMultipleMedia: boolean;
  allowsImages: boolean;
  allowsVideos: boolean;
  description: string;
}> = {
  [ContentPlatform.INSTAGRAM]: {
    maxMedia: 10,
    allowsMultipleMedia: true,
    allowsImages: true,
    allowsVideos: true,
    description: "Instagram carousel: max 10 images/videos",
  },
  [ContentPlatform.FACEBOOK]: {
    maxMedia: 10,
    allowsMultipleMedia: true,
    allowsImages: true,
    allowsVideos: true,
    description: "Facebook carousel: max 10 images/videos",
  },
  [ContentPlatform.LINKEDIN]: {
    maxMedia: 9,
    allowsMultipleMedia: true,
    allowsImages: true,
    allowsVideos: true,
    description: "LinkedIn carousel: max 9 images/videos",
  },
  [ContentPlatform.TWITTER]: {
    maxMedia: 4,
    allowsMultipleMedia: true,
    allowsImages: true,
    allowsVideos: true,
    description: "Twitter/X: max 4 images or 1 video",
  },
  [ContentPlatform.TIKTOK]: {
    maxMedia: 1,
    allowsMultipleMedia: false,
    allowsImages: false,
    allowsVideos: true,
    description: "TikTok: single video only",
  },
  [ContentPlatform.YOUTUBE]: {
    maxMedia: 1,
    allowsMultipleMedia: false,
    allowsImages: false,
    allowsVideos: true,
    description: "YouTube: single video only",
  },
};

/**
 * Get the most restrictive media limit across all selected platforms
 */
export function getMediaLimitForPlatforms(platforms: ContentPlatform[]): number {
  if (!platforms || platforms.length === 0) {
    return 10; // Default safe limit
  }

  return Math.min(...platforms.map((p) => PLATFORM_MEDIA_LIMITS[p].maxMedia));
}

/**
 * Validate media count against platform limits
 */
export function validateMediaForPlatforms(
  platforms: ContentPlatform[],
  mediaCount: number,
): { valid: boolean; error?: string } {
  if (!platforms || platforms.length === 0) {
    return { valid: true };
  }

  for (const platform of platforms) {
    const limit = PLATFORM_MEDIA_LIMITS[platform];

    if (mediaCount > limit.maxMedia) {
      return {
        valid: false,
        error: `${platform}: ${limit.description}. You have ${mediaCount} media files.`,
      };
    }

    if (!limit.allowsMultipleMedia && mediaCount > 1) {
      return {
        valid: false,
        error: `${platform} only allows a single video. You have ${mediaCount} media files.`,
      };
    }
  }

  return { valid: true };
}
