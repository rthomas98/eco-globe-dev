import type {
  ListingImportDiagnostic,
  ListingImportListing,
  ListingImportRow,
} from "../../shared/src/listing-import-api.js";
import { hasDemoEstimateMarker } from "../../shared/src/demo-estimates.mjs";
import { ApiError } from "./http.js";
import {
  listingNumeric,
  listingText,
  validateSpecifications,
} from "./listing-validation.js";
import {
  listingImportHeaders as headers,
  listingImportUnits,
  type ImportReferences,
  type WorkbookCell,
  type WorkbookRow,
} from "./listing-import-workbook.js";

const normalized = (value: string) => value.trim().toLowerCase();
function stringCell(cell: WorkbookCell | undefined): string | null {
  if (cell == null) return null;
  if (typeof cell === "object") return cell.date;
  return String(cell).trim() || null;
}
function numericCell(
  cell: WorkbookCell | undefined,
  field: string,
  scale: number,
  positive: boolean,
): number | null {
  if (cell == null) return null;
  let value: number;
  if (typeof cell === "number") value = cell;
  else {
    if (typeof cell !== "string") throw new ApiError(400, "Must be a number.");
    const text = cell.trim().replace(/^\$\s*/u, "");
    if (
      !/^[+-]?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(
        text,
      )
    )
      throw new ApiError(400, "Must be a valid number.");
    value = Number(text.replace(/,/gu, ""));
  }
  const result = listingNumeric(value, field, scale);
  if (positive && result !== null && result <= 0)
    throw new ApiError(400, "Must be greater than zero.");
  return result;
}
function dateCell(cell: WorkbookCell | undefined): string | null {
  if (cell == null) return null;
  const value = stringCell(cell)!;
  if (
    typeof cell === "number" ||
    !/^\d{4}-\d{2}-\d{2}$/u.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new ApiError(400, "Use a valid Excel date or YYYY-MM-DD date.");
  return value;
}
export function listingImportCounts(rows: ListingImportRow[]) {
  return {
    total: rows.length,
    ready: rows.filter((r) => r.status === "ready").length,
    warning: rows.filter((r) => r.status === "warning").length,
    error: rows.filter((r) => r.status === "error").length,
  };
}
export function validateListingImportRows(
  source: WorkbookRow[],
  refs: ImportReferences,
): ListingImportRow[] {
  const titles = new Map<string, number>();
  for (const row of source) {
    const title = stringCell(row.cells[0]);
    if (title)
      titles.set(normalized(title), (titles.get(normalized(title)) ?? 0) + 1);
  }
  const existing = new Set(refs.existingTitles.map(normalized));
  return source.map(({ rowNumber, cells }) => {
    const diagnostics: ListingImportDiagnostic[] = [];
    const error = (i: number, message: string) =>
      diagnostics.push({ field: headers[i]!, severity: "error", message });
    function check<T>(i: number, work: () => T): T | null {
      try {
        return work();
      } catch (e) {
        if (!(e instanceof ApiError)) throw e;
        error(i, e.message);
        return null;
      }
    }
    const title = check(0, () =>
      listingText(stringCell(cells[0]), "Title", 200),
    );
    if (!stringCell(cells[0])) error(0, "Title is required.");
    const materialName = stringCell(cells[1]);
    const materials = materialName
      ? refs.materials.filter(
          (m) =>
            normalized(m.code) === normalized(materialName) ||
            normalized(m.label) === normalized(materialName),
        )
      : [];
    if (!materialName) error(1, "Material type is required.");
    else if (materials.length !== 1)
      error(1, "Unknown or ambiguous material type. Use its code.");
    const material = materials.length === 1 ? materials[0] : null;
    const quantity = check(2, () => numericCell(cells[2], "Quantity", 3, true));
    let unit = stringCell(cells[3])?.toLowerCase() ?? null;
    if (unit === "t") unit = "tonnes";
    if (unit && !listingImportUnits.includes(unit)) error(3, "Unknown unit.");
    const moq = check(4, () => numericCell(cells[4], "Minimum order", 3, true));
    const price = check(5, () =>
      numericCell(cells[5], "Price per unit", 2, true),
    );
    if (quantity !== null && moq !== null && moq > quantity)
      error(4, "MOQ cannot exceed available quantity.");
    const currency = stringCell(cells[6])?.toUpperCase() ?? null;
    if (currency && !/^[A-Z]{3}$/u.test(currency))
      error(6, "Currency must be three letters.");
    const facilityName = stringCell(cells[7]);
    const locations = facilityName
      ? refs.locations.filter(
          (l) => normalized(l.name) === normalized(facilityName),
        )
      : [];
    if (facilityName && !locations.length)
      error(7, "Unknown facility for this seller company.");
    if (locations.length > 1)
      error(
        7,
        "Facility name is ambiguous. Rename the facilities and upload again.",
      );
    const location = locations.length === 1 ? locations[0] : null;
    const description = check(8, () =>
      listingText(stringCell(cells[8]), "Description", 10000),
    );
    if (hasDemoEstimateMarker(description))
      error(
        8,
        "Replace demo estimates and remove the demo estimate note before importing this listing.",
      );
    const carbon = check(9, () =>
      numericCell(cells[9], "Carbon intensity (kg CO2e/t)", 3, false),
    );
    const from = check(10, () => dateCell(cells[10]));
    const to = check(11, () => dateCell(cells[11]));
    if (from && to && from > to) error(11, "Availability end precedes start.");
    for (const i of [2, 3, 4, 5, 6, 7])
      if (cells[i] == null)
        diagnostics.push({
          field: headers[i]!,
          severity: "warning",
          message: "Needed before this listing can be submitted for review.",
        });
    if (currency && /^[A-Z]{3}$/u.test(currency) && currency !== "USD")
      diagnostics.push({
        field: headers[6]!,
        severity: "warning",
        message:
          "Online checkout supports USD only; buyers will need to request a quote.",
      });
    if (
      title &&
      ((titles.get(normalized(title)) ?? 0) > 1 ||
        existing.has(normalized(title)))
    )
      diagnostics.push({
        field: headers[0]!,
        severity: "warning",
        message:
          "Title duplicates another row or an existing non-closed listing of this company.",
      });
    const listing: ListingImportListing = {
      title,
      materialTypeCode: material?.code ?? null,
      materialTypeLabel: material?.label ?? null,
      quantity,
      quantityUnit: unit,
      minimumOrderQuantity: moq,
      pricePerUnit: price,
      currencyCode: currency,
      locationId: location?.id ?? null,
      locationName: location?.name ?? null,
      description,
      carbonIntensityKgCo2e: carbon,
      availabilityFrom: from,
      availabilityTo: to,
    };
    return {
      rowNumber,
      status: diagnostics.some((d) => d.severity === "error")
        ? "error"
        : diagnostics.length
          ? "warning"
          : "ready",
      listing,
      diagnostics,
    };
  });
}
/** Recheck canonical stored values as well as current FK ownership before any writes. */
export function revalidateListingImport(
  listing: ListingImportListing,
  refs: ImportReferences,
) {
  if (!listingText(listing.title, "title", 200))
    throw new ApiError(409, "Imported title is missing.");
  if (!refs.materials.some((m) => m.code === listing.materialTypeCode))
    throw new ApiError(409, "A material type no longer exists. Upload again.");
  if (
    listing.locationId !== null &&
    !refs.locations.some((l) => l.id === listing.locationId)
  )
    throw new ApiError(
      409,
      "A facility no longer belongs to this seller. Upload again.",
    );
  for (const [value, field, scale] of [
    [listing.quantity, "quantity", 3],
    [listing.minimumOrderQuantity, "minimumOrderQuantity", 3],
    [listing.pricePerUnit, "pricePerUnit", 2],
  ] as const) {
    listingNumeric(value, field, scale);
    if (value !== null && value <= 0)
      throw new ApiError(409, "Imported numbers must be positive.");
  }
  if (
    listing.quantity !== null &&
    listing.minimumOrderQuantity !== null &&
    listing.minimumOrderQuantity > listing.quantity
  )
    throw new ApiError(409, "MOQ exceeds quantity.");
  if (
    listing.quantityUnit &&
    !listingImportUnits.includes(listing.quantityUnit)
  )
    throw new ApiError(409, "Invalid imported unit.");
  if (listing.currencyCode && !/^[A-Z]{3}$/u.test(listing.currencyCode))
    throw new ApiError(409, "Invalid imported currency.");
  listingText(listing.description, "description", 10000);
  if (hasDemoEstimateMarker(listing.description))
    throw new ApiError(409, "Remove demo estimates and upload again.");
  listingNumeric(listing.carbonIntensityKgCo2e, "carbonIntensityKgCo2e", 3);
  return validateSpecifications({
    availabilityFrom: listing.availabilityFrom,
    availabilityTo: listing.availabilityTo,
  });
}
