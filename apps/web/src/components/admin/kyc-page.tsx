"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, Check, X, FileText, Filter } from "lucide-react";

type Stage = "Submitted" | "In review" | "Awaiting docs" | "Approved" | "Rejected";

interface KycRequest {
  id: string;
  entity: string;
  type: "Seller" | "Buyer";
  country: string;
  submitted: string;
  stage: Stage;
  docs: number;
  flags: number;
}

const requests: KycRequest[] = [
  { id: "KYC-9211", entity: "EcoPack Co.", type: "Seller", country: "USA", submitted: "2026-05-02", stage: "Submitted", docs: 4, flags: 0 },
  { id: "KYC-9210", entity: "GreenTex Ltd", type: "Seller", country: "UK", submitted: "2026-05-01", stage: "In review", docs: 6, flags: 1 },
  { id: "KYC-9208", entity: "Atlas Carbon Black", type: "Buyer", country: "Mexico", submitted: "2026-04-29", stage: "Awaiting docs", docs: 2, flags: 0 },
  { id: "KYC-9205", entity: "Rotterdam Bio Refineries", type: "Seller", country: "Netherlands", submitted: "2026-04-27", stage: "In review", docs: 5, flags: 0 },
  { id: "KYC-9201", entity: "Jubail Petrochem", type: "Buyer", country: "Saudi Arabia", submitted: "2026-04-25", stage: "Approved", docs: 7, flags: 0 },
];

const STAGES: Array<Stage | "All"> = ["All", "Submitted", "In review", "Awaiting docs", "Approved", "Rejected"];

export function AdminKycPage() {
  const [filter, setFilter] = useState<Stage | "All">("All");
  const visible = requests.filter((r) => filter === "All" || r.stage === filter);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">KYC verifications</h1>
            <p className="mt-1 text-sm text-neutral-500">
              New seller and buyer accounts awaiting identity verification and
              compliance approval.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-neutral-500" />
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filter === s
                      ? "bg-neutral-900 text-white"
                      : "bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                  style={filter !== s ? { border: "1px solid #E0E0E0" } : undefined}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
          {visible.map((r, i) => (
            <div
              key={r.id}
              className="flex items-start gap-4 px-5 py-4 hover:bg-neutral-50"
              style={{ borderBottom: i === visible.length - 1 ? undefined : "1px solid #F4F4F5" }}
            >
              <Shield className="mt-1 size-5 text-neutral-500" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-neutral-500">{r.id}</span>
                  <StageBadge stage={r.stage} />
                  <span className="text-xs text-neutral-400">·</span>
                  <span className="text-xs text-neutral-500">{r.type} · {r.country}</span>
                  {r.flags > 0 && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "#FEF3C7", color: "#92400E" }}>
                      {r.flags} flag{r.flags === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-semibold text-neutral-900">{r.entity}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Submitted {r.submitted} ·{" "}
                  <span className="inline-flex items-center gap-1">
                    <FileText className="size-3" />
                    {r.docs} documents
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={r.type === "Seller" ? `/admin/sellers/${r.id}` : `/admin/buyers/${r.id}`}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-100"
                  style={{ border: "1px solid #E0E0E0" }}
                >
                  Review
                </Link>
                <button className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100">
                  <X className="inline-block size-3 align-text-bottom" /> Reject
                </button>
                <button className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800">
                  <Check className="inline-block size-3 align-text-bottom" /> Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StageBadge({ stage }: { stage: Stage }) {
  const tone: Record<Stage, { bg: string; fg: string }> = {
    Submitted: { bg: "#DBEAFE", fg: "#1E40AF" },
    "In review": { bg: "#EDE9FE", fg: "#5B21B6" },
    "Awaiting docs": { bg: "#FEF3C7", fg: "#92400E" },
    Approved: { bg: "#DCFCE7", fg: "#166534" },
    Rejected: { bg: "#FEE2E2", fg: "#991B1B" },
  };
  const t = tone[stage];
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: t.bg, color: t.fg }}>
      {stage}
    </span>
  );
}
