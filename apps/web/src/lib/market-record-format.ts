/**
 * Presentation rules for internal market research records.
 *
 * These records are research context, not marketplace inventory:
 * - an unknown value stays unknown and is never shown as zero;
 * - volumes are annual capacities or estimates, never available stock;
 * - a negative research price is a gate fee the seller pays, never a
 *   negative checkout amount;
 * - a headquarters address is never a pickup site.
 *
 * Kept free of path aliases so `node --test` can import it directly.
 */

export type MarketFieldStatus = "unknown" | "estimated" | "confirmed";

export type AddressPurpose =
  | "unknown"
  | "headquarters"
  | "office"
  | "facility"
  | "pickup";

export interface ResearchPriceLike {
  status: MarketFieldStatus;
  value: string | null;
  currencyCode: string | null;
  perUnit: string | null;
}

export interface ResearchVolumeLike {
  status: MarketFieldStatus;
  value: string | null;
  unit: string | null;
  period: "annual" | "unspecified" | null;
}

export interface AddressLike {
  street: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  purpose: AddressPurpose;
}

export const UNKNOWN_LABEL = "Unknown";

const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/;
const GROUPED_PATTERN = /^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
const ZERO_PATTERN = /^-?0+(?:\.0+)?$/;

/** True for a canonical backend decimal string (no exponent or grouping). */
export function isDecimalString(value: string | null | undefined): value is string {
  return typeof value === "string" && DECIMAL_PATTERN.test(value.trim());
}

/**
 * Normalises an optional decimal typed into a form. Blank stays null; the
 * original digits are kept as a string so no precision is lost on the wire.
 * Commas are accepted only as correct thousands grouping, never stripped
 * blindly ("12,34" is rejected rather than read as 1234).
 */
export function parseOptionalDecimalInput(
  input: string,
  {
    allowNegative,
    maxScale,
    maxIntegerDigits,
  }: { allowNegative: boolean; maxScale?: number; maxIntegerDigits?: number },
): { ok: true; value: string | null } | { ok: false; error: string } {
  let trimmed = input.trim();
  if (trimmed === "") return { ok: true, value: null };
  if (trimmed.includes(",")) {
    if (!GROUPED_PATTERN.test(trimmed))
      return { ok: false, error: "Use commas only as thousands separators (12,000), or leave them out." };
    trimmed = trimmed.replace(/,/g, "");
  }
  if (!DECIMAL_PATTERN.test(trimmed))
    return { ok: false, error: "Enter a number, or leave it blank if unknown." };
  if (!allowNegative && trimmed.startsWith("-"))
    return { ok: false, error: "This value cannot be negative." };
  // Canonicalise "-0" and leading zeros without changing the decimal digits.
  const negative = trimmed.startsWith("-");
  const [whole, fraction] = trimmed.replace(/^-/, "").split(".");
  const cleanWhole = whole.replace(/^0+(?=\d)/, "");
  if (maxScale !== undefined && (fraction?.length ?? 0) > maxScale)
    return { ok: false, error: `Use at most ${maxScale} decimal places.` };
  if (maxIntegerDigits !== undefined && cleanWhole.length > maxIntegerDigits)
    return { ok: false, error: `Use at most ${maxIntegerDigits} digits before the decimal point.` };
  const body = fraction ? `${cleanWhole}.${fraction}` : cleanWhole;
  return { ok: true, value: negative && !ZERO_PATTERN.test(body) ? `-${body}` : body };
}

/**
 * Formats a decimal string exactly: thousands grouping on the integer part
 * and the fraction digits as given (optionally padded, never rounded), so
 * large 18-digit values are not distorted by floating point.
 */
export function formatDecimalString(value: string, minFractionDigits = 0) {
  const [whole, fraction = ""] = value.trim().replace(/^-/, "").split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const digits = fraction.padEnd(minFractionDigits, "0");
  return digits ? `${grouped}.${digits}` : grouped;
}

const CURRENCY_SYMBOLS: Record<string, string> = { USD: "$", EUR: "€", GBP: "£" };

function formatCurrencyString(absolute: string, currencyCode: string | null) {
  const amount = formatDecimalString(absolute, currencyCode ? 2 : 0);
  if (!currencyCode) return amount;
  const symbol = CURRENCY_SYMBOLS[currencyCode];
  return symbol ? `${symbol}${amount}` : `${currencyCode} ${amount}`;
}

export const FIELD_STATUS_LABELS: Record<MarketFieldStatus, string> = {
  unknown: "Not confirmed",
  estimated: "Estimate",
  confirmed: "Confirmed",
};

export function fieldStatusLabel(status: MarketFieldStatus | null | undefined) {
  return status ? FIELD_STATUS_LABELS[status] ?? "Not confirmed" : "Not confirmed";
}

/** Shown instead of "Estimate" when a value came from the demo fallback citation. */
export const DEMO_ESTIMATE_STATUS_LABEL = "Demo estimate, not verified";

/**
 * Review label for a price or volume. `demoCitation` is the shared
 * isDemoEstimateCitation() result; it never overrides a confirmed value, and
 * an ordinary workbook estimate keeps the plain "Estimate" label.
 */
export function researchFieldStatusLabel(status: MarketFieldStatus | null | undefined, demoCitation: boolean) {
  return demoCitation && status !== "confirmed" ? DEMO_ESTIMATE_STATUS_LABEL : fieldStatusLabel(status);
}

/**
 * Value text for a price or volume. When the number is unknown but the
 * citation preserved a workbook range, the range is shown as written rather
 * than collapsed to a midpoint.
 */
export function researchValueLabel(described: { label: string }, value: string | null, workbookRange: string | null) {
  if (isDecimalString(value) || !workbookRange) return described.label;
  return `Workbook range ${workbookRange} (unverified)`;
}

export type ResearchPriceKind = "unknown" | "zero" | "price" | "gate_fee";

/** Describes a research price. Negative values are gate fees paid by the seller. */
export function describeResearchPrice(price: ResearchPriceLike | null | undefined): {
  kind: ResearchPriceKind;
  label: string;
} {
  if (!price || !isDecimalString(price.value)) return { kind: "unknown", label: UNKNOWN_LABEL };
  const value = price.value.trim();
  const per = price.perUnit ? `/${price.perUnit}` : "";
  const amount = formatCurrencyString(value, price.currencyCode);
  if (ZERO_PATTERN.test(value)) return { kind: "zero", label: `${amount}${per}` };
  if (value.startsWith("-"))
    return { kind: "gate_fee", label: `Gate fee ${amount}${per} (seller pays)` };
  return { kind: "price", label: `${amount}${per}` };
}

/** Describes a volume as annual capacity. Never phrased as available stock. */
export function describeResearchVolume(volume: ResearchVolumeLike | null | undefined): {
  known: boolean;
  label: string;
} {
  if (!volume || !isDecimalString(volume.value)) return { known: false, label: UNKNOWN_LABEL };
  const unit = volume.unit ?? "";
  const base = `${formatDecimalString(volume.value)}${unit ? ` ${unit}` : ""}`;
  if (volume.period === "annual") {
    // Units like "t/yr" already carry the period.
    return {
      known: true,
      label: /\/(yr|year)$/i.test(unit) ? `${base} (annual)` : `${base} per year (annual)`,
    };
  }
  return { known: true, label: `${base} (period not stated)` };
}

export const ADDRESS_PURPOSE_LABELS: Record<AddressPurpose, string> = {
  unknown: "Address role unknown",
  headquarters: "Headquarters, not a pickup site",
  office: "Office, not a pickup site",
  facility: "Facility",
  pickup: "Pickup site",
};

export function addressPurposeLabel(purpose: AddressPurpose | null | undefined) {
  return ADDRESS_PURPOSE_LABELS[purpose ?? "unknown"] ?? ADDRESS_PURPOSE_LABELS.unknown;
}

/** One-line address; missing parts are omitted, a fully empty address is unknown. */
export function formatAddressLine(address: AddressLike | null | undefined) {
  if (!address) return UNKNOWN_LABEL;
  const region = [address.stateProvince, address.postalCode].filter(Boolean).join(" ");
  const parts = [address.street, address.city, region, address.countryCode]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(", ") : UNKNOWN_LABEL;
}

export function sourceCheckedLabel(checked: boolean | null | undefined) {
  // A source assertion only; it never confirms a field value or KYC.
  if (checked === true) return "Source marked checked";
  if (checked === false) return "Source not marked checked";
  return "Source check unknown";
}

export const SOURCE_RECORD_TYPE_LABELS: Record<string, string> = {
  confirmed_stream: "Confirmed stream",
  identified_stream: "Identified stream",
  estimate: "Estimate",
  prospect: "Prospect",
  buyer_need: "Buyer need",
};

export function sourceRecordTypeLabel(code: string | null | undefined) {
  if (!code) return "Type not recorded";
  return (
    SOURCE_RECORD_TYPE_LABELS[code] ??
    code.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

/** Returns the URL only when it is an absolute http(s) link; otherwise null. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * CSV cell that cannot be interpreted as a spreadsheet formula. Finite numbers
 * pass through unchanged so a signed gate fee stays numeric.
 */
export function csvCell(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = value ?? "";
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function formatReviewStamp(
  reviewer: string | null | undefined,
  at: string | null | undefined,
) {
  const date = at ? new Date(at) : null;
  const dateLabel =
    date && Number.isFinite(date.getTime())
      ? date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      : null;
  if (!reviewer && !dateLabel) return "Not reviewed";
  return [reviewer ?? "Reviewer unknown", dateLabel ?? "date unknown"].join(" · ");
}
