import type {
  Frequency,
  Listing,
  ListingDocumentRef,
  ListingState,
} from "@/components/public/browse-listings";
import { FREQUENCY_OPTIONS } from "@/components/public/browse-listings";
import {
  documentDownloadUrl,
  normalizeDocumentTypeCode,
  type BackendListing,
  type ListingDocument,
  type ListingLocation,
} from "./listings-api";
import {
  describePrice,
  formatCarbonIntensity,
  formatQuantityWithUnitName,
  perUnitSuffix,
} from "./listing-format";

const MATERIAL_TYPE_LABELS: Record<string, string> = {
  industrial_byproduct: "Industrial Byproducts",
  low_co2_feedstock: "Low CO₂ Feedstocks",
  certified_feedstock: "Certified Feedstocks",
  used_product: "Used products",
  other: "Others",
};

export function materialTypeLabel(code: string | null | undefined) {
  if (!code) return "Uncategorized";
  return (
    MATERIAL_TYPE_LABELS[code] ??
    code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function formatLocation(location: ListingLocation | null | undefined) {
  if (!location) return "";
  // Teasers carry only region and country; members also get the city.
  const parts = [
    location.city,
    location.stateProvince,
    location.city ? undefined : location.countryCode,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part);
  return parts.join(", ");
}

/** Labels shown in place of redacted fields on a teaser. */
export const TEASER_PRICE_LABEL = "Sign in to see price";
export const TEASER_MOQ_LABEL = "Sign in to see MOQ";

export function formatLocationAddress(location: ListingLocation | null | undefined) {
  if (!location) return "";
  return [
    location.addressLine1,
    location.addressLine2,
    location.city,
    location.stateProvince,
    location.postalCode,
    location.countryCode,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part)
    .join(", ");
}

function toState(value: string | null | undefined): ListingState {
  if (value === "Liquid" || value === "Gas") return value;
  return "Solid";
}

function toFrequency(value: string | null | undefined): Frequency | null {
  return FREQUENCY_OPTIONS.includes(value as Frequency) ? (value as Frequency) : null;
}

function toDocumentRef(document: ListingDocument): ListingDocumentRef {
  return {
    id: document.id,
    typeCode: normalizeDocumentTypeCode(document.documentTypeCode),
    fileName: document.fileName,
    url: documentDownloadUrl(document),
    contentType: document.contentType,
    byteLength: document.byteLength,
    verificationStatusCode: document.verificationStatusCode ?? null,
  };
}

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const SPEC_LABELS: Array<[key: string, label: string]> = [
  ["material", "Material composition"],
  ["listingType", "Listing type"],
  ["grade", "Grade / purity"],
  ["color", "Color"],
  ["shelfLife", "Shelf life"],
  ["storage", "Storage & handling"],
  ["packaging", "Package"],
  ["weight", "Weight"],
  ["usage", "Usage"],
  ["origin", "Place of origin"],
];

/** Convert a persisted backend listing into the shared marketplace view model. */
export function toListing(record: BackendListing): Listing {
  const teaser = record.teaser === true;
  const specs = record.specifications ?? {};
  const documents = (record.documents ?? []).map(toDocumentRef);
  const photos = documents.filter((doc) => doc.typeCode === "photo");
  const sds = documents.find((doc) => doc.typeCode === "sds");
  const price = describePrice(record.pricePerUnit, record.currencyCode, record.quantityUnit);
  const moq = formatQuantityWithUnitName(record.minimumOrderQuantity, record.quantityUnit);
  const location = record.location ?? {
    id: record.locationId ?? null,
    name: null,
    addressLine1: null,
    addressLine2: null,
    city: record.locationCity ?? null,
    stateProvince: record.locationStateProvince ?? null,
    postalCode: null,
    countryCode: record.locationCountryCode ?? null,
    latitude: record.locationLatitude ?? null,
    longitude: record.locationLongitude ?? null,
  };
  const co2 = formatCarbonIntensity(record.carbonIntensityKgCo2e);
  const category = clean(specs.category) ?? materialTypeLabel(record.materialTypeCode);

  const specifications: Record<string, string> = {};
  for (const [key, label] of SPEC_LABELS) {
    const value = clean((specs as Record<string, string | null | undefined>)[key]);
    if (value) specifications[label] = value;
  }

  const tags = Array.from(
    new Set(
      [category, materialTypeLabel(record.materialTypeCode), ...(specs.claims ?? [])]
        .map((tag) => tag?.trim().toLowerCase())
        .filter((tag): tag is string => !!tag),
    ),
  );

  return {
    id: String(record.id),
    backendId: record.id,
    slug: record.slug,
    teaser,
    title: record.title,
    location: formatLocation(location),
    distance: "—",
    moq: teaser ? TEASER_MOQ_LABEL : (moq ?? "—"),
    moqNum: record.minimumOrderQuantity,
    co2: co2 ?? "—",
    co2Num: record.carbonIntensityKgCo2e,
    hasCarbonData: co2 !== null,
    price: teaser ? TEASER_PRICE_LABEL : price.label,
    priceNum: price.amount,
    priceIsZero: price.kind === "zero",
    currencyCode: (record.currencyCode ?? "USD").toUpperCase(),
    unit: perUnitSuffix(record.quantityUnit),
    quantityUnit: record.quantityUnit ?? "ton",
    qtyNum: record.quantity,
    image: photos[0]?.url ?? null,
    images: photos.map((doc) => doc.url),
    tags,
    lng: location.longitude ?? null,
    lat: location.latitude ?? null,
    category,
    materialTypeCode: record.materialTypeCode,
    grade: clean(specs.grade) ?? null,
    state: toState(specs.state),
    quality: clean(specs.quality),
    composition: clean(specs.composition) ?? clean(specs.material),
    availabilityFrom: clean(specs.availabilityFrom),
    availabilityTo: clean(specs.availabilityTo),
    frequency: toFrequency(specs.frequency),
    additionalSpecs: (specs.additionalSpecs ?? []).filter(
      (spec) => spec && (spec.label?.trim() || spec.value?.trim()),
    ),
    sdsUrl: sds?.url,
    sdsDocument: sds,
    documents,
    sellerCompanyId: record.sellerCompanyId,
    sellerCompanyName: clean(record.sellerCompanyName) ?? null,
    sellerVerified: record.sellerVerified === true,
    sellerLocationId: location.id ?? record.locationId ?? null,
    statusCode: record.listingStatusCode,
    description: clean(record.description) ?? null,
    claims: (specs.claims ?? []).filter((claim) => !!claim?.trim()),
    sustainabilityNotes: clean(specs.sustainabilityNotes),
    specifications,
  };
}

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  published: "Published",
  paused: "Paused",
  closed: "Closed",
};

export function statusLabel(code: string | null | undefined) {
  if (!code) return "Unknown";
  return STATUS_LABELS[code] ?? code;
}
