import { randomBytes } from "crypto";

/**
 * Generate a unique public share token
 */
export function generateDeckShareToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Generate public share URL for a deck
 */
export function generateDeckShareUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.FRONTEND_URL || "http://localhost:3001";
  return `${base}/deck/shared/${token}`;
}

/**
 * Generate guest invite token
 */
export function generateInviteToken(): string {
  return randomBytes(24).toString("hex");
}
