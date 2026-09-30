import { Prisma, UserRole } from "@prisma/client";

/**
 * Media-collab access helpers.
 *
 * Project access in media-collab is normally granted per project through
 * MediaCollaborator rows (plus the project creator). On top of that, users
 * with the SUPER_ADMIN system role get *read-only* visibility of every media
 * project (owner decision): they can list projects and open project detail,
 * folders, assets and downloads without being a collaborator.
 *
 * The bypass is deliberately limited to:
 *   - SUPER_ADMIN only (not ADMIN, even though other modules treat
 *     ADMIN == SUPER_ADMIN), and
 *   - read paths only. Mutations (upload, edit, delete, collaborator
 *     management, public-sharing changes) still require the collaborator
 *     role checks in each service.
 *
 * `role` must come from the authenticated request (`req.user.role`), which
 * JwtStrategy re-reads from the database on every request — never from a
 * client-supplied value.
 */

/** True when the system role may read every media project. */
export function hasGlobalMediaReadAccess(role?: string | null): boolean {
  return role === UserRole.SUPER_ADMIN;
}

/**
 * `where` fragment restricting MediaProject rows to those the user may read.
 * Returns an empty filter (no restriction) for SUPER_ADMIN.
 *
 * @param includeCreator also match projects the user created (some call sites
 *   historically accepted the creator even without a collaborator row).
 * @param includePublic also match projects that are publicly shared (folder
 *   endpoints historically allowed this).
 */
export function mediaProjectReadWhere(
  userId: string,
  role?: string | null,
  options: { includeCreator?: boolean; includePublic?: boolean } = {},
): Prisma.MediaProjectWhereInput {
  if (hasGlobalMediaReadAccess(role)) {
    return {};
  }

  const or: Prisma.MediaProjectWhereInput[] = [
    { collaborators: { some: { userId } } },
  ];
  if (options.includeCreator) {
    or.push({ createdBy: userId });
  }
  if (options.includePublic) {
    or.push({ isPublic: true });
  }
  return or.length === 1 ? or[0] : { OR: or };
}
