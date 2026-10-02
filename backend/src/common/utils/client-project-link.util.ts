import { BadRequestException, NotFoundException } from "@nestjs/common";

/** Minimal Prisma surface needed (keeps the helper easy to unit test). */
interface ProjectLookup {
  project: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; clientId: true };
    }): Promise<{ id: string; clientId: string } | null>;
  };
}

export const CLIENT_PROJECT_MISMATCH_MESSAGE =
  "clientId does not match the client of the linked project";

/**
 * Write-time guard for records that carry both an optional `clientId` and an
 * optional business `projectId` (MediaProject, Deck). The client portal treats
 * an explicit clientId as authoritative and falls back to the project's client
 * only when clientId is null, so the two must never disagree:
 *
 *  - both set and project.clientId !== clientId  -> 400
 *  - projectId set but the project does not exist -> 404
 *  - either one missing                           -> nothing to check
 *
 * Callers pass the EFFECTIVE values after the write (for a partial update,
 * merge the DTO with the stored row first).
 */
export async function assertClientMatchesProject(
  prisma: ProjectLookup,
  clientId: string | null | undefined,
  projectId: string | null | undefined,
): Promise<void> {
  if (!clientId || !projectId) return;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, clientId: true },
  });
  if (!project) {
    throw new NotFoundException("Project not found");
  }
  if (project.clientId !== clientId) {
    throw new BadRequestException(CLIENT_PROJECT_MISMATCH_MESSAGE);
  }
}

/**
 * Effective value of an optional relation field after a partial update:
 * `undefined` in the DTO means "unchanged"; anything else (including null)
 * replaces the stored value.
 */
export function effectiveLink(
  dtoValue: string | null | undefined,
  storedValue: string | null | undefined,
): string | null {
  return dtoValue === undefined ? (storedValue ?? null) : dtoValue;
}
