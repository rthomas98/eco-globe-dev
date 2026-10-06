/**
 * Pure rules for what transaction screens may claim about an order. Every
 * answer comes from saved records (payments, shipments, listing fields); a
 * missing record yields an explicit "not recorded" state, never a default.
 */

export interface OrderPaymentRecord {
  id: number;
  orderId: number;
  payerCompanyId: number;
  providerPaymentId: string | null;
  amount: number;
  currencyCode: string;
  paymentStatusCode: string;
  paymentTypeCode: string;
  createdAt: string;
}

export interface FundingOrder {
  id: number;
  buyerCompanyId: number;
  creationSourceCode: string;
  totalAmount: number;
  currencyCode: string;
}

const cents = (value: number) => Math.round(Number(value) * 100);

/**
 * Buyer funding that counts towards a checkout order, matching the backend
 * rule: captured buyer_funding payments by the buyer, in the order currency,
 * linked to a provider payment.
 */
export function countedFunding<T extends OrderPaymentRecord>(order: FundingOrder, payments: T[]): T[] {
  return payments.filter(
    (p) =>
      p.orderId === order.id &&
      p.paymentStatusCode === "captured" &&
      p.paymentTypeCode === "buyer_funding" &&
      p.payerCompanyId === order.buyerCompanyId &&
      p.currencyCode === order.currencyCode &&
      !!p.providerPaymentId?.trim() &&
      Number.isFinite(Number(p.amount)),
  );
}

/**
 * Mirrors backend requireFundedCheckout: a listing checkout is funded only
 * when its total is positive and counted funding covers it. Other creation
 * sources (admin_direct, manual) are not gated by Stripe records, so this
 * returns null for them — "not applicable", never "paid".
 */
export function checkoutFunded(order: FundingOrder, payments: OrderPaymentRecord[]): boolean | null {
  if (order.creationSourceCode !== "listing_checkout") return null;
  const total = Number(order.totalAmount);
  if (!Number.isFinite(total) || total <= 0) return false;
  const funded = countedFunding(order, payments).reduce((sum, p) => sum + cents(p.amount), 0);
  return funded >= cents(total);
}

export type ReceiptReadiness =
  | { ready: true }
  | { ready: false; reason: string };

/**
 * A buyer can acknowledge receipt only once the order is released and, for
 * listing checkouts, captured funding covers the total. Mirrors the backend
 * confirm rule: an existing shipment must be in transit; a pickup with no
 * shipment yet is confirmed directly (the backend records the shipment).
 * Unknown payment or shipment state blocks it.
 */
export function receiptReadiness(input: {
  /** checkoutFunded(): true/false for listing checkouts, null when not gated. */
  funded: boolean | null;
  paymentsLoaded: boolean;
  fulfilment: "pickup" | "delivery";
  /** Shipment records read for the order; null until read. */
  shipments: { statusCode: string }[] | null;
}): ReceiptReadiness {
  if (input.funded !== null) {
    if (!input.paymentsLoaded)
      return { ready: false, reason: "Checking payment status before receipt can be confirmed." };
    if (!input.funded)
      return { ready: false, reason: "Receipt can be confirmed after full payment for this order is captured." };
  }
  if (!input.shipments)
    return { ready: false, reason: "Checking shipment status before receipt can be confirmed." };
  if (input.shipments.length === 0)
    return input.fulfilment === "pickup"
      ? { ready: true }
      : { ready: false, reason: "Receipt can be confirmed after the seller dispatches the delivery." };
  if (input.shipments.length > 1)
    return { ready: false, reason: "This order has more than one shipment record. Contact EcoGlobe to confirm receipt." };
  const status = input.shipments[0]?.statusCode;
  if (status !== "in_transit")
    return {
      ready: false,
      reason:
        status === "delivered"
          ? "Receipt for this order is already recorded."
          : "Receipt can be confirmed after the seller dispatches or releases the order.",
    };
  return { ready: true };
}

/**
 * Listing price for tracker cards. A saved price with a valid ISO currency is
 * shown as saved, including a genuine zero; a missing price or currency is
 * reported as not recorded.
 */
export function trackerPriceLabel(price: number | null | undefined, currency: string | null | undefined, unit: string | null | undefined) {
  const code = currency?.trim().toUpperCase() ?? "";
  const amount = Number(price);
  if (price === null || price === undefined || !Number.isFinite(amount) || amount < 0 || !/^[A-Z]{3}$/.test(code))
    return "Price not recorded";
  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(amount);
  const per = unit?.trim();
  return per ? `${formatted} / ${per}` : formatted;
}
