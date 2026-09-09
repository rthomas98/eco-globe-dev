import {
  PDFDocument,
  PDFDict,
  PDFArray,
  PDFName,
  PDFStream,
  type PDFObject,
} from "pdf-lib";
import { ApiError } from "./http.js";

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError(400, "Expected an object.");
  return value as Record<string, unknown>;
}
export function exactKeys(body: Record<string, unknown>, keys: string[]) {
  if (Object.keys(body).some((key) => !keys.includes(key)))
    throw new ApiError(400, "Unknown field.");
}
export function positiveId(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 2147483647
  )
    throw new ApiError(400, "A positive integer ID is required.");
  return value;
}
export function string(value: unknown, max = 240, empty = false): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!empty && !value.trim())
  )
    throw new ApiError(400, `Expected text up to ${max} characters.`);
  return value.trim();
}
export function choice<T extends string>(
  value: unknown,
  options: readonly T[],
): T {
  const match = options.find((option) => option === value);
  if (match === undefined) throw new ApiError(400, "Invalid selection.");
  return match;
}
export function strings(value: unknown, max = 50): string[] {
  if (!Array.isArray(value) || value.length > max)
    throw new ApiError(400, "Invalid selections.");
  const result = value.map((item) => string(item, 200));
  if (new Set(result).size !== result.length)
    throw new ApiError(400, "Duplicate selections.");
  return result;
}
export function date(value: unknown): string {
  const result = string(value, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(result) ||
    !Number.isFinite(Date.parse(result)) ||
    new Date(result).toISOString().slice(0, 10) !== result ||
    result > new Date().toISOString().slice(0, 10)
  )
    throw new ApiError(400, "A valid non-future date is required.");
  return result;
}
export const turnaroundChoices = [
  "standard",
  "expedited",
  "not_urgent",
] as const;
export const sharingChoices = ["private", "shared"] as const;
export const statuses = [
  "requested",
  "reviewing",
  "awaiting_sample",
  "testing",
  "completed",
  "cancelled",
] as const;
export const groups = [
  "processing",
  "safety",
  "compliance",
  "consistency",
] as const;
export const referralOptions = [
  {
    id: "processing-concern",
    group: "processing",
    label: "Will it run on my line?",
  },
  {
    id: "safety-concern",
    group: "safety",
    label: "Is anything in here I do not want?",
  },
  {
    id: "compliance-concern",
    group: "compliance",
    label: "Can I legally receive it?",
  },
  {
    id: "consistency-concern",
    group: "consistency",
    label: "Will batch two match batch one?",
  },
];
export function validateRequest(value: unknown) {
  const b = object(value);
  exactKeys(b, [
    "listingId",
    "sampleRequestId",
    "idempotencyKey",
    "panelId",
    "panelVersion",
    "optionalTestIds",
    "concerns",
    "turnaround",
    "sharing",
  ]);
  const key = string(b.idempotencyKey, 100);
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(key))
    throw new ApiError(400, "Invalid idempotency key.");
  const panelId = b.panelId == null ? null : positiveId(b.panelId);
  const panelVersion =
    b.panelVersion == null ? null : positiveId(b.panelVersion);
  if ((panelId === null) !== (panelVersion === null))
    throw new ApiError(400, "Panel and version must be supplied together.");
  return {
    listingId: positiveId(b.listingId),
    sampleRequestId:
      b.sampleRequestId == null ? null : positiveId(b.sampleRequestId),
    idempotencyKey: key,
    panelId,
    panelVersion,
    optionalTestIds: strings(b.optionalTestIds ?? []).sort(),
    concerns: string(b.concerns ?? "", 4000, true),
    turnaround: choice(b.turnaround, turnaroundChoices),
    sharing: choice(b.sharing ?? "private", sharingChoices),
  };
}
export function validateSelection(
  input: ReturnType<typeof validateRequest>,
  panel: {
    id: number;
    version: number;
    optionalTests: { id: string }[];
  } | null,
) {
  if (
    input.panelId !== (panel?.id ?? null) ||
    input.panelVersion !== (panel?.version ?? null)
  )
    throw new ApiError(409, "Testing scope changed; reload the form.");
  const options = panel?.optionalTests ?? referralOptions;
  if (
    input.optionalTestIds.some(
      (id) => !options.some((option) => option.id === id),
    )
  )
    throw new ApiError(400, "A selected test is unavailable for this listing.");
}
export function validatePanel(value: unknown) {
  const b = object(value);
  exactKeys(b, [
    "familyCode",
    "name",
    "materialTypeCodes",
    "tests",
    "optionalTests",
    "status",
    "review",
  ]);
  const familyCode = string(b.familyCode, 80);
  if (!/^[a-z][a-z0-9_-]+$/.test(familyCode))
    throw new ApiError(400, "Invalid family code.");
  const status = choice(b.status, ["draft", "published", "retired"]);
  if (!Array.isArray(b.optionalTests) || b.optionalTests.length > 50)
    throw new ApiError(400, "Invalid optional tests.");
  const optionalTests = b.optionalTests.map((item) => {
    const t = object(item);
    exactKeys(t, ["id", "group", "label"]);
    return {
      id: string(t.id, 80),
      group: choice(t.group, groups),
      label: string(t.label, 200),
    };
  });
  if (new Set(optionalTests.map((t) => t.id)).size !== optionalTests.length)
    throw new ApiError(400, "Duplicate test IDs.");
  const materialTypeCodes = strings(b.materialTypeCodes);
  const tests = strings(b.tests);
  let review = null;
  if (b.review != null) {
    const r = object(b.review);
    exactKeys(r, ["laboratoryName", "reviewedBy", "reviewedAt", "evidence"]);
    review = {
      laboratoryName: string(r.laboratoryName, 200),
      reviewedBy: string(r.reviewedBy, 200),
      reviewedAt: date(r.reviewedAt),
      evidence: string(r.evidence, 4000),
    };
  }
  if (
    status === "published" &&
    (!review || !tests.length || !materialTypeCodes.length)
  )
    throw new ApiError(
      400,
      "Publication requires laboratory review evidence, tests and material mappings.",
    );
  return {
    familyCode,
    name: string(b.name, 200),
    materialTypeCodes,
    tests,
    optionalTests,
    status,
    review,
  };
}
/** Accept bounded PDF documents, not a MIME label or a header-only fake. */
export async function validatePdf(value: unknown): Promise<Buffer> {
  const encoded = string(value, 7 * 1024 * 1024);
  if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
    throw new ApiError(400, "Invalid PDF base64.");
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.toString("base64") !== encoded || bytes.length > 5 * 1024 * 1024)
    throw new ApiError(400, "PDF must be at most 5 MiB.");
  if (
    !/^%PDF-(1\.[0-7]|2\.0)[\r\n]/.test(
      bytes.subarray(0, 12).toString("latin1"),
    )
  )
    throw new ApiError(400, "Invalid PDF structure.");
  try {
    const document = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
      throwOnInvalidObject: true,
      updateMetadata: false,
    });
    if (document.getPageCount() < 1) throw new Error("No pages");
    // Inspect parsed dictionaries, including decoded object streams, rather than binary image bytes.
    // This is an upload policy, not a malware certification. Downloads remain attachments with nosniff.
    const forbidden = new Set([
      "JavaScript",
      "JS",
      "Launch",
      "EmbeddedFile",
      "EmbeddedFiles",
      "OpenAction",
      "AA",
      "RichMedia",
      "XFA",
      "Encrypt",
    ]);
    const visited = new Set<PDFObject>();
    const inspect = (object: PDFObject): void => {
      if (visited.has(object)) return;
      visited.add(object);
      if (object instanceof PDFName && forbidden.has(object.decodeText()))
        throw new Error("Active PDF feature");
      if (object instanceof PDFStream) inspect(object.dict);
      else if (object instanceof PDFDict) {
        for (const [key, value] of object.entries()) {
          inspect(key);
          inspect(value);
        }
      } else if (object instanceof PDFArray) {
        for (const value of object.asArray()) inspect(value);
      }
    };
    inspect(document.catalog);
    for (const [, object] of document.context.enumerateIndirectObjects())
      inspect(object);
  } catch {
    throw new ApiError(
      400,
      "Invalid, active or encrypted PDF files are not supported.",
    );
  }
  return bytes;
}
export async function validateReport(value: unknown) {
  const b = object(value);
  exactKeys(b, [
    "laboratoryName",
    "batchReference",
    "sampleDate",
    "reportDate",
    "results",
    "fileName",
    "contentBase64",
    "published",
  ]);
  const sampleDate = date(b.sampleDate),
    reportDate = date(b.reportDate);
  if (reportDate < sampleDate)
    throw new ApiError(400, "Report date precedes sample date.");
  if (!Array.isArray(b.results) || b.results.length < 1 || b.results.length > 4)
    throw new ApiError(400, "Supply one to four actual headline results.");
  const results = b.results.map((item) => {
    const r = object(item);
    exactKeys(r, ["label", "value", "unit"]);
    return {
      label: string(r.label, 200),
      value: string(r.value, 200),
      unit: string(r.unit, 80, true),
    };
  });
  const fileName = string(b.fileName, 200);
  if (!/^[\w .()-]+\.pdf$/i.test(fileName))
    throw new ApiError(400, "A safe PDF filename is required.");
  if (typeof b.published !== "boolean")
    throw new ApiError(400, "published must be boolean.");
  return {
    laboratoryName: string(b.laboratoryName, 200),
    batchReference: string(b.batchReference, 200),
    sampleDate,
    reportDate,
    results,
    fileName,
    published: b.published,
    bytes: await validatePdf(b.contentBase64),
  };
}
