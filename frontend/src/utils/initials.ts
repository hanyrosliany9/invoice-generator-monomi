/**
 * Avatar initials: the first letter/digit of up to `max` words. Unicode-aware;
 * punctuation and symbols are skipped and bracketed tags are ignored, so
 * "[DEMO] Kopi Senja" gives "KS".
 * A single-word name yields up to two characters. Falls back to `fallback`.
 */
export function getInitials(
  name?: string | null,
  opts: { max?: number; fallback?: string; skipLegalPrefix?: boolean } = {},
): string {
  const { max = 2, fallback = '?', skipLegalPrefix = false } = opts;
  const raw = (name ?? '').split(/\s+/).filter(Boolean);
  // Bracketed tags such as "[DEMO]" aren't part of the name; ignore them unless
  // they are all there is.
  const untagged = raw.filter((w) => !/^[[(<{].*[\])>}]$/.test(w));
  let words = (untagged.length > 0 ? untagged : raw)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+/u, ''))
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
  // "PT Maju Jaya" reads as "MJ", not "PT".
  if (skipLegalPrefix && words.length >= 3 && /^(PT|CV)\.?$/i.test(words[0])) words = words.slice(1);
  if (words.length === 0) return fallback;
  if (words.length === 1) return Array.from(words[0]).slice(0, max).join('').toUpperCase();
  return words.slice(0, max).map((w) => Array.from(w)[0]).join('').toUpperCase();
}
