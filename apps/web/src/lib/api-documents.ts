"use client";

import { apiFetch, apiFetchBlob, BackendApiError } from "./backend-client";
import { MAX_DOCUMENT_BYTES, readFileAsBase64 } from "./listings-api";

/**
 * General company document vault (documents not tied to a listing, lab
 * request, contract envelope or shipment). Every call goes to the backend;
 * the UI never adds, approves or removes a document locally.
 */

export type VaultDocumentStatus = "pending_review" | "approved" | "rejected";

export interface VaultDocument {
  id: number;
  companyId: number;
  companyName: string | null;
  fileName: string;
  contentType: string | null;
  sizeBytes: number | null;
  category: string;
  status: VaultDocumentStatus | string;
  reviewNote: string | null;
  orderId: number | null;
  uploadedBy?: string | null;
  uploadedByName: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export const VAULT_CATEGORIES = [
  { code: "certificate", label: "Certificate or COA" },
  { code: "safety_data_sheet", label: "Safety data sheet" },
  { code: "insurance", label: "Proof of insurance" },
  { code: "invoice", label: "Invoice or payment record" },
  { code: "shipping", label: "Shipping paperwork" },
  { code: "other", label: "Other" },
] as const;

export async function fetchVaultDocuments(): Promise<VaultDocument[]> {
  const body = await apiFetch<{ ok: true; documents: VaultDocument[] }>("/api/documents");
  return Array.isArray(body.documents) ? body.documents : [];
}

export async function uploadVaultDocument(file: File, category: string, orderId?: number) {
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new BackendApiError(
      `${file.name} is larger than 5 MB. Please upload a smaller file.`,
      413,
      "validation",
    );
  }
  const contentBase64 = await readFileAsBase64(file);
  const body = await apiFetch<{ ok: true; document: VaultDocument }>("/api/documents", {
    method: "POST",
    deadlineMs: 60_000,
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      contentBase64,
      category,
      orderId,
    }),
  });
  return body.document;
}

export async function deleteVaultDocument(id: number) {
  await apiFetch<{ ok: true }>(`/api/documents/${id}`, { method: "DELETE" });
}

export async function reviewVaultDocument(
  id: number,
  status: "approved" | "rejected",
  note: string,
) {
  const body = await apiFetch<{ ok: true; document: VaultDocument }>(`/api/documents/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, note }),
  });
  return body.document;
}

/** Downloads the stored file bytes and hands them to the browser. */
export async function downloadVaultDocument(document: Pick<VaultDocument, "id" | "fileName">) {
  const { blob, fileName } = await apiFetchBlob(`/api/documents/${document.id}/download`, {
    deadlineMs: 60_000,
  });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = fileName ?? document.fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** True when the backend has no document vault endpoint in this environment. */
export function isVaultUnavailable(error: unknown) {
  return error instanceof BackendApiError && (error.status === 404 || error.status === 405 || error.status === 501);
}
