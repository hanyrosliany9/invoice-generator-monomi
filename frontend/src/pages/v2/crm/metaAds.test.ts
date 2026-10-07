import { describe, expect, it } from 'vitest';
import { buildAdLink, buildUniversalAdLink, formatMoney, timeAgo } from './crmUtils';
import { syncResultText } from './MetaAdsSyncCard';
import en from '@/i18n/locales/en.json';
import id from '@/i18n/locales/id.json';

const flat = (o: unknown, p = ''): string[] =>
  o && typeof o === 'object'
    ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => flat(v, `${p}${p ? '.' : ''}${k}`))
    : [p];
const val = (o: unknown, path: string) => path.split('.').reduce<unknown>((x, k) => (x as Record<string, unknown>)[k], o);

describe('universal ad link', () => {
  it('is one link for every ad: Meta fills {{campaign.id}} and {{ad.id}}', () => {
    expect(buildUniversalAdLink(undefined)).toBe(
      'https://link.monomiagency.com/?utm_source=meta&utm_medium=paid&utm_campaign={{campaign.id}}&utm_content={{ad.id}}',
    );
    expect(buildUniversalAdLink('https://lp.example.com/')).toBe(
      'https://lp.example.com/?utm_source=meta&utm_medium=paid&utm_campaign={{campaign.id}}&utm_content={{ad.id}}',
    );
  });

  it('keeps the per-code link as the secondary option', () => {
    expect(buildAdLink(undefined, 'FB-OKT1')).toContain('utm_campaign=FB-OKT1');
  });
});

describe('formatMoney (Meta account currency)', () => {
  it('shows IDR as rupiah, other currencies with their code and cents, and a dash for no value', () => {
    expect(formatMoney(1500000, 'IDR')).toBe('Rp 1.500.000');
    expect(formatMoney(1500000)).toBe('Rp 1.500.000');
    expect(formatMoney(12.5, 'USD')).toBe('USD 12.50');
    expect(formatMoney(null, 'USD')).toBe('-');
  });
});

describe('timeAgo ("last sync X ago")', () => {
  const now = new Date('2026-10-07T12:00:00Z');
  it('speaks the UI language', () => {
    expect(timeAgo('2026-10-07T09:00:00Z', 'en', now)).toBe('3 hours ago');
    expect(timeAgo('2026-10-07T09:00:00Z', 'id', now)).toBe('3 jam yang lalu');
    expect(timeAgo('2026-10-05T12:00:00Z', 'en', now)).toBe('2 days ago');
    expect(timeAgo('2026-10-07T11:58:00Z', 'en', now)).toBe('2 minutes ago');
  });
  it('is empty without a time', () => {
    expect(timeAgo(null, 'en', now)).toBe('');
  });
});

describe('Sync now result text', () => {
  const t = (_key: string, fallback: string, opts?: Record<string, unknown>) =>
    fallback.replace(/\{\{(\w+)\}\}/g, (_m, k) => String(opts?.[k] ?? ''));
  it('reports success with the counts and treats every other status as not ok', () => {
    expect(syncResultText(t, { status: 'SUCCESS', insightRows: 3, created: 2 })).toEqual({
      ok: true,
      text: 'Synced: 3 days of spend read, 2 new campaigns.',
    });
    for (const status of ['BUSY', 'RATE_LIMITED', 'INCOMPLETE', 'SKIPPED', 'FAILED'] as const) {
      const r = syncResultText(t, { status });
      expect(r.ok).toBe(false);
      expect(r.text.length).toBeGreaterThan(0);
    }
  });
});

describe('Meta Ads sync i18n', () => {
  it('has en + id text for every new key (same key set, nothing empty)', () => {
    const trees: Array<[unknown, unknown]> = [
      [en.crm.metaAds, id.crm.metaAds],
      [en.crm.campaigns.metaLink, id.crm.campaigns.metaLink],
      [en.crm.campaigns.adLink, id.crm.campaigns.adLink],
      [en.crm.dash.kpi, id.crm.dash.kpi],
    ];
    for (const [e, i] of trees) {
      expect(flat(i).sort()).toEqual(flat(e).sort());
      for (const k of flat(e)) {
        expect(String(val(e, k)).length).toBeGreaterThan(0);
        expect(String(val(i, k)).length).toBeGreaterThan(0);
      }
    }
    for (const k of ['synced', 'syncedNever', 'imprClicks', 'metaBadge', 'spendSplit', 'logSpend']) {
      expect((en.crm.campaigns as Record<string, unknown>)[k]).toBeTruthy();
      expect((id.crm.campaigns as Record<string, unknown>)[k]).toBeTruthy();
    }
  });

  it('relabels "Log spend" as other costs', () => {
    expect(en.crm.campaigns.logSpend).toBe('Log other costs');
    expect(id.crm.campaigns.logSpend).toBe('Catat biaya lain');
  });
});
