import type { FedexAddress, FedexShipment } from "@/lib/api-fedex-sandbox";

export const NOT_PROVIDED = "Not provided by the FedEx sandbox";

export function when(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("en-US") : null;
}

export function quoteAmount(shipment: FedexShipment) {
  const quote = shipment.quote;
  if (!quote || quote.amountCents === null || !quote.currency) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: quote.currency,
    }).format(quote.amountCents / 100);
  } catch {
    return `${(quote.amountCents / 100).toFixed(2)} ${quote.currency}`;
  }
}

export function isQuoteExpired(shipment: FedexShipment) {
  const expiresAt = shipment.quote?.expiresAt;
  if (!expiresAt) return false;
  const time = new Date(expiresAt).getTime();
  return Number.isFinite(time) && time <= Date.now();
}

export function addressLines(address: FedexAddress) {
  return [
    address.company ? `${address.name}, ${address.company}` : address.name,
    [address.street1, address.street2].filter(Boolean).join(", "),
    `${address.city}, ${address.stateOrProvince} ${address.postalCode}`,
    address.countryCode,
  ];
}

const STATE_LABELS: Record<string, { label: string; tone: string }> = {
  quoted: { label: "Quoted (not booked)", tone: "bg-blue-50 text-blue-700" },
  quote_expired: {
    label: "Quote expired",
    tone: "bg-neutral-100 text-neutral-600",
  },
  booking: { label: "Booking in progress", tone: "bg-amber-50 text-amber-800" },
  booking_unknown: {
    label: "Booking outcome unknown",
    tone: "bg-amber-50 text-amber-800",
  },
  booked: { label: "Booked (sandbox)", tone: "bg-green-50 text-green-700" },
  booking_failed: { label: "Booking failed", tone: "bg-red-50 text-red-700" },
  cancelling: {
    label: "Cancellation in progress",
    tone: "bg-amber-50 text-amber-800",
  },
  cancelled: { label: "Cancelled", tone: "bg-neutral-100 text-neutral-600" },
  cancel_failed: {
    label: "Cancellation failed",
    tone: "bg-red-50 text-red-700",
  },
};

export function stateBadge(state: string) {
  return (
    STATE_LABELS[state] ?? {
      label: state,
      tone: "bg-neutral-100 text-neutral-700",
    }
  );
}

/** States where the provider call may still be running or its result is not yet known. */
export function isPendingState(state: string) {
  return (
    state === "booking" || state === "booking_unknown" || state === "cancelling"
  );
}
