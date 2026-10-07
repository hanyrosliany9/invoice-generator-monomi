/**
 * Indonesian stamp duty (Bea Meterai) threshold.
 * UU No. 10 Tahun 2020 Pasal 3 ayat (2) huruf g: materai applies to documents
 * stating an amount of money of MORE THAN Rp 5.000.000 (strictly greater;
 * exactly Rp 5.000.000 does not require materai).
 */
export const MATERAI_THRESHOLD = 5_000_000;

export function isMateraiRequired(
  amount: number,
  threshold: number = MATERAI_THRESHOLD,
): boolean {
  return amount > threshold;
}
