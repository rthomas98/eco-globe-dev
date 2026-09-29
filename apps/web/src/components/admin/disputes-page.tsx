"use client";

import { describeBackendError } from "@/lib/backend-client";
import { ErrorState, LoadingState } from "@/components/shared/data-state";

import React from "react";

import { useEffect, useState } from "react";
import { fetchDisputes } from "@/lib/api-fulfilment";
import { DisputeThread } from "@/components/disputes/dispute-thread";
import { fetchOrders } from "@/lib/api-orders";
import { readDemoUser } from "@/lib/demo-user";
import Link from "next/link";
import { AlertTriangle, Filter, ChevronRight } from "lucide-react";

type DisputeStatus = "Open" | "Awaiting seller" | "Awaiting buyer" | "Under review" | "Resolved";

interface Dispute {
  live?: boolean;
  id: string;
  orderId: string;
  escrowId: string;
  buyer: string;
  seller: string;
  reason: string;
  amount: string;
  opened: string;
  status: DisputeStatus;
  escrowAction: string;
}


const FILTERS: Array<DisputeStatus | "All"> = [
  "All",
  "Open",
  "Awaiting seller",
  "Awaiting buyer",
  "Under review",
  "Resolved",
];

export function AdminDisputesPage() {
  const [filter, setFilter] = useState<DisputeStatus | "All">("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [rows, setRows] = useState<Dispute[]>([]);
  const [loadState, setLoadState] = useState<{ status: "loading" | "ready" | "error"; error?: string }>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  // Disputes come only from the backend.
  useEffect(() => {
    if (!readDemoUser()) {
      setLoadState({ status: "error", error: "Sign in to see disputes." });
      return;
    }
    let cancelled = false;
    setLoadState({ status: "loading" });
    Promise.all([fetchDisputes(), fetchOrders()])
      .then(([apiDisputes, orders]) => {
        if (cancelled) return;
        const orderById = new Map(orders.map((o) => [o.id, o]));
        const live: Dispute[] = apiDisputes.map((d) => {
          const order = d.orderId ? orderById.get(d.orderId) : undefined;
          return {
            id: `DSP-${d.id}`,
            live: true,
            orderId: d.orderId ? `EG-${d.orderId}` : "—",
            escrowId: d.escrowId ? `ESC-${d.escrowId}` : "—",
            buyer: order?.buyerCompanyName ?? "Marketplace buyer",
            seller: order?.sellerCompanyName ?? "Marketplace seller",
            reason: d.summary,
            amount: order ? `$${Number(order.totalAmount).toLocaleString()}` : "—",
            opened: new Date(d.createdAt).toISOString().slice(0, 10),
            status: d.disputeStatusCode === "open"
              ? "Open"
              : d.disputeStatusCode === "under_review"
                ? "Under review"
                : "Resolved",
            escrowAction: d.escrowId ? "Escrow locked pending resolution" : "No escrow on order",
          };
        });
        setRows(live);
        setLoadState({ status: "ready" });
      })
      .catch((error) => {
        if (!cancelled) setLoadState({ status: "error", error: describeBackendError(error, "Disputes could not be loaded.") });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const visible = rows.filter((d) => filter === "All" || d.status === filter);
  const counts = rows.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Disputes</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Open and recently-closed buyer/seller disputes that require admin oversight.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Stat label="Open" value={counts["Open"] ?? 0} tone="red" />
            <Stat label="Awaiting seller" value={counts["Awaiting seller"] ?? 0} tone="amber" />
            <Stat label="Under review" value={counts["Under review"] ?? 0} tone="purple" />
            <Stat label="Resolved" value={counts["Resolved"] ?? 0} tone="green" />
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-neutral-500" />
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filter === f
                      ? "bg-neutral-900 text-white"
                      : "bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                  style={filter !== f ? { border: "1px solid #E0E0E0" } : undefined}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loadState.status !== "ready" || visible.length === 0 ? (
          <div className="rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
            {loadState.status === "loading" ? (
              <LoadingState label="Loading disputes…" />
            ) : loadState.status === "error" ? (
              <ErrorState message={loadState.error ?? "Disputes could not be loaded."} onRetry={() => setReloadKey((k) => k + 1)} />
            ) : (
              <p className="px-6 py-12 text-center text-sm text-neutral-600">
                {rows.length === 0 ? "No disputes have been opened." : "No disputes match this filter."}
              </p>
            )}
          </div>
        ) : (
        <div className="overflow-x-auto rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
          <table className="w-full min-w-[860px] text-sm">
            <thead style={{ borderBottom: "1px solid #F0F0F0" }}>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <th className="px-5 py-3">Dispute</th>
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Escrow hold</th>
                <th className="px-5 py-3">Parties</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d, i) => {
                const liveMatch = d.live ? /^DSP-(\d+)$/.exec(d.id) : null;
                const liveId = liveMatch ? Number(liveMatch[1]) : null;
                return (
                <React.Fragment key={d.id}>
                <tr
                  style={{ borderBottom: i === visible.length - 1 && expandedId !== d.id ? undefined : "1px solid #F4F4F5" }}
                  className={`hover:bg-neutral-50 ${liveId !== null ? "cursor-pointer" : ""}`}
                  onClick={() =>
                    liveId !== null &&
                    setExpandedId((current) => (current === d.id ? null : d.id))
                  }
                >
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 size-4 text-amber-500" />
                      <div>
                        <p className="font-mono text-xs text-neutral-500">
                          {d.id}
                          {liveId !== null && (
                            <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                              Live
                            </span>
                          )}
                        </p>
                        <p className="text-sm font-medium text-neutral-900">{d.reason}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Link href={`/admin/sales/${d.orderId}`} className="font-mono text-sm text-neutral-700 underline hover:text-neutral-900">
                      {d.orderId}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <Link href={`/admin/accounting/escrow/${d.escrowId}`} className="font-mono text-sm text-neutral-700 underline hover:text-neutral-900">
                      {d.escrowId}
                    </Link>
                    <span className="mt-1 block max-w-[220px] text-xs text-neutral-500">
                      {d.escrowAction}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-neutral-700">
                    {d.buyer}
                    <span className="block text-xs text-neutral-500">vs. {d.seller}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-neutral-900">{d.amount}</td>
                  <td className="px-5 py-4">
                    <DisputeBadge status={d.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/sales/${d.orderId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-neutral-400 hover:text-neutral-900"
                    >
                      <ChevronRight className="size-4" />
                    </Link>
                  </td>
                </tr>
                {liveId !== null && expandedId === d.id && (
                  <tr style={{ borderBottom: i === visible.length - 1 ? undefined : "1px solid #F4F4F5" }}>
                    <td colSpan={7} className="bg-neutral-50/60 px-8 py-6">
                      <div className="max-w-[720px]">
                        <DisputeThread disputeId={liveId} viewerRole="admin" />
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "red" | "amber" | "purple" | "green" }) {
  const tones = {
    red: { bg: "#FEE2E2", fg: "#991B1B" },
    amber: { bg: "#FEF3C7", fg: "#92400E" },
    purple: { bg: "#EDE9FE", fg: "#5B21B6" },
    green: { bg: "#DCFCE7", fg: "#166534" },
  } as const;
  const t = tones[tone];
  return (
    <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: t.bg }}>
      <span className="font-bold" style={{ color: t.fg }}>{value}</span>
      <span className="text-xs uppercase tracking-wide" style={{ color: t.fg }}>{label}</span>
    </div>
  );
}

function DisputeBadge({ status }: { status: DisputeStatus }) {
  const tone: Record<DisputeStatus, { bg: string; fg: string }> = {
    Open: { bg: "#FEE2E2", fg: "#991B1B" },
    "Awaiting seller": { bg: "#FEF3C7", fg: "#92400E" },
    "Awaiting buyer": { bg: "#FEF3C7", fg: "#92400E" },
    "Under review": { bg: "#EDE9FE", fg: "#5B21B6" },
    Resolved: { bg: "#DCFCE7", fg: "#166534" },
  };
  const t = tone[status];
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: t.bg, color: t.fg }}>
      {status}
    </span>
  );
}
