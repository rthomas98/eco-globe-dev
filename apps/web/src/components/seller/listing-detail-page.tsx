"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MoreHorizontal, Edit, FileText, Download } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";
import { ListingMap } from "../public/listing-map";
import {
  getSellerListingById,
  type SellerListing,
  type SellerListingStatus,
  type SellerSustainability,
} from "./seller-listings-data";

function StatusBadge({ status }: { status: SellerListingStatus }) {
  const s: Record<SellerListingStatus, string> = {
    Draft: "bg-neutral-100 text-neutral-600",
    Pending: "bg-amber-50 text-amber-600",
    Approved: "bg-green-50 text-green-600",
  };
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${s[status]}`}>
      {status}
    </span>
  );
}

function SustainabilityDot({ type }: { type: SellerSustainability }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-neutral-700">
      <span className={`size-2 rounded-full ${type === "Verified" ? "bg-green-500" : "bg-amber-500"}`} />
      {type}
    </span>
  );
}

export function SellerListingDetailPage({ id }: { id: string }) {
  const listing = getSellerListingById(id);
  const [tab, setTab] = useState<"overview" | "documents" | "activity">("overview");

  if (!listing) {
    return (
      <SellerLayout title="Listing not found">
        <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
          <p className="text-lg font-bold text-neutral-900">Listing not found</p>
          <p className="mt-2 text-sm text-neutral-500">
            We couldn&apos;t find a listing with id <code className="rounded bg-neutral-100 px-1.5 py-0.5">{id}</code>.
          </p>
          <Link href="/seller/listings" className="mt-6">
            <Button variant="primary" size="md">
              Back to listings
            </Button>
          </Link>
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout title="Listing detail">
      <div className="px-8 py-8">
        {/* Back + actions */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/seller/listings"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
          >
            <ArrowLeft className="size-4" />
            Back to listings
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/seller/listings/${listing.id}/edit`}>
              <Button variant="secondary" size="md">
                <Edit className="size-4" />
                Edit listing
              </Button>
            </Link>
            <button className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100">
              <MoreHorizontal className="size-5 text-neutral-500" />
            </button>
          </div>
        </div>

        {/* Header */}
        <header className="mb-8 flex items-start gap-5">
          <div className="size-24 shrink-0 overflow-hidden rounded-xl">
            <img src={listing.image} alt={listing.name} className="size-full object-cover" />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-neutral-900">{listing.name}</h1>
              <StatusBadge status={listing.status} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
              <span>{listing.location}</span>
              <span>·</span>
              <SustainabilityDot type={listing.sustainability} />
              <span>·</span>
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">
                {listing.available.toLocaleString()} tons available
              </span>
              <span>·</span>
              <span className="font-semibold text-neutral-900">{listing.price}</span>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex gap-6" style={{ borderBottom: "1px solid #F0F0F0" }}>
          {(["overview", "documents", "activity"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px pb-3 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "border-b-2 border-neutral-900 text-neutral-900"
                  : "text-neutral-400 hover:text-neutral-700"
              }`}
            >
              {t === "activity" ? "Activity log" : t}
            </button>
          ))}
        </div>

        {/* Body */}
        {tab === "overview" && <OverviewTab listing={listing} />}
        {tab === "documents" && <DocumentsTab listing={listing} />}
        {tab === "activity" && <ActivityTab />}
      </div>
    </SellerLayout>
  );
}

function OverviewTab({ listing }: { listing: SellerListing }) {
  const images = [
    listing.image,
    "/products/wood-chips.png",
    "/products/wood-shavings.png",
    "/products/rutile-sand.png",
  ];
  const specs: Array<[string, string]> = [
    ["Material composition", "Rice Husk"],
    ["Listing type", "Dried"],
    ["Grade / purity", "Export Standard"],
    ["Color", "Natural Wood Color"],
    ["Shelf life", "12 months"],
    ["Storage & handling", "In dry place"],
    ["Package", "123 lb / PP Bag"],
    ["Weight", "123 lb"],
    ["Usage", "Paper-making Industry"],
    ["Place of origin", listing.location],
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <section>
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Listing info</h3>
          <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="mb-4 grid grid-cols-2 gap-y-4">
              <div>
                <p className="text-xs font-semibold text-neutral-500">Listing category</p>
                <p className="text-sm text-neutral-900">{listing.category}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-500">Listing price</p>
                <p className="text-sm text-neutral-900">{listing.price}</p>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto">
              {images.map((img, i) => (
                <div key={i} className="size-20 shrink-0 overflow-hidden rounded-lg">
                  <img src={img} alt="" className="size-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Specifications</h3>
          <div className="grid grid-cols-2 gap-y-4 rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
            {specs.map(([k, v]) => (
              <div key={k}>
                <p className="text-xs font-semibold text-neutral-500">{k}</p>
                <p className="text-sm text-neutral-900">{v}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Description</h3>
          <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
            <p className="text-sm leading-relaxed text-neutral-700">
              Verified industrial feedstock with documented composition, certified
              origin, and full chain-of-custody from facility to delivery. Buyers
              receive an SDS, an availability window, and the option to run a
              transportation footprint estimate before committing.
            </p>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Location</h3>
          <div className="h-[300px] overflow-hidden rounded-xl">
            <ListingMap />
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-6">
        <section>
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Carbon analytics</h3>
          <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs font-semibold text-neutral-500">Carbon footprint</p>
                <p className="text-sm text-neutral-900">300 kg CO₂e / ton</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-500">Certification</p>
                <p className="text-sm text-neutral-900">GRS verified</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-500">Verified by</p>
                <p className="text-sm text-neutral-900">EcoGlobe compliance</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Sales summary</h3>
          <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-neutral-500">Lifetime orders</span>
                <span className="font-bold text-neutral-900">42</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-neutral-500">Lifetime revenue</span>
                <span className="font-bold text-neutral-900">$168,400</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-neutral-500">Avg. order size</span>
                <span className="font-bold text-neutral-900">38 tons</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function DocumentsTab({ listing }: { listing: SellerListing }) {
  const docs = [
    { name: `Invoice_${listing.id}.pdf`, size: "212 KB" },
    { name: `SDS_${listing.id}.pdf`, size: "1.2 MB" },
    { name: `Carbon_Certificate_${listing.id}.pdf`, size: "640 KB" },
    { name: `Bill_of_Lading_${listing.id}.pdf`, size: "82 KB" },
  ];
  return (
    <div className="flex flex-col gap-3">
      {docs.map((doc) => (
        <div
          key={doc.name}
          className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ border: "1px solid #F0F0F0" }}
        >
          <div className="flex items-center gap-3">
            <FileText className="size-5 text-neutral-500" />
            <div>
              <p className="text-sm font-medium text-neutral-900">{doc.name}</p>
              <p className="text-xs text-neutral-500">{doc.size}</p>
            </div>
          </div>
          <button className="flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900">
            <Download className="size-4" />
            Download
          </button>
        </div>
      ))}
    </div>
  );
}

function ActivityTab() {
  const events = [
    { e: "Listing created", d: "2026-04-15 10:00 AM", a: true },
    { e: "Submitted for review", d: "2026-04-15 10:05 AM", a: true },
    { e: "Admin approved", d: "2026-04-16 09:00 AM", a: true },
    { e: "Published to marketplace", d: "2026-04-16 09:05 AM", a: true },
    { e: "First inquiry received", d: "2026-04-17 02:14 PM", a: true },
    { e: "First order placed", d: "", a: false },
  ];
  return (
    <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
      {events.map((item, i) => (
        <div key={item.e} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`size-3 rounded-full ${item.a ? "bg-green-500" : "bg-neutral-300"}`} />
            {i < events.length - 1 && (
              <div className={`w-0.5 flex-1 ${item.a && events[i + 1]?.a ? "bg-green-500" : "bg-neutral-200"}`} />
            )}
          </div>
          <div className="flex flex-1 items-center justify-between pb-5">
            <span className={`text-sm ${item.a ? "font-medium text-neutral-900" : "text-neutral-400"}`}>
              {item.e}
            </span>
            {item.d && <span className="text-xs text-neutral-500">{item.d}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
