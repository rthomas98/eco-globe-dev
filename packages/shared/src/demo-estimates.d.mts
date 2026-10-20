export const DEMO_ESTIMATE_MARKER: "DEMO ESTIMATES (presentation only):";
export const DEMO_ESTIMATE_CITATION: "DEMO ESTIMATE (presentation only):";
export const WORKBOOK_RANGE_CITATION: "WORKBOOK RANGE (unverified research):";
export function hasDemoEstimateMarker(value: unknown): boolean;
export function parseDemoEstimateFields(value: unknown): { price: boolean; volume: boolean };
export function isDemoEstimateCitation(value: unknown): boolean;
export function readWorkbookRangeCitation(value: unknown): string | null;
