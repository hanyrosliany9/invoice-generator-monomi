/* ------------------------------------------------------------------ */
/*  Share data sources                                                  */
/*                                                                      */
/*  The read-only media gallery and deck viewers are rendered from a     */
/*  "source" instead of a hard-coded public token, so the very same      */
/*  pages serve both:                                                    */
/*    - public share links      (publicMediaSource / publicDeckSource)   */
/*    - the client portal       (portalMediaSource / portalDeckSource,   */
/*                               see src/portal/portalApi.ts)            */
/*  `key` is used as the cache-key discriminator in TanStack Query.      */
/* ------------------------------------------------------------------ */

/* eslint-disable no-unused-vars -- parameter names in interface method signatures document the API */
import {
  type BulkDownloadJobCreated,
  type BulkDownloadJobStatus,
  type FrameComment,
  type MediaAsset,
  mediaCollabService,
  type MediaFolder,
  type MediaProject,
} from './media-collab';
import { decksApi } from './decks';
import type { Deck, DeckSlideComment } from '@/types/deck';

export interface MediaShareSource {
  /** Cache-key discriminator. For public links this is the share token. */
  key: string;
  /** Public guests type their name; portal contacts are identified server-side. */
  askGuestName: boolean;
  getProject(): Promise<MediaProject>;
  getAssets(): Promise<MediaAsset[]>;
  getFolders(): Promise<MediaFolder[]>;
  getMediaToken(): Promise<string>;
  getComments(assetId: string): Promise<FrameComment[]>;
  createComment(assetId: string, data: { content: string; guestName?: string }): Promise<FrameComment>;
  updateRating(assetId: string, starRating: number): Promise<MediaAsset>;
  createBulkJob(assetIds: string[], zipFilename?: string): Promise<BulkDownloadJobCreated>;
  getBulkStatus(jobId: string): Promise<BulkDownloadJobStatus>;
}

export interface DeckExportStatus {
  status: string;
  progress: number;
  filePath?: string;
}

export interface DeckShareSource {
  key: string;
  askGuestName: boolean;
  getDeck(): Promise<Deck>;
  canComment(deck: Deck): boolean;
  canExport(deck: Deck): boolean;
  getComments(slideId: string): Promise<DeckSlideComment[]>;
  createComment(data: { slideId: string; content: string; guestName?: string }): Promise<DeckSlideComment>;
  startExport(): Promise<{ jobId: string }>;
  getExportStatus(jobId: string): Promise<DeckExportStatus>;
  /** URL to open once an export job completes. */
  exportDownloadUrl(deck: Deck, jobId: string): string;
}

export function publicMediaSource(token: string): MediaShareSource {
  return {
    key: token,
    askGuestName: true,
    getProject: () => mediaCollabService.getPublicProject(token),
    getAssets: () => mediaCollabService.getPublicAssets(token),
    getFolders: () => mediaCollabService.getPublicFolders(token),
    getMediaToken: () => mediaCollabService.getPublicMediaToken(token),
    getComments: (assetId) => mediaCollabService.getPublicAssetComments(token, assetId),
    createComment: (assetId, data) =>
      mediaCollabService.createPublicComment(token, assetId, {
        content: data.content,
        guestName: data.guestName ?? '',
      }),
    updateRating: (assetId, n) => mediaCollabService.updatePublicAssetRating(token, assetId, n),
    createBulkJob: (ids, name) => mediaCollabService.createPublicBulkDownloadJob(token, ids, name),
    getBulkStatus: (jobId) => mediaCollabService.getPublicBulkDownloadJobStatus(token, jobId),
  };
}

export function publicDeckSource(token: string): DeckShareSource {
  return {
    key: token,
    askGuestName: true,
    getDeck: () => decksApi.getPublic(token),
    canComment: (deck) => deck.publicAccessLevel === 'COMMENT',
    canExport: (deck) => deck.publicAccessLevel === 'DOWNLOAD',
    getComments: (slideId) => decksApi.getPublicComments(token, slideId),
    createComment: (data) => decksApi.createPublicComment(token, data),
    startExport: () => decksApi.startPublicExportPdf(token),
    getExportStatus: (jobId) => decksApi.getPublicExportPdfStatus(token, jobId),
    // Existing public behaviour, kept unchanged.
    exportDownloadUrl: (deck, jobId) => `/api/decks/${deck.id}/export/pdf/download/${jobId}`,
  };
}
