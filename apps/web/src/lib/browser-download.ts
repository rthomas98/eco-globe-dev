/**
 * Browser file hand-off. A page can only ask the browser to save a file; it
 * never learns whether the save finished, so notices say the download
 * started, never that it completed.
 */

export type DownloadNoticeState = "pending" | "handed" | "error";

/** Wording for one download's progress; `label` names the file, e.g. "EG-20 invoice PDF". */
export function downloadNotice(state: DownloadNoticeState, label: string, detail?: string): string {
  if (state === "pending") return `Preparing ${label}…`;
  if (state === "handed") return `Download started for ${label}. Check your browser downloads.`;
  return `${label} was not downloaded. ${detail?.trim() || "Please try again."}`;
}

/** True only for a PDF content type (parameters such as charset are ignored). */
export function isPdfContentType(contentType: string | null | undefined): boolean {
  return (contentType ?? "").split(";")[0]!.trim().toLowerCase() === "application/pdf";
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

/** True when the bytes start with the PDF header "%PDF-". */
export async function hasPdfHeader(blob: Blob): Promise<boolean> {
  if (blob.size < PDF_MAGIC.length) return false;
  const head = new Uint8Array(await blob.slice(0, PDF_MAGIC.length).arrayBuffer());
  return PDF_MAGIC.every((byte, i) => head[i] === byte);
}

/**
 * Fetches a file expected to be a PDF and refuses anything else (wrong type,
 * empty, or bytes without the PDF header), so an HTML or JSON response is
 * never saved under a .pdf name.
 */
export async function fetchPdf(
  fetchBlob: () => Promise<{ blob: Blob; contentType: string | null; fileName: string | null }>,
  fallbackName: string,
): Promise<{ blob: Blob; fileName: string }> {
  const { blob, contentType, fileName } = await fetchBlob();
  if (!isPdfContentType(contentType) || blob.size === 0 || !(await hasPdfHeader(blob)))
    throw new Error("EcoGlobe did not return a PDF for this file.");
  return { blob, fileName: fileName?.trim() || fallbackName };
}

/**
 * Generation counter for async requests whose result belongs to one view.
 * `begin()` returns a ticket; `invalidate()` (on switch or close) makes every
 * earlier ticket stale so its result is dropped.
 */
export function createRequestGuard() {
  let generation = 0;
  return {
    begin: () => ++generation,
    isCurrent: (ticket: number) => ticket === generation,
    invalidate: () => {
      generation += 1;
    },
  };
}

/**
 * A notice tagged with the record and request it belongs to, shown only while
 * that record is open. A pending notice is also hidden once its request is no
 * longer current (e.g. EG-20 → EG-25 → EG-20 before the old response lands),
 * since that response will be dropped; finished notices stay with their record.
 */
export function noticeForOpenRecord<T extends { orderId: string; ticket: number; state: DownloadNoticeState }>(
  notice: T | null,
  openOrderId: string | undefined,
  isCurrent: (ticket: number) => boolean,
): T | null {
  if (!notice || notice.orderId !== openOrderId) return null;
  return notice.state === "pending" && !isCurrent(notice.ticket) ? null : notice;
}

/** Asks the browser to save the blob. The object URL outlives the click briefly. */
export function handBlobToBrowser(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
