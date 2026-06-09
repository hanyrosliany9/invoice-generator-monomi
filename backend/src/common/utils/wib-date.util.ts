/**
 * WIB (Asia/Jakarta, UTC+7) date helpers.
 *
 * The business operates in WIB but several columns are `timestamp without time
 * zone` and Node's `new Date()` / `getMonth()` work in UTC. Extracting
 * year/month with the plain getters returns the UTC month, which is wrong
 * around midnight WIB (e.g. 2026-03-31T17:30Z is already 2026-04-01 in WIB).
 * Use these helpers wherever a WIB calendar date/period is needed (document
 * number prefixes, report period grouping, "today" comparisons).
 */

export const WIB_TZ = "Asia/Jakarta";

/** WIB calendar parts for a date (defaults to now). month is 1-12. */
export function wibParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
} {
  // en-CA gives YYYY-MM-DD which is trivially parseable.
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const [year, month, day] = s.split("-").map((n) => parseInt(n, 10));
  return { year, month, day };
}

/** WIB full year. */
export function wibYear(date: Date = new Date()): number {
  return wibParts(date).year;
}

/** WIB month, 1-12. */
export function wibMonth(date: Date = new Date()): number {
  return wibParts(date).month;
}

/** WIB calendar date string, "YYYY-MM-DD". */
export function wibDateStr(date: Date = new Date()): string {
  const { year, month, day } = wibParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** WIB "YYYY-MM" period key for grouping. */
export function wibPeriodKey(date: Date = new Date()): string {
  const { year, month } = wibParts(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * The instant of WIB midnight (start of the WIB calendar day) for the given
 * date, as a Date (UTC instant). Use for "is X today/in the future" guards.
 */
export function wibStartOfDay(date: Date = new Date()): Date {
  const { year, month, day } = wibParts(date);
  // WIB midnight = previous day 17:00 UTC.
  return new Date(
    Date.UTC(year, month - 1, day, 0, 0, 0) - 7 * 60 * 60 * 1000,
  );
}

/**
 * The LAST instant (23:59:59.999) of the WIB calendar day for the given date,
 * as a Date (UTC instant). Use as an INCLUSIVE upper bound for "as of <date>"
 * report filters so entries timestamped later the same WIB day aren't dropped.
 * e.g. 2026-06-09 → 2026-06-09T16:59:59.999Z (= WIB 2026-06-09 23:59:59.999).
 */
export function wibEndOfDay(date: Date = new Date()): Date {
  const { year, month, day } = wibParts(date);
  // WIB midnight (prev-day 17:00 UTC) + 24h − 1ms.
  return new Date(
    Date.UTC(year, month - 1, day, 0, 0, 0) -
      7 * 60 * 60 * 1000 +
      24 * 60 * 60 * 1000 -
      1,
  );
}

/** First instant of the WIB month containing `date`. */
export function wibStartOfMonth(date: Date = new Date()): Date {
  const { year, month } = wibParts(date);
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - 7 * 60 * 60 * 1000);
}

/**
 * Whole WIB calendar days from `from` to `to` (to − from). Both are reduced to
 * their WIB calendar date first, so the result is timezone-stable (no
 * fractional-day UTC drift).
 */
export function wibDayDiff(from: Date, to: Date): number {
  const a = Date.parse(wibDateStr(from) + "T00:00:00Z");
  const b = Date.parse(wibDateStr(to) + "T00:00:00Z");
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}
