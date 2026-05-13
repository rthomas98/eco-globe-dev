"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, MessageSquare, ChevronRight } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { BuyerLayout } from "./buyer-layout";

type RFQStatus = "Open" | "Quoted" | "Accepted" | "Declined" | "Expired";

interface RFQ {
  id: string;
  product: string;
  category: string;
  quantity: string;
  needBy: string;
  responses: number;
  status: RFQStatus;
  created: string;
}

const rfqs: RFQ[] = [
  { id: "RFQ-30021", product: "Recycled Polypropylene Pellets, food-grade", category: "Plastics", quantity: "50 tons", needBy: "2026-06-01", responses: 4, status: "Open", created: "2026-05-02" },
  { id: "RFQ-30018", product: "Used Cooking Oil (UCO) refined", category: "Oils", quantity: "20 tons", needBy: "2026-05-25", responses: 7, status: "Quoted", created: "2026-04-28" },
  { id: "RFQ-30011", product: "Wood pellet biomass, Grade A", category: "Biomass", quantity: "100 tons", needBy: "2026-05-15", responses: 3, status: "Accepted", created: "2026-04-20" },
  { id: "RFQ-30002", product: "Tire crumb rubber, mesh 30-40", category: "Rubber", quantity: "12 tons", needBy: "2026-05-05", responses: 2, status: "Declined", created: "2026-04-12" },
  { id: "RFQ-29988", product: "Pyrolysis pitch (CB feedstock)", category: "Refinery", quantity: "200 tons", needBy: "2026-04-15", responses: 1, status: "Expired", created: "2026-03-25" },
];

const FILTERS: Array<RFQStatus | "All"> = ["All", "Open", "Quoted", "Accepted", "Declined", "Expired"];

export function BuyerRfqPage() {
  const [filter, setFilter] = useState<RFQStatus | "All">("All");
  const visible = rfqs.filter((r) => filter === "All" || r.status === filter);

  return (
    <BuyerLayout>
      <div className="px-8 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Requests for quote</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Submit a spec when you can&apos;t find a listing that fits — verified
              sellers respond with quotes you can compare side by side.
            </p>
          </div>
          <Link href="/buyer/rfq/new">
            <Button variant="primary" size="md">
              <Plus className="size-4" />
              New RFQ
            </Button>
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
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

        <div className="rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
          {visible.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-neutral-700">No RFQs match.</p>
              <p className="mt-1 text-xs text-neutral-500">Submit a new request to start gathering quotes.</p>
            </div>
          ) : (
            visible.map((r, i) => (
              <div
                key={r.id}
                className="flex items-start gap-4 px-5 py-4 hover:bg-neutral-50"
                style={{ borderBottom: i === visible.length - 1 ? undefined : "1px solid #F4F4F5" }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-neutral-500">{r.id}</span>
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-neutral-400">·</span>
                    <span className="text-xs text-neutral-500">{r.category}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">{r.product}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {r.quantity} · need by {r.needBy} · submitted {r.created}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-700">
                  <MessageSquare className="size-4 text-neutral-400" />
                  <span>{r.responses} quote{r.responses === 1 ? "" : "s"}</span>
                </div>
                <ChevronRight className="mt-2 size-4 text-neutral-300" />
              </div>
            ))
          )}
        </div>
      </div>
    </BuyerLayout>
  );
}

function StatusBadge({ status }: { status: RFQStatus }) {
  const tone: Record<RFQStatus, { bg: string; fg: string }> = {
    Open: { bg: "#DBEAFE", fg: "#1E40AF" },
    Quoted: { bg: "#EDE9FE", fg: "#5B21B6" },
    Accepted: { bg: "#DCFCE7", fg: "#166534" },
    Declined: { bg: "#FEE2E2", fg: "#991B1B" },
    Expired: { bg: "#F1F5F9", fg: "#475569" },
  };
  const t = tone[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: t.bg, color: t.fg }}
    >
      {status}
    </span>
  );
}
