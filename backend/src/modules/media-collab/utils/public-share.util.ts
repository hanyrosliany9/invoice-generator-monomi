import * as crypto from "crypto";
import { NotFoundException } from "@nestjs/common";
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

/** Fields needed to decide whether a public share link is currently usable. */
export interface PublicShareState {
  isPublic: boolean;
  publicShareExpiresAt?: Date | null;
}

/**
 * Single source of truth for "is this public share link active?".
 * A link is active when the project exists, public sharing is enabled and the
 * optional expiry has not passed. Throws 404 otherwise, with the same messages
 * the public endpoints have always returned.
 */
export function assertActivePublicShare<T extends PublicShareState>(
  project: T | null | undefined,
): asserts project is T {
  if (!project || !project.isPublic) {
    throw new NotFoundException("Public share link not found or disabled");
  }
  if (
    project.publicShareExpiresAt &&
    project.publicShareExpiresAt.getTime() < Date.now()
  ) {
    throw new NotFoundException("This public share link has expired");
  }
}
