import { randomInt } from "crypto";

/**
 * Ad-click reference codes ("Kode: K7QM2X").
 *
 * The landing-page snippet writes one into the WhatsApp pre-filled text so the
 * chat that lands on the WhatsApp Business app can be linked back to the
 * website ad click. Six characters from an alphabet without look-alikes
 * (no 0/O, 1/I): easy to read, easy to keep when a customer retypes it.
 */
export const REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const REF_LENGTH = 6;
export const REF_RE = /^[2-9A-HJ-NP-Z]{6}$/;

export function generateRefCode(): string {
  let out = "";
  for (let i = 0; i < REF_LENGTH; i += 1) {
    out += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  }
  return out;
}

/** Upper-cases and validates a candidate code; null when it cannot be one. */
export function normalizeRefCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toUpperCase();
  return REF_RE.test(v) ? v : null;
}

// "Kode: K7QM2X", "kode K7QM2X", "Ref: K7QM2X", "KODE=K7QM2X", "Kode #K7QM2X".
// The label must start a word and the code must end one, so "Kodean" or a
// longer token never yields a partial match.
const LABELLED_CODE =
  /(?:^|[^A-Za-z0-9])(?:kode|ref)\s*[:=#.\-：]?\s*#?([A-Za-z0-9]{6})(?![A-Za-z0-9])/gi;

/**
 * Finds the first valid reference code in free text (a pasted WhatsApp chat,
 * the first inbound message). Returns the upper-cased code or null.
 */
export function extractRefCode(text: string | null | undefined): string | null {
  if (!text || typeof text !== "string") return null;
  LABELLED_CODE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LABELLED_CODE.exec(text)) !== null) {
    const code = normalizeRefCode(m[1]);
    if (code) return code;
  }
  return null;
}
