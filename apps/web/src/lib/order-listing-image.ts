/**
 * Validates the saved listing photo reference on an order (`listingImageUrl`
 * from GET /api/orders and GET /api/orders/:id). Kept import-free for
 * node:test; callers turn the result into a browser URL with
 * `listingDocumentUrl` from api-listing-documents.
 *
 * Accepted: the backend download path `/api/listing-documents/<id>/download`
 * (optionally already behind the `/api/backend` proxy) or a retained legacy
 * absolute https URL. Anything else yields null, so the UI shows "No photo
 * available" instead of loading an unexpected source.
 */
export interface OrderListingImageRef {
  id: number;
  fileUrl: string;
}

const DOWNLOAD_PATH = /^(?:\/api\/backend)?\/api\/listing-documents\/(\d{1,15})\/download$/;

export function parseOrderListingImageUrl(raw: unknown): OrderListingImageRef | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || value.length > 2048 || /[\s\\]/.test(value)) return null;

  const path = DOWNLOAD_PATH.exec(value);
  if (path) {
    const id = Number(path[1]);
    return Number.isSafeInteger(id) && id > 0 ? { id, fileUrl: value } : null;
  }

  if (!/^https:\/\//i.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
  return { id: 0, fileUrl: url.toString() };
}
