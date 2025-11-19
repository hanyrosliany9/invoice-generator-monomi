import * as crypto from 'crypto';

/**
 * Generate a URL-safe public share token
 * Shorter and more readable than guest tokens
 */
export function generatePublicShareToken(): string {
  // Generate 16-byte token (shorter for public URLs)
  return crypto
    .randomBytes(16)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate public share URL
 */
export function generatePublicShareUrl(token: string): string {
  const baseUrl = process.env.APP_URL || 'http://localhost:3001';
  return `${baseUrl}/shared/${token}`;
}
