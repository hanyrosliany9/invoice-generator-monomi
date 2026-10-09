import { describe, expect, it } from 'vitest';
import en from '@/i18n/locales/en.json';
import id from '@/i18n/locales/id.json';
import type { Campaign, LeadDetail } from '@/services/crm';
import { buildTikTokAdLink, buildUniversalAdLink, campaignPlatformKind, type Tfn } from './crmUtils';
import { eventsLine, tiktokSyncResultText } from './TikTokSettingsCard';
import {
  attributionText, showTikTokPanel, tiktokEventHint, tiktokPanelRows, tiktokSpendSplit, tiktokStatusLabel,
} from './tiktokUi';

// Minimal i18n over the real locale files (key lookup, {{x}} interpolation).
const make = (lang: 'en' | 'id'): Tfn => (key, fallback, opts) => {
  const v = key.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown> | undefined)?.[p], lang === 'en' ? en : id);
  const s = typeof v === 'string' ? v : fallback;
  return s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(opts?.[k] ?? ''));
};
const tEn = make('en');
const tId = make('id');
const flat = (o: unknown, p = ''): string[] =>
  o && typeof o === 'object'
    ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => flat(v, `${p}${p ? '.' : ''}${k}`))
    : [p];
const val = (o: unknown, path: string) => path.split('.').reduce<unknown>((x, k) => (x as Record<string, unknown>)[k], o);

describe('TikTok ad link', () => {
  it('is one link for every TikTok ad with the official macros kept literal', () => {
    expect(buildTikTokAdLink(undefined)).toBe(
      'https://link.monomiagency.com/?utm_source=tiktok&utm_medium=paid&utm_campaign=__CAMPAIGN_ID__&utm_term=__AID__&utm_content=__CID__',
    );
    expect(buildTikTokAdLink('https://lp.example.com//')).toBe(
      'https://lp.example.com/?utm_source=tiktok&utm_medium=paid&utm_campaign=__CAMPAIGN_ID__&utm_term=__AID__&utm_content=__CID__',
    );
    // the Meta link is untouched
    expect(buildUniversalAdLink(undefined)).toContain('utm_source=meta');
  });

  it('platform of a campaign: TikTok when linked or marked, else Meta', () => {
    expect(campaignPlatformKind({ platform: 'TIKTOK' })).toBe('TIKTOK');
    expect(campaignPlatformKind({ platform: 'FACEBOOK', tiktokCampaignId: '1790000000000001' })).toBe('TIKTOK');
    expect(campaignPlatformKind({ platform: 'FACEBOOK' })).toBe('META');
    expect(campaignPlatformKind({ platform: 'BOTH', tiktokCampaignId: null })).toBe('META');
  });
});

describe('lead attribution text', () => {
  it('says where the lead\'s events go and why', () => {
    const at = '2026-10-09T03:00:00Z';
    expect(attributionText(tEn, { platform: 'TIKTOK', reason: 'last_touch', ref: 'K7QM2X', at })).toBe('Attributed to TikTok — last ad click before WhatsApp');
    expect(attributionText(tEn, { platform: 'META', reason: 'url_param', ref: 'K7QM2X', at })).toBe('Attributed to Meta — the ad link of the visit that tapped WhatsApp');
    expect(attributionText(tId, { platform: 'TIKTOK', reason: 'last_touch', ref: null, at })).toBe('Diatribusikan ke TikTok — klik iklan terakhir sebelum WhatsApp');
    expect(attributionText(tEn, { platform: 'NONE', reason: 'none', ref: null, at })).toMatch(/^No ad attribution/);
  });
  it('shows nothing for clicks that predate attribution or when no click is linked', () => {
    expect(attributionText(tEn, { platform: null, reason: null, ref: 'K7QM2X', at: '2026-10-09T03:00:00Z' })).toBeNull();
    expect(attributionText(tEn, null)).toBeNull();
    expect(attributionText(tEn, undefined)).toBeNull();
  });
});

describe('Events sent to TikTok panel', () => {
  const lead = (over: Partial<LeadDetail>): Pick<LeadDetail, 'attribution' | 'tiktokEvents' | 'tiktokClickEvent'> => ({
    attribution: null, tiktokEvents: [], tiktokClickEvent: null, ...over,
  });
  it('is shown only for TikTok leads (or leads that already have TikTok events)', () => {
    expect(showTikTokPanel(lead({}))).toBe(false);
    expect(showTikTokPanel(lead({ attribution: { platform: 'META', reason: 'url_param', ref: null, at: '' } }))).toBe(false);
    expect(showTikTokPanel(lead({ attribution: { platform: 'TIKTOK', reason: 'url_param', ref: null, at: '' } }))).toBe(true);
    // the lead switched to Meta later but TikTok already got events: keep showing what was sent
    expect(showTikTokPanel(lead({
      attribution: { platform: 'META', reason: 'url_param', ref: null, at: '' },
      tiktokEvents: [{ id: '1', eventName: 'Lead', status: 'SENT', value: null, eventTime: 't', sentAt: 't', lastError: null }],
    }))).toBe(true);
  });

  it('lists Contact, Lead, CompleteRegistration, Purchase with their status; Contact comes from the tap\'s click', () => {
    const rows = tiktokPanelRows(lead({
      tiktokClickEvent: { status: 'SENT', eventTime: 'e1', sentAt: 's1', lastError: null },
      tiktokEvents: [
        { id: '2', eventName: 'Lead', status: 'PENDING_CONFIG', value: null, eventTime: 'e2', sentAt: null, lastError: null },
        { id: '3', eventName: 'CompleteRegistration', status: 'SKIPPED', value: null, eventTime: 'e3', sentAt: null, lastError: 'event older than 7 days' },
      ],
    }));
    expect(rows.map((r) => [r.name, r.status, r.at])).toEqual([
      ['Contact', 'SENT', 's1'],
      ['Lead', 'PENDING_CONFIG', 'e2'],
      ['CompleteRegistration', 'SKIPPED', 'e3'],
      ['Purchase', null, null],
    ]);
    expect(rows.map((r) => tiktokStatusLabel(tEn, r))).toEqual(['Sent', 'Waiting to be sent', 'Skipped', 'When the invoice is paid']);
    expect(rows[2].error).toBe('event older than 7 days');
    expect(tiktokStatusLabel(tEn, { name: 'Lead', status: null, at: null, error: null })).toBe('When the WhatsApp chat arrives');
    expect(tiktokStatusLabel(tId, { name: 'CompleteRegistration', status: null, at: null, error: null })).toBe('Saat lead menjadi Qualified');
    expect(tiktokEventHint(tEn, 'Purchase')).toMatch(/IDR/);
  });
});

describe('campaign spend line with TikTok', () => {
  const base = { tiktokSpend: 0, tiktokCurrency: 'IDR', tiktokSeparate: false, metaSpend: 0, manualSpend: 0, spendCurrency: 'IDR' } as Pick<
    Campaign, 'tiktokSpend' | 'tiktokCurrency' | 'tiktokSeparate' | 'metaSpend' | 'manualSpend' | 'spendCurrency'>;
  it('falls back to the Meta wording when TikTok has no spend', () => {
    expect(tiktokSpendSplit(tEn, base)).toBeNull();
  });
  it('shows TikTok + other costs, or Meta + TikTok + other costs', () => {
    expect(tiktokSpendSplit(tEn, { ...base, tiktokSpend: 250_000, manualSpend: 50_000 })).toBe('TikTok Rp 250.000 + other costs Rp 50.000');
    expect(tiktokSpendSplit(tEn, { ...base, tiktokSpend: 250_000, metaSpend: 100_000 })).toBe('Meta Rp 100.000 + TikTok Rp 250.000 + other costs Rp 0');
    expect(tiktokSpendSplit(tId, { ...base, tiktokSpend: 250_000 })).toBe('TikTok Rp 250.000 + biaya lain Rp 0');
  });
  it('keeps a foreign-currency TikTok account apart from the rupiah totals', () => {
    const s = tiktokSpendSplit(tEn, { ...base, tiktokSpend: 12.5, tiktokCurrency: 'USD', tiktokSeparate: true, manualSpend: 50_000 })!;
    expect(s).toContain('USD 12.50');
    expect(s).toContain('not added to the rupiah totals');
    expect(s).toContain('Rp 50.000');
  });
});

describe('TikTok settings card text', () => {
  it('the events counter line', () => {
    expect(eventsLine(tEn, { SENT: 4, FAILED: 1, PENDING_CONFIG: 2, QUEUED: 1, SKIPPED: 5 })).toBe('sent 4 · failed 1 · waiting 3 · skipped 5');
    expect(eventsLine(tId, { SENT: 4, FAILED: 1, PENDING_CONFIG: 2, QUEUED: 1, SKIPPED: 5 })).toBe('terkirim 4 · gagal 1 · menunggu 3 · dilewati 5');
  });
  it('what "Sync now" did', () => {
    expect(tiktokSyncResultText(tEn, { status: 'SUCCESS', insightRows: 12, created: 2 })).toEqual({ ok: true, text: 'Synced: 12 days of spend read, 2 new campaigns.' });
    for (const status of ['BUSY', 'RATE_LIMITED', 'INCOMPLETE', 'SKIPPED', 'FAILED'] as const) {
      const r = tiktokSyncResultText(tEn, { status });
      expect(r.ok).toBe(false);
      expect(r.text.length).toBeGreaterThan(10);
    }
  });
});

describe('TikTok i18n (en + id)', () => {
  it('has the same key set in both languages and nothing empty', () => {
    const trees: Array<[string, unknown, unknown]> = [
      ['crm.tiktok', (en.crm as Record<string, unknown>).tiktok, (id.crm as Record<string, unknown>).tiktok],
      ['crm.attribution', (en.crm as Record<string, unknown>).attribution, (id.crm as Record<string, unknown>).attribution],
    ];
    for (const [, e, i] of trees) {
      expect(e).toBeTruthy();
      expect(flat(i).sort()).toEqual(flat(e).sort());
      for (const k of flat(e)) {
        expect(String(val(e, k)).length).toBeGreaterThan(0);
        expect(String(val(i, k)).length).toBeGreaterThan(0);
      }
    }
    for (const k of [
      'crm.campaigns.platform.TIKTOK', 'crm.campaigns.tiktokBadge', 'crm.campaigns.tiktokAdLink.help', 'crm.campaigns.tiktokLink.title',
      'crm.campaigns.syncedTikTok', 'crm.campaigns.spendSplitTikTok', 'crm.dash.byPlatform', 'crm.dash.kpi.spendHintTikTok', 'crm.dash.syncedFromTikTok',
    ]) {
      expect(String(val(en, k) ?? '').length).toBeGreaterThan(0);
      expect(String(val(id, k) ?? '').length).toBeGreaterThan(0);
    }
  });

  it('every {{placeholder}} of an English text also exists in its Indonesian twin', () => {
    const ph = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
    for (const root of ['crm.tiktok', 'crm.attribution']) {
      const e = val(en, root);
      const i = val(id, root);
      for (const k of flat(e)) expect(ph(String(val(i, k)))).toEqual(ph(String(val(e, k))));
    }
  });

  it('the ad link help keeps the three macros and the UPPERCASE rule in both languages', () => {
    for (const tree of [en, id]) {
      const s = String(val(tree, 'crm.campaigns.tiktokAdLink.help'));
      for (const macro of ['__CAMPAIGN_ID__', '__AID__', '__CID__', 'ttclid']) expect(s).toContain(macro);
    }
  });
});
