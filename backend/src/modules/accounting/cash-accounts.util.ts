/**
 * Cash & Bank account classification — single source of truth.
 *
 * Indonesian chart of accounts: cash/bank accounts live under 1-10xx.
 *   - Cash  (Kas):            1-101x  (e.g. 1-1010)
 *   - Bank (& wallets):       1-102x  (e.g. 1-1020 Rekening Bank, 1-1021 USD, 1-1022 Crypto)
 *
 * IMPORTANT: do NOT match on the broad `1-1` prefix — that also captures
 * inventory accounts (1-15xx), which are NOT cash/bank.
 */

export type CashGroup = "CASH" | "BANK";

/** Default accounts used by the simple Cash/Bank source toggle. */
export const CASH_DEFAULT = "1-1010";
export const BANK_DEFAULT = "1-1020";

/** Returns 'CASH' / 'BANK' for a cash/bank account code, or null otherwise. */
export function classifyCashAccount(code?: string | null): CashGroup | null {
  if (!code) return null;
  if (/^1-101\d$/.test(code)) return "CASH";
  if (/^1-102\d$/.test(code)) return "BANK";
  return null;
}

/** True if the account code is a cash or bank account (excludes inventory etc.). */
export function isCashOrBank(code?: string | null): boolean {
  return classifyCashAccount(code) !== null;
}

/** The account code to credit for a given payment source. */
export function accountForSource(source: "CASH" | "BANK"): string {
  return source === "BANK" ? BANK_DEFAULT : CASH_DEFAULT;
}
