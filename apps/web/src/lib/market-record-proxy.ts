/**
 * Market record workbook preview and commit can run longer than ordinary JSON
 * calls (server-side XLSX parsing, a single 2,000-row SQL transaction), so the
 * same-origin proxies give exactly these two POST routes a longer deadline.
 * Kept free of imports so `node --test` can load it directly.
 */
export const MARKET_RECORD_IMPORT_DEADLINE_MS = 60_000;

const IMPORT_WRITE_PATH =
  /^\/api\/admin\/market-records\/imports\/(?:preview|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/commit)$/i;

export function isMarketRecordImportWrite(pathname: string, method: string) {
  return method === "POST" && IMPORT_WRITE_PATH.test(pathname);
}
