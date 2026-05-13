"use client";

import { useState } from "react";
import Link from "next/link";
import { Flag, Filter, Check, X, Eye } from "lucide-react";

type ModStatus = "Pending" | "Flagged" | "Approved" | "Rejected";

interface ModItem {
  id: string;
  product: string;
  seller: string;
  image: string;
  submitted: string;
  status: ModStatus;
  reason?: string;
}

const items: ModItem[] = [
  { id: "EG-PROD-00031", product: "Bio-based Resin Pellets", seller: "EcoPack Co.", image: "/products/red-granules.png", submitted: "2026-05-03", status: "Pending" },
  { id: "EG-PROD-00030", product: "Recycled Aluminum Sheet", seller: "Metal Reclaim LLC", image: "/products/wood-chips.png", submitted: "2026-05-02", status: "Flagged", reason: "Buyer flagged sustainability claim" },
  { id: "EG-PROD-00028", product: "CBO Coal Tar Carbon Black Oil", seller: "Refinery Surplus", image: "/products/coal-tar.png", submitted: "2026-05-01", status: "Pending" },
  { id: "EG-PROD-00027", product: "Molecular Sieve Zeolite 13X", seller: "EcoPack Co.", image: "/products/molecular-sieve.png", submitted: "2026-04-30", status: "Approved" },
  { id: "EG-PROD-00026", product: "Natural Zeolite Powder", seller: "EcoPack Co.", image: "/products/zeolite-powder.png", submitted: "2026-04-29", status: "Approved" },
  { id: "EG-PROD-00025", product: "Natural Rutile Sand Concentrate", seller: "Metal Reclaim LLC", image: "/products/rutile-sand.png", submitted: "2026-04-28", status: "Rejected", reason: "Origin documentation incomplete" },
];

const STATUSES: Array<ModStatus | "All"> = ["All", "Pending", "Flagged", "Approved", "Rejected"];

export function AdminModerationPage() {
  const [filter, setFilter] = useState<ModStatus | "All">("All");
  const visible = items.filter((i) => filter === "All" || i.status === filter);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Listing moderation</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Approve new listings, review flagged sustainability claims, and keep
              the marketplace catalog trustworthy.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-neutral-500" />
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-xl bg-white"
              style={{ border: "1px solid #F0F0F0" }}
            >
              <div className="relative h-40 overflow-hidden">
                <img src={item.image} alt="" className="size-full object-cover" />
                <div className="absolute left-3 top-3">
                  <ModBadge status={item.status} />
                </div>
                {item.reason && (
                  <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 bg-amber-50/90 px-3 py-1.5 text-xs text-amber-900">
                    <Flag className="size-3" />
                    {item.reason}
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-neutral-900 line-clamp-2">{item.product}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {item.seller} · submitted {item.submitted}
                </p>
                <p className="mt-0.5 font-mono text-xs text-neutral-400">{item.id}</p>
                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href={`/admin/listings/${item.id}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-100"
                    style={{ border: "1px solid #E0E0E0" }}
                  >
                    <Eye className="size-3" />
                    Review
                  </Link>
                  <button className="flex size-8 items-center justify-center rounded-full bg-red-50 text-red-700 hover:bg-red-100" title="Reject">
                    <X className="size-3" />
                  </button>
                  <button className="flex size-8 items-center justify-center rounded-full bg-neutral-900 text-white hover:bg-neutral-800" title="Approve">
                    <Check className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModBadge({ status }: { status: ModStatus }) {
  const tone: Record<ModStatus, { bg: string; fg: string }> = {
    Pending: { bg: "#FEF3C7", fg: "#92400E" },
    Flagged: { bg: "#FFEDD5", fg: "#C2410C" },
    Approved: { bg: "#DCFCE7", fg: "#166534" },
    Rejected: { bg: "#FEE2E2", fg: "#991B1B" },
  };
  const t = tone[status];
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: t.bg, color: t.fg }}>
      {status}
    </span>
  );
}
