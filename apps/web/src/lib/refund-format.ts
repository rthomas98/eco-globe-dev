/** Pure money/reference helpers for refund cases (kept import-free for node:test). */

/** Stable per-attempt key (16–100 of [A-Za-z0-9_-]) so a retried submit replays. */
export function newRefundIdempotencyKey() {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `refund-${random}`.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 100);
}

export function formatRefundMoney(cents: number, currencyCode: string) {
  const code = /^[A-Z]{3}$/.test(currencyCode) ? currencyCode : "USD";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(
    cents / 100,
  );
}

/**
 * Parses a typed major-unit amount ("125.50") into integer cents. Returns
 * null for anything that is not a positive amount with at most two decimals.
 */
export function parseAmountToCents(value: string): number | null {
  const trimmed = value.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

/** A Stripe refund object ID as staff copy it from the Dashboard. */
export function isStripeRefundReference(value: string) {
  return /^re_[A-Za-z0-9]+$/.test(value.trim());
}
