import type { UserRole } from "@prisma/client";

export type McpKind = "tool" | "resource" | "prompt";

export interface McpUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface McpContext {
  user: McpUser;
  clientId: string;
  tokenId: string | null;
  /** OAuth scopes granted on the access token. Empty array = no scopes on token. */
  scopes: string[];
  ipAddress?: string;
  userAgent?: string;
}

// ---------------------------------------------------------------------------
// Canonical MCP OAuth scope strings
// ---------------------------------------------------------------------------

/** Required scope for all read-only MCP tools. */
export const MCP_SCOPE_READ = "mcp:read";
/** Required scope for mutating MCP tools (create / update / delete). */
export const MCP_SCOPE_WRITE = "mcp:write";

/**
 * Returns true when the context's granted scopes satisfy the required scope.
 *
 * Special case: if the token has NO scopes at all we treat it as a legacy /
 * internally-minted token and allow everything (backwards-compat).  Once all
 * token issuance paths set scopes this fallback can be removed.
 */
export function scopeAllows(ctx: McpContext, required: string): boolean {
  if (ctx.scopes.length === 0) return true; // legacy token — no scopes recorded
  return ctx.scopes.includes(required);
}

export type RoleSet = ReadonlyArray<UserRole>;

export const ALL_ROLES: RoleSet = ["SUPER_ADMIN", "ADMIN", "VIDEOGRAPHER"];
export const ADMIN_ROLES: RoleSet = ["SUPER_ADMIN", "ADMIN"];
export const SUPER_ADMIN_ONLY: RoleSet = ["SUPER_ADMIN"];

export function roleAllows(allowed: RoleSet, role: UserRole): boolean {
  return allowed.includes(role);
}
