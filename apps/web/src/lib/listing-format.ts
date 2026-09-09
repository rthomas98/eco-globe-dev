/**
 * Pure formatting helpers for listing prices, quantities and units.
 * No implicit currency or unit conversion happens here: values are rendered
 * in the units and currency the seller recorded.
 */

export interface UnitDescriptor {
  code: string;
  /** Short symbol used next to numbers, e.g. "t". */
  short: string;
  /** Singular noun. */
  singular: string;
  /** Plural noun. */
  plural: string;
  /** True for mass units where a per-tonne basis is defined. */
  isMass: boolean;
  /** Tonnes per one unit, only for mass units. */
  tonnesPerUnit: number | null;
}

const UNITS: Record<string, UnitDescriptor> = {
  ton: { code: "ton", short: "t", singular: "metric tonne", plural: "metric tonnes", isMass: true, tonnesPerUnit: 1 },
  tonne: { code: "tonne", short: "t", singular: "metric tonne", plural: "metric tonnes", isMass: true, tonnesPerUnit: 1 },
  kg: { code: "kg", short: "kg", singular: "kilogram", plural: "kilograms", isMass: true, tonnesPerUnit: 0.001 },
  lb: { code: "lb", short: "lb", singular: "pound", plural: "pounds", isMass: true, tonnesPerUnit: 0.00045359237 },
  unit: { code: "unit", short: "unit", singular: "unit", plural: "units", isMass: false, tonnesPerUnit: null },
};

export function describeUnit(code: string | null | undefined): UnitDescriptor {
  const key = (code ?? "").trim().toLowerCase();
  if (UNITS[key]) return UNITS[key];
  if (key === "tons" || key === "tonnes" || key === "metric-tons") return UNITS.ton;
  if (key === "units") return UNITS.unit;
  if (key === "kgs" || key === "kilograms") return UNITS.kg;
  if (key === "lbs" || key === "pounds") return UNITS.lb;
  // Unknown unit: preserve the seller's label verbatim.
  const label = key || "unit";
  return { code: label, short: label, singular: label, plural: label, isMass: false, tonnesPerUnit: null };
}

/** "/t", "/kg", "/unit" style suffix for a unit code. */
export function perUnitSuffix(code: string | null | undefined) {
  return `/${describeUnit(code).short}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  MXN: "MX$",
  BRL: "R$",
  JPY: "¥",
  SAR: "SAR ",
};

export function currencySymbol(code: string | null | undefined) {
  const key = (code ?? "").toUpperCase();
  return CURRENCY_SYMBOLS[key] ?? (key ? `${key} ` : "");
}

export function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Render a money amount in the recorded currency.
 * Returns `null` when the amount is not a finite number so callers can show
 * an explicit "unavailable" state instead of zero.
 */
export function formatMoney(
  amount: number | null | undefined,
  currencyCode: string | null | undefined,
  options: { fractionDigits?: number } = {},
): string | null {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return null;
  }
  const digits = options.fractionDigits ?? 2;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(amount));
  const sign = amount < 0 ? "−" : "";
  return `${sign}${currencySymbol(currencyCode)}${formatted}`;
}

export type PriceState =
  | { kind: "available"; amount: number; label: string; perUnit: string }
  | { kind: "zero"; amount: 0; label: string; perUnit: string }
  | { kind: "unavailable"; amount: null; label: "Price unavailable"; perUnit: string };

/**
 * Distinguish a recorded price (including a genuine zero) from a missing one.
 * A missing price never renders as $0.00.
 */
export function describePrice(
  pricePerUnit: number | null | undefined,
  currencyCode: string | null | undefined,
  quantityUnit: string | null | undefined,
): PriceState {
  const perUnit = perUnitSuffix(quantityUnit);
  if (pricePerUnit === null || pricePerUnit === undefined || !Number.isFinite(pricePerUnit)) {
    return { kind: "unavailable", amount: null, label: "Price unavailable", perUnit };
  }
  const label = formatMoney(pricePerUnit, currencyCode) ?? "Price unavailable";
  if (pricePerUnit === 0) return { kind: "zero", amount: 0, label, perUnit };
  return { kind: "available", amount: pricePerUnit, label, perUnit };
}

/** "100 t" style label, or null when the quantity is unknown. */
export function formatQuantity(
  quantity: number | null | undefined,
  unitCode: string | null | undefined,
): string | null {
  if (quantity === null || quantity === undefined || !Number.isFinite(quantity)) return null;
  const unit = describeUnit(unitCode);
  return `${formatNumber(quantity, 3)} ${unit.short}`;
}

/** "100 t (metric tonnes)" — explicit unit wording for MOQ displays. */
export function formatQuantityWithUnitName(
  quantity: number | null | undefined,
  unitCode: string | null | undefined,
): string | null {
  if (quantity === null || quantity === undefined || !Number.isFinite(quantity)) return null;
  const unit = describeUnit(unitCode);
  const noun = quantity === 1 ? unit.singular : unit.plural;
  if (!unit.isMass || unit.short === noun) return `${formatNumber(quantity, 3)} ${noun}`;
  return `${formatNumber(quantity, 3)} ${unit.short} (${noun})`;
}

export function formatCarbonIntensity(kgCo2e: number | null | undefined) {
  if (kgCo2e === null || kgCo2e === undefined || !Number.isFinite(kgCo2e)) return null;
  return `${formatNumber(kgCo2e, 1)} kg CO₂e`;
}

/** Parse a user-entered number; returns null for blank or invalid input. */
export function parseOptionalNumber(input: string | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const trimmed = input.replace(/,/g, "").trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}
