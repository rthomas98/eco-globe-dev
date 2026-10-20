import type {
  MarketRecord,
  MarketRecordChanges,
  MarketRecordInput,
  MarketRecordRole,
  MarketSourceType,
} from "@/lib/api-market-records";
import {
  SOURCE_RECORD_TYPE_LABELS,
  parseOptionalDecimalInput,
  type AddressPurpose,
} from "@/lib/market-record-format";

/*
 * Form state and validation for a direct-entry market record. Optional
 * fields may stay blank and blank is sent as null (unknown), never as zero.
 * Review status, reviewer and date are never part of the input.
 */

export type Draft = {
  role: MarketRecordRole;
  companyName: string;
  facilityName: string;
  feedstock: string;
  feedstockGroup: string;
  buyerNeed: string;
  sourceRecordType: MarketSourceType;
  sourceChecked: "yes" | "no" | "unknown";
  sourceCheckedBy: string;
  sourceCheckedAt: string;
  sourceCitation: string;
  addressSource: string;
  street: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  countryCode: string;
  addressPurpose: AddressPurpose;
  volumeValue: string;
  volumeUnit: string;
  volumePeriod: "annual" | "unspecified";
  volumeCitation: string;
  priceAmount: string;
  priceIsGateFee: boolean;
  priceCurrency: string;
  pricePerUnit: string;
  priceCitation: string;
  reason: string;
};

export type FieldKey = keyof Draft;
export type FieldErrors = Partial<Record<FieldKey, string>>;

/** Source record types allowed per side (buyer: need or prospect; seller: all but buyer need). */
export const TYPES_BY_ROLE: Record<MarketRecordRole, MarketSourceType[]> = {
  seller: ["confirmed_stream", "identified_stream", "estimate", "prospect"],
  buyer: ["buyer_need", "prospect"],
};
export const UNIT_OPTIONS = [
  { value: "t", label: "Tonnes (t)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "lb", label: "Pounds (lb)" },
  { value: "gal", label: "Gallons (gal)" },
  { value: "unit", label: "Units" },
];
export const CURRENCY_SUGGESTIONS = ["USD", "EUR"];

/** Mirrors SQL DECIMAL(18,2) price and DECIMAL(18,3) volume. */
const DECIMAL_LIMITS = {
  priceAmount: { maxScale: 2, maxIntegerDigits: 16 },
  volumeValue: { maxScale: 3, maxIntegerDigits: 15 },
} as const;

/** Server `fieldErrors` keys (dotted wire paths) mapped to form fields. */
const SERVER_FIELD_MAP: Record<string, FieldKey> = {
  role: "role",
  companyName: "companyName",
  facilityName: "facilityName",
  feedstock: "feedstock",
  feedstockGroup: "feedstockGroup",
  buyerNeed: "buyerNeed",
  sourceRecordType: "sourceRecordType",
  sourceChecked: "sourceChecked",
  sourceCheckedBy: "sourceCheckedBy",
  sourceCheckedAt: "sourceCheckedAt",
  sourceCitation: "sourceCitation",
  addressSource: "addressSource",
  "address.street": "street",
  "address.city": "city",
  "address.stateProvince": "stateProvince",
  "address.postalCode": "postalCode",
  "address.countryCode": "countryCode",
  "address.purpose": "addressPurpose",
  "volume.value": "volumeValue",
  "volume.unit": "volumeUnit",
  "volume.period": "volumePeriod",
  "volume.citation": "volumeCitation",
  "price.value": "priceAmount",
  "price.currencyCode": "priceCurrency",
  "price.perUnit": "pricePerUnit",
  "price.citation": "priceCitation",
  // Whole-group errors (e.g. a price without currency or unit).
  address: "street",
  volume: "volumeValue",
  price: "priceAmount",
  reason: "reason",
};

/** Maps server field errors to form fields; unmapped keys are covered by the request-level message. */
export function mapServerFieldErrors(serverFieldErrors: Record<string, string>): FieldErrors {
  const mapped: FieldErrors = {};
  for (const [path, message] of Object.entries(serverFieldErrors)) {
    const key = SERVER_FIELD_MAP[path];
    if (key) mapped[key] = message;
  }
  return mapped;
}

export const LABELS: Record<FieldKey, string> = {
  role: "Side",
  companyName: "Company name",
  facilityName: "Facility name",
  feedstock: "Feedstock",
  feedstockGroup: "Feedstock group",
  buyerNeed: "Buyer need",
  sourceRecordType: "Record type",
  sourceChecked: "Source check claim",
  sourceCheckedBy: "Original source checker",
  sourceCheckedAt: "Original source check date",
  sourceCitation: "Source citation",
  addressSource: "Address source",
  street: "Street",
  city: "City",
  stateProvince: "State or province",
  postalCode: "Postal code",
  countryCode: "Country code",
  addressPurpose: "Address role",
  volumeValue: "Volume",
  volumeUnit: "Volume unit",
  volumePeriod: "Volume period",
  volumeCitation: "Volume citation",
  priceAmount: "Research price",
  priceIsGateFee: "Price direction",
  priceCurrency: "Currency",
  pricePerUnit: "Price per unit",
  priceCitation: "Price citation",
  reason: "Reason",
};

export function toDraft(record: MarketRecord | null, role: MarketRecordRole): Draft {
  const price = record?.price.value?.trim() ?? "";
  return {
    role: record?.role ?? role,
    companyName: record?.companyName ?? "",
    facilityName: record?.facilityName ?? "",
    feedstock: record?.feedstock ?? "",
    feedstockGroup: record?.feedstockGroup ?? "",
    buyerNeed: record?.buyerNeed ?? "",
    sourceRecordType: record?.sourceRecordType ?? "prospect",
    sourceChecked:
      record?.sourceChecked === true ? "yes" : record?.sourceChecked === false ? "no" : "unknown",
    sourceCheckedBy: record?.sourceCheckedBy ?? "",
    sourceCheckedAt: record?.sourceCheckedAt?.slice(0, 10) ?? "",
    sourceCitation: record?.sourceCitation ?? "",
    addressSource: record?.addressSource ?? "",
    street: record?.address.street ?? "",
    city: record?.address.city ?? "",
    stateProvince: record?.address.stateProvince ?? "",
    postalCode: record?.address.postalCode ?? "",
    countryCode: record?.address.countryCode ?? "",
    addressPurpose: record?.address.purpose ?? "unknown",
    volumeValue: record?.volume.value ?? "",
    volumeUnit: record?.volume.unit ?? "",
    volumePeriod: record?.volume.period ?? "annual",
    volumeCitation: record?.volume.citation ?? "",
    priceAmount: price.replace(/^-/, ""),
    priceIsGateFee: price.startsWith("-"),
    priceCurrency: record?.price.currencyCode ?? "",
    pricePerUnit: record?.price.perUnit ?? "",
    priceCitation: record?.price.citation ?? "",
    reason: "",
  };
}

export const optionalText = (value: string) => (value.trim() === "" ? null : value.trim());

export function validateDraft(
  draft: Draft,
  requireReason = false,
): { ok: true; input: MarketRecordInput } | { ok: false; errors: FieldErrors } {
  const text = optionalText;
  const errors: FieldErrors = {};
  if (requireReason && !draft.reason.trim())
    errors.reason = "Enter a reason so the record history explains this change.";
  if (!draft.companyName.trim()) errors.companyName = "Enter the company name.";
  if (!draft.feedstock.trim()) errors.feedstock = "Enter the feedstock.";
  if (!TYPES_BY_ROLE[draft.role].includes(draft.sourceRecordType))
    errors.sourceRecordType = `${SOURCE_RECORD_TYPE_LABELS[draft.sourceRecordType]} does not apply to a ${draft.role} record.`;
  if (draft.sourceCheckedAt && !/^\d{4}-\d{2}-\d{2}$/.test(draft.sourceCheckedAt))
    errors.sourceCheckedAt = "Enter a valid date, or leave it blank if unknown.";
  const country = draft.countryCode.trim().toUpperCase();
  if (country && !/^[A-Z]{2}$/.test(country))
    errors.countryCode = "Use a two-letter country code such as US, or leave it blank.";
  const currency = draft.priceCurrency.trim().toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency))
    errors.priceCurrency = "Use a three-letter currency code such as USD, or leave it blank.";

  const decimals = { volumeValue: null, priceAmount: null } as Record<keyof typeof DECIMAL_LIMITS, string | null>;
  for (const key of ["volumeValue", "priceAmount"] as const) {
    const parsed = parseOptionalDecimalInput(draft[key], { allowNegative: false, ...DECIMAL_LIMITS[key] });
    if (parsed.ok) decimals[key] = parsed.value;
    else errors[key] = parsed.error;
  }
  if (decimals.volumeValue !== null && !draft.volumeUnit)
    errors.volumeUnit = "Choose the unit for this volume.";
  if (decimals.priceAmount !== null) {
    if (!currency) errors.priceCurrency = "Enter the currency for this price.";
    if (!draft.pricePerUnit) errors.pricePerUnit = "Choose what the price is per.";
  }
  if (Object.keys(errors).length) return { ok: false, errors };

  const priceValue =
    decimals.priceAmount !== null && draft.priceIsGateFee && !/^0+(\.0+)?$/.test(decimals.priceAmount)
      ? `-${decimals.priceAmount}`
      : decimals.priceAmount;
  return {
    ok: true,
    input: {
      role: draft.role,
      companyName: draft.companyName.trim(),
      facilityName: text(draft.facilityName),
      feedstock: draft.feedstock.trim(),
      feedstockGroup: text(draft.feedstockGroup),
      buyerNeed: draft.role === "buyer" ? text(draft.buyerNeed) : null,
      sourceRecordType: draft.sourceRecordType,
      sourceChecked:
        draft.sourceChecked === "yes" ? true : draft.sourceChecked === "no" ? false : null,
      // The original source's own checker claim; never an EcoGlobe reviewer.
      sourceCheckedBy: text(draft.sourceCheckedBy),
      sourceCheckedAt: draft.sourceCheckedAt ? `${draft.sourceCheckedAt}T00:00:00.000Z` : null,
      sourceCitation: text(draft.sourceCitation),
      addressSource: text(draft.addressSource),
      address: {
        street: text(draft.street),
        city: text(draft.city),
        stateProvince: text(draft.stateProvince),
        postalCode: text(draft.postalCode),
        countryCode: country || null,
        purpose: draft.addressPurpose,
      },
      volume: {
        value: decimals.volumeValue,
        unit: text(draft.volumeUnit),
        period: draft.volumePeriod,
        citation: text(draft.volumeCitation),
      },
      price: {
        value: priceValue,
        currencyCode: currency || null,
        perUnit: text(draft.pricePerUnit),
        citation: text(draft.priceCitation),
      },
    },
  };
}

/** Only changed top-level keys; address/price/volume groups are sent whole. */
export function diffMarketRecordInput(before: MarketRecordInput, after: MarketRecordInput): MarketRecordChanges {
  const changes: Record<string, unknown> = {};
  for (const key of Object.keys(after) as (keyof MarketRecordInput)[]) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) changes[key] = after[key];
  }
  return changes as MarketRecordChanges;
}

/** The record as the form would submit it unchanged, used as the PATCH baseline. */
export function recordToInput(record: MarketRecord): MarketRecordInput | null {
  const result = validateDraft(toDraft(record, record.role));
  return result.ok ? result.input : null;
}
