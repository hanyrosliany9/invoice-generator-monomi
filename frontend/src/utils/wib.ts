/**
 * WIB (Asia/Jakarta, UTC+7, no DST) helpers for the content planner.
 *
 * The planner always shows and edits schedule times in WIB regardless of the
 * time zone of the browser. WIB has a fixed +7h offset, so plain arithmetic is
 * exact and avoids depending on the Intl time-zone data of the runtime.
 */

export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
export const WIB_LABEL = 'WIB';

export interface WibParts {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Calendar/clock parts of an instant as seen in WIB. */
export function wibParts(input: string | number | Date): WibParts {
  const shifted = new Date(new Date(input).getTime() + WIB_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/** The instant for a wall-clock date/time in WIB. */
export function wibToDate(
  year: number, month: number, day: number, hour = 0, minute = 0,
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - WIB_OFFSET_MS);
}

/** ISO string for a WIB wall-clock date/time. */
export function wibToIso(
  year: number, month: number, day: number, hour = 0, minute = 0,
): string {
  return wibToDate(year, month, day, hour, minute).toISOString();
}

/** Day bucket key (yyyy-MM-dd) of an instant in WIB. */
export function wibDayKey(input: string | number | Date): string {
  const p = wibParts(input);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** "HH:mm" of an instant in WIB. */
export function wibTime(input: string | number | Date): string {
  const p = wibParts(input);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** Combine a picked calendar date (local components) and an "HH:mm" WIB time. */
export function combineWib(pickedDate: Date, time: string): string {
  const [h, m] = time.split(':').map(Number);
  return wibToIso(
    pickedDate.getFullYear(), pickedDate.getMonth() + 1, pickedDate.getDate(),
    h || 0, m || 0,
  );
}

/**
 * Local Date (midnight) carrying the WIB calendar day of an instant. This is
 * what a date picker / month grid cell expects, and is independent of the
 * zone of the browser.
 */
export function wibCalendarDate(input: string | number | Date): Date {
  const p = wibParts(input);
  return new Date(p.year, p.month - 1, p.day);
}

/** Move an instant to another WIB calendar day, keeping the WIB time of day. */
export function moveToWibDay(input: string | number | Date, target: Date): string {
  const p = wibParts(input);
  return wibToIso(target.getFullYear(), target.getMonth() + 1, target.getDate(), p.hour, p.minute);
}

/** Next whole hour strictly after `now`, as a WIB date + "HH:mm". */
export function nextWibHourSlot(now: Date = new Date()): { date: Date; time: string } {
  const p = wibParts(now);
  const next = wibToDate(p.year, p.month, p.day, p.hour + 1, 0);
  return { date: wibCalendarDate(next), time: wibTime(next) };
}

/** Is the WIB wall-clock `date` + `time` already in the past? */
export function isPastWib(pickedDate: Date, time: string, now: Date = new Date()): boolean {
  return new Date(combineWib(pickedDate, time)).getTime() < now.getTime();
}

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "8 Okt 2026 19:30 WIB" (no browser time zone involved). */
export function formatWib(
  input: string | number | Date,
  opts: { lang?: string; withYear?: boolean; withLabel?: boolean; withTime?: boolean } = {},
): string {
  const { lang = 'id', withYear = true, withLabel = true, withTime = true } = opts;
  const p = wibParts(input);
  const months = lang.toLowerCase().startsWith('id') ? MONTHS_ID : MONTHS_EN;
  let out = `${p.day} ${months[p.month - 1]}`;
  if (withYear) out += ` ${p.year}`;
  if (withTime) out += ` ${pad(p.hour)}:${pad(p.minute)}`;
  if (withTime && withLabel) out += ` ${WIB_LABEL}`;
  return out;
}
