import { hasDemoEstimateMarker } from "../../shared/src/demo-estimates.mjs";
import { ApiError } from "./http.js";
import type {
  WantedListingFields,
  WantedListingStatusCode,
} from "../../shared/src/wanted-listing-api.js";

export type WantedState = WantedListingFields & {
  isDraft: boolean;
  isOpen: boolean;
  acceptedCount: number;
};
export function wantedStatus(saved: {
  isDraft?: unknown;
  isOpen?: unknown;
  acceptedCount?: unknown;
}): WantedListingStatusCode {
  return saved.isDraft
    ? "draft"
    : saved.isOpen && !Number(saved.acceptedCount ?? 0)
      ? "open"
      : "closed";
}
const fieldNames = [
  "title",
  "materialTypeCode",
  "quantity",
  "quantityUnit",
  "targetPricePerUnit",
  "currencyCode",
  "countryCode",
  "stateProvince",
  "notes",
  "needByDate",
];
const units = [
  "ton",
  "tons",
  "tonne",
  "tonnes",
  "t",
  "kg",
  "lb",
  "unit",
  "units",
];
function object(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new ApiError(400, "Expected an object.");
  return Object.fromEntries(Object.entries(body));
}
function text(
  value: unknown,
  key: string,
  max: number,
  required = false,
  preserveWhitespace = false,
): string | null {
  if (value == null || value === "") {
    if (required) throw new ApiError(400, `${key} is required.`);
    return null;
  }
  if (typeof value !== "string" || value.length > max)
    throw new ApiError(400, `Invalid ${key}.`);
  const result = value.trim();
  if (!result && required) throw new ApiError(400, `${key} is required.`);
  return result ? (preserveWhitespace ? value : result) : null;
}
function decimal(
  value: unknown,
  key: string,
  scale: number,
  allowZero = false,
): number | null {
  if (value == null) return null;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (allowZero ? value < 0 : value <= 0) ||
    value > 999999999999 ||
    Math.round(value * 10 ** scale) / 10 ** scale !== value
  )
    throw new ApiError(
      400,
      `${key} must be ${allowZero ? "nonnegative" : "positive"} with at most ${scale} decimals.`,
    );
  return value;
}
export function parseWantedWrite(
  input: unknown,
  previous?: WantedState,
): WantedState {
  const body = object(input);
  for (const key of Object.keys(body))
    if (
      ![...fieldNames, "statusCode", ...(previous ? ["isOpen"] : [])].includes(
        key,
      )
    )
      throw new ApiError(400, `Unknown request field ${key}.`);
  if (
    "statusCode" in body &&
    (typeof body.statusCode !== "string" ||
      !["draft", "open", "closed"].includes(body.statusCode))
  )
    throw new ApiError(400, "Invalid statusCode.");
  if ("isOpen" in body && typeof body.isOpen !== "boolean")
    throw new ApiError(400, "isOpen must be boolean.");
  if (
    "isOpen" in body &&
    "statusCode" in body &&
    body.isOpen !== (body.statusCode === "open")
  )
    throw new ApiError(400, "Conflicting statusCode and isOpen.");
  const priorStatus = previous ? wantedStatus(previous) : undefined;
  const status =
    body.statusCode ??
    ("isOpen" in body
      ? body.isOpen
        ? "open"
        : priorStatus === "draft"
          ? "draft"
          : "closed"
      : (priorStatus ?? "open"));
  if (!previous && status === "closed")
    throw new ApiError(400, "New requests must be draft or open.");
  if (
    previous &&
    ((priorStatus !== "draft" && status === "draft") ||
      (priorStatus === "draft" &&
        (status === "closed" || ("isOpen" in body && !("statusCode" in body)))))
  )
    throw new ApiError(409, "Invalid request transition.");
  if (previous?.acceptedCount && status === "open")
    throw new ApiError(409, "An accepted request cannot be reopened.");
  const merged = { ...previous, ...body };
  if (status === "open" && hasDemoEstimateMarker(merged.notes))
    throw new ApiError(400, "Replace demo estimates and remove the demo estimate note before posting this request.");
  // Defaults are confined to the existing immediate-post creation path.
  if (!previous && status === "open") {
    if (!("quantityUnit" in body)) merged.quantityUnit = "tons";
    if (!("currencyCode" in body)) merged.currencyCode = "USD";
  }
  const quantityUnit = text(merged.quantityUnit, "quantityUnit", 40);
  if (quantityUnit && !units.includes(quantityUnit))
    throw new ApiError(400, "Unsupported quantity unit.");
  const currencyCode =
    text(merged.currencyCode, "currencyCode", 3)?.toUpperCase() ?? null;
  const countryCode =
    text(merged.countryCode, "countryCode", 2)?.toUpperCase() ?? null;
  if (currencyCode && !/^[A-Z]{3}$/.test(currencyCode))
    throw new ApiError(400, "currencyCode must contain three letters.");
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode))
    throw new ApiError(400, "countryCode must contain two letters.");
  const needByDate = text(merged.needByDate, "needByDate", 10);
  if (
    needByDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(needByDate) ||
      needByDate.startsWith("0000-") ||
      !Number.isFinite(Date.parse(needByDate)) ||
      new Date(needByDate).toISOString().slice(0, 10) !== needByDate)
  )
    throw new ApiError(400, "needByDate must be a valid YYYY-MM-DD date.");
  const quantity = decimal(merged.quantity, "quantity", 3);
  if (
    status !== "draft" &&
    (quantity === null || !quantityUnit || !currencyCode || !countryCode)
  )
    throw new ApiError(
      400,
      "Posting requires quantity, unit, currency and country.",
    );
  return {
    title: text(merged.title, "title", 200, true)!,
    materialTypeCode: text(
      merged.materialTypeCode,
      "materialTypeCode",
      80,
      true,
    )!,
    quantity,
    quantityUnit,
    currencyCode,
    countryCode,
    needByDate,
    targetPricePerUnit: decimal(
      merged.targetPricePerUnit,
      "targetPricePerUnit",
      2,
      true,
    ),
    stateProvince: text(merged.stateProvince, "stateProvince", 120),
    notes: text(merged.notes, "notes", 2000, false, true),
    isDraft: status === "draft",
    isOpen:
      previous?.acceptedCount && !("statusCode" in body) && !("isOpen" in body)
        ? previous.isOpen
        : status === "open",
    acceptedCount: previous?.acceptedCount ?? 0,
  };
}
