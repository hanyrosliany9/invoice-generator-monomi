import { describe, expect, it } from 'vitest';
import en from '@/i18n/locales/en.json';
import id from '@/i18n/locales/id.json';
import {
  displayPhone, isWaitingLead, leadContactLine, parseActivityBody, waDigits, waitingOutcomeText, waLink, type Tfn,
} from './crmUtils';

// Minimal i18n over the real locale files (key lookup, {{x}} interpolation).
const make = (lang: 'en' | 'id'): Tfn => (key, fallback, opts) => {
  const v = key.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown> | undefined)?.[p], lang === 'en' ? en : id);
  const s = typeof v === 'string' ? v : fallback;
  return s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(opts?.[k] ?? ''));
};

describe('waiting leads (landing-page form, no WhatsApp yet)', () => {
  it('recognises the server timeline keys of the auto-lead flow (and nothing that merely looks like one)', () => {
    expect(parseActivityBody('@lead.fromLandingForm: K7QM2X')).toEqual({ key: 'lead.fromLandingForm', text: 'K7QM2X' });
    expect(parseActivityBody('@lead.landingFormRepeat: K7QM2X')).toEqual({ key: 'lead.landingFormRepeat', text: 'K7QM2X' });
    expect(parseActivityBody('@lead.phoneFilled')).toEqual({ key: 'lead.phoneFilled', text: null });
    expect(parseActivityBody('@lead.mergedFrom: K7QM2X, ABCD23')).toEqual({ key: 'lead.mergedFrom', text: 'K7QM2X, ABCD23' });
    expect(parseActivityBody('@lead.mergedInto: @kopi.senja')).toEqual({ key: 'lead.mergedInto', text: '@kopi.senja' });
    expect(parseActivityBody('@lead.neverSentWhatsapp')).toEqual({ key: 'lead.neverSentWhatsapp', text: null });
    expect(parseActivityBody('@lead.fromLandingFormX: hi')).toBeNull();
  });

  it('has en + id text for every new key (same key set, nothing empty)', () => {
    const flat = (o: unknown, p = ''): string[] =>
      o && typeof o === 'object'
        ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => flat(v, `${p}${p ? '.' : ''}${k}`))
        : [p];
    const enW = (en.crm as Record<string, unknown>).waiting;
    const idW = (id.crm as Record<string, unknown>).waiting;
    expect(flat(idW).sort()).toEqual(flat(enW).sort());
    for (const k of flat(enW)) expect(make('en')(`crm.waiting.${k}`, '')).not.toBe('');
    for (const k of ['fromLandingForm', 'landingFormRepeat', 'phoneFilled', 'mergedFrom', 'mergedInto', 'neverSentWhatsapp']) {
      expect((en.crm.history as Record<string, unknown>)[k]).toBeTruthy();
      expect((id.crm.history as Record<string, unknown>)[k]).toBeTruthy();
    }
    for (const k of ['brand', 'category']) {
      expect((en.crm.info as Record<string, unknown>)[k]).toBeTruthy();
      expect((id.crm.info as Record<string, unknown>)[k]).toBeTruthy();
    }
    expect(make('en')('crm.waiting.badge', '')).toBe('Waiting for WhatsApp');
    expect(make('id')('crm.waiting.badge', '')).toBe('Menunggu WhatsApp');
    const steps = (lang: typeof en) => (lang.guides.items as Record<string, { steps: Record<string, { title: string; body: string }> }>)['crm-leads-whatsapp'].steps;
    expect(steps(en)['lead-menunggu-wa'].body).toContain('Waiting for WhatsApp');
    expect(steps(id)['lead-menunggu-wa'].body).toContain('Menunggu WhatsApp');
  });

  it('banner text names the Kode', () => {
    expect(make('en')('crm.waiting.banner', '', { ref: 'K7QM2X' })).toBe('No phone yet — waiting for the WhatsApp message with Kode K7QM2X');
    expect(make('id')('crm.waiting.banner', '', { ref: 'K7QM2X' })).toBe('Belum ada nomor — menunggu pesan WhatsApp dengan Kode K7QM2X');
  });

  it('outcome toasts for fill-in and merge', () => {
    const t = make('en');
    expect(waitingOutcomeText(t, { outcome: 'filled', leadId: 'L1' }, 'Rina')).toBe('Number added to Rina.');
    expect(waitingOutcomeText(t, { outcome: 'merged', leadId: 'L0', fromLeadId: 'L1', placeholderDeleted: true }, 'Budi'))
      .toBe('This number already had a lead: merged into Budi. The waiting lead was removed (nothing had been done on it).');
    expect(waitingOutcomeText(make('id'), { outcome: 'merged', leadId: 'L0', fromLeadId: 'L1', placeholderDeleted: false }, 'Budi'))
      .toBe('Nomor ini sudah punya lead: digabung ke Budi. Lead yang menunggu disimpan sebagai Kalah (Duplikat).');
  });

  it('every phone consumer accepts null: no wa.me link, no digits, empty display, handle as the contact line', () => {
    expect(waLink(null)).toBeNull();
    expect(waLink(undefined, 'hi')).toBeNull();
    expect(waDigits(null)).toBeNull();
    expect(displayPhone(null)).toBe('');
    expect(leadContactLine({ phone: null, instagramHandle: 'kopi.senja' })).toBe('@kopi.senja');
    expect(leadContactLine({ phone: null, instagramHandle: null })).toBe('');
    expect(leadContactLine({ name: '@kopi.senja', phone: null, instagramHandle: 'kopi.senja' })).toBe('');
    expect(leadContactLine({ phone: '+6281234567890', instagramHandle: 'kopi.senja' })).toBe('+62 812-3456-7890');
    expect(isWaitingLead({ awaitingWhatsapp: true })).toBe(true);
    expect(isWaitingLead({})).toBe(false);
    expect(isWaitingLead(null)).toBe(false);
  });
});
