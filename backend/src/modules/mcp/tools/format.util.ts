import { Decimal } from "@prisma/client/runtime/library";

/** Indonesian Rupiah formatter: "Rp 12.500.000". */
export function formatIDR(value: Decimal | number | string | null | undefined): string {
  if (value === null || value === undefined) return "Rp 0";
  const n = typeof value === "number" ? value : Number(value.toString());
  if (!Number.isFinite(n)) return "Rp 0";
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

/** Compact date in Asia/Jakarta: "19 Mei 2026". */
export function formatJakartaDate(d: Date | null | undefined): string {
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Number of whole days between two dates (b - a), can be negative. */
export function daysBetween(a: Date, b: Date): number {
  const MS = 24 * 60 * 60 * 1000;
  return Math.floor((b.getTime() - a.getTime()) / MS);
}

/** Truncate a string for safe inclusion in LLM-visible text. */
export function trunc(s: string | null | undefined, max = 120): string {
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
