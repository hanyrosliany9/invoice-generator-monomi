import { useAuthStore } from '../store/auth';
// Import refresh function to avoid circular dependency
// api.ts handles the actual refresh logic, this service handles background scheduling
import { refreshAuthToken } from '../config/api';

/**
 * Token Refresh Service
 *
 * Handles proactive background token refresh to prevent session expiration.
 * The actual 401 handling and request queuing is done in api.ts interceptors.
 *
 * Based on 2025 best practices:
 * - https://jwt.app/blog/jwt-best-practices/
 * - https://codingsprints.medium.com/how-to-auto-refresh-jwt-tokens-in-react-with-axios-interceptors-8feaa74529de
 */
class TokenRefreshService {
  private refreshPromise: Promise<boolean> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private lastRefreshAttempt: number = 0;
  private readonly MIN_REFRESH_INTERVAL = 10000; // 10 seconds minimum between proactive refreshes
  private readonly CHECK_INTERVAL = 30000; // Check every 30 seconds

  /**
   * Start automatic token refresh background task
   * Proactively refreshes tokens before they expire
   */
  startAutoRefresh() {
    // Clear any existing timer
    this.stopAutoRefresh();

    console.log('[TokenRefresh] Starting auto-refresh service');

    this.refreshTimer = setInterval(() => {
      this.checkAndRefreshToken();
    }, this.CHECK_INTERVAL);

    // Initial check after a short delay (let app settle)
    setTimeout(() => this.checkAndRefreshToken(), 1000);
  }

  /**
   * Stop automatic token refresh
   */
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('[TokenRefresh] Auto-refresh service stopped');
    }
  }

  /**
   * Check if token needs refresh and refresh if needed
   * IMPORTANT: Even if access token is expired, we should try to refresh
   * because refresh token might still be valid (30 days)
   */
  private async checkAndRefreshToken() {
    const { isAuthenticated, isTokenExpiringSoon, isTokenExpired, getRefreshToken } = useAuthStore.getState();

    if (!isAuthenticated) {
      this.stopAutoRefresh();
      return;
    }

    // Check if we have a refresh token at all
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      console.warn('[TokenRefresh] No refresh token available');
      return;
    }

    // Calculate time until expiry for logging
    const tokenData = useAuthStore.getState().tokenData;
    const timeUntilExpiry = tokenData ? tokenData.expiresAt - Date.now() : 0;
    const minutesUntilExpiry = Math.round(timeUntilExpiry / 60000);

    // If access token is expired, try to refresh immediately
    // Don't give up - refresh token is valid for 30 days!
    if (isTokenExpired()) {
      console.log('[TokenRefresh] Access token EXPIRED, attempting refresh...');
      await this.proactiveRefresh();
      return;
    }

    // If token expires in < 2 minutes, refresh it proactively
    if (isTokenExpiringSoon()) {
      console.log(`[TokenRefresh] Token expiring in ~${minutesUntilExpiry} min, refreshing proactively...`);
      await this.proactiveRefresh();
    }
  }

  /**
   * Proactive refresh - used by background scheduler
   * Has throttling to prevent too frequent refreshes
   */
  private async proactiveRefresh(): Promise<boolean> {
    // Prevent rapid-fire refresh attempts
    const now = Date.now();
    if (now - this.lastRefreshAttempt < this.MIN_REFRESH_INTERVAL) {
      console.log('[TokenRefresh] Skipping proactive refresh, too soon after last attempt');
      return false;
    }

    // If there's already a refresh in progress, wait for it
    if (this.refreshPromise) {
      console.log('[TokenRefresh] Refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    this.lastRefreshAttempt = now;
    this.refreshPromise = this._performRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _performRefresh(): Promise<boolean> {
    try {
      // Use centralized refresh function from api.ts
      // This avoids duplicating logic and prevents circular issues
      await refreshAuthToken();
      console.log('[TokenRefresh] Proactive refresh successful');
      return true;
    } catch (error: any) {
      // Don't log 401 errors - api.ts handles logout
      if (error.response?.status !== 401) {
        console.error('[TokenRefresh] Proactive refresh failed:', error?.message);
      }
      return false;
    }
  }

  /**
   * Force an immediate token refresh
   * Bypasses throttling - used for critical situations
   */
  async forceRefresh(): Promise<boolean> {
    console.log('[TokenRefresh] Force refresh requested');
    this.lastRefreshAttempt = 0; // Reset throttle
    this.refreshPromise = null; // Clear any pending promise
    return this._performRefresh();
  }
}

export const tokenRefreshService = new TokenRefreshService();
