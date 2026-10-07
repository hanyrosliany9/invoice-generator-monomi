import { useTranslation } from 'react-i18next';
import type { LeadSource, LeadStage, MetaEventName, MetaEventStatus, ReturningFrom, WaitingOutcome } from '@/services/crm';

/** Default English names of the seeded stages: a renamed system stage shows its custom name. */
const DEFAULT_STAGE_NAMES: Record<string, string> = {
  NEW: 'New', QUALIFIED: 'Qualified', MEETING: 'Meeting', PROPOSAL: 'Proposal', WON: 'Won', LOST: 'Lost',
};

export type Tfn = (key: string, fallback: string, opts?: Record<string, unknown>) => string;

export function useCrmLabels() {
  const { t: rawT, i18n } = useTranslation();
  const t = rawT as unknown as Tfn;

  const stageLabel = (s: { key: string | null; name: string } | null | undefined): string => {
    if (!s) return '';
    if (s.key && DEFAULT_STAGE_NAMES[s.key] === s.name) {
      const map: Record<string, string> = {
        NEW: t('crm.stage.NEW', 'New'),
        QUALIFIED: t('crm.stage.QUALIFIED', 'Qualified'),
        MEETING: t('crm.stage.MEETING', 'Meeting'),
        PROPOSAL: t('crm.stage.PROPOSAL', 'Proposal'),
        WON: t('crm.stage.WON', 'Won'),
        LOST: t('crm.stage.LOST', 'Lost'),
      };
      return map[s.key] ?? s.name;
    }
    return s.name;
  };

  const sourceLabel = (s: LeadSource): string => ({
    WHATSAPP_CTWA: t('crm.source.WHATSAPP_CTWA', 'WhatsApp · Ad'),
    WHATSAPP_ORGANIC: t('crm.source.WHATSAPP_ORGANIC', 'WhatsApp'),
    INSTAGRAM_DM: t('crm.source.INSTAGRAM_DM', 'Instagram DM'),
    REFERRAL: t('crm.source.REFERRAL', 'Referral'),
    WEBSITE: t('crm.source.WEBSITE', 'Website'),
    OTHER: t('crm.source.OTHER', 'Other'),
  }[s]);

  const metaStatusLabel = (e: { eventName: MetaEventName; status: MetaEventStatus } | undefined, name: MetaEventName): string => {
    if (!e) {
      return name === 'Purchase'
        ? t('crm.meta.whenPaid', 'When the invoice is paid')
        : t('crm.meta.notTriggered', 'Not triggered yet');
    }
    return ({
      PENDING_CONFIG: t('crm.meta.status.PENDING_CONFIG', 'Awaiting approval'),
      QUEUED: t('crm.meta.status.QUEUED', 'Queued'),
      SENT: t('crm.meta.status.SENT', 'Sent'),
      FAILED: t('crm.meta.status.FAILED', 'Failed'),
      SKIPPED: t('crm.meta.status.SKIPPED', 'Skipped'),
    } as Record<MetaEventStatus, string>)[e.status];
  };

  /** Which Conversions API route carried (or will carry) the event. */
  const metaRouteLabel = (e: { route?: string } | undefined, hasCtwa: boolean): string | null => {
    if (!e) return null;
    if (e.route === 'WEBSITE') return t('crm.meta.route.website', 'Matched via website click');
    return hasCtwa ? t('crm.meta.route.whatsapp', 'via WhatsApp ad click') : null;
  };

  /** "22 min", "1 h 5 min", "3 d". */
  const formatWait = (minutes: number | null | undefined): string => {
    if (minutes === null || minutes === undefined) return '';
    const m = Math.max(0, Math.round(minutes));
    if (m < 60) return t('crm.time.min', '{{n}} min', { n: m });
    if (m < 60 * 24) {
      const h = Math.floor(m / 60);
      const rest = m % 60;
      return rest === 0
        ? t('crm.time.hour', '{{n}} h', { n: h })
        : t('crm.time.hourMin', '{{h}} h {{m}} min', { h, m: rest });
    }
    return t('crm.time.day', '{{n}} d', { n: Math.floor(m / (60 * 24)) });
  };

  const lang = i18n.language?.startsWith('en') ? 'en-GB' : 'id-ID';
  const formatDateTime = (iso: string | null | undefined): string =>
    iso
      ? new Intl.DateTimeFormat(lang, {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta', hour12: false,
        }).format(new Date(iso))
      : '';
  const formatDate = (iso: string | null | undefined): string =>
    iso
      ? new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(iso))
      : '';

  /**
   * History rows written by the server carry a stable key ("@wa.in: text"),
   * translated here; older rows hold plain (Indonesian) text and pass through.
   */
  const activityText = (body: string | null | undefined): string => {
    const parsed = parseActivityBody(body);
    if (!parsed) return unescapeActivityText(body ?? '');
    const rest = parsed.text;
    switch (parsed.key) {
      case 'wa.in': return join(t('crm.history.waIn', 'Message received'), rest);
      case 'wa.monomi': return join(t('crm.history.waMonomi', 'Replied from the Monomi inbox'), rest);
      case 'wa.phoneApp': return join(t('crm.history.waPhoneApp', 'Replied from the phone (WhatsApp Business)'), rest);
      case 'lead.adClickLinked': return join(t('crm.history.adClickLinked', 'Linked to landing page ad click'), rest);
      case 'lead.fromLandingForm': return join(t('crm.history.fromLandingForm', 'Form filled in on the landing page · Kode'), rest);
      case 'lead.landingFormRepeat': return join(t('crm.history.landingFormRepeat', 'Filled in the landing page form again · Kode'), rest);
      case 'lead.phoneFilled': return t('crm.history.phoneFilled', 'WhatsApp number added, no longer waiting');
      case 'lead.mergedFrom': return join(t('crm.history.mergedFrom', 'Waiting landing-page lead merged into this one · Kode'), rest);
      case 'lead.mergedInto': return join(t('crm.history.mergedInto', 'Duplicate: merged into lead'), rest);
      case 'lead.neverSentWhatsapp': return t('crm.history.neverSentWhatsapp', 'Closed: never sent the WhatsApp message');
      case 'lead.returningClient': {
        const r = parseReturningClient(rest);
        return r ? returningClientText(t, r) : t('crm.history.returningClientPlain', 'Returning client');
      }
      case 'lead.quotationCreated': return t('crm.history.quotationCreated', 'Quotation created');
      case 'lead.converted': {
        const parts = (rest ?? '').split(',').map((p) => p.trim()).filter(Boolean).map((p) => ({
          clientNew: t('crm.history.conv.clientNew', 'New client created'),
          clientLinked: t('crm.history.conv.clientLinked', 'Client linked'),
          project: t('crm.history.conv.project', 'project'),
          quotation: t('crm.history.conv.quotation', 'draft quotation'),
        } as Record<string, string>)[p] ?? p);
        return parts.join(' + ');
      }
      default: return rest ?? body ?? '';
    }
  };

  return { t, stageLabel, sourceLabel, metaStatusLabel, metaRouteLabel, formatWait, formatDateTime, formatDate, activityText };
}

const join = (label: string, text: string | null) => (text ? `${label}: ${text}` : label);

/** "@key: text" -> { key, text } (see backend crm activity bodies); null for plain text. */
export function parseActivityBody(body: string | null | undefined): { key: string; text: string | null } | null {
  const m = body?.match(/^@([A-Za-z]+(?:\.[A-Za-z]+)+)(?::\s?([\s\S]*))?$/);
  // Only the keys the server writes; anything else (a customer's "@John.Doe: hi") is plain text.
  return m && ACTIVITY_KEYS.has(m[1]) ? { key: m[1], text: m[2] ? m[2] : null } : null;
}

const ACTIVITY_KEYS = new Set([
  'wa.in', 'wa.monomi', 'wa.phoneApp', 'lead.converted', 'lead.quotationCreated', 'lead.adClickLinked',
  'lead.fromLandingForm', 'lead.landingFormRepeat', 'lead.phoneFilled', 'lead.mergedFrom', 'lead.mergedInto',
  'lead.neverSentWhatsapp', 'lead.returningClient',
]);

const LEAD_ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

/** "@lead.returningClient: <leadId> <WON|LOST> <name>" -> parts (null when malformed; the id is link-safe). */
export function parseReturningClient(text: string | null | undefined): ReturningFrom | null {
  const m = text?.match(/^(\S+) (WON|LOST) ([\s\S]+)$/);
  if (!m || !LEAD_ID_RE.test(m[1])) return null;
  return { id: m[1], stageType: m[2] as 'WON' | 'LOST', name: m[3] };
}

/** "Returning client: previous lead Rina (Won)". */
export const returningClientText = (t: Tfn, r: Pick<ReturningFrom, 'name' | 'stageType'>): string =>
  t('crm.waiting.returning', 'Returning client: previous lead {{name}} ({{stage}})', {
    name: r.name,
    stage: r.stageType === 'WON' ? t('crm.stage.WON', 'Won') : t('crm.stage.LOST', 'Lost'),
  });

/** Lead from the landing-page form that still waits for its WhatsApp chat (no number yet). */
export const isWaitingLead = (l: { awaitingWhatsapp?: boolean } | null | undefined): boolean => !!l?.awaitingWhatsapp;

/** Card / row subtitle: the number, else "@handle" for a lead that has none yet. */
export const leadContactLine = (l: { name?: string; phone: string | null; instagramHandle?: string | null }): string => {
  const line = l.phone ? displayPhone(l.phone) : l.instagramHandle ? `@${l.instagramHandle}` : '';
  // an auto-created lead may already be named "@handle": do not say it twice
  return line === l.name ? '' : line;
};

/** Toast after a waiting lead got its chat (quick-add, link code, add phone). */
export function waitingOutcomeText(t: Tfn, o: WaitingOutcome, leadName: string): string {
  if (o.outcome === 'filled') {
    const filled = t('crm.waiting.filled', 'Number added to {{name}}.', { name: leadName });
    return o.returningFrom ? `${filled} ${returningClientText(t, o.returningFrom)}.` : filled;
  }
  const merged = t('crm.waiting.merged', 'This number already had a lead: merged into {{name}}.', { name: leadName });
  const tail = o.placeholderDeleted
    ? t('crm.waiting.mergedDeleted', 'The waiting lead was removed (nothing had been done on it).')
    : t('crm.waiting.mergedKept', 'The waiting lead was kept as Lost (Duplicate).');
  return `${merged} ${tail}`;
}

/** Plain activity text: the server escapes a leading "@" typed by people as "\@" (crm.utils escapeActivityText). */
export const unescapeActivityText = (body: string): string => (body.startsWith('\\@') ? body.slice(1) : body);

/** 6281234567890 style id for wa.me links. */
export const waDigits = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  const d = phone.replace(/\D/g, '');
  return d || null;
};

export const waLink = (phone: string | null | undefined, text?: string): string | null => {
  const d = waDigits(phone);
  if (!d) return null;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

/** +6281234567890 -> "+62 812-3456-7890" */
export const displayPhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  const m = phone.match(/^\+62(\d{3})(\d{3,4})(\d{2,5})$/);
  return m ? `+62 ${m[1]}-${m[2]}-${m[3]}` : phone;
};

/** Short "Rina W." style label for dense cards. */
export const toNumber = (v: string | number | null | undefined): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export const idr = (v: number | null | undefined): string =>
  v === null || v === undefined ? '-' : `Rp ${Math.round(v).toLocaleString('id-ID')}`;

/** Compact IDR for KPI tiles: Rp 98 jt / Rp 850 rb. */
export const idrCompact = (v: number | null | undefined, lang: string): string => {
  if (v === null || v === undefined) return '-';
  const abs = Math.abs(v);
  const en = lang.startsWith('en');
  if (abs >= 1e9) return `Rp ${(v / 1e9).toFixed(1).replace(/\.0$/, '')}${en ? 'B' : ' M'}`;
  if (abs >= 1e6) return `Rp ${(v / 1e6).toFixed(1).replace(/\.0$/, '')}${en ? 'M' : ' jt'}`;
  if (abs >= 1e3) return `Rp ${Math.round(v / 1e3)}${en ? 'K' : ' rb'}`;
  return `Rp ${Math.round(v)}`;
};

export const sourceTone = (s: LeadSource): string =>
  s === 'WHATSAPP_CTWA' || s === 'WHATSAPP_ORGANIC'
    ? 'bg-success/15 text-success'
    : 'bg-bg-sunken text-text-secondary';

export const stageAccent = (s: Pick<LeadStage, 'color'>): { backgroundColor: string } => ({ backgroundColor: s.color });

/** Date -> "YYYY-MM-DD" in WIB. */
export const wibDateStr = (d: Date): string => {
  const w = new Date(d.getTime() + 7 * 3600 * 1000);
  return w.toISOString().slice(0, 10);
};

const DEFAULT_LANDING_URL = 'https://link.monomiagency.com';

/**
 * Ad link for the landing page: the campaign code travels as utm_campaign so
 * every WhatsApp chat that starts there can be linked to this campaign.
 * "{{ad.id}}" is Meta's dynamic URL parameter and must stay literal.
 */
export const buildAdLink = (base: string | null | undefined, code: string): string =>
  `${(base || DEFAULT_LANDING_URL).replace(/\/+$/, '')}/?utm_source=meta&utm_medium=paid&utm_campaign=${encodeURIComponent(code)}&utm_content={{ad.id}}`;
