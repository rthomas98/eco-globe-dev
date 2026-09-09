import type { LocalListingDraftForm } from "@/lib/custom-listings";
import type {
  BackendListing,
  ListingSpecifications,
  ListingWriteBody,
} from "@/lib/listings-api";
import { parseOptionalNumber } from "@/lib/listing-format";

export type ListingForm = LocalListingDraftForm;

export const CATEGORY_OPTIONS = [
  { value: "Chemical Byproducts", label: "Chemical Byproducts" },
  { value: "Refinery Byproducts", label: "Refinery Byproducts" },
  { value: "Plastics", label: "Plastics" },
  { value: "Rubber & Tire-Derived", label: "Rubber & Tire-Derived" },
  { value: "Oils & Liquid Feedstocks", label: "Oils & Liquid Feedstocks" },
  { value: "Biomass & Wood", label: "Biomass & Wood" },
  { value: "Industrial Byproducts", label: "Industrial Byproducts" },
  { value: "Used products", label: "Used products" },
  { value: "Others", label: "Others" },
];

export const MATERIAL_TYPE_OPTIONS = [
  { value: "industrial_byproduct", label: "Industrial byproduct" },
  { value: "low_co2_feedstock", label: "Low CO₂ feedstock" },
  { value: "certified_feedstock", label: "Certified feedstock" },
  { value: "used_product", label: "Used product" },
  { value: "other", label: "Other" },
];

export const UNIT_OPTIONS = [
  { value: "ton", label: "t (metric tonne)" },
  { value: "kg", label: "kg (kilogram)" },
  { value: "lb", label: "lb (pound)" },
  { value: "unit", label: "unit (per item)" },
];

export const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "CAD", label: "CAD" },
  { value: "MXN", label: "MXN" },
  { value: "BRL", label: "BRL" },
  { value: "SAR", label: "SAR" },
];

export const LISTING_TYPE_OPTIONS = [
  { value: "Dried", label: "Dried" },
  { value: "Wet", label: "Wet" },
  { value: "Processed", label: "Processed" },
];

export const GRADE_OPTIONS = [
  { value: "Export Standard", label: "Export Standard" },
  { value: "Premium", label: "Premium" },
  { value: "Standard", label: "Standard" },
];

export const CLAIM_OPTIONS = [
  "Recycled Content",
  "Bio-based Material",
  "Waste-derived Feedstock",
  "Low-carbon Process",
  "Certified Sustainable",
  "Others",
];

export function emptyListingForm(): ListingForm {
  return {
    name: "",
    category: "",
    materialTypeCode: "",
    images: [],
    material: "",
    listingType: "",
    grade: "",
    color: "",
    shelfLife: "",
    storage: "",
    pkg: "",
    weight: "",
    usage: "",
    origin: "",
    price: "",
    currencyCode: "",
    moq: "",
    qty: "",
    unit: "",
    description: "",
    claims: [],
    customClaims: [],
    otherClaim: "",
    sustainNotes: "",
    sameAsCompany: false,
    originLocation: "",
    quality: "",
    composition: "",
    frequency: "",
    state: "",
    availabilityFrom: "",
    availabilityTo: "",
    additionalSpecs: [],
    locationId: "",
    sdsName: "",
  };
}

export function mergeListingForm(partial: Partial<ListingForm> | undefined): ListingForm {
  return { ...emptyListingForm(), ...(partial ?? {}) };
}

function str(value: string | null | undefined) {
  return value ?? "";
}

function numberToInput(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

/** Populate the form from a persisted listing (edit flow). */
export function formFromRecord(record: BackendListing): ListingForm {
  const specs = record.specifications ?? {};
  const claims = (specs.claims ?? []).filter((c) => !!c);
  const known = new Set(CLAIM_OPTIONS);
  const otherClaims = claims.filter((c) => !known.has(c));
  return {
    ...emptyListingForm(),
    name: record.title,
    category: str(specs.category),
    materialTypeCode: record.materialTypeCode ?? "",
    material: str(specs.material),
    listingType: str(specs.listingType),
    grade: str(specs.grade),
    color: str(specs.color),
    shelfLife: str(specs.shelfLife),
    storage: str(specs.storage),
    pkg: str(specs.packaging),
    weight: str(specs.weight),
    usage: str(specs.usage),
    origin: str(specs.origin),
    price: numberToInput(record.pricePerUnit),
    currencyCode: (record.currencyCode ?? "").toUpperCase(),
    moq: numberToInput(record.minimumOrderQuantity),
    qty: numberToInput(record.quantity),
    unit: record.quantityUnit ?? "",
    description: str(record.description),
    claims: claims.filter((c) => known.has(c)),
    // Custom claims are preserved as individual entries so a no-op edit never
    // rewrites them; the "Others" input adds a new entry.
    customClaims: otherClaims,
    otherClaim: "",
    sustainNotes: str(specs.sustainabilityNotes),
    sameAsCompany: specs.sameAsCompany === true,
    originLocation: str(specs.originLocation),
    quality: str(specs.quality),
    composition: str(specs.composition),
    frequency: str(specs.frequency),
    state: str(specs.state),
    availabilityFrom: str(specs.availabilityFrom),
    availabilityTo: str(specs.availabilityTo),
    additionalSpecs: specs.additionalSpecs ?? [],
    locationId: record.locationId ? String(record.locationId) : "",
    sdsName: record.documents?.find((d) => d.documentTypeCode === "sds")?.fileName ?? "",
  };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Build the full specifications object; PATCH replaces it entirely. */
export function formToSpecifications(form: ListingForm): ListingSpecifications {
  const claims = form.claims.filter((c) => c !== "Others");
  for (const custom of form.customClaims) if (custom.trim()) claims.push(custom.trim());
  const other = form.otherClaim.trim();
  if (form.claims.includes("Others") && other && !claims.includes(other)) claims.push(other);
  return {
    category: nullable(form.category),
    material: nullable(form.material),
    listingType: nullable(form.listingType),
    grade: nullable(form.grade),
    color: nullable(form.color),
    shelfLife: nullable(form.shelfLife),
    storage: nullable(form.storage),
    packaging: nullable(form.pkg),
    weight: nullable(form.weight),
    usage: nullable(form.usage),
    origin: nullable(form.origin),
    quality: nullable(form.quality),
    composition: nullable(form.composition),
    frequency: nullable(form.frequency),
    state: nullable(form.state),
    availabilityFrom: nullable(form.availabilityFrom),
    availabilityTo: nullable(form.availabilityTo),
    sustainabilityNotes: nullable(form.sustainNotes),
    originLocation: nullable(form.originLocation),
    sameAsCompany: form.sameAsCompany,
    claims,
    // The API requires both a label and a value per row; incomplete rows are
    // reported by validateDraft rather than silently dropped or fabricated.
    additionalSpecs: form.additionalSpecs
      .filter((spec) => spec.label.trim() && spec.value.trim())
      .map((spec) => ({ label: spec.label.trim(), value: spec.value.trim() })),
  };
}

/** Full write body for create or update. Missing numbers are sent as null, never zero. */
export function formToWriteBody(
  form: ListingForm,
  options: { sellerCompanyId?: number; listingStatusCode?: ListingWriteBody["listingStatusCode"] } = {},
): ListingWriteBody {
  // Absent choices are sent as absent/null; nothing is filled in on the seller's behalf.
  const body: ListingWriteBody = {
    title: form.name.trim(),
    ...(form.materialTypeCode ? { materialTypeCode: form.materialTypeCode } : {}),
    quantity: parseOptionalNumber(form.qty),
    quantityUnit: form.unit || null,
    minimumOrderQuantity: parseOptionalNumber(form.moq),
    pricePerUnit: parseOptionalNumber(form.price),
    currencyCode: form.currencyCode || null,
    description: nullable(form.description),
    specifications: formToSpecifications(form),
  };
  if (options.sellerCompanyId) body.sellerCompanyId = options.sellerCompanyId;
  if (form.locationId) body.locationId = Number(form.locationId);
  if (options.listingStatusCode) body.listingStatusCode = options.listingStatusCode;
  return body;
}

export interface ValidationIssue {
  field: keyof ListingForm | "sds";
  message: string;
}

/** Minimum requirements for creating a draft. */
export function validateDraft(form: ListingForm): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!form.name.trim()) issues.push({ field: "name", message: "Listing name is required." });
  if (!form.locationId) issues.push({ field: "locationId", message: "Choose the facility this listing ships from." });
  // The API would otherwise classify the listing as "other" on the seller's behalf.
  if (!form.materialTypeCode) issues.push({ field: "materialTypeCode", message: "Choose the material type (marketplace classification)." });
  if (!form.category) issues.push({ field: "category", message: "Choose a listing category." });
  if (form.additionalSpecs.some((spec) => !!spec.label.trim() !== !!spec.value.trim())) {
    issues.push({ field: "additionalSpecs", message: "Each additional spec needs both a label and a value (or remove the row)." });
  }
  if (form.category === "Others" && !form.material.trim() && !form.description.trim()) {
    issues.push({ field: "material", message: "Describe the material when choosing Others." });
  }
  return issues;
}

/** Requirements for submitting a listing for review (contract rules). */
export function validateForSubmission(form: ListingForm, hasSds: boolean): ValidationIssue[] {
  const issues = validateDraft(form);
  const qty = parseOptionalNumber(form.qty);
  const moq = parseOptionalNumber(form.moq);
  const price = parseOptionalNumber(form.price);
  if (qty === null || qty <= 0) issues.push({ field: "qty", message: "Available quantity must be greater than zero." });
  if (moq === null || moq <= 0) issues.push({ field: "moq", message: "Minimum order quantity must be greater than zero." });
  if (qty !== null && moq !== null && moq > qty) {
    issues.push({ field: "moq", message: "Minimum order quantity cannot exceed the available quantity." });
  }
  if (price === null || price < 0) issues.push({ field: "price", message: "Enter a unit price (zero is allowed, blank is not)." });
  if (!form.currencyCode) issues.push({ field: "currencyCode", message: "Choose a currency." });
  if (!form.unit) issues.push({ field: "unit", message: "Choose a quantity unit." });
  if (!form.materialTypeCode) issues.push({ field: "materialTypeCode", message: "Choose a material type." });
  if (!form.state) issues.push({ field: "state", message: "Choose the feedstock state." });
  if (!form.frequency) issues.push({ field: "frequency", message: "Choose the supply frequency." });
  if (form.claims.includes("Others") && !form.otherClaim.trim() && form.customClaims.length === 0) {
    issues.push({ field: "otherClaim", message: "Describe the other sustainability claim." });
  }
  if (!hasSds) issues.push({ field: "sds", message: "Upload the Safety Data Sheet (SDS) PDF before submitting." });
  return issues;
}
