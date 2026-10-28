import { ApiError } from "./http.js";
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError(400, "Expected an object.");
  return value as Record<string, unknown>;
}
export function listingText(
  value: unknown,
  key: string,
  max = 240,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > max)
    throw new ApiError(400, `${key} must be text up to ${max} characters.`);
  return value.trim() || null;
}
export function listingNumeric(
  value: unknown,
  key: string,
  scale: number,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 999999999999 ||
    Math.abs(value * 10 ** scale - Math.round(value * 10 ** scale)) > 0.001
  )
    throw new ApiError(
      400,
      `${key} must be a nonnegative number with at most ${scale} decimals.`,
    );
  return value;
}
const specKeys = [
  "category",
  "material",
  "listingType",
  "grade",
  "color",
  "shelfLife",
  "storage",
  "packaging",
  "weight",
  "usage",
  "origin",
  "quality",
  "composition",
  "frequency",
  "state",
  "availabilityFrom",
  "availabilityTo",
  "sustainabilityNotes",
  "originLocation",
];
export function validateSpecifications(input: unknown) {
  const source = input == null ? {} : object(input);
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(source))
    if (
      ![...specKeys, "sameAsCompany", "claims", "additionalSpecs"].includes(key)
    )
      throw new ApiError(400, `Unknown specification ${key}.`);
  for (const key of specKeys) result[key] = listingText(source[key], key, 4000);
  for (const key of ["availabilityFrom", "availabilityTo"]) {
    const date = result[key];
    if (
      date &&
      (typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    )
      throw new ApiError(400, `${key} must be a valid date.`);
  }
  if (
    typeof result.availabilityFrom === "string" &&
    typeof result.availabilityTo === "string" &&
    result.availabilityFrom > result.availabilityTo
  )
    throw new ApiError(400, "Availability end precedes start.");
  if (
    source.sameAsCompany !== undefined &&
    typeof source.sameAsCompany !== "boolean"
  )
    throw new ApiError(400, "sameAsCompany must be boolean.");
  result.sameAsCompany = source.sameAsCompany ?? false;
  const claims = source.claims ?? [];
  if (!Array.isArray(claims) || claims.length > 50)
    throw new ApiError(400, "claims must be an array of at most 50 strings.");
  result.claims = claims.map((value) => {
    const claim = listingText(value, "claim");
    if (!claim) throw new ApiError(400, "Empty claim.");
    return claim;
  });
  const specs = source.additionalSpecs ?? [];
  if (!Array.isArray(specs) || specs.length > 50)
    throw new ApiError(
      400,
      "additionalSpecs must be an array of at most 50 rows.",
    );
  result.additionalSpecs = specs.map((value) => {
    const row = object(value);
    const label = listingText(row.label, "label");
    const valueText = listingText(row.value, "value", 4000);
    if (!label || !valueText)
      throw new ApiError(400, "Specification label and value required.");
    return { label, value: valueText };
  });
  return result;
}
