/**
 * Market record workbook preview and commit can run longer than ordinary JSON
 * calls (server-side XLSX parsing, a single 2,000-row SQL transaction), and a
 * reference PDF upload carries up to 3 MiB of base64 JSON plus server PDF
 * parsing, so the same-origin proxies give exactly these POST routes a longer
 * deadline. Kept free of imports so `node --test` can load it directly.
 */
export const MARKET_RECORD_IMPORT_DEADLINE_MS = 60_000;

const IMPORT_WRITE_PATH =
  /^\/api\/admin\/market-records\/imports\/(?:preview|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/commit)$/i;
const REFERENCE_UPLOAD_PATH = "/api/admin/market-records/references";

export function isMarketRecordImportWrite(pathname: string, method: string) {
  return method === "POST" && IMPORT_WRITE_PATH.test(pathname);
}

export function isMarketReferenceUpload(pathname: string, method: string) {
  return method === "POST" && pathname === REFERENCE_UPLOAD_PATH;
}

/** Every market record POST that gets the longer proxy deadline. */
export function isLongMarketRecordWrite(pathname: string, method: string) {
  return isMarketRecordImportWrite(pathname, method) || isMarketReferenceUpload(pathname, method);
}
