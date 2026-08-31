"use client";

/**
 * Listing attachment helpers: TDS / SDS / COA and other supporting
 * documents. Files land in Azure Blob storage via /api/files and are
 * catalogued in ListingDocuments; the list endpoint is public so buyers
 * can download what sellers publish.
 */

export interface ApiListingDocument {
  id: number;
  listingId: number;
  documentTypeCode: string;
  documentTypeName: string;
  fileName: string;
  fileUrl: string;
  verificationStatusCode: string;
  createdAt: string;
}

export const LISTING_DOCUMENT_TYPES = [
  { code: "sds", label: "Safety Data Sheet (SDS)" },
  { code: "tds", label: "Technical Data Sheet (TDS)" },
  { code: "coa", label: "Certificate of Analysis (COA)" },
  { code: "certification", label: "Certification" },
  { code: "lab_report", label: "Lab report" },
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
  return Array.isArray(body.documents) ? body.documents : [];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

/** Upload one attachment: blob storage first, then the document record. */
export async function uploadListingDocument({
  listingId,
  documentTypeCode,
  file,
}: {
  listingId: number;
  documentTypeCode: string;
  file: File;
}): Promise<ApiListingDocument | null> {
  const dataBase64 = await fileToBase64(file);
  const uploaded = await fetch("/api/backend/api/files", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/pdf",
      dataBase64,
    }),
  });
  if (!uploaded.ok) {
    const body = (await uploaded.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `File upload failed (${uploaded.status}).`);
  }
  const blob = (await uploaded.json()) as { file: { url: string } };

  const created = await fetch("/api/backend/api/listing-documents", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      listingId,
      documentTypeCode,
      fileName: file.name,
      fileUrl: blob.file.url,
    }),
  });
  if (!created.ok) {
    const body = (await created.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Document record failed (${created.status}).`);
  }
  const payload = (await created.json()) as { document?: ApiListingDocument };
  return payload.document ?? null;
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
