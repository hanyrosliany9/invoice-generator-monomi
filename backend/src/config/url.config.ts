/**
 * Centralized URL Configuration
 *
 * Manages all external URLs for different environments:
 * - ADMIN_URL: Admin panel for authenticated users
 * - PUBLIC_URL: Public sharing for anonymous users
 * - MEDIA_URL: Media CDN (Cloudflare Worker)
 */

/**
 * Get admin panel URL
 * Used for: Internal links, admin redirects, CORS
 */
export function getAdminUrl(): string {
  return process.env.FRONTEND_URL || "http://localhost:3001";
}

/**
 * Get public sharing URL
 * Used for: Public share links, guest invites
 *
 * Falls back to FRONTEND_URL for backward compatibility
 */
export function getPublicUrl(): string {
  return (
    process.env.PUBLIC_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:3001"
  );
}

/**
 * Get media CDN URL
 * Used for: Media URLs served via Cloudflare Worker
 */
export function getMediaUrl(): string {
  return process.env.MEDIA_URL || "https://media.monomiagency.com";
}

/**
 * Validate URL configuration on application startup
 * Warns if using localhost in production
 */
export function validateUrls(): void {
  const nodeEnv = process.env.NODE_ENV;
  const publicUrl = getPublicUrl();
  const adminUrl = getAdminUrl();
  const mediaUrl = getMediaUrl();

  if (nodeEnv === "production") {
    let hasErrors = false;

    if (publicUrl.includes("localhost")) {
      console.error(
        "[URL_CONFIG] ❌ PUBLIC_URL contains localhost in production!",
      );
      console.error(
        "[URL_CONFIG]    Set: PUBLIC_URL=https://share.monomiagency.com",
      );
      hasErrors = true;
    }

    if (adminUrl.includes("localhost")) {
      console.error(
        "[URL_CONFIG] ❌ FRONTEND_URL contains localhost in production!",
      );
      console.error(
        "[URL_CONFIG]    Set: FRONTEND_URL=https://admin.monomiagency.com",
      );
      hasErrors = true;
    }

    if (mediaUrl.includes("localhost")) {
      console.error(
        "[URL_CONFIG] ⚠️  MEDIA_URL contains localhost in production",
      );
      console.error(
        "[URL_CONFIG]    Set: MEDIA_URL=https://media.monomiagency.com",
      );
    }

    if (!hasErrors) {
      console.log("[URL_CONFIG] ✅ URLs configured correctly:");
      console.log(`[URL_CONFIG]    Admin:  ${adminUrl}`);
      console.log(`[URL_CONFIG]    Public: ${publicUrl}`);
      console.log(`[URL_CONFIG]    Media:  ${mediaUrl}`);
    } else {
      console.error("[URL_CONFIG] ❌ Fix URL configuration before deploying!");
    }
  } else {
    console.log(`[URL_CONFIG] 🔧 Development URLs:`);
    console.log(`[URL_CONFIG]    Admin:  ${adminUrl}`);
    console.log(`[URL_CONFIG]    Public: ${publicUrl}`);
    console.log(`[URL_CONFIG]    Media:  ${mediaUrl}`);
  }
}
