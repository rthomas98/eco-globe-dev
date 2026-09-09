"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, LayoutGrid, List, Info, ChevronRight, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";
import { useDemoUser } from "@/lib/demo-user";
import { useListings } from "@/lib/use-listings";
import { removeLocalListingDraft, useLocalListingDrafts } from "@/lib/custom-listings";
import { statusLabel } from "@/lib/listing-view";
import { formatQuantity } from "@/lib/listing-format";
import type { Listing } from "../public/browse-listings";
import {
  fetchInterestSummary,
  fetchWantedListings,
  portalMoney,
  type ApiInterestRow,
  type ApiWantedListing,
} from "@/lib/api-portal";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  pending_review: "bg-amber-50 text-amber-600",
  published: "bg-green-50 text-green-600",
  paused: "bg-blue-50 text-blue-600",
  closed: "bg-neutral-200 text-neutral-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[status] ?? "bg-neutral-100 text-neutral-600"}`}>
      {statusLabel(status)}
    </span>
  );
}

function SdsIndicator({ listing }: { listing: Listing }) {
  return listing.sdsDocument ? (
    <span className="flex items-center gap-1.5 text-sm text-neutral-700"><span className="size-2 rounded-full bg-green-500" />SDS on file</span>
  ) : (
    <span className="flex items-center gap-1.5 text-sm text-neutral-700"><span className="size-2 rounded-full bg-amber-500" />SDS missing</span>
  );
}

function Thumb({ listing }: { listing: Listing }) {
  return listing.image ? (
    <img src={listing.image} alt="" className="size-full object-cover" />
  ) : (
    <div className="flex size-full items-center justify-center bg-neutral-100 text-[10px] text-neutral-400">No photo</div>
  );
}

function CardView({ listings, onSelect }: { listings: Listing[]; onSelect: (l: Listing) => void }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {listings.map((l) => (
        <button type="button" key={l.id} className="cursor-pointer overflow-hidden rounded-xl bg-white text-left transition-shadow hover:shadow-md" onClick={() => onSelect(l)}>
          <div className="h-48 overflow-hidden"><Thumb listing={l} /></div>
          <div className="p-4">
            <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-neutral-900">{l.title}</h3>
            <p className="mb-2 text-xs text-neutral-500">{l.location || "No facility"} · <SdsIndicator listing={l} /></p>
            <span className="mb-3 inline-block rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{formatQuantity(l.qtyNum, l.quantityUnit) ?? "Quantity not set"}</span>
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-neutral-900">{l.price} {l.priceNum !== null && <span className="text-xs font-normal text-neutral-400">{l.unit}</span>}</p>
              <StatusBadge status={l.statusCode} />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

export function ListingsPage() {
  const router = useRouter();
  const user = useDemoUser();
  const [view, setView] = useState<"list" | "card">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const owned = useListings("owned", { enabled: !!user });
  const localDrafts = useLocalListingDrafts();
  const [interest, setInterest] = useState<ApiInterestRow[]>([]);
  const [demand, setDemand] = useState<ApiWantedListing[]>([]);

  // Aggregate buyer-interest signals and open buyer demand for the active company.
  useEffect(() => {
    if (!user?.activeCompanyId) return;
    let cancelled = false;
    fetchInterestSummary()
      .then((rows) => {
        if (!cancelled) setInterest(rows);
      })
      .catch(() => {
        // Interest analytics are best-effort.
      });
    fetchWantedListings()
      .then((rows) => {
        if (!cancelled) setDemand(rows.filter((row) => row.isOpen));
      })
      .catch(() => {
        // Demand feed is best-effort.
      });
    return () => {
      cancelled = true;
    };
  }, [user?.activeCompanyId]);

  const filtered = useMemo(
    () => owned.listings.filter((l) => !searchQuery.trim() || l.title.toLowerCase().includes(searchQuery.toLowerCase())),
    [owned.listings, searchQuery],
  );
  const pendingCount = owned.listings.filter((l) => l.statusCode === "pending_review").length;
  const open = (l: Listing) => router.push(`/seller/listings/${l.id}`);
  const interestWithActivity = interest.filter((row) => row.totalEvents > 0);

  return (
    <SellerLayout title="Listings">
      {/* Aggregate buyer-interest signals — the intelligence the licence buys */}
      {interestWithActivity.length > 0 && (
        <div className="mb-5 rounded-xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
          <h2 className="mb-1 text-sm font-bold text-neutral-900">Buyer interest</h2>
          <p className="mb-3 text-xs text-neutral-500">
            Aggregate activity on your listings. Buyer identities stay private
            until they reach out.
          </p>
          <div className="flex flex-wrap gap-3">
            {interestWithActivity.map((row) => (
              <div
                key={row.listingId}
                className="rounded-lg bg-neutral-50 px-4 py-2 text-sm"
                style={{ border: "1px solid #F0F0F0" }}
              >
                <span className="font-semibold text-neutral-900">{row.listingTitle}</span>
                <span className="ml-2 text-neutral-600">
                  {row.detailViews} views · {row.cartAdds} cart adds ·{" "}
                  {row.interestedCompanies}{" "}
                  {row.interestedCompanies === 1 ? "company" : "companies"} interested
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open buyer demand — wanted listings posted by buyers */}
      {demand.length > 0 && (
        <div className="mb-5 rounded-xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
          <h2 className="mb-1 text-sm font-bold text-neutral-900">Buyers are looking for</h2>
          <p className="mb-3 text-xs text-neutral-500">
            Open wanted listings from verified buyers. Post a matching listing
            to connect.
          </p>
          <div className="flex flex-col gap-2">
            {demand.slice(0, 5).map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-50 px-4 py-2 text-sm"
                style={{ border: "1px solid #F0F0F0" }}
              >
                <span className="font-semibold text-neutral-900">{row.title}</span>
                <span className="text-neutral-600">
                  {row.quantity} {row.quantityUnit} · {row.materialTypeName} ·{" "}
                  {[row.stateProvince, row.countryCode].filter(Boolean).join(", ")}
                  {row.targetPricePerUnit != null &&
                    ` · target ${portalMoney(row.targetPricePerUnit, row.currencyCode)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Listings</h1>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
          <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-full bg-neutral-50 px-4 py-2 sm:flex-none" style={{ border: "1px solid #F0F0F0" }}>
            <Search className="size-4 text-neutral-400" />
            <input type="text" aria-label="Search listings" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400 sm:w-32 sm:flex-none" />
          </div>
          <button type="button" onClick={() => setView(view === "list" ? "card" : "list")} className="flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-neutral-700" style={{ border: "1px solid #F0F0F0" }}>
            {view === "list" ? <><LayoutGrid className="size-4" /> Card View</> : <><List className="size-4" /> List View</>}
          </button>
          <Link href="/seller/listings/add" className="w-full sm:w-auto"><Button variant="primary" size="md" className="w-full sm:w-auto">Add Listing</Button></Link>
        </div>
      </div>

      {localDrafts.length > 0 && (
        <div className="mb-5 rounded-xl bg-amber-50 px-4 py-3 sm:px-5" style={{ border: "1px solid #FDE68A" }}>
          <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900"><AlertTriangle className="size-4 text-amber-600" />{localDrafts.length} draft{localDrafts.length === 1 ? "" : "s"} saved only on this device</p>
          <p className="mt-1 text-xs text-neutral-700">These were never saved to EcoGlobe. Resume one to finish and save it, or discard it deliberately. Nothing is deleted automatically.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {localDrafts.map((draft) => (
              <li key={draft.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                <span className="font-medium text-neutral-900">{draft.title}{draft.savedAt ? <span className="ml-2 text-xs font-normal text-neutral-500">{new Date(draft.savedAt).toLocaleString()}</span> : null}</span>
                <span className="flex gap-2">
                  <Link href={`/seller/listings/add?draft=${encodeURIComponent(draft.id)}`} className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">Resume</Link>
                  <button type="button" onClick={() => { if (window.confirm(`Discard the local draft "${draft.title}"? This cannot be undone.`)) removeLocalListingDraft(draft.id); }} className="rounded-full px-3 py-1 text-xs font-semibold text-neutral-700" style={{ border: "1px solid #E0E0E0" }}>Discard</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-blue-50 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3"><Info className="size-5 text-blue-500" /><span className="text-sm text-neutral-700">{pendingCount} listing{pendingCount === 1 ? "" : "s"} pending approval</span></div>
          <ChevronRight className="size-4 text-neutral-400" />
        </div>
      )}

      {!user ? (
        <p className="rounded-xl bg-white p-6 text-sm text-neutral-600">Sign in to see your company&apos;s listings.</p>
      ) : owned.status === "loading" ? (
        <p className="rounded-xl bg-white p-6 text-sm text-neutral-600" role="status">Loading your listings…</p>
      ) : owned.status === "error" ? (
        <div className="rounded-xl bg-red-50 p-6 text-sm text-red-700" role="alert">
          <p>{owned.error}</p>
          <button type="button" onClick={owned.reload} className="mt-2 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" /> Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center">
          <p className="text-base font-semibold text-neutral-900">{owned.listings.length === 0 ? "No listings yet" : "No listings match your search"}</p>
          <p className="mt-1 text-sm text-neutral-500">{owned.listings.length === 0 ? "Create your first listing to start receiving buyer interest." : "Try a different keyword."}</p>
          {owned.listings.length === 0 && <Link href="/seller/listings/add" className="mt-4 inline-block"><Button variant="primary" size="md">Add Listing</Button></Link>}
        </div>
      ) : view === "list" ? (
        <div className="overflow-x-auto rounded-xl bg-white">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="text-left" style={{ borderBottom: "1px solid #F0F0F0" }}>
                <th className="pb-3 text-sm font-medium text-neutral-500">Listing Name</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Category</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Available</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Price</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">SDS</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="cursor-pointer hover:bg-neutral-50" style={{ borderBottom: "1px solid #F8F8F8" }} onClick={() => open(l)}>
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="size-10 shrink-0 overflow-hidden rounded-lg"><Thumb listing={l} /></div>
                      <div><p className="max-w-[300px] truncate text-sm font-medium text-neutral-900">{l.title}</p><p className="text-xs text-neutral-400">#{l.id} · {l.slug}</p></div>
                    </div>
                  </td>
                  <td className="py-3.5 text-sm text-neutral-700">{l.category}</td>
                  <td className="py-3.5 text-sm text-neutral-700">{formatQuantity(l.qtyNum, l.quantityUnit) ?? "—"}</td>
                  <td className="py-3.5 text-sm text-neutral-900">{l.price}{l.priceNum !== null ? l.unit : ""}</td>
                  <td className="py-3.5"><SdsIndicator listing={l} /></td>
                  <td className="py-3.5"><StatusBadge status={l.statusCode} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <CardView listings={filtered} onSelect={open} />
      )}
    </SellerLayout>
  );
}
