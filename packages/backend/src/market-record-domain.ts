import { createHash } from "node:crypto";
import type {
  MarketRecordData,
  MarketReview,
  MarketReviewStatus,
  MarketPreviewRow,
} from "../../shared/src/market-records-api.js";
import { ApiError } from "./http.js";

export class MarketRecordError extends ApiError {
  constructor(
    status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(status, message);
  }
}
export function invalid(field: string, message: string): never {
  throw new MarketRecordError(400, "validation_failed", message, {
    [field]: message,
  });
}
export function object(
  value: unknown,
  field = "body",
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalid(field, `${field} must be an object.`);
  return value as Record<string, unknown>;
}
export function keys(
  value: Record<string, unknown>,
  allowed: readonly string[],
) {
  for (const key of Object.keys(value))
    if (!allowed.includes(key))
      invalid(key, `Unknown or server-owned field ${key}.`);
}
export function text(
  value: unknown,
  field: string,
  max: number,
  required = false,
): string | null {
  if (value === null || value === undefined || value === "") {
    if (required) invalid(field, `${field} is required.`);
    return null;
  }
  if (
    typeof value !== "string" ||
    value.length > max ||
    Array.from(value).some(
      (character) =>
        character.charCodeAt(0) < 32 &&
        ![9, 10, 13].includes(character.charCodeAt(0)),
    )
  )
    invalid(field, `${field} must be text of at most ${max} characters.`);
  const result = value.trim();
  if (required && !result) invalid(field, `${field} is required.`);
  return result || null;
}
export function choice<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  for (const item of allowed) if (value === item) return item;
  return invalid(field, `Invalid ${field}.`);
}
export const sourceTypes = [
  "confirmed_stream",
  "identified_stream",
  "estimate",
  "prospect",
  "buyer_need",
] as const;
export const reviewStatuses = ["unknown", "estimated", "confirmed"] as const;
export const emptyReview = (): MarketReview => ({
  status: "unknown",
  citation: null,
  reviewedByUserId: null,
  reviewedByUserName: null,
  reviewedAt: null,
});
export function decimal(
  value: unknown,
  field: string,
  scale: number,
  signed = false,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (
    typeof value !== "string" ||
    !(signed ? /^-?\d+(?:\.\d+)?$/ : /^\d+(?:\.\d+)?$/).test(value)
  )
    invalid(field, `${field} must be a decimal string.`);
  const negative = value.startsWith("-");
  const parts = value.replace(/^-/u, "").split(".");
  const whole = (parts[0] ?? "0").replace(/^0+(?=\d)/u, "");
  const fraction = parts[1] ?? "";
  if (whole.length > 18 - scale || fraction.length > scale)
    invalid(field, `${field} exceeds decimal precision.`);
  const canonical =
    whole +
    (fraction.replace(/0+$/u, "") ? "." + fraction.replace(/0+$/u, "") : "");
  return negative && canonical !== "0" ? "-" + canonical : canonical;
}
const editable = [
  "role",
  "companyName",
  "facilityName",
  "feedstock",
  "feedstockGroup",
  "buyerNeed",
  "sourceRecordType",
  "sourceChecked",
  "sourceCitation",
  "addressSource",
  "sourceCheckedBy",
  "sourceCheckedAt",
  "address",
  "price",
  "volume",
];
export function recordInput(
  input: unknown,
  previous?: MarketRecordData,
): MarketRecordData {
  const body = object(input);
  keys(body, editable);
  const merged = { ...previous, ...body };
  const role = choice(merged.role, ["buyer", "seller"], "role");
  const sourceRecordType = choice(
    merged.sourceRecordType,
    sourceTypes,
    "sourceRecordType",
  );
  if (
    (role === "seller" && sourceRecordType === "buyer_need") ||
    (role === "buyer" && !["prospect", "buyer_need"].includes(sourceRecordType))
  )
    invalid("sourceRecordType", "Record type must match buyer or seller role.");
  const checked = merged.sourceChecked ?? null;
  if (checked !== null && typeof checked !== "boolean")
    invalid("sourceChecked", "sourceChecked must be boolean or null.");
  const addressBody = object(merged.address ?? {}, "address");
  keys(addressBody, [
    "street",
    "city",
    "stateProvince",
    "postalCode",
    "countryCode",
    "purpose",
  ]);
  const countryCode = text(addressBody.countryCode, "address.countryCode", 2);
  if (countryCode && !/^[A-Z]{2}$/u.test(countryCode))
    invalid("address.countryCode", "Country must be two uppercase letters.");
  const address = {
    street: text(addressBody.street, "address.street", 240),
    city: text(addressBody.city, "address.city", 120),
    stateProvince: text(
      addressBody.stateProvince,
      "address.stateProvince",
      120,
    ),
    postalCode: text(addressBody.postalCode, "address.postalCode", 40),
    countryCode,
    purpose: choice(
      addressBody.purpose ?? "unknown",
      ["unknown", "headquarters", "office", "facility", "pickup"],
      "address.purpose",
    ),
  };
  const priceBody = object("price" in body ? body.price : {}, "price");
  const volumeBody = object("volume" in body ? body.volume : {}, "volume");
  keys(priceBody, ["value", "currencyCode", "perUnit", "citation"]);
  keys(volumeBody, ["value", "unit", "period", "citation"]);
  const priceValues =
    "price" in body || !previous
      ? {
          value: decimal(priceBody.value, "price.value", 2, true),
          currencyCode: text(priceBody.currencyCode, "price.currencyCode", 3),
          perUnit: text(priceBody.perUnit, "price.perUnit", 40),
          citation: text(priceBody.citation, "price.citation", 2000),
        }
      : {
          value: previous.price.value,
          currencyCode: previous.price.currencyCode,
          perUnit: previous.price.perUnit,
          citation: previous.price.citation,
        };
  if (priceValues.currencyCode && !/^[A-Z]{3}$/u.test(priceValues.currencyCode))
    invalid("price.currencyCode", "Currency must be three uppercase letters.");
  if (priceValues.perUnit)
    choice(
      priceValues.perUnit,
      ["t", "gal", "kg", "lb", "unit"],
      "price.perUnit",
    );
  if (
    priceValues.value !== null &&
    (!priceValues.currencyCode || !priceValues.perUnit)
  )
    invalid("price", "Price value requires currency and per-unit.");
  const volumeValues =
    "volume" in body || !previous
      ? {
          value: decimal(volumeBody.value, "volume.value", 3),
          unit: text(volumeBody.unit, "volume.unit", 40),
          period: choice(
            volumeBody.period ?? "unspecified",
            ["annual", "unspecified"],
            "volume.period",
          ),
          citation: text(volumeBody.citation, "volume.citation", 2000),
        }
      : {
          value: previous.volume.value,
          unit: previous.volume.unit,
          period: previous.volume.period,
          citation: previous.volume.citation,
        };
  if (volumeValues.unit)
    choice(volumeValues.unit, ["t", "gal", "kg", "lb", "unit"], "volume.unit");
  if (volumeValues.value !== null && !volumeValues.unit)
    invalid("volume.unit", "Volume value requires a unit.");
  const buyerNeed = text(merged.buyerNeed, "buyerNeed", 4000);
  if (role !== "buyer" && buyerNeed)
    invalid("buyerNeed", "Buyer need is only applicable to buyer records.");
  const sourceCheckedAt = text(merged.sourceCheckedAt, "sourceCheckedAt", 40);
  if (
    sourceCheckedAt &&
    (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(sourceCheckedAt) ||
      !Number.isFinite(Date.parse(sourceCheckedAt)) ||
      new Date(sourceCheckedAt).toISOString() !== sourceCheckedAt)
  )
    invalid(
      "sourceCheckedAt",
      "Source check date must be a valid UTC ISO timestamp.",
    );
  const priceReview =
    previous &&
    JSON.stringify(priceValues) ===
      JSON.stringify({
        value: previous.price.value,
        currencyCode: previous.price.currencyCode,
        perUnit: previous.price.perUnit,
        citation: previous.price.citation,
      })
      ? previous.price
      : emptyReview();
  const volumeReview =
    previous &&
    JSON.stringify(volumeValues) ===
      JSON.stringify({
        value: previous.volume.value,
        unit: previous.volume.unit,
        period: previous.volume.period,
        citation: previous.volume.citation,
      })
      ? previous.volume
      : emptyReview();
  return {
    role,
    sourceRecordType,
    companyName: text(merged.companyName, "companyName", 240, true)!,
    facilityName: text(merged.facilityName, "facilityName", 160),
    feedstock: text(merged.feedstock, "feedstock", 500, true)!,
    feedstockGroup: text(merged.feedstockGroup, "feedstockGroup", 160),
    buyerNeed,
    sourceChecked: checked,
    sourceCitation: text(merged.sourceCitation, "sourceCitation", 2000),
    addressSource: text(merged.addressSource, "addressSource", 2000),
    sourceCheckedBy: text(merged.sourceCheckedBy, "sourceCheckedBy", 240),
    sourceCheckedAt,
    address,
    addressReview:
      previous && JSON.stringify(address) === JSON.stringify(previous.address)
        ? previous.addressReview
        : emptyReview(),
    price: { ...priceReview, ...priceValues },
    volume: { ...volumeReview, ...volumeValues },
  };
}
export function fingerprint(record: MarketRecordData): Buffer {
  const a = record.address;
  const values = [
    record.role,
    record.companyName,
    record.facilityName,
    a.street,
    a.city,
    a.stateProvince,
    a.postalCode,
    a.countryCode,
    record.feedstock,
  ];
  return createHash("sha256")
    .update(
      JSON.stringify(
        values.map((value) =>
          (value ?? "")
            .normalize("NFKC")
            .trim()
            .replace(/\s+/gu, " ")
            .toLowerCase(),
        ),
      ),
    )
    .digest();
}
export function reviewRecord(
  record: MarketRecordData,
  field: "price" | "volume" | "address",
  status: MarketReviewStatus,
  citation: string | null,
  actor: number,
  now: string,
): MarketRecordData {
  if (status !== "unknown" && !citation)
    invalid(
      "citation",
      "A citation is required for estimated or confirmed reviews.",
    );
  if (status === "confirmed") {
    if (
      field === "price" &&
      (record.price.value === null ||
        !record.price.currencyCode ||
        !record.price.perUnit)
    )
      invalid(field, "A complete price is required.");
    if (
      field === "volume" &&
      (record.volume.value === null || !record.volume.unit)
    )
      invalid(field, "A complete volume is required.");
    if (
      field === "address" &&
      (!record.address.street ||
        !record.address.city ||
        !record.address.postalCode ||
        !record.address.countryCode)
    )
      invalid(field, "A full sourced address is required.");
  }
  const review: MarketReview =
    status === "unknown"
      ? emptyReview()
      : {
          status,
          citation,
          reviewedByUserId: actor,
          reviewedByUserName: null,
          reviewedAt: now,
        };
  return field === "address"
    ? { ...record, addressReview: review }
    : { ...record, [field]: { ...record[field], ...review } };
}
export function version(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{16}$/iu.test(value))
    invalid(
      "expectedVersion",
      "expectedVersion must be the saved record version.",
    );
  return value.toLowerCase();
}
export function uuid(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value,
    )
  )
    invalid(field, `${field} must be a UUID.`);
  return value.toLowerCase();
}
export function importDisposition(
  row: MarketPreviewRow,
  excluded: boolean,
  existingId: number | null,
): "excluded" | "duplicate" | "ignored" | "created" {
  if (excluded) return "excluded";
  if (row.decision === "error")
    invalid(
      "excludedRowKeys",
      "Explicitly exclude all invalid rows before committing.",
    );
  if (!row.proposedRecord) return "ignored";
  if (row.decision === "skip" || existingId !== null) return "duplicate";
  return "created";
}
