/**
 * Reimbursable-portion helpers — the single source of truth for splitting an
 * invoice into its services (revenue / Trade AR 1-2010) vs reimbursable
 * (pass-through / Piutang Lain-lain 1-2040) portions.
 *
 * An invoice's reimbursable portion = the sum of its `priceBreakdown.products[]`
 * line items whose `name` starts with `"[Reimburse]"`. These are cost recoveries,
 * NOT revenue, and must never be commingled with services in any revenue / AR /
 * income / profit metric. Use these helpers everywhere instead of re-deriving the
 * split, so the rule stays consistent across the codebase.
 */

export function reimbursablePortionOf(invoice: { priceBreakdown?: any } | null | undefined): number {
  const products = invoice?.priceBreakdown?.products;
  if (!Array.isArray(products)) return 0;
  return products
    .filter(
      (p: any) => typeof p?.name === "string" && p.name.startsWith("[Reimburse]"),
    )
    .reduce(
      (s: number, p: any) =>
        s +
        (Number(p?.subtotal) ||
          Number(p?.price) * (Number(p?.quantity) || 1) ||
          0),
      0,
    );
}

/**
 * The services (revenue / Trade-AR) portion of an invoice = total − reimbursable.
 * Never negative.
 */
export function servicesPortionOf(
  invoice: { totalAmount?: any; priceBreakdown?: any } | null | undefined,
): number {
  const total = Number(invoice?.totalAmount ?? 0);
  return Math.max(0, total - reimbursablePortionOf(invoice));
}
