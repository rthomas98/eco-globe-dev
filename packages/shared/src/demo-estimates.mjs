/** Labels stored with private demo values. No price or quantity is inferred here. */
export const DEMO_ESTIMATE_MARKER = "DEMO ESTIMATES (presentation only):";
export const DEMO_ESTIMATE_CITATION = "DEMO ESTIMATE (presentation only):";
export const WORKBOOK_RANGE_CITATION = "WORKBOOK RANGE (unverified research):";

export function hasDemoEstimateMarker(value) {
  return typeof value === "string" && value.split(/\r?\n/).some((line) => line.trim().startsWith(DEMO_ESTIMATE_MARKER));
}

export function parseDemoEstimateFields(value) {
  if (typeof value !== "string") return { price: false, volume: false };
  const line = value.split(/\r?\n/).find((candidate) => candidate.trim().startsWith(DEMO_ESTIMATE_MARKER));
  if (!line) return { price: false, volume: false };
  const fields = line.trim().slice(DEMO_ESTIMATE_MARKER.length).replace(/\.$/, "").split(";").map((field) => field.trim());
  return { price: fields.includes("price"), volume: fields.includes("volume") };
}

export function isDemoEstimateCitation(value) {
  return typeof value === "string" && value.trim().startsWith(DEMO_ESTIMATE_CITATION);
}

export function readWorkbookRangeCitation(value) {
  if (typeof value !== "string" || !value.trim().startsWith(WORKBOOK_RANGE_CITATION)) return null;
  const range = value.trim().slice(WORKBOOK_RANGE_CITATION.length).split(". Source:")[0]?.trim();
  return range || null;
}
