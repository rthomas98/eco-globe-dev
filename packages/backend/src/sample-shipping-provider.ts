import { ApiError } from "./http.js";
import type { SampleBox } from "./sample-shipping-domain.js";

export type ShippingMode = "unavailable" | "simulation" | "easypost_test";
export function shippingMode(): ShippingMode {
  // Production activation requires a separate review and real provider verification.
  if (process.env.NODE_ENV === "production") return "unavailable";
  if (
    process.env.SAMPLE_SHIPPING_MODE === "simulation" &&
    process.env.ECOGLOBE_LOCAL_SAMPLE_TEST === "1"
  )
    return "simulation";
  if (
    process.env.SAMPLE_SHIPPING_MODE === "easypost_test" &&
    process.env.EASYPOST_API_KEY?.startsWith("EZTK") &&
    process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") &&
    process.env.SAMPLE_CHECKOUT_ORIGIN
  )
    return "easypost_test";
  return "unavailable";
}
export type ParcelAddress = {
  company: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};
export type ParcelRate = {
  id: string;
  carrier: string;
  service: string;
  cents: number;
  deliveryDays: number | null;
};
function obj(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError(502, "Invalid shipping provider response.");
  return value as Record<string, unknown>;
}
function str(value: unknown): string {
  if (typeof value !== "string" || !value)
    throw new ApiError(502, "Incomplete shipping provider response.");
  return value;
}
async function ep(path: string, body?: unknown) {
  if (shippingMode() !== "easypost_test")
    throw new ApiError(503, "EasyPost test shipping is not connected.");
  const response = await fetch(`https://api.easypost.com/v2/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.EASYPOST_API_KEY}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok)
    throw new ApiError(
      502,
      "EasyPost could not complete this operation. Retry or contact EcoGlobe.",
    );
  return obj(await response.json());
}
async function stripe(
  path: string,
  body?: Record<string, string>,
  key?: string,
) {
  if (shippingMode() !== "easypost_test")
    throw new ApiError(503, "Test payments are not connected.");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    body: body ? new URLSearchParams(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok)
    throw new ApiError(
      502,
      "The payment provider could not complete this operation. Retry or contact EcoGlobe.",
    );
  return obj(await response.json());
}
export async function parcelRates(
  from: ParcelAddress,
  to: ParcelAddress,
  box: SampleBox,
) {
  if (shippingMode() === "simulation")
    return {
      shipmentId: `sim_${crypto.randomUUID()}`,
      rates: [
        {
          id: "sim_ups",
          carrier: "UPS",
          service: "Ground",
          cents:
            box.maxWeightKg === 2 ? 1600 : box.maxWeightKg === 10 ? 3160 : 4800,
          deliveryDays: null,
        },
        {
          id: "sim_fedex",
          carrier: "FedEx",
          service: "Ground",
          cents:
            box.maxWeightKg === 2 ? 1490 : box.maxWeightKg === 10 ? 2890 : 4650,
          deliveryDays: null,
        },
      ] satisfies ParcelRate[],
    };
  // Address deliverability is separate from staff confirmation that this is a business receiving site.
  const verified = await ep("addresses", { address: to, verify: ["delivery"] });
  if (
    obj(obj(verified.verifications).delivery).success !== true ||
    verified.residential === true
  )
    throw new ApiError(
      400,
      "The carrier could not verify this company receiving address. Ask EcoGlobe to review it.",
    );
  const shipment = await ep("shipments", {
    shipment: {
      from_address: from,
      to_address: { id: str(verified.id) },
      parcel: {
        length: box.lengthCm / 2.54,
        width: box.widthCm / 2.54,
        height: box.heightCm / 2.54,
        weight: box.maxWeightKg * 35.27396195,
      },
    },
  });
  if (shipment.mode !== "test")
    throw new ApiError(502, "Expected a test shipment.");
  const rates: ParcelRate[] = [];
  for (const value of Array.isArray(shipment.rates) ? shipment.rates : []) {
    const r = obj(value);
    if (
      !["UPS", "FedEx"].includes(String(r.carrier)) ||
      !["Ground", "FEDEX_GROUND"].includes(String(r.service)) ||
      r.currency !== "USD"
    )
      continue;
    const cents = Math.round(Number(r.rate) * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0) continue;
    rates.push({
      id: str(r.id),
      carrier: str(r.carrier),
      service: str(r.service),
      cents,
      deliveryDays:
        typeof r.delivery_days === "number" ? r.delivery_days : null,
    });
  }
  if (!rates.length)
    throw new ApiError(
      409,
      "No supported ground services are available for this route.",
    );
  return { shipmentId: str(shipment.id), rates };
}
export async function paymentSession(id: number, cents: number) {
  if (shippingMode() === "simulation")
    return { id: `sim_checkout_${id}`, url: "" };
  const origin = new URL(process.env.SAMPLE_CHECKOUT_ORIGIN!);
  const result = await stripe(
    "checkout/sessions",
    {
      mode: "payment",
      success_url: `${origin.origin}/buyer/samples?sample=${id}`,
      cancel_url: `${origin.origin}/buyer/samples?cancelled=${id}`,
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(cents),
      "line_items[0][price_data][product_data][name]": `Sample SR-${id} shipping`,
      "line_items[0][quantity]": "1",
      "metadata[sample_id]": String(id),
      client_reference_id: String(id),
    },
    `sample-checkout-${id}`,
  );
  return { id: str(result.id), url: str(result.url) };
}
export async function paymentConfirmed(
  sessionId: string,
  cents: number,
  sampleId: number,
) {
  const session = await stripe(
    `checkout/sessions/${encodeURIComponent(sessionId)}`,
  );
  if (session.payment_status !== "paid") return null;
  if (
    session.amount_total !== cents ||
    session.currency !== "usd" ||
    session.client_reference_id !== String(sampleId) ||
    session.livemode !== false
  )
    throw new ApiError(409, "Payment does not match this sample.");
  return str(session.payment_intent);
}
export async function buyParcel(shipmentId: string, rateId: string) {
  if (shippingMode() === "simulation")
    return { tracking: `SIMULATION-${shipmentId.slice(-12)}`, labelUrl: "" };
  let shipment = await ep(`shipments/${encodeURIComponent(shipmentId)}`);
  if (!shipment.postage_label)
    shipment = await ep(`shipments/${encodeURIComponent(shipmentId)}/buy`, {
      rate: { id: rateId },
    });
  if (obj(shipment.selected_rate).id !== rateId)
    throw new ApiError(
      409,
      "Purchased label does not match the selected rate.",
    );
  const labelUrl = str(obj(shipment.postage_label).label_url);
  if (new URL(labelUrl).protocol !== "https:")
    throw new ApiError(502, "Invalid carrier label URL.");
  return { tracking: str(shipment.tracking_code), labelUrl };
}
export async function refundPayment(intent: string, id: number) {
  if (shippingMode() === "simulation")
    return { id: `sim_refund_${id}`, succeeded: true };
  const refund = await stripe(
    "refunds",
    { payment_intent: intent },
    `sample-refund-${id}`,
  );
  return { id: str(refund.id), succeeded: refund.status === "succeeded" };
}
export async function voidParcel(shipmentId: string) {
  if (shippingMode() === "simulation") return true;
  const shipment = await ep(`shipments/${encodeURIComponent(shipmentId)}`);
  if (!shipment.postage_label || shipment.refund_status === "refunded")
    return true;
  if (shipment.refund_status !== "submitted")
    await ep(`shipments/${encodeURIComponent(shipmentId)}/refund`, {});
  return false; // Carrier approval is asynchronous; do not claim a completed void.
}
export async function parcelStatus(shipmentId: string) {
  const result = await ep(`shipments/${encodeURIComponent(shipmentId)}`);
  return String(result.status);
}
