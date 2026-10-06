import { useTranslation } from 'react-i18next';
import type { LeadSource, LeadStage, MetaEventName, MetaEventStatus } from '@/services/crm';

/** Default English names of the seeded stages: a renamed system stage shows its custom name. */
const DEFAULT_STAGE_NAMES: Record<string, string> = {
  NEW: 'New', QUALIFIED: 'Qualified', MEETING: 'Meeting', PROPOSAL: 'Proposal', WON: 'Won', LOST: 'Lost',
};

type Tfn = (key: string, fallback: string, opts?: Record<string, unknown>) => string;

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

  return { t, stageLabel, sourceLabel, metaStatusLabel, formatWait, formatDateTime, formatDate };
}

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
