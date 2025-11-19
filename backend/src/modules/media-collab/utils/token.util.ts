import * as crypto from 'crypto';

/**
 * Generate a cryptographically secure random token for guest invites
 * @returns 32-byte base64url-encoded token
 */
export function generateSecureToken(): string {
  // Generate 32-byte random token, encode as base64url
  return crypto
    .randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate guest invite link with token
 * @param token - The secure invite token
 * @returns Full URL for guest to accept invite
 */
export function generateGuestInviteLink(token: string): string {
  const baseUrl = process.env.APP_URL || 'http://localhost:3001';
  return `${baseUrl}/guest/accept?token=${token}`;
}
