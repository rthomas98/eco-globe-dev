"use client";

/**
 * Listing attachment helpers: TDS / SDS / COA and other supporting
 * documents. Uploads go to `POST /api/listing-documents` as base64 and are
 * stored inline; the per-listing list is public so buyers can download what
 * sellers publish, while the unfiltered list is the admin review queue.
 */

export interface ApiListingDocument {
  id: number;
  listingId: number;
  documentTypeCode: string;
  documentTypeName: string;
  fileName: string;
  /** Browser-ready URL: proxied download path, or a retained legacy absolute URL. */
  fileUrl: string;
  contentType?: string | null;
  byteLength?: number | null;
  verificationStatusCode: string;
  listingTitle?: string;
  sellerCompanyName?: string;
  createdAt: string;
}

export const LISTING_DOCUMENT_TYPES = [
  { code: "sds", label: "Safety Data Sheet (SDS)" },
  { code: "tds", label: "Technical Data Sheet (TDS)" },
  { code: "coa", label: "Certificate of Analysis (COA)" },
  { code: "certification", label: "Certification" },
  { code: "lab_report", label: "Lab report" },
  { code: "photo", label: "Listing photo" },
  { code: "other", label: "Other document" },
] as const;

export function listingDocumentLabel(code: string): string {
  return (
    LISTING_DOCUMENT_TYPES.find((t) => t.code === code)?.label ??
    code.replace(/_/g, " ")
  );
}

export async function fetchListingDocuments(
  listingId: number,
): Promise<ApiListingDocument[]> {
  const response = await fetch(
    `/api/backend/api/listing-documents?listingId=${listingId}`,
    { credentials: "same-origin" },
  );
  if (!response.ok) return [];
  const body = (await response.json()) as {
    ok: boolean;
    documents?: ApiListingDocument[];
  };
  return Array.isArray(body.documents) ? body.documents.map(withBrowserUrl) : [];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Browser URL for a document. Relative API paths (`/api/listing-documents/:id/download`)
 * go through the same-origin proxy; retained legacy absolute blob URLs are used as-is.
 */
export function listingDocumentUrl(document: Pick<ApiListingDocument, "id" | "fileUrl">) {
  const fileUrl = document.fileUrl?.trim() ?? "";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  if (fileUrl.startsWith("/api/backend/")) return fileUrl;
  const path = fileUrl.startsWith("/") ? fileUrl : `/api/listing-documents/${document.id}/download`;
  return `/api/backend${path}`;
}

function withBrowserUrl(document: ApiListingDocument): ApiListingDocument {
  return { ...document, fileUrl: listingDocumentUrl(document) };
}

/**
 * Upload one attachment in a single request: the backend stores the bytes
 * inline and returns the document record (`fileUrl` is the download path).
 * Accepted types: photo, sds, certification, tds, coa, lab_report, other.
 */
export async function uploadListingDocument({
  listingId,
  documentTypeCode,
  file,
}: {
  listingId: number;
  documentTypeCode: string;
  file: File;
}): Promise<ApiListingDocument | null> {
  const contentBase64 = await fileToBase64(file);
  const created = await fetch("/api/backend/api/listing-documents", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      listingId,
      documentTypeCode,
      fileName: file.name,
      contentType: file.type || "application/pdf",
      contentBase64,
    }),
  });
  if (!created.ok) {
    const body = (await created.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Document upload failed (${created.status}).`);
  }
  const payload = (await created.json()) as { document?: ApiListingDocument };
  return payload.document ? withBrowserUrl(payload.document) : null;
}

export async function removeListingDocument(id: number) {
  const response = await fetch(`/api/backend/api/listing-documents/${id}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Delete failed (${response.status}).`);
  }
}

/** Every listing document on the platform — the admin review queue (admin session required). */
export async function fetchAllListingDocuments(): Promise<ApiListingDocument[]> {
  const response = await fetch("/api/backend/api/listing-documents", {
    credentials: "same-origin",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Document queue request failed (${response.status}).`);
  }
  const body = (await response.json()) as {
    ok: boolean;
    documents?: ApiListingDocument[];
  };
  return Array.isArray(body.documents) ? body.documents.map(withBrowserUrl) : [];
}

/** Admin decision: "verified" approves, "inactive" rejects. */
export async function setListingDocumentVerification(
  id: number,
  verificationStatusCode: "verified" | "inactive" | "pending_verification",
) {
  const response = await fetch(`/api/backend/api/listing-documents/${id}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ verificationStatusCode }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Update failed (${response.status}).`);
  }
}
