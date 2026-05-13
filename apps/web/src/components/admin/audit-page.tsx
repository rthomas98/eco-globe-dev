"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Filter, Download } from "lucide-react";
import { Button } from "@eco-globe/ui";

type Severity = "Info" | "Warning" | "Critical";
type Category = "All" | "Auth" | "Listings" | "Orders" | "Escrow" | "KYC" | "Settings";

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  category: Exclude<Category, "All">;
  action: string;
  resourceId?: string;
  resourceHref?: string;
  severity: Severity;
  ip: string;
}

const entries: AuditEntry[] = [
  { id: "AUD-90021", timestamp: "2026-05-04 11:42:08", actor: "Katarina Jenkins", category: "Listings", action: "Approved listing", resourceId: "EG-PROD-00027", resourceHref: "/admin/listings/EG-PROD-00027", severity: "Info", ip: "10.0.4.18" },
  { id: "AUD-90020", timestamp: "2026-05-04 11:18:32", actor: "Katarina Jenkins", category: "Escrow", action: "Released escrow funds", resourceId: "ESC-50012", resourceHref: "/admin/accounting/escrow/ESC-50012", severity: "Info", ip: "10.0.4.18" },
  { id: "AUD-90019", timestamp: "2026-05-04 10:55:21", actor: "System", category: "Orders", action: "Auto-flagged transaction over $100,000", resourceId: "TX-50021", resourceHref: "/admin/accounting/transactions/TX-50021", severity: "Warning", ip: "system" },
  { id: "AUD-90018", timestamp: "2026-05-04 10:14:05", actor: "Anabea Costa", category: "KYC", action: "Approved seller verification", resourceId: "S-00231", resourceHref: "/admin/sellers/S-00231", severity: "Info", ip: "10.0.4.42" },
  { id: "AUD-90017", timestamp: "2026-05-04 09:30:48", actor: "Anabea Costa", category: "Listings", action: "Rejected listing", resourceId: "EG-PROD-00025", resourceHref: "/admin/listings/EG-PROD-00025", severity: "Warning", ip: "10.0.4.42" },
  { id: "AUD-90016", timestamp: "2026-05-03 18:22:11", actor: "System", category: "Auth", action: "Failed login attempts threshold reached", resourceId: "B-00184", resourceHref: "/admin/buyers/B-00184", severity: "Warning", ip: "203.0.113.42" },
  { id: "AUD-90015", timestamp: "2026-05-03 15:05:00", actor: "Katarina Jenkins", category: "Settings", action: "Updated platform fee schedule", severity: "Critical", ip: "10.0.4.18" },
  { id: "AUD-90014", timestamp: "2026-05-03 11:48:09", actor: "Anabea Costa", category: "Auth", action: "Granted admin role", resourceId: "U-00038", severity: "Critical", ip: "10.0.4.42" },
];

const CATEGORIES: Category[] = ["All", "Auth", "Listings", "Orders", "Escrow", "KYC", "Settings"];

export function AdminAuditPage() {
  const [category, setCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");

  const visible = entries.filter((e) => {
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
      <div className="px-8 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Audit log</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Tamper-evident log of platform actions. Filter by category or
              search for a specific actor, resource, or audit ID.
            </p>
          </div>
          <Button variant="secondary" size="md">
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

        <div className="rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
          <table className="w-full text-sm">
            <thead style={{ borderBottom: "1px solid #F0F0F0" }}>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Resource</th>
                <th className="px-5 py-3">Severity</th>
                <th className="px-5 py-3">IP</th>
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
                    {e.resourceHref && e.resourceId ? (
                      <Link href={e.resourceHref} className="text-neutral-700 underline hover:text-neutral-900">
                        {e.resourceId}
                      </Link>
                    ) : e.resourceId ? (
                      <span className="text-neutral-700">{e.resourceId}</span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <SevBadge severity={e.severity} />
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-neutral-500">{e.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-neutral-700">No audit entries match.</p>
              <p className="mt-1 text-xs text-neutral-500">Adjust your filters or search query.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SevBadge({ severity }: { severity: Severity }) {
  const tone: Record<Severity, { bg: string; fg: string }> = {
    Info: { bg: "#F1F5F9", fg: "#475569" },
    Warning: { bg: "#FEF3C7", fg: "#92400E" },
    Critical: { bg: "#FEE2E2", fg: "#991B1B" },
  };
  const t = tone[severity];
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: t.bg, color: t.fg }}>
      {severity}
    </span>
  );
}
