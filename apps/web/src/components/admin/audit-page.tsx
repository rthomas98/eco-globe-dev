"use client";

import { useMemo, useState } from "react";
import { Search, Filter, Download } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { fetchAuditLogs, type ApiAuditLog } from "@/lib/api-portal";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";

type Category = "All" | "Listings" | "Orders" | "Escrow" | "Companies" | "Other";

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  category: Exclude<Category, "All">;
  action: string;
  resourceId?: string;
}

const CATEGORIES: Category[] = ["All", "Listings", "Orders", "Escrow", "Companies", "Other"];

function categoryFor(recordType: string | null): Exclude<Category, "All"> {
  if (recordType === "listing") return "Listings";
  if (recordType === "order" || recordType === "quote" || recordType === "shipment") return "Orders";
  if (recordType === "escrow" || recordType === "payment" || recordType === "payout") return "Escrow";
  if (recordType === "user" || recordType === "company") return "Companies";
  return "Other";
}

function toEntry(log: ApiAuditLog): AuditEntry {
  return {
    id: `AUD-${log.id}`,
    timestamp: new Date(log.createdAt).toLocaleString("en-US"),
    actor: log.actorUserName ?? (log.actorTypeCode === "system" ? "System" : log.actorTypeCode),
    category: categoryFor(log.recordTypeCode),
    action: `${log.actionTypeCode.replace(/_/g, " ")}${log.reason ? ` — ${log.reason}` : ""}`,
    resourceId:
      log.recordTypeCode && log.recordId !== null
        ? `${log.recordTypeCode}-${log.recordId}`
        : undefined,
  };
}

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function downloadCsv(rows: AuditEntry[]) {
  const header = ["Audit ID", "Timestamp", "Actor", "Category", "Action", "Resource"];
  const lines = [header, ...rows.map((r) => [r.id, r.timestamp, r.actor, r.category, r.action, r.resourceId ?? ""])]
    .map((cells) => cells.map(csvCell).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([lines], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `ecoglobe-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminAuditPage() {
  const logs = useBackendData(fetchAuditLogs, [], "The audit log could not be loaded.");
  const entryRows = useMemo(() => (logs.data ?? []).map(toEntry), [logs.data]);

  const [category, setCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");

  const visible = entryRows.filter((e) => {
    if (category !== "All" && e.category !== category) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const blob = `${e.id} ${e.actor} ${e.action} ${e.resourceId ?? ""}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Audit log</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Platform actions recorded by the EcoGlobe backend. Filter by category or
              search for a specific actor, resource, or audit ID.
            </p>
          </div>
          <Button
            variant="secondary"
            size="md"
            disabled={visible.length === 0}
            onClick={() => downloadCsv(visible)}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-4 py-2" style={{ border: "1px solid #E0E0E0", maxWidth: 420 }}>
            <Search className="size-4 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit ID, actor, resource…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
          </div>
          <Filter className="size-4 text-neutral-500" />
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  category === c
                    ? "bg-neutral-900 text-white"
                    : "bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
                style={category !== c ? { border: "1px solid #E0E0E0" } : undefined}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
          <DataBoundary
            state={logs}
            loadingLabel="Loading audit log…"
            isEmpty={() => visible.length === 0}
            empty={
              entryRows.length === 0
                ? { title: "No audit entries yet", description: "Recorded platform actions will appear here." }
                : { title: "No audit entries match.", description: "Adjust your filters or search query." }
            }
          >
            {() => (
              <table className="w-full min-w-[720px] text-sm">
                <thead style={{ borderBottom: "1px solid #F0F0F0" }}>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Actor</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Resource</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((e, i) => (
                    <tr
                      key={e.id}
                      style={{ borderBottom: i === visible.length - 1 ? undefined : "1px solid #F4F4F5" }}
                      className="hover:bg-neutral-50"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-neutral-700">{e.timestamp}</td>
                      <td className="px-5 py-3 text-sm text-neutral-900">{e.actor}</td>
                      <td className="px-5 py-3 text-sm text-neutral-700">{e.category}</td>
                      <td className="px-5 py-3 text-sm text-neutral-900">{e.action}</td>
                      <td className="px-5 py-3 font-mono text-xs">
                        {e.resourceId ? (
                          <span className="text-neutral-700">{e.resourceId}</span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DataBoundary>
        </div>
      </div>
    </div>
  );
}
