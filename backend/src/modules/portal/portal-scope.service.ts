import { Injectable, NotFoundException } from "@nestjs/common";
import { DeckStatus, Prisma, ReportStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PortalSession, PortalSessionContact } from "./portal-auth.service";

/** Report statuses visible to clients (drafts stay internal). */
export const PORTAL_REPORT_STATUSES: ReportStatus[] = [
  ReportStatus.COMPLETED,
  ReportStatus.SENT,
];

/** Deck statuses hidden from clients. */
export const PORTAL_HIDDEN_DECK_STATUSES: DeckStatus[] = [DeckStatus.DRAFT];

/**
 * Authorisation for every portal data route. Each helper answers 404 (never
 * 403) for anything outside the session's scope so ids of other clients'
 * resources are not confirmed to exist.
 */
@Injectable()
export class PortalScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /** The session's contact for :clientId, or 404. */
  contactForClient(session: PortalSession, clientId: string): PortalSessionContact {
    const contact = session.contacts.find((c) => c.clientId === clientId);
    if (!contact) {
      throw new NotFoundException("Klien tidak ditemukan");
    }
    return contact;
  }

  /** Stable binding for jobs created through the portal. */
  portalScopeKey(contact: PortalSessionContact): string {
    return `${contact.clientId}:${contact.email}`;
  }

  /**
   * Ownership rule for records that carry BOTH an optional `clientId` and an
   * optional business `project` (MediaProject, Deck):
   *  - an explicit `clientId` is authoritative;
   *  - only when `clientId` is null does the linked project's client decide.
   * So a record mislinked as clientId=B + project of client A is visible to B
   * only, never to both. Every list AND every by-id lookup (detail, assets,
   * comments, status/rating, downloads, exports, job polls) goes through
   * these two builders, so the rule is applied in one place.
   */
  mediaProjectsWhere(clientId: string): Prisma.MediaProjectWhereInput {
    return {
      OR: [{ clientId }, { clientId: null, project: { clientId } }],
    };
  }

  decksWhere(clientId: string): Prisma.DeckWhereInput {
    return {
      status: { notIn: PORTAL_HIDDEN_DECK_STATUSES },
      OR: [{ clientId }, { clientId: null, project: { clientId } }],
    };
  }

  reportsWhere(clientId: string): Prisma.SocialMediaReportWhereInput {
    return {
      status: { in: PORTAL_REPORT_STATUSES },
      project: { clientId },
    };
  }

  async mediaProjectInScope(clientId: string, projectId: string) {
    const project = await this.prisma.mediaProject.findFirst({
      where: { id: projectId, ...this.mediaProjectsWhere(clientId) },
      select: { id: true, createdBy: true },
    });
    if (!project) throw new NotFoundException("Media project not found");
    return project;
  }

  async deckInScope(clientId: string, deckId: string) {
    const deck = await this.prisma.deck.findFirst({
      where: { id: deckId, ...this.decksWhere(clientId) },
      select: { id: true, createdById: true },
    });
    if (!deck) throw new NotFoundException("Deck not found");
    return deck;
  }

  async reportInScope(clientId: string, reportId: string) {
    const report = await this.prisma.socialMediaReport.findFirst({
      where: { id: reportId, ...this.reportsWhere(clientId) },
      select: { id: true },
    });
    if (!report) throw new NotFoundException("Report not found");
    return report;
  }
}
