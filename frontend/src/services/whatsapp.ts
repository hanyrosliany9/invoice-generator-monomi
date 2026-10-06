import { api } from '../config/api';
import type { LeadSource, StageType } from './crm';

export type WaDirection = 'IN' | 'OUT';
export type WaOrigin = 'CUSTOMER' | 'MONOMI' | 'PHONE_APP' | 'HISTORY';
export type WaStatus = 'RECEIVED' | 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface WaReferral {
  source_url?: string;
  source_id?: string;
  source_type?: string;
  headline?: string;
  body?: string;
  media_type?: string;
  image_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  ctwa_clid?: string;
}

export interface WaWindow {
  open: boolean;
  expiresAt: string | null;
  freeEntryUntil: string | null;
  freeEntryActive: boolean;
}

export interface WaConversation {
  id: string;
  status: 'OPEN' | 'ARCHIVED';
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastInboundAt: string | null;
  assignedTo: { id: string; name: string } | null;
  window: WaWindow;
  contact: {
    id: string;
    waId: string;
    phone: string | null;
    profileName: string | null;
    phoneBookName: string | null;
    displayName: string;
  };
  lead: {
    id: string;
    name: string;
    source: LeadSource;
    campaignCode: string | null;
    stage: { id: string; key: string | null; name: string; color: string; type: StageType };
  } | null;
}

export interface WaConversationDetail extends WaConversation {
  ctwa: { referral: WaReferral; at: string } | null;
}

export interface WaMessage {
  id: string;
  waMessageId: string | null;
  direction: WaDirection;
  origin: WaOrigin;
  type: string;
  text: string | null;
  hasMedia: boolean;
  mediaMime: string | null;
  mediaCaption: string | null;
  mediaFilename: string | null;
  templateName: string | null;
  contextWaMessageId: string | null;
  status: WaStatus;
  errorCode: string | null;
  errorTitle: string | null;
  timestamp: string;
  referral: WaReferral | null;
  sentBy: { id: string; name: string } | null;
}

export interface WaTemplate {
  name: string;
  language: string;
  category: string | null;
  bodyText: string | null;
  paramCount: number;
}

export interface WaQuickReply { title: string; text: string }

export interface WaListFilters {
  filter?: 'all' | 'unread' | 'mine' | 'unassigned';
  window?: 'open' | 'closed' | '';
  status?: 'OPEN' | 'ARCHIVED';
  q?: string;
  limit?: number;
}

export type WaConfigState = 'OFF' | 'INCOMPLETE' | 'INVALID' | 'READY';

export interface WaSettingsStatus {
  configured: boolean;
  credentialSource: 'env' | 'embedded' | null;
  /** Anything but READY keeps the webhook, inbox sending and CAPI disabled. */
  state: WaConfigState;
  env: {
    accessToken: boolean;
    wabaId: string | null;
    phoneNumberId: string | null;
    appSecret: boolean;
    verifyToken: boolean;
    graphVersion: string;
    appSecretProof: boolean;
    problems: string[];
  };
  webhook: { url: string; ready: boolean; fields: string[]; lastWebhookAt: string | null };
  connection: {
    status: 'CONNECTED' | 'DISCONNECTED';
    wabaId: string | null;
    phoneNumberId: string | null;
    displayPhoneNumber: string | null;
    connectedAt: string | null;
    disconnectedAt: string | null;
    disconnectReason: string | null;
    hasStoredToken: boolean;
    historySyncRequestedAt: string | null;
    contactsSyncRequestedAt: string | null;
    historyPhase: number | null;
    historyProgress: number | null;
    historyError: string | null;
  } | null;
  check: {
    ok: boolean;
    checkedAt: string;
    error: string | null;
    waba: { id: string; name: string | null } | null;
    numbers: Array<{
      id: string;
      displayPhoneNumber: string | null;
      verifiedName: string | null;
      platformType: string | null;
      status: string | null;
      qualityRating: string | null;
      isConfigured: boolean;
    }>;
  } | null;
  capi: {
    enabled: boolean;
    state: WaConfigState;
    problems: string[];
    datasetConfigured: boolean;
    datasetId: string | null;
    testEventCode: boolean;
    counts: Record<'PENDING_CONFIG' | 'QUEUED' | 'SENT' | 'FAILED' | 'SKIPPED', number>;
    lastSentAt: string | null;
    lastFailed: { at: string; eventName: string; error: string | null } | null;
  };
  embeddedSignup: {
    enabled: boolean;
    coexistenceFlag: boolean;
    appId: string | null;
    configId: string | null;
    graphVersion: string;
  };
}

const unwrap = <T,>(r: { data: { data?: T } & T }): T => (r.data.data !== undefined ? r.data.data : (r.data as T));

export const whatsappApi = {
  conversations: async (f: WaListFilters = {}): Promise<{ items: WaConversation[]; total: number }> => {
    const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v !== undefined));
    return unwrap(await api.get('/whatsapp/conversations', { params }));
  },
  conversation: async (id: string): Promise<WaConversationDetail> => unwrap(await api.get(`/whatsapp/conversations/${id}`)),
  messages: async (id: string, before?: string): Promise<{ items: WaMessage[]; hasMore: boolean }> =>
    unwrap(await api.get(`/whatsapp/conversations/${id}/messages`, { params: before ? { before, limit: 50 } : { limit: 50 } })),
  sendText: async (id: string, text: string, replyToMessageId?: string) =>
    unwrap(await api.post(`/whatsapp/conversations/${id}/messages`, { text, ...(replyToMessageId ? { replyToMessageId } : {}) })),
  sendTemplate: async (id: string, name: string, language: string, params: string[]) =>
    unwrap(await api.post(`/whatsapp/conversations/${id}/template`, { name, language, params })),
  markRead: async (id: string) => unwrap(await api.post(`/whatsapp/conversations/${id}/read`)),
  assign: async (id: string, assignedToId: string | null): Promise<WaConversationDetail> =>
    unwrap(await api.post(`/whatsapp/conversations/${id}/assign`, { assignedToId })),
  setStatus: async (id: string, status: 'OPEN' | 'ARCHIVED'): Promise<WaConversationDetail> =>
    unwrap(await api.post(`/whatsapp/conversations/${id}/status`, { status })),
  linkLead: async (id: string, leadId: string | null): Promise<WaConversationDetail> =>
    unwrap(await api.post(`/whatsapp/conversations/${id}/lead`, { leadId })),
  forLead: async (leadId: string): Promise<{ conversation: WaConversationDetail | null }> =>
    unwrap(await api.get(`/whatsapp/leads/${leadId}/conversation`)),
  templates: async (refresh = false): Promise<WaTemplate[]> =>
    unwrap(await api.get('/whatsapp/templates', { params: refresh ? { refresh: 1 } : {} })),
  /** Media is fetched with the staff session and shown via an object URL (never a Meta URL). */
  media: async (messageId: string): Promise<Blob> =>
    (await api.get(`/whatsapp/media/${messageId}`, { responseType: 'blob', timeout: 60000 })).data as Blob,
  badge: async (): Promise<{ conversations: number; messages: number }> => unwrap(await api.get('/whatsapp/badge')),
  quickReplies: async (): Promise<WaQuickReply[]> => unwrap(await api.get('/whatsapp/quick-replies')),
  setQuickReplies: async (items: WaQuickReply[]): Promise<WaQuickReply[]> =>
    unwrap(await api.put('/whatsapp/quick-replies', { items })),
  settingsStatus: async (refresh = false): Promise<WaSettingsStatus> =>
    unwrap(await api.get('/whatsapp/settings/status', { params: refresh ? { refresh: 1 } : {} })),
  revealVerifyToken: async (): Promise<{ verifyToken: string }> => unwrap(await api.post('/whatsapp/settings/verify-token')),
  runCapi: async () => unwrap(await api.post('/whatsapp/capi/run')),
  createDataset: async (): Promise<{ datasetId: string; source: 'configured' | 'meta' }> =>
    unwrap(await api.post('/whatsapp/capi/dataset')),
  completeEmbeddedSignup: async (d: { code: string; wabaId: string; phoneNumberId: string }) =>
    unwrap(await api.post('/whatsapp/embedded-signup/complete', d)),
};

/** The API error "code" (e.g. WINDOW_CLOSED, WHATSAPP_NOT_CONFIGURED). */
export function apiErrorCode(err: unknown): string | null {
  // The global exception filter passes `details` through (custom top-level fields are dropped).
  const d = (err as { response?: { data?: { code?: string; details?: { code?: string } } } })?.response?.data;
  return d?.details?.code ?? d?.code ?? null;
}
