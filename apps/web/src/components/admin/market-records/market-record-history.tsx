"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { describeBackendError } from "@/lib/backend-client";
import {
  fetchMarketRecordAudit,
  type MarketAuditEvent,
  type MarketRecord,
} from "@/lib/api-market-records";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";

const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Edited",
  archive: "Archived",
  restore: "Restored",
  review: "Field reviewed",
  import: "Imported",
};

const HIDDEN_KEYS = new Set(["version", "updatedAt", "updatedByUserId", "updatedByUserName"]);

function flatten(value: unknown, prefix: string, into: Map<string, string>) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, inner] of Object.entries(value)) flatten(inner, prefix ? `${prefix}.${key}` : key, into);
  } else {
    into.set(prefix, value === null || value === undefined ? "—" : String(value));
  }
}

/** Field-level changes between two snapshots, shown as plain text. */
function auditChanges(previous: MarketRecord | null, next: MarketRecord | null) {
  const before = new Map<string, string>();
  const after = new Map<string, string>();
  flatten(previous ?? {}, "", before);
  flatten(next ?? {}, "", after);
  const keys = new Set([...before.keys(), ...after.keys()]);
  return [...keys]
    .filter((key) => !HIDDEN_KEYS.has(key) && (before.get(key) ?? "—") !== (after.get(key) ?? "—"))
    .map((key) => ({ field: key, from: before.get(key) ?? "—", to: after.get(key) ?? "—" }));
}

function EventItem({ event }: { event: MarketAuditEvent }) {
  const changes = event.previous && event.next ? auditChanges(event.previous, event.next) : [];
  return (
    <li className="rounded-xl bg-white px-4 py-3" style={{ border: "1px solid #E0E0E0" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-neutral-900">
          {ACTION_LABELS[event.action] ?? event.action.replace(/_/g, " ")}
          <span className="font-normal text-neutral-600"> by {event.actorUserName ?? `user #${event.actorUserId}`}</span>
        </p>
        <time dateTime={event.createdAt} className="text-xs text-neutral-500">
          {new Date(event.createdAt).toLocaleString("en-US")}
        </time>
      </div>
      {event.reason && <p className="mt-1 break-words text-sm text-neutral-700">Reason: {event.reason}</p>}
      {changes.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-neutral-700">
            {changes.length} field{changes.length === 1 ? "" : "s"} changed
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {changes.map((change) => (
              <li key={change.field} className="break-words text-neutral-700">
                <span className="font-mono text-xs text-neutral-500">{change.field}</span>: {change.from} → {change.to}
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

export function MarketRecordHistory({ recordId, refreshKey }: { recordId: number; refreshKey: string }) {
  const state = useBackendData(() => fetchMarketRecordAudit(recordId), [recordId, refreshKey], "History could not be loaded.");
  const [more, setMore] = useState<{ events: MarketAuditEvent[]; nextCursor: string | null; scope: string } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const scope = `${recordId}:${refreshKey}`;
  const extra = more?.scope === scope ? more : null;

  const loadMore = async (cursor: string) => {
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await fetchMarketRecordAudit(recordId, cursor);
      setMore({ events: [...(extra?.events ?? []), ...page.events], nextCursor: page.nextCursor, scope });
    } catch (error) {
      setMoreError(describeBackendError(error, "More history could not be loaded."));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section aria-labelledby="market-record-history" className="mt-8">
      <h2 id="market-record-history" className="mb-3 text-lg font-bold text-neutral-900">
        History
      </h2>
      <DataBoundary
        state={state}
        isEmpty={(data) => data.events.length === 0}
        empty={{ title: "No history yet" }}
        loadingLabel="Loading history…"
      >
        {(data) => {
          const events = [...data.events, ...(extra?.events ?? [])];
          const cursor = extra ? extra.nextCursor : data.nextCursor;
          return (
            <>
              <ol className="flex flex-col gap-2">
                {events.map((event) => (
                  <EventItem key={event.id} event={event} />
                ))}
              </ol>
              {moreError && (
                <p role="alert" className="mt-2 text-sm text-red-700">
                  {moreError}
                </p>
              )}
              {cursor && (
                <button
                  type="button"
                  onClick={() => void loadMore(cursor)}
                  disabled={loadingMore}
                  aria-busy={loadingMore}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
                  style={{ border: "1px solid #E0E0E0" }}
                >
                  {loadingMore && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  Load more history
                </button>
              )}
            </>
          );
        }}
      </DataBoundary>
    </section>
  );
}
