import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

/**
 * Internal clients (the agency itself, e.g. "Monomi") exist so we can plan our
 * own social media in the content calendar. They are not customers, so every
 * business-facing query (pickers, stats, reports, billing validation) must
 * exclude them. Spread this into a `where` clause:
 *
 *   prisma.client.count({ where: { ...EXCLUDE_INTERNAL_CLIENTS, status: "active" } })
 */
export const EXCLUDE_INTERNAL_CLIENTS: Prisma.ClientWhereInput = {
  isInternal: false,
};

export const INTERNAL_CLIENT_NAME = "Monomi";

/** Throws if the client is the internal (non-billable) one. */
export function assertNotInternalClient(
  client: { isInternal?: boolean } | null | undefined,
  action = "membuat dokumen penagihan",
): void {
  if (client?.isInternal) {
    throw new BadRequestException(
      `Klien internal tidak dapat digunakan untuk ${action}`,
    );
  }
}
