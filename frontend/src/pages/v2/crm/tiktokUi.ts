import type { AdPlatform, Campaign, LeadDetail, MetaEventStatus, TikTokEventName } from '@/services/crm';
import { formatMoney } from './crmUtils';

type T = (key: string, fallback: string, opts?: Record<string, unknown>) => string;

export const TIKTOK_EVENTS: TikTokEventName[] = ['Contact', 'Lead', 'CompleteRegistration', 'Purchase'];

const platformName = (t: T, p: AdPlatform): string =>
  p === 'TIKTOK' ? t('crm.attribution.platform.TIKTOK', 'TikTok') : p === 'META' ? t('crm.attribution.platform.META', 'Meta') : '';

/**
 * "Attributed to TikTok — last ad click before WhatsApp". null when the click predates the
 * attribution (nothing known) so the UI shows nothing instead of guessing.
 */
export function attributionText(t: T, a: LeadDetail['attribution']): string | null {
  if (!a || !a.platform) return null;
  if (a.platform === 'NONE') return t('crm.attribution.none', 'No ad attribution (organic visit): no ad platform gets this lead\'s events.');
  const reason = a.reason === 'url_param'
    ? t('crm.attribution.reason.url_param', 'the ad link of the visit that tapped WhatsApp')
    : t('crm.attribution.reason.last_touch', 'last ad click before WhatsApp');
  return t('crm.attribution.line', 'Attributed to {{platform}} — {{reason}}', { platform: platformName(t, a.platform), reason });
}

/** The "Events sent to TikTok" panel only makes sense for a lead whose events go to TikTok (or already did). */
export function showTikTokPanel(lead: Pick<LeadDetail, 'attribution' | 'tiktokEvents' | 'tiktokClickEvent'>): boolean {
  return lead.attribution?.platform === 'TIKTOK' || (lead.tiktokEvents?.length ?? 0) > 0 || !!lead.tiktokClickEvent;
}

export interface TikTokPanelRow {
  name: TikTokEventName;
  status: MetaEventStatus | null;
  at: string | null;
  error: string | null;
}

/** One row per TikTok event: Contact belongs to the tap's click, the others to the lead. */
export function tiktokPanelRows(lead: Pick<LeadDetail, 'tiktokEvents' | 'tiktokClickEvent'>): TikTokPanelRow[] {
  return TIKTOK_EVENTS.map((name) => {
    const row = name === 'Contact'
      ? (lead.tiktokClickEvent ? { status: lead.tiktokClickEvent.status, at: lead.tiktokClickEvent.sentAt ?? lead.tiktokClickEvent.eventTime, error: lead.tiktokClickEvent.lastError } : null)
      : (() => {
        const e = lead.tiktokEvents?.find((x) => x.eventName === name);
        return e ? { status: e.status, at: e.sentAt ?? e.eventTime, error: e.lastError } : null;
      })();
    return { name, status: row?.status ?? null, at: row?.at ?? null, error: row?.error ?? null };
  });
}

export function tiktokStatusLabel(t: T, row: TikTokPanelRow): string {
  if (!row.status) {
    return row.name === 'Purchase'
      ? t('crm.meta.whenPaid', 'When the invoice is paid')
      : row.name === 'CompleteRegistration'
        ? t('crm.tiktok.panel.whenQualified', 'When the lead is Qualified')
        : row.name === 'Lead'
          ? t('crm.tiktok.panel.whenChat', 'When the WhatsApp chat arrives')
          : t('crm.meta.notTriggered', 'Not triggered yet');
  }
  return ({
    PENDING_CONFIG: t('crm.tiktok.panel.status.PENDING_CONFIG', 'Waiting to be sent'),
    QUEUED: t('crm.meta.status.QUEUED', 'Queued'),
    SENT: t('crm.meta.status.SENT', 'Sent'),
    FAILED: t('crm.meta.status.FAILED', 'Failed'),
    SKIPPED: t('crm.meta.status.SKIPPED', 'Skipped'),
  } as Record<MetaEventStatus, string>)[row.status];
}

/** What each TikTok event means, one short line under its name. */
export function tiktokEventHint(t: T, name: TikTokEventName): string {
  return ({
    Contact: t('crm.tiktok.panel.hint.Contact', 'Sent when the WhatsApp button was tapped'),
    Lead: t('crm.tiktok.panel.hint.Lead', 'The chat arrived and the phone number is known'),
    CompleteRegistration: t('crm.tiktok.panel.hint.CompleteRegistration', 'The lead reached Qualified (or later)'),
    Purchase: t('crm.tiktok.panel.hint.Purchase', 'Paid, with the value in IDR'),
  } as Record<TikTokEventName, string>)[name];
}

/**
 * Spend line of a campaign that has TikTok spend ("TikTok Rp 1.000.000 + other costs Rp 0"); null when
 * TikTok has no spend there, so the caller keeps the original Meta wording.
 */
export function tiktokSpendSplit(
  t: T,
  c: Pick<Campaign, 'tiktokSpend' | 'tiktokCurrency' | 'tiktokSeparate' | 'metaSpend' | 'manualSpend' | 'spendCurrency'>,
): string | null {
  const tiktok = c.tiktokSpend ?? 0;
  if (tiktok <= 0) return null;
  const meta = c.metaSpend ?? 0;
  const tt = formatMoney(tiktok, c.tiktokCurrency);
  const other = formatMoney(c.manualSpend ?? 0, c.tiktokSeparate ? 'IDR' : (c.tiktokCurrency ?? c.spendCurrency));
  if (c.tiktokSeparate) {
    return t('crm.campaigns.spendTikTokSeparate', 'TikTok {{tiktok}} is in another currency and is not added to the rupiah totals. Other costs {{other}}.', { tiktok: tt, other });
  }
  if (meta > 0) {
    return t('crm.campaigns.spendSplitBoth', 'Meta {{meta}} + TikTok {{tiktok}} + other costs {{other}}', { meta: formatMoney(meta, c.spendCurrency), tiktok: tt, other });
  }
  return t('crm.campaigns.spendSplitTikTok', 'TikTok {{tiktok}} + other costs {{other}}', { tiktok: tt, other });
}
