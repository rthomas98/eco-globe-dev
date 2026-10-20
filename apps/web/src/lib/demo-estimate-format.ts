/**
 * Presentation rules for demo estimate values on listings and buyer requests.
 *
 * A demo estimate is a placeholder price or quantity stored with a
 * "DEMO ESTIMATES (presentation only): …" note. The backend-owned shared
 * parser decides which fields are demo; these helpers only turn that result
 * into labels, so a demo quantity is never described as available stock.
 *
 * Kept free of path aliases and runtime imports so `node --test` can import it.
 */

export type DemoEstimateFields = {
  /** A demo note is present, even if its field list is malformed. */
  marker: boolean;
  price: boolean;
  volume: boolean;
};

export const NO_DEMO_ESTIMATES: DemoEstimateFields = { marker: false, price: false, volume: false };

export const DEMO_PRICE_ESTIMATE_LABEL = "Demo price estimate";
export const DEMO_VOLUME_ESTIMATE_LABEL = "Demo volume estimate";

/** Mirrors the backend 400 for listings so the disabled button explains itself. */
export const DEMO_LISTING_SUBMIT_BLOCKED =
  "Replace demo estimates and remove the demo estimate note before submitting this listing.";
/** Mirrors the backend 400 for buyer requests. */
export const DEMO_REQUEST_POST_BLOCKED =
  "Replace demo estimates and remove the demo estimate note before posting this request.";

export function combineDemoEstimateFields(
  marker: boolean,
  fields: { price: boolean; volume: boolean },
): DemoEstimateFields {
  // Field flags only count when the marker line exists.
  return marker ? { marker, price: fields.price, volume: fields.volume } : NO_DEMO_ESTIMATES;
}

export function demoEstimateBadgeLabels(fields: DemoEstimateFields): string[] {
  const labels: string[] = [];
  if (fields.price) labels.push(DEMO_PRICE_ESTIMATE_LABEL);
  if (fields.volume) labels.push(DEMO_VOLUME_ESTIMATE_LABEL);
  return labels;
}

/**
 * Seller header quantity. A demo volume is never "available"; a price-only
 * marker leaves the real source quantity and its wording untouched.
 */
export function listingQuantityLabel(quantity: string | null, fields: DemoEstimateFields): string {
  if (!quantity) return "Quantity not set";
  return fields.volume ? `${quantity} (demo volume estimate)` : `${quantity} available`;
}

/** Listing statuses the backend accepts while a demo note remains. */
const LISTING_STATUSES_WITH_DEMO = new Set(["draft", "closed"]);

export function listingStatusAllowedWithDemo(status: string, fields: DemoEstimateFields): boolean {
  return !fields.marker || LISTING_STATUSES_WITH_DEMO.has(status);
}
