import { apiClient } from '../config/api';
import type { ColumnKind, ColumnTypes, ImportedSection } from '@/types/report';

/** Staff-side Instagram (Instagram API with Instagram Login) integration. */

export type InstagramConnectionStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ERROR';

export interface InstagramConnection {
  id: string;
  clientId: string;
  username: string;
  accountType?: string | null;
  profilePictureUrl?: string | null;
  followersCount?: number | null;
  mediaCount?: number | null;
  tokenExpiresAt?: string | null;
  scopes: string[];
  status: InstagramConnectionStatus;
  lastSyncAt?: string | null;
  lastError?: string | null;
  connectedBy: string;
  createdAt: string;
}

export interface InstagramStatus {
  configured: boolean;
  connected: boolean;
  syncing: boolean;
  insightsGranted: boolean | null;
  connection: InstagramConnection | null;
  data: { days: number; from: string | null; to: string | null; media: number } | null;
}

export type InstagramSectionKey = 'metrics' | 'daily' | 'top';

export interface InstagramPreviewSection {
  key: InstagramSectionKey;
  title: string;
  description: string;
  kind: 'table' | 'metrics';
  empty: boolean;
  headers: string[];
  columnTypes: ColumnTypes;
  columnKinds: Record<string, ColumnKind>;
  rowCount: number;
  rows: Record<string, unknown>[];
  warnings: string[];
  chartCount: number;
  coverage: InstagramMetricCoverage[];
  notes: string[];
  hasOmitted: boolean;
}

export interface InstagramMetricCoverage {
  column: string;
  days: number;
  total: number;
  ratio: number;
  omitted: boolean;
}

export interface InstagramReportPreview {
  available: boolean;
  period: { month: number; year: number };
  periodMismatch: null;
  includePartial: boolean;
  /** Instagram sections already in this report (re-adding replaces them after confirmation). */
  existing: { id: string; key: InstagramSectionKey | null; title: string }[];
  connection: {
    username: string;
    status: InstagramConnectionStatus;
    lastSyncAt?: string | null;
    profilePictureUrl?: string | null;
    connectedAt?: string | null;
  } | null;
  sections: InstagramPreviewSection[];
}

function unwrap<T>(body: unknown): T {
  const env = body as { data?: unknown } | null | undefined;
  return (env?.data ?? body) as T;
}

const enc = encodeURIComponent;

/** Hosts Instagram's OAuth authorize page is served from. */
const AUTHORIZE_HOSTS = new Set(['www.instagram.com', 'instagram.com']);
/** Local fake OAuth servers, development builds only. */
const DEV_AUTHORIZE_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * Only ever navigate to Instagram's own authorize page (https, instagram.com
 * host, no credentials in the URL). Anything else returned by the server is
 * refused, so a compromised or misconfigured response cannot turn the
 * "Connect" button into an open redirect.
 */
export function safeAuthorizeUrl(url: unknown, dev: boolean = import.meta.env.DEV): string | null {
  if (typeof url !== 'string') return null;
  try {
    const u = new URL(url);
    if (u.username || u.password) return null;
    if (u.protocol === 'https:' && AUTHORIZE_HOSTS.has(u.hostname) && (u.port === '' || u.port === '443')) return u.toString();
    if (dev && (u.protocol === 'http:' || u.protocol === 'https:') && DEV_AUTHORIZE_HOSTS.has(u.hostname)) return u.toString();
    return null;
  } catch {
    return null;
  }
}

export interface AddInstagramSectionsResult {
  created: ImportedSection[];
  replaced: ImportedSection[];
  skipped: string[];
}

export const instagramService = {
  async status(clientId: string): Promise<InstagramStatus> {
    const res = await apiClient.get<unknown>(`/instagram/clients/${enc(clientId)}`);
    return unwrap<InstagramStatus>(res.data);
  },
  async connect(clientId: string, opts: { syncProfile?: boolean } = {}): Promise<string> {
    const res = await apiClient.post<unknown>(`/instagram/connect/${enc(clientId)}`, opts);
    return unwrap<{ authorizeUrl: string }>(res.data).authorizeUrl;
  },
  async sync(clientId: string): Promise<{ started: boolean }> {
    const res = await apiClient.post<unknown>(`/instagram/clients/${enc(clientId)}/sync`);
    return unwrap<{ started: boolean }>(res.data);
  },
  async disconnect(clientId: string, purge: boolean): Promise<void> {
    await apiClient.post(`/instagram/clients/${enc(clientId)}/disconnect`, { purge });
  },
  async reportPreview(reportId: string, includePartial = false): Promise<InstagramReportPreview> {
    const res = await apiClient.get<unknown>(`/instagram/reports/${enc(reportId)}/preview`, {
      params: includePartial ? { includePartial: 'true' } : undefined,
    });
    return unwrap<InstagramReportPreview>(res.data);
  },
  async addReportSections(
    reportId: string,
    sections: InstagramSectionKey[],
    opts: { replace?: boolean; includePartial?: boolean } = {},
  ): Promise<AddInstagramSectionsResult> {
    const res = await apiClient.post<unknown>(`/instagram/reports/${enc(reportId)}/sections`, { sections, ...opts });
    const r = unwrap<Partial<AddInstagramSectionsResult>>(res.data);
    return { created: r.created ?? [], replaced: r.replaced ?? [], skipped: r.skipped ?? [] };
  },
};

/** Text for ?instagram=error&reason=… after the OAuth redirect. */
export function instagramReasonText(t: (k: string, f: string) => string, reason: string | null): string {
  switch (reason) {
    case 'denied':
      return t('instagram.reason.denied', 'Izin ditolak di Instagram. Akun tidak dihubungkan.');
    case 'state':
    case 'expired':
    case 'session':
      return t('instagram.reason.session', 'Sesi penghubungan kedaluwarsa, sudah dipakai, atau dibuka di browser lain. Silakan coba lagi dari halaman ini.');
    case 'forbidden':
      return t('instagram.reason.forbidden', 'Anda tidak lagi memiliki akses untuk menghubungkan akun ini.');
    case 'not_business':
      return t('instagram.reason.notBusiness', 'Akun ini bukan akun Bisnis atau Kreator. Ubah ke akun profesional di aplikasi Instagram, lalu coba lagi.');
    case 'in_use':
      return t('instagram.reason.inUse', 'Akun Instagram ini sudah terhubung ke klien lain. Putuskan dari klien tersebut terlebih dahulu, atau masuk dengan akun Instagram milik klien ini.');
    case 'other_account':
      return t('instagram.reason.otherAccount', 'Akun Instagram yang dipakai masuk berbeda dengan akun yang sudah tersimpan untuk klien ini. Putuskan akun lama dan centang "hapus data" terlebih dahulu, lalu hubungkan lagi.');
    case 'access':
      return t('instagram.reason.access', 'Meta belum mengizinkan akun ini. Selama aplikasi Monomi masih Standard Access, hanya akun yang terdaftar di App Roles yang bisa dihubungkan (perlu App Review untuk akun klien).');
    default:
      return t('instagram.reason.exchange', 'Gagal menghubungkan Instagram. Silakan coba lagi.');
  }
}
