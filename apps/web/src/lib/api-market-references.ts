"use client";

import type { MarketReference, MarketReferenceUpload } from "@eco-globe/shared/market-references-api";
import { apiFetch, apiFetchBlob, BackendApiError } from "./backend-client";
import { fetchPdf, handBlobToBrowser, hasPdfHeader } from "./browser-download";
import { readFileAsBase64 } from "./listings-api";
import { referenceFileProblem } from "./market-reference-format";

/*
 * Internal research reference PDFs (admin only). Each reference is material
 * context for internal market records; it is never supplier-issued SDS,
 * never shown on listings and never approves a supplier. Wire types are owned
 * by the backend in @eco-globe/shared/market-references-api.
 */

export type { MarketReference } from "@eco-globe/shared/market-references-api";

const BASE = "/api/admin/market-records/references";
/** Base64 JSON of a 3 MiB PDF plus server PDF parsing; longer than ordinary calls. */
const UPLOAD_DEADLINE_MS = 60_000;

export async function fetchMarketReferences(recordId?: number) {
  const body = await apiFetch<{ ok: true; references: MarketReference[] }>(
    recordId === undefined ? BASE : `${BASE}?recordId=${recordId}`,
  );
  return Array.isArray(body?.references) ? body.references : [];
}

export async function uploadMarketReference(
  file: File,
  fields: Omit<MarketReferenceUpload, "fileName" | "contentBase64">,
) {
  const problem = referenceFileProblem(file);
  if (problem) throw new BackendApiError(problem, 400, "validation", { fieldErrors: { contentBase64: problem } });
  if (!(await hasPdfHeader(file))) {
    const message = "This file does not start with a PDF header, so it is not a PDF.";
    throw new BackendApiError(message, 400, "validation", { fieldErrors: { contentBase64: message } });
  }
  const input: MarketReferenceUpload = {
    ...fields,
    fileName: file.name,
    contentBase64: await readFileAsBase64(file),
  };
  const body = await apiFetch<{ ok: true; reference: MarketReference }>(BASE, {
    method: "POST",
    body: JSON.stringify(input),
    deadlineMs: UPLOAD_DEADLINE_MS,
  });
  return body.reference;
}

/**
 * Saves the original bytes under the stored original file name; refuses any
 * response that is not a PDF. The response header's plain `filename` is an
 * ASCII fallback, so the name recorded with the reference is used instead.
 */
export async function downloadMarketReference(reference: Pick<MarketReference, "id" | "fileName">) {
  const { blob } = await fetchPdf(
    () => apiFetchBlob(`${BASE}/${reference.id}/download`, { deadlineMs: UPLOAD_DEADLINE_MS }),
    reference.fileName,
  );
  handBlobToBrowser(blob, reference.fileName);
}
