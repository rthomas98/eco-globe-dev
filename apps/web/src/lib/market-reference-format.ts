import type { MarketReference } from "@eco-globe/shared/market-references-api";

/*
 * Pure helpers for the internal research reference library. Kept free of
 * runtime imports so `node --test` can load this file directly.
 */

/**
 * Client limit on one original PDF. The backend accepts 5 MiB, but the upload
 * travels as base64 JSON through the hosted proxy (4.5 MB request cap), so the
 * browser stops at 3 MiB.
 */
export const MAX_REFERENCE_BYTES = 3 * 1024 * 1024;

/** Server bounds (packages/backend market-reference-domain). */
export const REFERENCE_LIMITS = {
  fileName: 240,
  title: 240,
  material: 500,
  notes: 4000,
  reason: 1000,
  recordIds: 100,
} as const;

const SQL_INT_MAX = 2147483647;

export function formatReferenceSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Problem with a chosen file before it is read, or null when it may be uploaded. */
export function referenceFileProblem(file: { name: string; size: number; type: string }): string | null {
  if (!/\.pdf$/i.test(file.name) || file.name.length <= 4)
    return "Choose a PDF file (the name must end in .pdf).";
  if (file.type && file.type !== "application/pdf") return "This file is not a PDF.";
  if (file.name.length > REFERENCE_LIMITS.fileName)
    return `The file name is longer than ${REFERENCE_LIMITS.fileName} characters. Rename it and choose it again.`;
  // eslint-disable-next-line no-control-regex
  if (/[/\\\x00-\x1f\x7f]/.test(file.name))
    return "The file name contains characters that cannot be stored. Rename it and choose it again.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_REFERENCE_BYTES)
    return `This file is ${formatReferenceSize(file.size)}. The limit is ${formatReferenceSize(MAX_REFERENCE_BYTES)}.`;
  return null;
}

/**
 * Parses the optional "record IDs" box: numbers separated by commas, spaces or
 * new lines, with an optional leading "#". Duplicates are an error rather than
 * silently merged so the admin sees exactly what will be linked.
 */
export function parseReferenceRecordIds(text: string): { ids: number[]; error: string | null } {
  const tokens = text
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const ids: number[] = [];
  for (const token of tokens) {
    const digits = token.startsWith("#") ? token.slice(1) : token;
    if (!/^[1-9]\d{0,9}$/.test(digits) || Number(digits) > SQL_INT_MAX)
      return { ids: [], error: `"${token}" is not a market record ID. Use whole numbers such as 12, 40.` };
    const id = Number(digits);
    if (ids.includes(id)) return { ids: [], error: `Record #${id} is listed more than once.` };
    ids.push(id);
  }
  if (ids.length > REFERENCE_LIMITS.recordIds)
    return { ids: [], error: `Link at most ${REFERENCE_LIMITS.recordIds} records to one reference.` };
  return { ids, error: null };
}

/** Case-insensitive match on title, material, original file name and notes. */
export function filterReferences(references: MarketReference[], search: string) {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return references;
  return references.filter((reference) => {
    const haystack = [reference.title, reference.material, reference.fileName, reference.notes ?? ""]
      .join("\n")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/** Optional `recordId` filter from the library URL; anything else is ignored. */
export function readReferenceRecordFilter(value: string | null): number | null {
  if (!value || !/^[1-9]\d{0,9}$/.test(value) || Number(value) > SQL_INT_MAX) return null;
  return Number(value);
}
