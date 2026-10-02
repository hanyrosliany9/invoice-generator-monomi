import { describe, expect, it } from 'vitest';
import {
  combineWib, formatWib, isPastWib, moveToWibDay, nextWibHourSlot,
  wibCalendarDate, wibDayKey, wibParts, wibTime, wibToIso,
} from './wib';

describe('wib helpers', () => {
  it('converts a WIB wall-clock time to UTC and back', () => {
    // 19:30 WIB on 8 Oct == 12:30Z (matches the stored value seen in the audit)
    expect(wibToIso(2026, 10, 8, 19, 30)).toBe('2026-10-08T12:30:00.000Z');
    expect(wibParts('2026-10-08T12:30:00.000Z')).toEqual({
      year: 2026, month: 10, day: 8, hour: 19, minute: 30,
    });
    expect(wibTime('2026-10-08T12:30:00.000Z')).toBe('19:30');
  });

  it('rolls the WIB calendar day over midnight (17:00Z is already tomorrow in WIB)', () => {
    expect(wibDayKey('2026-10-08T17:00:00.000Z')).toBe('2026-10-09');
    expect(wibDayKey('2026-10-08T16:59:00.000Z')).toBe('2026-10-08');
    expect(wibDayKey('2026-12-31T20:00:00.000Z')).toBe('2027-01-01');
  });

  it('combineWib uses the picked calendar date and a WIB time, independent of the browser zone', () => {
    const picked = new Date(2026, 9, 14); // 14 Oct, local midnight
    expect(combineWib(picked, '09:00')).toBe('2026-10-14T02:00:00.000Z');
    expect(combineWib(picked, '00:30')).toBe('2026-10-13T17:30:00.000Z');
  });

  it('wibCalendarDate round-trips with combineWib', () => {
    const iso = '2026-10-13T17:30:00.000Z'; // 14 Oct 00:30 WIB
    const d = wibCalendarDate(iso);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 10, 14]);
    expect(combineWib(d, wibTime(iso))).toBe(iso);
  });

  it('moveToWibDay keeps the WIB time of day', () => {
    const moved = moveToWibDay('2026-10-08T12:30:00.000Z', new Date(2026, 9, 20));
    expect(moved).toBe('2026-10-20T12:30:00.000Z');
    // an early-morning WIB slot crosses the UTC date line but stays 00:30 WIB
    const early = moveToWibDay('2026-10-07T17:30:00.000Z', new Date(2026, 9, 20));
    expect(wibTime(early)).toBe('00:30');
    expect(wibDayKey(early)).toBe('2026-10-20');
  });

  it('nextWibHourSlot is the next whole WIB hour', () => {
    // 10:20 WIB -> 11:00 WIB the same day
    const s = nextWibHourSlot(new Date('2026-10-02T03:20:00.000Z'));
    expect(s.time).toBe('11:00');
    expect([s.date.getMonth() + 1, s.date.getDate()]).toEqual([10, 2]);
    // 23:40 WIB -> 00:00 WIB next day
    const n = nextWibHourSlot(new Date('2026-10-02T16:40:00.000Z'));
    expect(n.time).toBe('00:00');
    expect(n.date.getDate()).toBe(3);
  });

  it('isPastWib compares in WIB', () => {
    const now = new Date('2026-10-02T03:00:00.000Z'); // 10:00 WIB
    expect(isPastWib(new Date(2026, 9, 2), '09:00', now)).toBe(true);
    expect(isPastWib(new Date(2026, 9, 2), '10:30', now)).toBe(false);
  });

  it('formats with a WIB label in both languages', () => {
    expect(formatWib('2026-10-08T12:30:00.000Z')).toBe('8 Okt 2026 19:30 WIB');
    expect(formatWib('2026-10-08T12:30:00.000Z', { lang: 'en', withYear: false })).toBe('8 Oct 19:30 WIB');
  });
});
