import type { CookieOptions, Request, Response } from "express";
import { STATE_TTL_SECONDS } from "./oauth-state";

/**
 * Browser-binding cookie of the Instagram connect flow (see
 * InstagramOAuthService). One cookie per flow so a staff connect and a portal
 * connect running in parallel in the same browser do not overwrite each other.
 *
 * Production: "__Host-" prefix, which the browser only accepts with Secure,
 * Path=/ and no Domain attribute — the cookie can then never be set or
 * shadowed by a sibling subdomain. Development (plain http): no prefix, scoped
 * to the OAuth callback path.
 */
export type ConnectFlow = "staff" | "portal";

export const BIND_COOKIE_PATH = "/api/v1/instagram/oauth";

const isProduction = (env: NodeJS.ProcessEnv = process.env) => env.NODE_ENV === "production";

export function bindCookieName(flow: ConnectFlow, env: NodeJS.ProcessEnv = process.env): string {
  return isProduction(env) ? `__Host-ig_bind_${flow}` : `ig_bind_${flow}`;
}

export function bindCookieOptions(env: NodeJS.ProcessEnv = process.env): CookieOptions {
  const prod = isProduction(env);
  return {
    httpOnly: true,
    secure: prod,
    // Lax: sent on the top-level GET redirect back from instagram.com.
    sameSite: "lax",
    path: prod ? "/" : BIND_COOKIE_PATH,
    // Never a Domain attribute (required by "__Host-").
  };
}

export function setBindCookie(res: Response, flow: ConnectFlow, value: string): void {
  res.cookie(bindCookieName(flow), value, { ...bindCookieOptions(), maxAge: STATE_TTL_SECONDS * 1000 });
}

export function clearBindCookie(res: Response, flow: ConnectFlow): void {
  res.clearCookie(bindCookieName(flow), bindCookieOptions());
}

export function readBindCookies(req: Request): Record<ConnectFlow, unknown> {
  const cookies = (req.cookies ?? {}) as Record<string, unknown>;
  return { staff: cookies[bindCookieName("staff")], portal: cookies[bindCookieName("portal")] };
}
