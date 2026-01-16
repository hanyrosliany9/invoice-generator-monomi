import * as crypto from "crypto";
import { getPublicUrl } from "../../../config/url.config";

/**
 * Generate a URL-safe public share token
 * Shorter and more readable than guest tokens
 */
export function generatePublicShareToken(): string {
  // Generate 16-byte token (shorter for public URLs)
  return crypto
    .randomBytes(16)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Generate public share URL
 *
 * Production: https://share.monomiagency.com/shared/{token}
 * Development: http://localhost:3001/shared/{token}
 */
export function generatePublicShareUrl(token: string): string {
  const baseUrl = getPublicUrl();
  return `${baseUrl}/shared/${token}`;
}
