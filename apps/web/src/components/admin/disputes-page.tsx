"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Filter, ChevronRight } from "lucide-react";

type DisputeStatus = "Open" | "Awaiting seller" | "Awaiting buyer" | "Under review" | "Resolved";
type Severity = "High" | "Medium" | "Low";

interface Dispute {
  id: string;
  orderId: string;
  buyer: string;
  seller: string;
  reason: string;
  amount: string;
  opened: string;
  status: DisputeStatus;
  severity: Severity;
  age: string;
}

const disputes: Dispute[] = [
  { id: "DSP-2041", orderId: "EG-50021", buyer: "AgriCorp Solutions", seller: "EcoPack Co.", reason: "Quantity mismatch on delivery", amount: "$13,440.00", opened: "2026-05-01", status: "Open", severity: "High", age: "3d" },
  { id: "DSP-2038", orderId: "EG-50018", buyer: "GreenHarvest Co.", seller: "GreenTex Ltd", reason: "Quality below specification", amount: "$8,210.00", opened: "2026-04-28", status: "Under review", severity: "High", age: "6d" },
  { id: "DSP-2031", orderId: "EG-50012", buyer: "NutriFeed Industries", seller: "EcoPack Co.", reason: "Damaged in transit", amount: "$4,990.00", opened: "2026-04-22", status: "Awaiting seller", severity: "Medium", age: "12d" },
  { id: "DSP-2027", orderId: "EG-50009", buyer: "BioGreen Innovations", seller: "Trinity Feedstocks", reason: "Wrong product shipped", amount: "$2,180.00", opened: "2026-04-15", status: "Awaiting buyer", severity: "Medium", age: "19d" },
  { id: "DSP-2018", orderId: "EG-50002", buyer: "PurePastures Ltd.", seller: "EcoPack Co.", reason: "Carbon certification missing", amount: "$5,640.00", opened: "2026-04-08", status: "Resolved", severity: "Low", age: "26d" },
];

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
  const visible = disputes.filter((d) => filter === "All" || d.status === filter);
  const counts = disputes.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-8">
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
            <Stat label="Resolved (30d)" value={counts["Resolved"] ?? 0} tone="green" />
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

        <div className="rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
          <table className="w-full text-sm">
            <thead style={{ borderBottom: "1px solid #F0F0F0" }}>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <th className="px-5 py-3">Dispute</th>
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Parties</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Severity</th>
                <th className="px-5 py-3">Age</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d, i) => (
                <tr
                  key={d.id}
                  style={{ borderBottom: i === visible.length - 1 ? undefined : "1px solid #F4F4F5" }}
                  className="hover:bg-neutral-50"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 size-4 text-amber-500" />
                      <div>
                        <p className="font-mono text-xs text-neutral-500">{d.id}</p>
                        <p className="text-sm font-medium text-neutral-900">{d.reason}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Link href={`/admin/sales/${d.orderId}`} className="font-mono text-sm text-neutral-700 underline hover:text-neutral-900">
                      {d.orderId}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-sm text-neutral-700">
                    {d.buyer}
                    <span className="block text-xs text-neutral-500">vs. {d.seller}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-neutral-900">{d.amount}</td>
                  <td className="px-5 py-4">
                    <DisputeBadge status={d.status} />
                  </td>
                  <td className="px-5 py-4">
                    <SeverityBadge severity={d.severity} />
                  </td>
                  <td className="px-5 py-4 text-sm text-neutral-700">{d.age}</td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/admin/sales/${d.orderId}`} className="text-neutral-400 hover:text-neutral-900">
                      <ChevronRight className="size-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

function SeverityBadge({ severity }: { severity: Severity }) {
  const tone: Record<Severity, { bg: string; fg: string }> = {
    High: { bg: "#FEE2E2", fg: "#991B1B" },
    Medium: { bg: "#FEF3C7", fg: "#92400E" },
    Low: { bg: "#F1F5F9", fg: "#475569" },
  };
  const t = tone[severity];
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: t.bg, color: t.fg }}>
      {severity}
    </span>
  );
}
