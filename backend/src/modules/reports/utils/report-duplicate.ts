/**
 * Helpers for "copy to next month": move a report's period forward and adapt
 * a title/description that mentions the old month or year.
 */

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface Period {
  month: number;
  year: number;
}

/** The period right after `p` (December rolls over to January of the next year). */
export function nextPeriod(p: Period): Period {
  return p.month >= 12 ? { month: 1, year: p.year + 1 } : { month: p.month + 1, year: p.year };
}

/**
 * Replace month names (Indonesian or English, keeping the language and
 * capitalisation style) and the 4-digit year of `from` with those of `to`.
 * Text that mentions neither is returned unchanged.
 */
export function retitleForPeriod(text: string, from: Period, to: Period): string {
  if (!text) return text;
  const names = [...MONTHS_ID, ...MONTHS_EN];
  const re = new RegExp(String.raw`\b(${names.join("|")})\b`, "gi");
  let out = text.replace(re, (m) => {
    const lower = m.toLowerCase();
    const idIdx = MONTHS_ID.findIndex((n) => n.toLowerCase() === lower);
    const enIdx = MONTHS_EN.findIndex((n) => n.toLowerCase() === lower);
    // Only swap the month that is the report's own month; others stay.
    const isOwn = idIdx === from.month - 1 || enIdx === from.month - 1;
    if (!isOwn) return m;
    const target = idIdx >= 0 ? MONTHS_ID[to.month - 1] : MONTHS_EN[to.month - 1];
    if (m === m.toUpperCase()) return target.toUpperCase();
    if (m === m.toLowerCase()) return target.toLowerCase();
    return target;
  });
  out = out.replace(new RegExp(String.raw`\b${from.year}\b`, "g"), String(to.year));
  return out;
}
