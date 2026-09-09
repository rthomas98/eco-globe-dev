/**
 * Value-recovery estimators for the carbon workflow.
 *
 * Seller: avoided disposal cost + sale proceeds for a quantity Q.
 * Buyer: baseline delivered cost − alternative purchase cost for Q.
 *
 * All money values are in the listing's recorded currency; quantities are in
 * the listing's recorded pricing unit. No implicit currency or unit conversion
 * is performed. Shipping for the sale (seller) or the alternative purchase
 * (buyer) is explicitly excluded and disclosed with every result.
 */

export type EstimatorRole = "seller" | "buyer";

export interface SellerRecoveryInput {
  /** Quantity in the listing's pricing unit. */
  quantity: number;
  /** Disposal fee per unit, in listing currency. */
  disposalRatePerUnit: number;
  /** Transport-to-disposal cost per unit, in listing currency. */
  transportToDisposalRatePerUnit: number;
  /** Listing sale price per unit, in listing currency. */
  listingPricePerUnit: number;
}

export interface SellerRecoveryResult {
  role: "seller";
  quantity: number;
  avoidedDisposalRatePerUnit: number;
  avoidedDisposalCost: number;
  saleProceeds: number;
  totalRecovery: number;
  exclusions: string[];
}

export interface BuyerSavingsInput {
  quantity: number;
  /** Combined baseline feedstock production + delivered cost per unit. */
  baselineDeliveredRatePerUnit: number;
  listingPricePerUnit: number;
}

export interface BuyerSavingsResult {
  role: "buyer";
  quantity: number;
  baselineCost: number;
  purchaseCost: number;
  /** Positive = savings; negative = additional cost versus baseline. */
  savings: number;
  exclusions: string[];
}

export type ValueRecoveryResult = SellerRecoveryResult | BuyerSavingsResult;

export const SELLER_EXCLUSIONS = [
  "Shipping and handling costs for the sale itself are not included.",
  "Figures are estimates based on the rates you entered, not audited accounting.",
];

export const BUYER_EXCLUSIONS = [
  "Shipping for the alternative purchase from this seller is not included.",
  "Figures are estimates based on the rates you entered, not audited accounting.",
];

function assertFinite(name: string, value: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number.`);
  }
}

function assertNonNegative(name: string, value: number) {
  assertFinite(name, value);
  if (value < 0) throw new RangeError(`${name} cannot be negative.`);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeSellerRecovery(input: SellerRecoveryInput): SellerRecoveryResult {
  assertNonNegative("quantity", input.quantity);
  assertNonNegative("disposalRatePerUnit", input.disposalRatePerUnit);
  assertNonNegative("transportToDisposalRatePerUnit", input.transportToDisposalRatePerUnit);
  assertNonNegative("listingPricePerUnit", input.listingPricePerUnit);

  const avoidedDisposalRatePerUnit =
    input.disposalRatePerUnit + input.transportToDisposalRatePerUnit;
  const avoidedDisposalCost = round2(avoidedDisposalRatePerUnit * input.quantity);
  const saleProceeds = round2(input.listingPricePerUnit * input.quantity);
  return {
    role: "seller",
    quantity: input.quantity,
    avoidedDisposalRatePerUnit: round2(avoidedDisposalRatePerUnit),
    avoidedDisposalCost,
    saleProceeds,
    totalRecovery: round2(avoidedDisposalCost + saleProceeds),
    exclusions: [...SELLER_EXCLUSIONS],
  };
}

export function computeBuyerSavings(input: BuyerSavingsInput): BuyerSavingsResult {
  assertNonNegative("quantity", input.quantity);
  assertNonNegative("baselineDeliveredRatePerUnit", input.baselineDeliveredRatePerUnit);
  assertNonNegative("listingPricePerUnit", input.listingPricePerUnit);

  const baselineCost = round2(input.baselineDeliveredRatePerUnit * input.quantity);
  const purchaseCost = round2(input.listingPricePerUnit * input.quantity);
  return {
    role: "buyer",
    quantity: input.quantity,
    baselineCost,
    purchaseCost,
    savings: round2(baselineCost - purchaseCost),
    exclusions: [...BUYER_EXCLUSIONS],
  };
}

/**
 * Resolve the estimator quantity in the listing's pricing unit from the
 * carbon scenario's metric tonnage.
 *
 * - Mass-priced listings (t, kg, lb) convert tonnes → unit using the exact
 *   mass factor, which is a unit identity rather than a business assumption.
 * - Unit-priced listings need an explicit weight basis (tonnes per unit)
 *   before a tonne-based scenario can be expressed in units.
 */
export function quantityFromMetricTons(
  metricTons: number,
  tonnesPerUnit: number | null,
): number | null {
  assertNonNegative("metricTons", metricTons);
  if (tonnesPerUnit === null || !Number.isFinite(tonnesPerUnit) || tonnesPerUnit <= 0) {
    return null;
  }
  return metricTons / tonnesPerUnit;
}

/** Label suggested for the deck's "affording costs" wording. */
export const AVOIDED_DISPOSAL_LABEL = "Avoided disposal costs";
