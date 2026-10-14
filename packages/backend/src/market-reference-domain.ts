import { createHash } from "node:crypto";
import { object, keys, text, invalid } from "./market-record-domain.js";
import { validatePdf } from "./lab-validation.js";
import type { MarketReferenceUpload } from "../../shared/src/market-references-api.js";

export function referenceId(value: unknown, field = "id"): number {
  if (
    typeof value !== "string" ||
    !/^[1-9]\d{0,9}$/.test(value) ||
    Number(value) > 2147483647
  )
    invalid(field, `${field} must be a positive SQL INT in decimal notation.`);
  return Number(value);
}
export type ValidatedReference = Omit<
  MarketReferenceUpload,
  "contentBase64"
> & { bytes: Buffer; sha256: string };
export async function referenceInput(
  value: unknown,
): Promise<ValidatedReference> {
  const body = object(value);
  keys(body, [
    "fileName",
    "title",
    "material",
    "notes",
    "recordIds",
    "reason",
    "contentBase64",
  ]);
  const fileName = text(body.fileName, "fileName", 240, true)!;
  if (
    !/\.pdf$/i.test(fileName) ||
    /[\/\\\x00-\x1f\x7f]/.test(fileName) ||
    fileName === ".pdf"
  )
    invalid("fileName", "A safe original PDF filename is required.");
  const title = text(body.title, "title", 240, true)!;
  const material = text(body.material, "material", 500, true)!;
  const notes = text(body.notes, "notes", 4000);
  const reason = text(body.reason, "reason", 1000, true)!;
  if (!Array.isArray(body.recordIds) || body.recordIds.length > 100)
    invalid(
      "recordIds",
      "recordIds must be an array of at most 100 unique record IDs.",
    );
  const recordIds = body.recordIds.map((id: unknown) => {
    if (
      typeof id !== "number" ||
      !Number.isInteger(id) ||
      id <= 0 ||
      id > 2147483647
    )
      invalid("recordIds", "Record IDs must be positive SQL INT numbers.");
    return id;
  });
  if (new Set(recordIds).size !== recordIds.length)
    invalid("recordIds", "Record IDs must be unique.");
  recordIds.sort((a, b) => a - b);
  const bytes = await validatePdf(body.contentBase64);
  return {
    fileName,
    title,
    material,
    notes,
    reason,
    recordIds,
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
