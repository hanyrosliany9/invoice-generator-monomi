/**
 * Pure helpers for the CRM module (no Nest / Prisma dependencies, so they are
 * trivially unit-testable).
 */

/**
 * Timeline bodies starting with "@key" are server keys the UI translates. Text typed by staff or sent by a
 * customer must never be read as one, so a leading "@" is escaped with a backslash (the UI removes it).
 */
export function escapeActivityText<T extends string | null | undefined>(text: T): T {
  return (typeof text === "string" && /^\s*@/.test(text) ? "\\" + text.trimStart() : text) as T;
}

/** WIB = UTC+7, no daylight saving. */
export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Normalise a phone number to E.164, Indonesian style:
 *   08123456789 -> +628123456789, 62812... -> +62812..., +62 812-3456 -> +62812...
 *   8123456789 (no leading 0) -> +628123456789, 0062... -> +62...
 * Returns null when the input cannot be a valid phone number (8-15 digits).
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (raw === "") return null;
  const hasPlus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (digits === "") return null;

  if (hasPlus) {
    // already international
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
  } else if (digits.startsWith("62")) {
    // already country-coded
  } else if (digits.startsWith("8")) {
    digits = "62" + digits;
  }

  if (digits.length < 8 || digits.length > 15) return null;
  // Indonesian numbers: +62 followed by 8-12 more digits.
  if (digits.startsWith("62") && (digits.length < 10 || digits.length > 14)) {
    return null;
  }
  return "+" + digits;
}

/** WhatsApp id (digits only, no +) for a normalised phone. */
export function waIdFromPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits === "" ? null : digits;
}

/** "Kode kampanye: CODE" / "Campaign code: CODE" (the only non-bracket form an auto-generated code may match in). */
export function explicitCodeRegex(code: string): RegExp {
  const c = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:kode\\s+kampanye|campaign\\s+code)\\s*[:=-]?\\s*${c}(?![A-Za-z0-9_-])`, "i");
}

export interface QuickAddParse {
  name: string | null;
  phone: string | null;
  campaignCode: string | null;
  /** The pasted text without the detected name/phone line noise, used as the first message. */
  message: string | null;
}

const PHONE_CANDIDATE =
  /(?:\+|00)?\s*(?:62|0)?\s*8[\d\s().-]{7,16}\d|\+\s*\d[\d\s().-]{7,17}\d/g;

/**
 * Parse a pasted WhatsApp first message / chat info.
 *   - phone: first plausible number (wa.me links, +62, 08xx ...)
 *   - campaign code: "[CODE]" in square brackets, else a bare token that
 *     matches one of the known campaign codes (case-insensitive). Codes in
 *     `explicitOnlyCodes` (generated from a Meta campaign name, e.g. "PROMO")
 *     never match as a bare word: only as "[CODE]" or "Kode kampanye: CODE"
 *   - name: "Name: X" / "Nama: X", else the leftover text of the line that
 *     held the phone number (e.g. "Budi Santoso +62 857-...")
 */
export function parseQuickAdd(
  text: string,
  knownCodes: string[] = [],
  explicitOnlyCodes: string[] = [],
): QuickAddParse {
  const result: QuickAddParse = { name: null, phone: null, campaignCode: null, message: null };
  if (!text || text.trim() === "") return result;

  const lines = text.replace(/\r/g, "").split("\n");

  // wa.me/628123... links first (unambiguous)
  const waLink = text.match(/wa\.me\/\+?(\d{8,15})/i);
  let phoneLineIdx = -1;
  let phoneMatchText = "";
  if (waLink) {
    result.phone = normalizePhone("+" + waLink[1]);
    phoneLineIdx = lines.findIndex((l) => /wa\.me\//i.test(l));
    phoneMatchText = lines[phoneLineIdx]?.match(/\S*wa\.me\/\S*/i)?.[0] ?? "";
  } else {
    for (let i = 0; i < lines.length && result.phone === null; i += 1) {
      const matches = lines[i].match(PHONE_CANDIDATE);
      if (!matches) continue;
      for (const m of matches) {
        const norm = normalizePhone(m.trim());
        if (norm) {
          result.phone = norm;
          phoneLineIdx = i;
          phoneMatchText = m;
          break;
        }
      }
    }
  }

  // Campaign code: [CODE]
  const bracket = text.match(/\[\s*([A-Za-z0-9][A-Za-z0-9_-]{1,23})\s*\]/);
  if (bracket) {
    result.campaignCode = bracket[1].toUpperCase();
  } else if (explicitOnlyCodes.some((c) => explicitCodeRegex(c).test(text))) {
    result.campaignCode = explicitOnlyCodes.find((c) => explicitCodeRegex(c).test(text))!.toUpperCase();
  } else if (knownCodes.length > 0) {
    const upper = text.toUpperCase();
    for (const code of knownCodes) {
      const c = code.toUpperCase();
      const re = new RegExp(`(^|[^A-Z0-9_-])${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^A-Z0-9_-])`);
      if (re.test(upper)) {
        result.campaignCode = c;
        break;
      }
    }
  }

  // Name
  const labelled = text.match(/(?:^|\n)\s*(?:name|nama)\s*[:=-]\s*([^\n]+)/i);
  if (labelled) {
    result.name = cleanName(labelled[1].replace(phoneMatchText, ""));
  } else if (phoneLineIdx >= 0) {
    const left = lines[phoneLineIdx].replace(phoneMatchText, " ");
    const cand = cleanName(left);
    if (cand && cand.split(/\s+/).length <= 5 && /[A-Za-z]/.test(cand)) {
      result.name = cand;
    }
  }

  // Message: everything except the line that only carried name+phone
  const msgLines = lines.filter((_, i) => !(i === phoneLineIdx && result.name !== null && lines[i].replace(phoneMatchText, "").trim().length <= (result.name?.length ?? 0) + 4));
  const message = msgLines.join("\n").trim();
  result.message = message === "" ? null : message;
  return result;
}

function cleanName(s: string): string | null {
  const t = s
    .replace(/[—–|:;,()[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-.\s]+|[-.\s]+$/g, "");
  return t.length >= 2 && t.length <= 60 ? t : null;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Share of a spend record that falls inside [from, to] (inclusive days),
 * prorated linearly by day. Spend rows carry a date range [spendFrom, spendTo].
 */
export function prorateSpend(
  amount: number,
  spendFrom: Date,
  spendTo: Date,
  from: Date,
  to: Date,
): number {
  const sf = startOfUtcDay(spendFrom).getTime();
  const st = startOfUtcDay(spendTo).getTime();
  const rf = startOfUtcDay(from).getTime();
  const rt = startOfUtcDay(to).getTime();
  const spanDays = Math.max(1, Math.round((st - sf) / DAY_MS) + 1);
  const overlapStart = Math.max(sf, rf);
  const overlapEnd = Math.min(st, rt);
  if (overlapEnd < overlapStart) return 0;
  const overlapDays = Math.round((overlapEnd - overlapStart) / DAY_MS) + 1;
  return (amount * overlapDays) / spanDays;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function safeDivide(a: number, b: number): number | null {
  return b > 0 ? a / b : null;
}

/** Highest pipeline step a lead ever reached (never counting Lost), or null. */
export function maxReachedOrder(l: {
  stage: { type: string; order: number };
  activities: Array<{ toStage: { order: number; type: string } | null }>;
}): number | null {
  const orders: number[] = [];
  if (l.stage.type !== "LOST") orders.push(l.stage.order);
  for (const a of l.activities) {
    if (a.toStage && a.toStage.type !== "LOST") orders.push(a.toStage.order);
  }
  return orders.length ? Math.max(...orders) : null;
}

/**
 * Cost per lead / Qualified lead / client from combined spend (synced Meta
 * spend + manually logged other costs). null when the denominator is 0.
 */
export function campaignCostMetrics(
  manualSpend: number,
  metaSpend: number,
  counts: { leads: number; qualified: number; won: number },
) {
  const spend = manualSpend + metaSpend;
  return {
    spend,
    costPerLead: safeDivide(spend, counts.leads),
    costPerQualified: safeDivide(spend, counts.qualified),
    costPerClient: safeDivide(spend, counts.won),
  };
}

export interface FunnelStageInput {
  id: string;
  key: string | null;
  name: string;
  order: number;
  type: "OPEN" | "WON" | "LOST";
}

export interface FunnelLeadInput {
  /** Highest order among the non-LOST stages this lead ever reached (history + current). */
  maxReachedOrder: number | null;
  currentStageType: "OPEN" | "WON" | "LOST";
}

export interface FunnelStep {
  stageId: string;
  key: string | null;
  name: string;
  count: number;
  /** Percent of the previous step that continued (null for the first step). */
  continuePct: number | null;
}

/**
 * Progression funnel: a lead "reached" a step when it ever reached a non-LOST
 * stage whose order is >= the step's order. Counts are therefore monotonic.
 */
export function buildFunnel(stages: FunnelStageInput[], leads: FunnelLeadInput[]): FunnelStep[] {
  const steps = stages.filter((s) => s.type !== "LOST").sort((a, b) => a.order - b.order);
  const out: FunnelStep[] = [];
  steps.forEach((s, i) => {
    const count = leads.filter((l) => l.maxReachedOrder !== null && l.maxReachedOrder >= s.order).length;
    const prev = i > 0 ? out[i - 1].count : null;
    out.push({
      stageId: s.id,
      key: s.key,
      name: s.name,
      count,
      continuePct: prev === null ? null : prev > 0 ? Math.round((count / prev) * 1000) / 10 : null,
    });
  });
  return out;
}

export interface DropOffInsight {
  fromStageId: string;
  fromKey: string | null;
  fromName: string;
  toStageId: string;
  toKey: string | null;
  toName: string;
  /** Percent that did not continue from -> to. */
  dropPct: number;
  lost: number;
}

/** The consecutive pair with the largest percentage drop (needs >= 1 lead at the 'from' step). */
export function findDropOff(funnel: FunnelStep[]): DropOffInsight | null {
  let best: DropOffInsight | null = null;
  for (let i = 1; i < funnel.length; i += 1) {
    const prev = funnel[i - 1];
    const cur = funnel[i];
    if (prev.count <= 0) continue;
    const dropPct = Math.round(((prev.count - cur.count) / prev.count) * 1000) / 10;
    if (best === null || dropPct > best.dropPct) {
      best = {
        fromStageId: prev.stageId,
        fromKey: prev.key,
        fromName: prev.name,
        toStageId: cur.stageId,
        toKey: cur.key,
        toName: cur.name,
        dropPct,
        lost: prev.count - cur.count,
      };
    }
  }
  return best;
}

/** End of "today" in WIB, expressed as a UTC Date. */
export function endOfTodayWib(now: Date = new Date()): Date {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS);
  const endWibUtcFields = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() + 1, 0, 0, 0, 0) - 1;
  return new Date(endWibUtcFields - WIB_OFFSET_MS);
}

export function startOfTodayWib(now: Date = new Date()): Date {
  return new Date(endOfTodayWib(now).getTime() - DAY_MS + 1);
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / 60000);
}
