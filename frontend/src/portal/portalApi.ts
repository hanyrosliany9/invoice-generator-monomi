/* ------------------------------------------------------------------ */
/*  Client portal API                                                   */
/*                                                                      */
/*  A dedicated axios instance: the portal authenticates with an        */
/*  httpOnly `portal_session` cookie (path /api/v1/portal), so every    */
/*  request is `withCredentials` and the token is never visible to JS.  */
/*  This deliberately does NOT reuse the staff apiClient (its           */
/*  interceptors inject staff bearer tokens and run refresh logic).     */
/* ------------------------------------------------------------------ */

import axios, { AxiosError } from 'axios';
import { API_CONFIG } from '@/config/api';
import type {
  BulkDownloadJobCreated,
  BulkDownloadJobStatus,
  FrameComment,
  MediaAsset,
  MediaFolder,
  MediaProject,
} from '@/services/media-collab';
import type { Deck, DeckSlideComment } from '@/types/deck';
import type { SocialMediaReport } from '@/types/report';
import type { PublicContent } from '@/services/content-calendar';
import type { DeckShareSource, MediaShareSource } from '@/services/shareSources';

export interface PortalClient {
  id: string;
  name: string;
  instagramHandle?: string | null;
  instagramAvatarUrl?: string | null;
  tiktokHandle?: string | null;
}

export interface PortalSession {
  email: string;
  name: string;
  expiresAt?: string;
  clients: PortalClient[];
}

export interface PortalReportSummary {
  id: string;
  title: string;
  description?: string | null;
  month: number;
  year: number;
  status: string;
  hasPdf: boolean;
  projectId?: string | null;
  /** The project's description (projects have no separate name). */
  projectName?: string | null;
  projectNumber?: string | null;
  /** Number of sections, and the first few section titles (teaser). */
  sectionCount?: number;
  sectionTitles?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PortalMediaProjectSummary {
  id: string;
  name: string;
  description?: string | null;
  assetCount: number;
  updatedAt: string;
  coverThumbnailUrl?: string | null;
}

export interface PortalDeckSummary {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  slideCount: number;
}

export const portalHttp = axios.create({
  baseURL: `${API_CONFIG.BASE_URL}/portal`,
  timeout: API_CONFIG.TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

/** Responses may or may not be wrapped in `{ data }`. */
export function unwrap<T>(res: { data: unknown }): T {
  const body = res.data as { data?: unknown } | null | undefined;
  return (body?.data ?? res.data) as T;
}

function unwrapList<T>(res: { data: unknown }): T[] {
  return unwrap<T[] | null | undefined>(res) ?? [];
}

// Listeners notified when any portal call comes back 401 (session ended).
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();
export function onPortalUnauthorized(fn: UnauthorizedListener): () => void {
  unauthorizedListeners.add(fn);
  return () => { unauthorizedListeners.delete(fn); };
}

portalHttp.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    const url = error.config?.url ?? '';
    // Login/verify failures are expected 4xx — only other 401s mean "session ended".
    // `/me` 401 just means "not logged in" (handled by the session query).
    if (error.response?.status === 401 && !url.startsWith('/auth/') && url !== '/me') {
      unauthorizedListeners.forEach((fn) => fn());
    }
    return Promise.reject(error);
  },
);

/** HTTP status of an axios error, if any. */
export function httpStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

const enc = encodeURIComponent;
const clientBase = (clientId: string) => `/clients/${enc(clientId)}`;

export const portalApi = {
  /** Cloudflare Worker token for a media project's thumbnails/assets. */
  async getMediaToken(clientId: string, projectId: string): Promise<string> {
    const d = unwrap<{ mediaToken?: string } | string | null>(
      await portalHttp.get(`${clientBase(clientId)}/media-projects/${enc(projectId)}/media-token`),
    );
    return typeof d === 'string' ? d : (d?.mediaToken ?? '');
  },

  async requestCode(email: string): Promise<void> {
    await portalHttp.post('/auth/request-code', { email });
  },
  async verifyCode(email: string, code: string): Promise<PortalSession> {
    return unwrap<PortalSession>(await portalHttp.post('/auth/verify-code', { email, code }));
  },
  async me(): Promise<PortalSession> {
    return unwrap<PortalSession>(await portalHttp.get('/me'));
  },
  async logout(): Promise<void> {
    await portalHttp.post('/auth/logout');
  },

  async getContent(clientId: string): Promise<PublicContent> {
    return unwrap<PublicContent>(await portalHttp.get(`${clientBase(clientId)}/content`));
  },

  async getReports(clientId: string): Promise<PortalReportSummary[]> {
    return unwrapList<PortalReportSummary>(await portalHttp.get(`${clientBase(clientId)}/reports`));
  },
  async getReport(clientId: string, reportId: string): Promise<SocialMediaReport> {
    return unwrap<SocialMediaReport>(await portalHttp.get(`${clientBase(clientId)}/reports/${enc(reportId)}`));
  },
  /** Downloads the report PDF through the browser (cookie-authenticated blob). */
  async downloadReportPdf(clientId: string, reportId: string, filename: string): Promise<void> {
    const res = await portalHttp.get(`${clientBase(clientId)}/reports/${enc(reportId)}/pdf`, {
      responseType: 'blob',
      // The server may render the PDF on demand (10-30 s).
      timeout: 120000,
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Revoking right after click can cut the download short (Safari, Playwright): give it time.
    setTimeout(() => window.URL.revokeObjectURL(url), 15000);
  },

  async getMediaProjects(clientId: string): Promise<PortalMediaProjectSummary[]> {
    return unwrapList<PortalMediaProjectSummary>(await portalHttp.get(`${clientBase(clientId)}/media-projects`));
  },
  async getDecks(clientId: string): Promise<PortalDeckSummary[]> {
    return unwrapList<PortalDeckSummary>(await portalHttp.get(`${clientBase(clientId)}/decks`));
  },
};

/* ------------------------------------------------------------------ */
/*  Share-source adapters: let the public gallery / deck viewers run    */
/*  against the portal endpoints (same shapes as the public share API). */
/* ------------------------------------------------------------------ */

export function portalMediaSource(clientId: string, projectId: string): MediaShareSource {
  const base = `${clientBase(clientId)}/media-projects/${enc(projectId)}`;
  return {
    key: `portal:${clientId}:${projectId}`,
    askGuestName: false,
    getProject: async () => unwrap<MediaProject>(await portalHttp.get(base)),
    getAssets: async () => unwrapList<MediaAsset>(await portalHttp.get(`${base}/assets`)),
    getFolders: async () => unwrapList<MediaFolder>(await portalHttp.get(`${base}/folders`)),
    getMediaToken: () => portalApi.getMediaToken(clientId, projectId),
    getComments: async (assetId) =>
      unwrapList<FrameComment>(await portalHttp.get(`${base}/assets/${enc(assetId)}/comments`)),
    createComment: async (assetId, data) =>
      unwrap<FrameComment>(
        await portalHttp.post(`${base}/assets/${enc(assetId)}/comments`, { content: data.content }),
      ),
    updateRating: async (assetId, starRating) =>
      unwrap<MediaAsset>(await portalHttp.put(`${base}/assets/${enc(assetId)}/rating`, { starRating })),
    createBulkJob: async (assetIds, zipFilename) =>
      unwrap<BulkDownloadJobCreated>(
        await portalHttp.post(`${base}/async-bulk-download`, { assetIds, zipFilename }),
      ),
    getBulkStatus: async (jobId) =>
      unwrap<BulkDownloadJobStatus>(await portalHttp.get(`${base}/async-bulk-download/${enc(jobId)}`)),
  };
}

export function portalDeckSource(clientId: string, deckId: string): DeckShareSource {
  const base = `${clientBase(clientId)}/decks/${enc(deckId)}`;
  return {
    key: `portal:${clientId}:${deckId}`,
    askGuestName: false,
    getDeck: async () => unwrap<Deck>(await portalHttp.get(base)),
    canComment: (deck) => deck.portalAccess?.canComment !== false,
    canExport: (deck) => deck.portalAccess?.canDownload !== false,
    getComments: async (slideId) =>
      unwrapList<DeckSlideComment>(await portalHttp.get(`${base}/comments/${enc(slideId)}`)),
    createComment: async (data) =>
      unwrap<DeckSlideComment>(
        await portalHttp.post(`${base}/comment`, { slideId: data.slideId, content: data.content }),
      ),
    startExport: async () => {
      const r = await portalHttp.post(`${base}/export-pdf`);
      return unwrap<{ jobId: string }>(r);
    },
    getExportStatus: async (jobId) => {
      const r = await portalHttp.get(`${base}/export-pdf/status/${enc(jobId)}`);
      return unwrap<{ status: string; progress: number; filePath?: string; error?: string }>(r);
    },
    exportDownloadUrl: (_deck, jobId) =>
      `${API_CONFIG.BASE_URL}/portal${base}/export-pdf/download/${enc(jobId)}`,
  };
}
