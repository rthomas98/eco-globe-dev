"use client";

import { apiFetch } from "./backend-client";
import { parseDemoPresentationsResponse } from "./demo-presentations";

/** Public, signed-out-safe read of reviewed demo presentation snapshots. */
export async function fetchDemoPresentations() {
  const body = await apiFetch<unknown>("/api/demo-presentations", { method: "GET" });
  return parseDemoPresentationsResponse(body);
}
