/**
 * Validation for a buyer request for quote before it is posted or saved as a
 * private draft. Kept import-free for node:test. Nothing is defaulted: an
 * invalid quantity, price or delivery region is reported instead of being
 * replaced, and a draft keeps absent values absent (null), never zero.
 */
export interface RfqDraft {
  title: string;
  quantity: string;
  targetPrice: string;
  /** Delivery country and region, from a saved facility or entered by the buyer. */
  countryCode: string;
  stateProvince: string;
}

export interface ValidRfq {
  title: string;
  quantity: number;
  targetPricePerUnit?: number;
  countryCode: string;
  stateProvince?: string;
}

function parseNumber(input: string) {
  const trimmed = input.replace(/,/g, "").trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : Number.NaN;
}

export function validateRfqDraft(
  draft: RfqDraft,
): { ok: true; value: ValidRfq } | { ok: false; error: string } {
  const title = draft.title.trim();
  if (!title) return { ok: false, error: "Enter a title for your request." };

  const quantity = parseNumber(draft.quantity);
  if (quantity === null || Number.isNaN(quantity) || quantity <= 0) {
    return { ok: false, error: "Quantity must be a number greater than zero." };
  }

  const price = parseNumber(draft.targetPrice);
  if (price !== null && (Number.isNaN(price) || price < 0)) {
    return { ok: false, error: "Target price must be a number (no ranges or currency symbols), or left blank." };
  }

  const countryCode = draft.countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return { ok: false, error: "Choose a saved delivery facility or enter a two-letter delivery country code." };
  }

  return {
    ok: true,
    value: {
      title,
      quantity,
      targetPricePerUnit: price === null ? undefined : Math.round(price * 100) / 100,
      countryCode,
      stateProvince: draft.stateProvince.trim() || undefined,
    },
  };
}

/** Everything the request form holds; empty strings mean "not specified". */
export interface RfqFormInput extends RfqDraft {
  materialTypeCode: string;
  unit: string;
  currencyCode: string;
  /** YYYY-MM-DD from a date input, or empty. */
  needBy: string;
  notes: string;
}

/** Full write body for create or update. Absent values are null, never zero. */
export interface RfqWriteBody {
  title: string;
  materialTypeCode: string;
  quantity: number | null;
  quantityUnit: string | null;
  targetPricePerUnit: number | null;
  currencyCode: string | null;
  countryCode: string | null;
  stateProvince: string | null;
  needByDate: string | null;
  notes: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * "draft": a private, resumable request. Only a title and classification are
 * required; anything entered must still be valid.
 * "publish": the existing posting prerequisites (title, quantity, delivery
 * country, need-by date) plus the unit and currency the API requires to open.
 */
export function validateRfqForm(
  input: RfqFormInput,
  mode: "draft" | "publish",
): { ok: true; value: RfqWriteBody } | { ok: false; error: string } {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Enter a title for your request." };
  if (!input.materialTypeCode.trim()) return { ok: false, error: "Choose a category for your request." };

  const quantity = parseNumber(input.quantity);
  if (quantity !== null && (Number.isNaN(quantity) || quantity <= 0)) {
    return { ok: false, error: "Quantity must be a number greater than zero, or left blank on a draft." };
  }
  const price = parseNumber(input.targetPrice);
  if (price !== null && (Number.isNaN(price) || price < 0)) {
    return { ok: false, error: "Target price must be a number (no ranges or currency symbols), or left blank." };
  }
  const countryCode = input.countryCode.trim().toUpperCase();
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    return { ok: false, error: "Delivery country must be a two-letter code, or left blank on a draft." };
  }
  const needBy = input.needBy.trim();
  if (needBy && !ISO_DATE.test(needBy)) {
    return { ok: false, error: "Need-by date must be a valid date, or left blank on a draft." };
  }

  if (mode === "publish") {
    const checked = validateRfqDraft(input);
    if (!checked.ok) return checked;
    if (!input.unit.trim()) return { ok: false, error: "Choose the unit for the quantity before submitting." };
    if (!needBy) return { ok: false, error: "Enter the date you need the material by before submitting." };
    if (!input.currencyCode.trim()) return { ok: false, error: "Choose the currency before submitting." };
  }

  return {
    ok: true,
    value: {
      title,
      materialTypeCode: input.materialTypeCode.trim(),
      quantity,
      quantityUnit: nullable(input.unit),
      targetPricePerUnit: price === null ? null : Math.round(price * 100) / 100,
      currencyCode: nullable(input.currencyCode)?.toUpperCase() ?? null,
      countryCode: countryCode || null,
      stateProvince: nullable(input.stateProvince),
      needByDate: needBy || null,
      // Kept verbatim so saving a resumed draft never rewrites seeded notes.
      notes: input.notes.trim() ? input.notes : null,
    },
  };
}

/**
 * Adds a chosen delivery cadence to the notes once. An unspecified cadence
 * leaves the notes exactly as entered, so resuming a draft never rewrites them.
 */
export function withRecurrence(notes: string, recurrence: string) {
  const cadence = recurrence.trim();
  const text = notes.trim();
  if (!cadence) return notes;
  const suffix = `Delivery cadence: ${cadence}`;
  if (text.endsWith(suffix)) return notes;
  return text ? `${text}\n${suffix}` : suffix;
}

export interface RfqCategory {
  label: string;
  materialTypeCode: string;
}

/** Buyer-facing categories; "Other" is the truthful classification when unknown. */
export const RFQ_CATEGORIES: RfqCategory[] = [
  { label: "Biomass & wood", materialTypeCode: "certified_feedstock" },
  { label: "Plastics", materialTypeCode: "industrial_byproduct" },
  { label: "Oils & liquids", materialTypeCode: "certified_feedstock" },
  { label: "Rubber", materialTypeCode: "used_product" },
  { label: "Refinery byproducts", materialTypeCode: "industrial_byproduct" },
  { label: "Chemicals", materialTypeCode: "industrial_byproduct" },
  { label: "Industrial byproducts", materialTypeCode: "industrial_byproduct" },
  // Used equipment and products (e.g. transformers) use the saved used_product type.
  { label: "Used products", materialTypeCode: "used_product" },
  { label: "Other", materialTypeCode: "other" },
];
const UNKNOWN_CATEGORY = "Other";

/** Saved request values a draft is resumed from. */
export interface RfqResumeSource {
  title: string;
  materialTypeCode: string;
  materialTypeName: string;
  quantity: number | null;
  quantityUnit: string | null;
  targetPricePerUnit: number | null;
  currencyCode: string | null;
  countryCode: string | null;
  stateProvince: string | null;
  needByDate?: string | null;
  notes: string | null;
}

/** Categories, plus the saved classification when no category maps to it. */
export function rfqCategoryOptions(existing?: Pick<RfqResumeSource, "materialTypeCode" | "materialTypeName">) {
  if (!existing || RFQ_CATEGORIES.some((c) => c.materialTypeCode === existing.materialTypeCode)) return RFQ_CATEGORIES;
  return [
    ...RFQ_CATEGORIES,
    { label: existing.materialTypeName || existing.materialTypeCode, materialTypeCode: existing.materialTypeCode },
  ];
}

/** Form state; empty strings mean "not specified". */
export interface RfqFormState {
  title: string;
  category: string;
  quantity: string;
  unit: string;
  currencyCode: string;
  recurrence: string;
  needBy: string;
  budget: string;
  notes: string;
  /** "" = no delivery location chosen, "manual" = typed country/region, otherwise a saved facility id. */
  facilityChoice: string;
  manualCountry: string;
  manualRegion: string;
}

/**
 * Initial values. A new request starts with nothing chosen (no unit, currency,
 * facility or cadence) so an untouched draft saves nulls. A resumed draft
 * shows exactly its saved values, including its own delivery region.
 */
export function initialRfqFormState(existing?: RfqResumeSource): RfqFormState {
  if (!existing) {
    return {
      title: "",
      category: UNKNOWN_CATEGORY,
      quantity: "",
      unit: "",
      currencyCode: "",
      recurrence: "",
      needBy: "",
      budget: "",
      notes: "",
      facilityChoice: "",
      manualCountry: "",
      manualRegion: "",
    };
  }
  const categories = rfqCategoryOptions(existing);
  return {
    title: existing.title,
    category: categories.find((c) => c.materialTypeCode === existing.materialTypeCode)?.label ?? UNKNOWN_CATEGORY,
    quantity: existing.quantity == null ? "" : String(existing.quantity),
    unit: existing.quantityUnit ?? "",
    currencyCode: existing.currencyCode ?? "",
    // Cadence is unknown on a resumed draft; any saved cadence is already in its notes.
    recurrence: "",
    needBy: existing.needByDate ? existing.needByDate.slice(0, 10) : "",
    budget: existing.targetPricePerUnit == null ? "" : String(existing.targetPricePerUnit),
    notes: existing.notes ?? "",
    facilityChoice: "manual",
    manualCountry: existing.countryCode ?? "",
    manualRegion: existing.stateProvince ?? "",
  };
}

/** Validator input for the form; `facility` is the chosen saved facility, if any. */
export function rfqFormInput(
  state: RfqFormState,
  categories: RfqCategory[],
  facility?: { countryCode: string; stateProvince: string | null },
): RfqFormInput {
  const manual = state.facilityChoice === "manual";
  return {
    title: state.title,
    materialTypeCode: categories.find((c) => c.label === state.category)?.materialTypeCode ?? "",
    quantity: state.quantity,
    unit: state.unit,
    targetPrice: state.budget,
    currencyCode: state.currencyCode,
    countryCode: facility ? facility.countryCode : manual ? state.manualCountry : "",
    stateProvince: facility ? (facility.stateProvince ?? "") : manual ? state.manualRegion : "",
    needBy: state.needBy,
    notes: withRecurrence(state.notes, state.recurrence),
  };
}
