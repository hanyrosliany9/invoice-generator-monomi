import { describe, expect, it } from 'vitest';
import { buildAdLink, parseActivityBody, unescapeActivityText } from './crmUtils';
import { trackingScriptTag } from './TrackingSettingsCard';
import { failureText } from '../calendar/SocialPublishParts';
import en from '@/i18n/locales/en.json';
import id from '@/i18n/locales/id.json';

describe('parseActivityBody (server timeline keys)', () => {
  it('splits "@key: text"', () => {
    expect(parseActivityBody('@wa.in: Halo kak')).toEqual({ key: 'wa.in', text: 'Halo kak' });
    expect(parseActivityBody('@wa.phoneApp: a: b')).toEqual({ key: 'wa.phoneApp', text: 'a: b' });
    expect(parseActivityBody('@lead.converted: clientNew,project,quotation')).toEqual({ key: 'lead.converted', text: 'clientNew,project,quotation' });
    expect(parseActivityBody('@lead.quotationCreated')).toEqual({ key: 'lead.quotationCreated', text: null });
  });

  it('only accepts the keys the server writes (no truncation of customer text)', () => {
    expect(parseActivityBody('@John.Doe: hi')).toBeNull();
    expect(parseActivityBody('@wa.other: x')).toBeNull();
    expect(unescapeActivityText('\\@lead.quotationCreated')).toBe('@lead.quotationCreated');
    expect(unescapeActivityText('plain')).toBe('plain');
  });

  it('leaves legacy rows and plain notes alone', () => {
    expect(parseActivityBody('Pesan masuk: Halo')).toBeNull();
    expect(parseActivityBody('Call me @home.now later')).toBeNull();
    expect(parseActivityBody(null)).toBeNull();
  });

  it('has a translation for every key the backend writes (en + id)', () => {
    for (const k of ['waIn', 'waMonomi', 'waPhoneApp', 'quotationCreated']) {
      expect((en.crm.history as Record<string, string>)[k]).toBeTruthy();
      expect((id.crm.history as Record<string, string>)[k]).toBeTruthy();
    }
    for (const k of ['clientNew', 'clientLinked', 'project', 'quotation']) {
      expect((en.crm.history.conv as Record<string, string>)[k]).toBeTruthy();
      expect((id.crm.history.conv as Record<string, string>)[k]).toBeTruthy();
    }
  });
});

describe('failureText (publish failure reasons)', () => {
  // Minimal i18n: look the key up in the real locale files, else the fallback.
  const make = (lang: 'en' | 'id') => (key: string, fallback: string) => {
    const v = key.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown> | undefined)?.[p], lang === 'en' ? en : id);
    return typeof v === 'string' ? v : fallback;
  };

  it('translates by code and appends the raw Meta detail', () => {
    const pub = { errorCode: 'MEDIA_INVALID', errorMessage: 'Media ditolak Meta / Media rejected by Meta\nunsupported aspect ratio (feed images 4:5 to 1.91:1)' };
    expect(failureText(make('en'), 'en', pub)).toBe('Media rejected by Meta: unsupported aspect ratio (feed images 4:5 to 1.91:1)');
    expect(failureText(make('id'), 'id', pub)).toBe('Media ditolak Meta: unsupported aspect ratio (feed images 4:5 to 1.91:1)');
  });

  it('formats quota numbers and permission detail', () => {
    expect(failureText(make('en'), 'en', { errorCode: 'PUBLISH_LIMIT_REACHED', errorMessage: 'x / y\n95/100' })).toMatch(/limit reached\. Will retry automatically\. \(95\/100\)$/);
    expect(failureText(make('en'), 'en', { errorCode: 'PERMISSION_DENIED', errorMessage: 'x / y\n(#200) no' })).toMatch(/\(Meta: \(#200\) no\)$/);
  });

  it('uses the code alone for fixed messages', () => {
    const pub = { errorCode: 'RATE_LIMITED', errorMessage: 'Meta membatasi ... / Meta is rate-limiting ...' };
    expect(failureText(make('en'), 'en', pub)).toBe('Meta is rate-limiting API calls. Will retry automatically.');
    expect(failureText(make('id'), 'id', pub)).toBe('Meta membatasi jumlah panggilan API sementara. Akan dicoba lagi otomatis.');
  });

  it('shows the right half of legacy "Bahasa / English" rows', () => {
    const legacy = { errorCode: 'MEDIA_INVALID', errorMessage: 'Media ditolak Meta / Media rejected by Meta: unsupported aspect ratio' };
    expect(failureText(make('en'), 'en', legacy)).toBe('Media rejected by Meta: unsupported aspect ratio');
    expect(failureText(make('id'), 'id', legacy)).toBe('Media ditolak Meta: unsupported aspect ratio');
  });

  it('recovers the detail of legacy permission / limit rows and splits at the middle separator', () => {
    const perm = {
      errorCode: 'PERMISSION_DENIED',
      errorMessage: 'Izin Meta kurang (mis. pages_manage_posts / instagram_content_publish) atau aset belum ditugaskan ke system user. / Missing Meta permission (e.g. pages_manage_posts / instagram_content_publish) or the asset is not assigned to the system user. (Meta: (#200) denied)',
    };
    expect(failureText(make('en'), 'en', perm)).toMatch(/^Missing Meta permission .* \(Meta: \(#200\) denied\)$/);
    const limit = { errorCode: 'PUBLISH_LIMIT_REACHED', errorMessage: 'Batas publikasi Instagram 24 jam tercapai (95/100). Akan dicoba lagi otomatis. / Instagram 24-hour publishing limit reached (95/100). Will retry automatically.' };
    expect(failureText(make('id'), 'id', limit)).toMatch(/\(95\/100\)$/);
    // Unknown code: bilingual fallback, split at the separator nearest the middle.
    const other = { errorCode: 'VALIDATION', errorMessage: 'Media (foto / video) wajib diisi untuk Instagram. / Media (photo / video) is required for Instagram.' };
    expect(failureText(make('en'), 'en', other)).toBe('Media (photo / video) is required for Instagram.');
    expect(failureText(make('id'), 'id', other)).toBe('Media (foto / video) wajib diisi untuk Instagram.');
  });

  it('keeps the old duplicate-post row readable (it used the MEDIA_INVALID code)', () => {
    const dup = { errorCode: 'MEDIA_INVALID', errorMessage: 'Facebook menolak postingan duplikat. / Facebook rejected a duplicate post.' };
    expect(failureText(make('en'), 'en', dup)).toBe('Facebook rejected a duplicate post.');
  });

  it('returns null when there is no message', () => {
    expect(failureText(make('en'), 'en', { errorCode: null, errorMessage: null })).toBeNull();
  });
});

describe('landing page tracking (ad click) UI helpers', () => {
  it('builds the Ads Manager link with the campaign code as utm_campaign and a literal {{ad.id}}', () => {
    expect(buildAdLink(undefined, 'FB-OKT1')).toBe(
      'https://link.monomiagency.com/?utm_source=meta&utm_medium=paid&utm_campaign=FB-OKT1&utm_content={{ad.id}}',
    );
    expect(buildAdLink('https://lp.example.com/', 'A B&C')).toBe(
      'https://lp.example.com/?utm_source=meta&utm_medium=paid&utm_campaign=A%20B%26C&utm_content={{ad.id}}',
    );
  });

  it('prints a single script tag served by this backend', () => {
    expect(trackingScriptTag('/api/v1/public/track/monomi-track.js', 'https://admin.monomiagency.com')).toBe(
      '<script async src="https://admin.monomiagency.com/api/v1/public/track/monomi-track.js"></script>',
    );
  });

  it('recognises the server timeline key for a linked ad click', () => {
    expect(parseActivityBody('@lead.adClickLinked: K7QM2X')).toEqual({ key: 'lead.adClickLinked', text: 'K7QM2X' });
  });

  it('has en + id text for every new key (same key set, nothing empty)', () => {
    const flat = (o: unknown, p = ''): string[] =>
      o && typeof o === 'object'
        ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => flat(v, `${p}${p ? '.' : ''}${k}`))
        : [p];
    const val = (o: unknown, path: string) => path.split('.').reduce<unknown>((x, k) => (x as Record<string, unknown>)[k], o);
    const trees: Array<[string, unknown, unknown]> = [
      ['crm.tracking', en.crm.tracking, id.crm.tracking],
      ['crm.adClick', en.crm.adClick, id.crm.adClick],
      ['crm.campaigns.adLink', en.crm.campaigns.adLink, id.crm.campaigns.adLink],
      ['crm.quick.adClick', en.crm.quick.adClick, id.crm.quick.adClick],
      ['crm.meta.route', en.crm.meta.route, id.crm.meta.route],
    ];
    for (const [, e, i] of trees) {
      expect(flat(i).sort()).toEqual(flat(e).sort());
      for (const k of flat(e)) {
        expect(String(val(e, k)).length).toBeGreaterThan(0);
        expect(String(val(i, k)).length).toBeGreaterThan(0);
      }
    }
    expect(en.crm.history.adClickLinked).toBeTruthy();
    expect(id.crm.history.adClickLinked).toBeTruthy();
  });
});
