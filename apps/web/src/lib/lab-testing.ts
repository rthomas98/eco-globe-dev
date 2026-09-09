/**
 * Pure helpers for laboratory testing referrals (no React, no fetch).
 * Shared by the customer form, the listing analysis panel, the Documents
 * pages, and the internal admin queue. Wording rules from the plan:
 * never "EcoGlobe certified"; no invented laboratory, price, or duration.
 */

export type LabGroupCodeLike = "processing" | "safety" | "compliance" | "consistency";

/** Fallback labels for the four concern groups when the config omits them. */
export const LAB_GROUP_FALLBACK: Record<
  LabGroupCodeLike,
  { label: string; question: string }
> = {
  processing: { label: "Processing behaviour", question: "Will it run on my line?" },
  safety: { label: "Contaminants & safety", question: "Is anything in here I don't want?" },
  compliance: { label: "Regulatory & compliance", question: "Can I legally receive it?" },
  consistency: {
    label: "Consistency across the stream",
    question: "Will batch two match batch one?",
  },
};

export const TURNAROUND_LABELS: Record<string, string> = {
  standard: "Standard",
  expedited: "Expedited",
  not_urgent: "Not urgent",
};

export const LAB_STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  reviewing: "Reviewing",
  awaiting_sample: "Awaiting sample",
  testing: "Testing",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const SHARING_LABELS: Record<string, string> = {
  private: "My company only",
  shared: "Shared with the seller and the listing",
};

export const SCOPE_TO_BE_CONFIRMED = "Testing scope to be confirmed";
export const NOT_A_REPLACEMENT = "This does not replace your own testing";
export const RESULTS_DESCRIBE_A_BATCH = "Results describe a batch";

export function turnaroundLabel(code: string | null | undefined) {
  if (!code) return "—";
  return TURNAROUND_LABELS[code] ?? code.replace(/_/g, " ");
}

export function labStatusLabel(code: string | null | undefined) {
  if (!code) return "Unknown";
  return LAB_STATUS_LABELS[code] ?? code.replace(/_/g, " ");
}

export function sharingLabel(code: string | null | undefined) {
  if (!code) return "—";
  return SHARING_LABELS[code] ?? code;
}

/**
 * Consent controls stay available for every request status. A cancelled
 * request can still carry a published, shared report that remains visible to
 * the seller and the public until the requester withdraws sharing, so
 * cancellation must never lock the requester out of that choice.
 */
export function canChangeSharing(status: string | null | undefined): boolean {
  void status;
  return true;
}

/** Customer-facing status line; never promises a laboratory, cost, or date. */
export function describeRequestProgress(status: string): string {
  switch (status) {
    case "requested":
      return "Request received. EcoGlobe confirms the laboratory, scope, cost and turnaround with you before anything is booked.";
    case "reviewing":
      return "EcoGlobe is reviewing the scope with a laboratory.";
    case "awaiting_sample":
      return "Waiting for the sample to reach the laboratory.";
    case "testing":
      return "The sample is with the laboratory.";
    case "completed":
      return "Testing is complete and the report is attached.";
    case "cancelled":
      return "This request was cancelled.";
    default:
      return "Request recorded.";
  }
}

export interface LabFormValues {
  optionalTestIds: string[];
  concerns: string;
  turnaround: string | null;
  sharing: "private" | "shared";
  consentToShare: boolean;
}

export const EMPTY_LAB_FORM: LabFormValues = {
  optionalTestIds: [],
  concerns: "",
  turnaround: "standard",
  sharing: "private",
  consentToShare: false,
};

export const MAX_CONCERNS_LENGTH = 4000;

export interface LabFormError {
  field: "turnaround" | "consentToShare" | "concerns";
  message: string;
}

/** Validation that runs before any request leaves the browser. */
export function validateLabForm(values: LabFormValues): LabFormError[] {
  const errors: LabFormError[] = [];
  if (!values.turnaround) {
    errors.push({ field: "turnaround", message: "Choose how soon you need the results." });
  }
  if (values.sharing === "shared" && !values.consentToShare) {
    errors.push({
      field: "consentToShare",
      message: "Confirm that the report may be shared with the seller and shown on the listing.",
    });
  }
  if (values.concerns.length > MAX_CONCERNS_LENGTH) {
    errors.push({
      field: "concerns",
      message: `Keep additional concerns under ${MAX_CONCERNS_LENGTH} characters.`,
    });
  }
  return errors;
}

/** Clean form values into the request body fields (trimmed, deduplicated). */
export function toLabRequestScope(values: LabFormValues) {
  const tests = Array.from(new Set(values.optionalTestIds.map((t) => t.trim()).filter(Boolean))).sort();
  const concerns = values.concerns.trim();
  return {
    optionalTestIds: tests,
    concerns,
    sharing: values.sharing,
    consentToShare: values.sharing === "shared" ? values.consentToShare : false,
  };
}

/** Contract key format: 16..100 characters of [A-Za-z0-9_-]; UUIDs qualify. */
export function isValidIdempotencyKey(key: string) {
  return /^[A-Za-z0-9_-]{16,100}$/.test(key);
}

/** Random idempotency key; the same key is reused across retries of one submission. */
export function makeIdempotencyKey(random: () => number = Math.random): string {
  const globalCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return globalCrypto.randomUUID();
  }
  let out = "";
  for (let i = 0; i < 32; i += 1) {
    out += Math.floor(random() * 16).toString(16);
  }
  return `${out.slice(0, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}-${out.slice(16, 20)}-${out.slice(20)}`;
}

export interface TestedBadgeInput {
  laboratoryName: string;
  reportDate: string;
  batchReference: string;
  sampleDate: string;
}

function formatDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export { formatDate as formatLabDate };

/**
 * The only permitted claim: "Independently tested — <laboratory>, <report date>".
 * Batch context is always attached because results describe a batch.
 */
export function describeTestedBadge(report: TestedBadgeInput) {
  return {
    headline: "Independently tested",
    detail: `${report.laboratoryName}, ${formatDate(report.reportDate)}`,
    batch: `Batch ${report.batchReference} · sample drawn ${formatDate(report.sampleDate)}`,
  };
}

export interface HeadlineResultLike {
  label: string;
  value: string;
  unit: string;
}

export function formatHeadlineResult(result: HeadlineResultLike) {
  const unit = result.unit.trim();
  if (!unit) return result.value;
  if (unit === "%") return `${result.value}%`;
  return `${result.value} ${unit}`;
}

export interface ReportFormValues {
  laboratoryName: string;
  batchReference: string;
  sampleDate: string;
  reportDate: string;
  headlineResults: HeadlineResultLike[];
  fileName: string | null;
  fileSize: number | null;
  fileIsPdf: boolean | null;
}

export interface ReportFormError {
  field:
    | "laboratoryName"
    | "batchReference"
    | "sampleDate"
    | "reportDate"
    | "headlineResults"
    | "file";
  message: string;
}

export const MAX_HEADLINE_RESULTS = 4;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Report attachment rules: every field is a real value, never a placeholder. */
export function validateReportForm(
  values: ReportFormValues,
  maxBytes: number,
): ReportFormError[] {
  const errors: ReportFormError[] = [];
  if (!values.laboratoryName.trim()) {
    errors.push({ field: "laboratoryName", message: "Enter the laboratory name as it appears on the report." });
  }
  if (!values.batchReference.trim()) {
    errors.push({ field: "batchReference", message: "Enter the batch reference the sample was drawn from." });
  }
  const today = todayIso();
  if (!ISO_DATE.test(values.sampleDate)) {
    errors.push({ field: "sampleDate", message: "Enter the date the sample was drawn." });
  } else if (values.sampleDate > today) {
    errors.push({ field: "sampleDate", message: "The sample date cannot be in the future." });
  }
  if (!ISO_DATE.test(values.reportDate)) {
    errors.push({ field: "reportDate", message: "Enter the date on the laboratory report." });
  } else if (values.reportDate > today) {
    errors.push({ field: "reportDate", message: "The report date cannot be in the future." });
  } else if (ISO_DATE.test(values.sampleDate) && values.reportDate < values.sampleDate) {
    errors.push({ field: "reportDate", message: "The report date cannot be before the sample date." });
  }
  const results = values.headlineResults.filter(
    (r) => r.label.trim() || r.value.trim() || r.unit.trim(),
  );
  if (results.length === 0) {
    errors.push({ field: "headlineResults", message: "Enter at least one headline result from the report." });
  } else if (results.length > MAX_HEADLINE_RESULTS) {
    errors.push({ field: "headlineResults", message: `Enter at most ${MAX_HEADLINE_RESULTS} headline results.` });
  } else if (results.some((r) => !r.label.trim() || !r.value.trim())) {
    errors.push({ field: "headlineResults", message: "Every headline result needs a label and a value." });
  }
  if (!values.fileName) {
    errors.push({ field: "file", message: "Attach the laboratory report as a PDF." });
  } else if (!/^[\w .()-]+\.pdf$/i.test(values.fileName)) {
    errors.push({ field: "file", message: "Rename the file to a plain name ending in .pdf before uploading." });
  } else if (values.fileIsPdf === false) {
    errors.push({ field: "file", message: "The file is not a PDF. Attach the laboratory's PDF report." });
  } else if ((values.fileSize ?? 0) > maxBytes) {
    errors.push({
      field: "file",
      message: `The PDF is larger than ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    });
  }
  return errors;
}

export function cleanHeadlineResults(results: HeadlineResultLike[]): HeadlineResultLike[] {
  return results
    .filter((r) => r.label.trim() || r.value.trim())
    .map((r) => ({ label: r.label.trim(), value: r.value.trim(), unit: r.unit.trim() }));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export interface PanelPublishInput {
  review: { laboratoryName: string; reviewedBy: string; reviewedAt: string; evidence: string } | null;
  tests: string[];
  materialTypeCodes: string[];
}

/** A draft panel becomes publishable only with explicit laboratory review metadata. */
export function panelPublishBlockers(panel: PanelPublishInput): string[] {
  const blockers: string[] = [];
  if (!panel.review?.laboratoryName.trim()) blockers.push("Record which laboratory reviewed the panel.");
  if (!panel.review?.reviewedBy.trim()) blockers.push("Record who at the laboratory reviewed it.");
  if (!panel.review?.reviewedAt || !ISO_DATE.test(panel.review.reviewedAt)) blockers.push("Record the review date.");
  if (!panel.review?.evidence.trim()) blockers.push("Record the review evidence (what was confirmed or corrected).");
  if (panel.tests.filter((t) => t.trim()).length === 0) blockers.push("Add at least one test to the panel.");
  if (panel.materialTypeCodes.filter((t) => t.trim()).length === 0) blockers.push("Map the panel to at least one material type code.");
  return blockers;
}

/** Stable id for an optional test label typed by staff. */
export function slugifyTestCode(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

/** Staff-facing requester line; company id is the last resort, never fabricated. */
export function describeRequester(request: {
  companyId: number;
  companyName?: string | null;
  requestedByName?: string | null;
  requestedByEmail?: string | null;
}) {
  const company = request.companyName?.trim() || `Company #${request.companyId}`;
  const person = [request.requestedByName?.trim(), request.requestedByEmail?.trim()].filter((v): v is string => !!v).join(" · ");
  return person ? `${company} — ${person}` : company;
}
