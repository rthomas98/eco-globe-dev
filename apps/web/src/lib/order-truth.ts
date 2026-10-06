/**
 * Pure rules for what transaction screens may claim about an order. Every
 * answer comes from saved records (payments, shipments, listing fields); a
 * missing record yields an explicit "not recorded" state, never a default.
 */

export interface OrderPaymentRecord {
  id: number;
  orderId: number;
  providerPaymentId: string | null;
  amount: number;
  currencyCode: string;
  paymentStatusCode: string;
  createdAt: string;
}

/** The most recent captured payment for the order, or null when none is saved. */
export function capturedPayment<T extends OrderPaymentRecord>(payments: T[], orderId: number): T | null {
  const captured = payments
    .filter((p) => p.orderId === orderId && p.paymentStatusCode === "captured")
    .sort((a, b) => b.id - a.id);
  return captured[0] ?? null;
}

export type ReceiptReadiness =
  | { ready: true }
  | { ready: false; reason: string };

/**
 * A buyer can acknowledge receipt only when a payment is captured and the
 * shipment has been dispatched. Unknown payment or shipment state blocks it.
 */
export function receiptReadiness(input: {
  paymentsLoaded: boolean;
  hasCapturedPayment: boolean;
  shipmentStatusCode: string | null;
}): ReceiptReadiness {
  if (!input.paymentsLoaded)
    return { ready: false, reason: "Checking payment status before receipt can be confirmed." };
  if (!input.hasCapturedPayment)
    return { ready: false, reason: "Receipt can be confirmed after payment for this order is recorded." };
  if (input.shipmentStatusCode !== "in_transit")
    return {
      ready: false,
      reason:
        input.shipmentStatusCode === "delivered"
          ? "Receipt for this order is already recorded."
          : "Receipt can be confirmed after the seller dispatches or releases the order.",
    };
  return { ready: true };
}

/**
 * Listing price for tracker cards: a saved positive price with a valid ISO
 * currency, otherwise an explicit "Price not recorded".
 */
export function trackerPriceLabel(price: number | null | undefined, currency: string | null | undefined, unit: string | null | undefined) {
  const code = currency?.trim().toUpperCase() ?? "";
  const amount = Number(price);
  if (price === null || price === undefined || !Number.isFinite(amount) || amount <= 0 || !/^[A-Z]{3}$/.test(code))
    return "Price not recorded";
  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(amount);
  const per = unit?.trim();
  return per ? `${formatted} / ${per}` : formatted;
}
