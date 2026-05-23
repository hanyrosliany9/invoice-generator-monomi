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
  ipAddress?: string;
  userAgent?: string;
}

export type RoleSet = ReadonlyArray<UserRole>;

export const ALL_ROLES: RoleSet = ["SUPER_ADMIN", "ADMIN", "VIDEOGRAPHER"];
export const ADMIN_ROLES: RoleSet = ["SUPER_ADMIN", "ADMIN"];
export const SUPER_ADMIN_ONLY: RoleSet = ["SUPER_ADMIN"];

export function roleAllows(allowed: RoleSet, role: UserRole): boolean {
  return allowed.includes(role);
}
