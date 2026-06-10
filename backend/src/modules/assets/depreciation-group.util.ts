/**
 * Indonesian fiscal depreciation groups (Kelompok harta berwujud) — straight-line
 * useful life per UU PPh / PMK. Drives the asset's umur manfaat.
 */
export const DEPRECIATION_GROUP_YEARS: Record<string, number> = {
  I: 4, // Kelompok 1 — 4 tahun
  II: 8, // Kelompok 2 — 8 tahun
  III: 16, // Kelompok 3 — 16 tahun
  IV: 20, // Kelompok 4 — 20 tahun
};

/** Useful life in years for a Kelompok code ("I".."IV"), or undefined if unknown. */
export function usefulLifeYearsForGroup(
  group?: string | null,
): number | undefined {
  if (!group) return undefined;
  return DEPRECIATION_GROUP_YEARS[group.trim().toUpperCase()];
}

/** Normalise a Kelompok code to canonical "I".."IV" (or null). */
export function normaliseGroup(group?: string | null): string | null {
  if (!group) return null;
  const g = group.trim().toUpperCase();
  return DEPRECIATION_GROUP_YEARS[g] ? g : null;
}

/**
 * Sensible default Kelompok by asset category when none is supplied. Media
 * production gear (cameras, lenses, computers, lighting, audio) is short-lived
 * electronics → Kelompok I (4yr); furniture/vehicles → II (8yr); buildings → IV.
 */
export function defaultGroupForCategory(category?: string | null): string {
  switch (category) {
    case "Building":
      return "IV";
    case "Vehicle":
    case "Furniture":
      return "II";
    default:
      return "I";
  }
}
