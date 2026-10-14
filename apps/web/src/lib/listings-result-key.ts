// Pure helpers that keep catalogue results tied to the request that produced
// them. Kept import-free so node:test can load them directly.

/** One catalogue result per viewer/company, scope, search and portfolio. */
export function listingsResultKey(input: {
  viewerKey: string;
  scope: string;
  search?: string;
  portfolioId?: number;
}): string {
  return JSON.stringify([input.viewerKey, input.scope, input.search ?? "", input.portfolioId ?? null]);
}

/**
 * Before the effect for a new key runs, a result produced for a previous
 * viewer, company, search or portfolio reads as loading with no cards, so
 * stale listings and map markers are never rendered.
 */
export function currentListingsState<T extends { status: string; listings: unknown[]; records: unknown[]; error: string | null }>(
  state: T & { key: string | null },
  resultKey: string,
  enabled = true,
): T {
  const { key, ...current } = state;
  const result = current as unknown as T;
  // A disabled request (e.g. an invalid portfolio link) shows nothing at once,
  // even though its key can match the previous full-catalogue result.
  if (!enabled) return { ...result, status: "ready", listings: [], records: [], error: null };
  return key !== null && key !== resultKey
    ? { ...result, status: "loading", listings: [], records: [], error: null }
    : result;
}
