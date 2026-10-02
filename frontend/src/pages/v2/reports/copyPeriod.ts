export interface Period { month: number; year: number }

export const nextMonth = (p: Period): Period =>
  (p.month >= 12 ? { month: 1, year: p.year + 1 } : { month: p.month + 1, year: p.year });

/**
 * The first period after `source` that is not in `taken` ("year-month" keys),
 * plus the periods skipped on the way (each already has a report).
 */
export function pickNextFreePeriod(source: Period, taken: Set<string>): { target: Period; skipped: Period[] } {
  const key = (p: Period) => `${p.year}-${p.month}`;
  const skipped: Period[] = [];
  let target = nextMonth(source);
  for (let i = 0; i < 24 && taken.has(key(target)); i++) {
    skipped.push(target);
    target = nextMonth(target);
  }
  return { target, skipped };
}
