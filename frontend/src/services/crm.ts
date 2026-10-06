import { api } from '../config/api';

export type LeadSource =
  | 'WHATSAPP_CTWA'
  | 'WHATSAPP_ORGANIC'
  | 'INSTAGRAM_DM'
  | 'REFERRAL'
  | 'WEBSITE'
  | 'OTHER';
export type StageType = 'OPEN' | 'WON' | 'LOST';
export type MetaEventName = 'LeadSubmitted' | 'QualifiedLead' | 'Purchase';
export type MetaEventStatus = 'PENDING_CONFIG' | 'QUEUED' | 'SENT' | 'FAILED' | 'SKIPPED';
export type ActivityType =
  | 'NOTE' | 'CALL' | 'WHATSAPP' | 'MEETING'
  | 'STAGE_CHANGE' | 'FOLLOW_UP_SET' | 'FOLLOW_UP_DONE' | 'CONVERTED' | 'ASSIGNED';
export type CampaignPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'BOTH';
export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'ENDED';

export interface LeadStage {
  id: string;
  key: string | null;
  name: string;
  order: number;
  color: string;
  type: StageType;
  metaEvent: MetaEventName | null;
  isActive: boolean;
}

export interface CampaignRef { id: string; name: string; code: string }
export interface UserRef { id: string; name: string }

export interface Lead {
  id: string;
  name: string;
  phone: string | null;
  waId: string | null;
  email: string | null;
  company: string | null;
  source: LeadSource;
  campaignId: string | null;
  campaignCode: string | null;
  firstMessage: string | null;
  stageId: string;
  stage: LeadStage;
  estimatedValue: string | number;
  assignedToId: string | null;
  assignedTo: UserRef | null;
  campaign: CampaignRef | null;
  followUpAt: string | null;
  followUpNote: string | null;
  lostReason: string | null;
  clientId: string | null;
  projectId: string | null;
  quotationId: string | null;
  firstContactAt: string;
  firstResponseAt: string | null;
  lastContactAt: string;
  createdAt: string;
  waitingMinutes: number | null;
  isUncontacted: boolean;
  firstResponseMinutes: number | null;
}

export interface LeadActivity {
  id: string;
  type: ActivityType;
  body: string | null;
  metaEvent: MetaEventName | null;
  createdAt: string;
  actor: UserRef | null;
  fromStage: { id: string; key: string | null; name: string } | null;
  toStage: { id: string; key: string | null; name: string } | null;
}

export interface MetaEventRow {
  id: string;
  eventName: MetaEventName;
  status: MetaEventStatus;
  value: string | number | null;
  eventTime: string;
  sentAt: string | null;
  lastError: string | null;
}

export interface LeadDetail extends Lead {
  client: { id: string; name: string } | null;
  project: { id: string; number: string; description: string } | null;
  quotation: { id: string; quotationNumber: string; status: string; totalAmount: string | number } | null;
  activities: LeadActivity[];
  metaEvents: MetaEventRow[];
  thresholdMinutes: number;
}

export interface LeadList {
  items: Lead[];
  total: number;
  page: number;
  limit: number;
  thresholdMinutes: number;
}

export interface LeadFilters {
  stageId?: string;
  assignee?: string;
  campaignId?: string;
  source?: LeadSource;
  followUp?: 'due' | 'overdue' | 'today';
  uncontacted?: boolean;
  q?: string;
  limit?: number;
}

export interface CreateLeadInput {
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  source?: LeadSource;
  campaignId?: string;
  campaignCode?: string;
  firstMessage?: string;
  stageId?: string;
  estimatedValue?: number;
  assignedToId?: string;
  allowDuplicate?: boolean;
}

export interface DuplicateLead {
  id: string;
  name: string;
  phone: string | null;
  createdAt: string;
  stage: { id: string; key: string | null; name: string; type: StageType };
}

export interface QuickAddParse {
  name: string | null;
  phone: string | null;
  campaignCode: string | null;
  message: string | null;
  campaign: CampaignRef | null;
  duplicate: DuplicateLead | null;
}

export interface ConvertInput {
  clientId?: string;
  createProject?: boolean;
  createQuotation?: boolean;
  projectName?: string;
  amount?: number;
}

export interface ConvertResult {
  leadId: string;
  clientId: string;
  projectId: string | null;
  quotationId: string | null;
  clientCreated: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  code: string;
  platform: CampaignPlatform;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  status: CampaignStatus;
  prefillMessage: string | null;
  /** Meta ad ids (Click-to-WhatsApp referral source_id) mapped to this campaign. */
  metaAdIds?: string[];
  leads: number;
  won: number;
  spend: number;
  costPerLead: number | null;
  costPerClient: number | null;
}

export interface CampaignInput {
  name: string;
  code: string;
  platform?: CampaignPlatform;
  startDate?: string;
  endDate?: string;
  budget?: number;
  status?: CampaignStatus;
  prefillMessage?: string;
  metaAdIds?: string[];
}

export interface CampaignSpend {
  id: string;
  campaignId: string;
  dateFrom: string;
  dateTo: string;
  amount: number;
  note: string | null;
  source: 'MANUAL' | 'META';
}

export interface FunnelStep {
  stageId: string;
  key: string | null;
  name: string;
  count: number;
  continuePct: number | null;
}

export interface CrmStats {
  range: { from: string; to: string };
  previous: { from: string; to: string; leads: number };
  thresholdMinutes: number;
  leads: number;
  qualified: number;
  meeting: number;
  proposal: number;
  won: number;
  lost: number;
  conversionPct: number;
  revenue: number;
  revenuePaid: number;
  revenuePending: number;
  spend: number;
  costPerLead: number | null;
  costPerClient: number | null;
  costPerPayingClient: number | null;
  payingClients: number;
  response: { avgMinutes: number | null; medianMinutes: number | null; answered: number; uncontactedNow: number };
  byOwner: Array<{ ownerId: string | null; name: string | null; leads: number; won: number; revenue: number; avgResponseMinutes: number | null }>;
  bySource: Array<{ source: LeadSource; leads: number; won: number }>;
  byCampaign: Array<{
    campaignId: string; name: string; code: string; leads: number; qualified: number; won: number;
    revenue: number; spend: number; costPerLead: number | null; costPerClient: number | null;
  }>;
  noCampaign: { leads: number; won: number };
  funnel: FunnelStep[];
  dropOff: { fromKey: string | null; fromName: string; toKey: string | null; toName: string; dropPct: number; lost: number } | null;
}

export interface CrmBadges {
  uncontacted: number;
  followUpsDue: number;
  total: number;
  thresholdMinutes: number;
}

export interface CrmSettings {
  responseThresholdMinutes: number;
  stages: LeadStage[];
}

export interface Assignee { id: string; name: string; role: string }

const unwrap = <T,>(r: { data: { data?: T } & T }): T => (r.data.data !== undefined ? r.data.data : (r.data as T));

export const crmApi = {
  listLeads: async (f: LeadFilters = {}): Promise<LeadList> =>
    unwrap(await api.get('/crm/leads', { params: f })),
  getLead: async (id: string): Promise<LeadDetail> => unwrap(await api.get(`/crm/leads/${id}`)),
  createLead: async (d: CreateLeadInput): Promise<LeadDetail> => unwrap(await api.post('/crm/leads', d)),
  updateLead: async (id: string, d: Partial<Pick<Lead, 'name' | 'phone' | 'email' | 'company' | 'source'>> & { estimatedValue?: number; campaignId?: string | null }): Promise<LeadDetail> =>
    unwrap(await api.patch(`/crm/leads/${id}`, d)),
  deleteLead: async (id: string): Promise<void> => { await api.delete(`/crm/leads/${id}`); },
  parse: async (text: string): Promise<QuickAddParse> => unwrap(await api.post('/crm/leads/parse', { text })),
  duplicate: async (phone: string, excludeId?: string): Promise<{ duplicate: DuplicateLead | null }> =>
    unwrap(await api.get('/crm/leads/duplicates', { params: { phone, excludeId } })),
  moveStage: async (id: string, stageId: string, note?: string): Promise<LeadDetail> =>
    unwrap(await api.post(`/crm/leads/${id}/stage`, { stageId, note })),
  assign: async (id: string, assignedToId: string | null): Promise<LeadDetail> =>
    unwrap(await api.post(`/crm/leads/${id}/assign`, { assignedToId })),
  addActivity: async (id: string, type: 'NOTE' | 'CALL' | 'WHATSAPP' | 'MEETING', body?: string): Promise<LeadDetail> =>
    unwrap(await api.post(`/crm/leads/${id}/activities`, { type, body })),
  setFollowUp: async (id: string, at: string, note?: string): Promise<LeadDetail> =>
    unwrap(await api.post(`/crm/leads/${id}/follow-up`, { at, note })),
  followUpDone: async (id: string): Promise<LeadDetail> => unwrap(await api.post(`/crm/leads/${id}/follow-up/done`)),
  markLost: async (id: string, reason: string): Promise<LeadDetail> =>
    unwrap(await api.post(`/crm/leads/${id}/lost`, { reason })),
  convert: async (id: string, d: ConvertInput): Promise<ConvertResult> =>
    unwrap(await api.post(`/crm/leads/${id}/convert`, d)),
  bulk: async (ids: string[], d: { assignedToId?: string | null; stageId?: string }): Promise<{ updated: number; failed: Array<{ id: string; message: string }> }> =>
    unwrap(await api.post('/crm/leads/bulk', { ids, ...d })),
  assignees: async (): Promise<Assignee[]> => unwrap(await api.get('/crm/assignees')),
  badges: async (): Promise<CrmBadges> => unwrap(await api.get('/crm/badges')),
  stats: async (p: { from?: string; to?: string; campaignId?: string } = {}): Promise<CrmStats> =>
    unwrap(await api.get('/crm/stats', { params: p })),

  settings: async (): Promise<CrmSettings> => unwrap(await api.get('/crm/settings')),
  updateSettings: async (d: { responseThresholdMinutes?: number }): Promise<CrmSettings> =>
    unwrap(await api.patch('/crm/settings', d)),
  stages: async (): Promise<LeadStage[]> => unwrap(await api.get('/crm/stages')),
  createStage: async (d: { name: string; color?: string; type?: StageType; metaEvent?: string }): Promise<LeadStage> =>
    unwrap(await api.post('/crm/stages', d)),
  updateStage: async (id: string, d: Partial<{ name: string; color: string; type: StageType; metaEvent: string | null; isActive: boolean }>): Promise<LeadStage> =>
    unwrap(await api.patch(`/crm/stages/${id}`, d)),
  reorderStages: async (ids: string[]): Promise<LeadStage[]> => unwrap(await api.put('/crm/stages/reorder', { ids })),
  deleteStage: async (id: string): Promise<void> => { await api.delete(`/crm/stages/${id}`); },

  campaigns: async (): Promise<Campaign[]> => unwrap(await api.get('/crm/campaigns')),
  createCampaign: async (d: CampaignInput): Promise<Campaign> => unwrap(await api.post('/crm/campaigns', d)),
  updateCampaign: async (id: string, d: Partial<CampaignInput>): Promise<Campaign> =>
    unwrap(await api.patch(`/crm/campaigns/${id}`, d)),
  deleteCampaign: async (id: string): Promise<void> => { await api.delete(`/crm/campaigns/${id}`); },
  spend: async (campaignId: string): Promise<CampaignSpend[]> => unwrap(await api.get(`/crm/campaigns/${campaignId}/spend`)),
  addSpend: async (campaignId: string, d: { dateFrom: string; dateTo?: string; amount: number; note?: string }): Promise<CampaignSpend> =>
    unwrap(await api.post(`/crm/campaigns/${campaignId}/spend`, d)),
  deleteSpend: async (id: string): Promise<void> => { await api.delete(`/crm/spend/${id}`); },
};

/** Best human-readable message from an axios error. */
export const apiErrorMessage = (err: unknown, fallback: string): string => {
  const e = err as { response?: { data?: { message?: string | string[]; error?: string } } };
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m.join(', ');
  return m || e?.response?.data?.error || (err instanceof Error ? err.message : fallback);
};
