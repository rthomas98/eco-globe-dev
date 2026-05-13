"use client";

import { useState } from "react";
import { Button } from "@eco-globe/ui";
import { Check, X, Flag, FileText, Download } from "lucide-react";
import { AdminDetailPage, DetailCard, KeyValueGrid } from "./admin-detail-page";
import { ListingMap } from "../public/listing-map";

interface AdminListing {
  id: string;
  name: string;
  seller: string;
  category: string;
  price: string;
  available: string;
  status: "Pending" | "Approved" | "Rejected" | "Flagged";
  submitted: string;
  image: string;
  location: string;
}

const LISTING: AdminListing = {
  id: "EG-PROD-00023",
  name: "Wood Sawdust Industrial High Quality",
  seller: "EcoPack Co",
  category: "Biomass & Wood",
  price: "$400 / ton",
  available: "3,500 tons",
  status: "Pending",
  submitted: "2026-05-01 10:14 AM",
  image: "/products/wood-chips.png",
  location: "Baton Rouge, LA",
};

export function AdminListingDetailPage({ id }: { id: string }) {
  const listing: AdminListing = { ...LISTING, id };
  const [decision, setDecision] = useState<AdminListing["status"]>(listing.status);

  return (
    <AdminDetailPage
      breadcrumbs={[
        { label: "Listings", href: "/admin/listings" },
        { label: id },
      ]}
      title={listing.name}
      subtitle={
        <span className="inline-flex items-center gap-2">
          <span className="font-mono">{listing.id}</span>
          <span>·</span>
          <span>Submitted by {listing.seller}</span>
          <span>·</span>
          <ListingStatusBadge status={decision} />
        </span>
      }
      actions={
        <>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setDecision("Flagged")}
          >
            <Flag className="size-4" />
            Flag
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setDecision("Rejected")}
          >
            <X className="size-4" />
            Reject
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setDecision("Approved")}
          >
            <Check className="size-4" />
            Approve listing
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DetailCard title="Listing">
            <div className="flex gap-5">
              <div className="size-32 shrink-0 overflow-hidden rounded-xl">
                <img src={listing.image} alt="" className="size-full object-cover" />
              </div>
              <div className="flex-1">
                <KeyValueGrid
                  items={[
                    { label: "Category", value: listing.category },
                    { label: "Price", value: listing.price },
                    { label: "Available quantity", value: listing.available },
                    { label: "Location", value: listing.location },
                    { label: "Submitted", value: listing.submitted },
                    { label: "Seller", value: listing.seller },
                  ]}
                />
              </div>
            </div>
          </DetailCard>

          <DetailCard title="Description">
            <p className="text-sm leading-relaxed text-neutral-700">
              Verified industrial feedstock with documented composition, certified
              origin, and full chain-of-custody from facility to delivery. Buyers
              receive an SDS, an availability window, and the option to run a
              transportation footprint estimate before committing.
            </p>
          </DetailCard>

          <DetailCard title="Documents">
            <div className="flex flex-col gap-2">
              {[
                { name: `SDS_${listing.id}.pdf`, size: "1.2 MB" },
                { name: `GRS_Certificate_${listing.seller.replace(/\s/g, "_")}.pdf`, size: "640 KB" },
                { name: `Origin_Affidavit_${listing.id}.pdf`, size: "212 KB" },
              ].map((d) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between rounded-lg px-4 py-3"
                  style={{ border: "1px solid #F4F4F5" }}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="size-5 text-neutral-500" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{d.name}</p>
                      <p className="text-xs text-neutral-500">{d.size}</p>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900">
                    <Download className="size-4" />
                    Download
                  </button>
                </div>
              ))}
            </div>
          </DetailCard>

          <DetailCard title="Location">
            <div className="h-[280px] overflow-hidden rounded-xl">
              <ListingMap />
            </div>
          </DetailCard>
        </div>

        <aside className="flex flex-col gap-6">
          <DetailCard title="Moderation notes">
            <textarea
              rows={5}
              placeholder="Add notes for the seller or for internal records…"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
            />
            <Button variant="secondary" size="md" className="mt-3 w-full">
              Save note
            </Button>
          </DetailCard>

          <DetailCard title="Compliance">
            <div className="flex flex-col gap-3 text-sm">
              <ComplianceRow label="SDS provided" ok />
              <ComplianceRow label="Sustainability certification" ok />
              <ComplianceRow label="Chain of custody documented" ok />
              <ComplianceRow label="Origin affidavit signed" ok />
              <ComplianceRow label="Photos meet quality bar" />
            </div>
          </DetailCard>
        </aside>
      </div>
    </AdminDetailPage>
  );
}

function ComplianceRow({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-700">{label}</span>
      {ok ? (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "#DCFCE7", color: "#166534" }}>
          <Check className="size-3" />
          OK
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "#FEF3C7", color: "#92400E" }}>
          Review
        </span>
      )}
    </div>
  );
}

function ListingStatusBadge({ status }: { status: AdminListing["status"] }) {
  const tone: Record<AdminListing["status"], { bg: string; fg: string }> = {
    Pending: { bg: "#FEF3C7", fg: "#92400E" },
    Approved: { bg: "#DCFCE7", fg: "#166534" },
    Rejected: { bg: "#FEE2E2", fg: "#991B1B" },
    Flagged: { bg: "#FFEDD5", fg: "#C2410C" },
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
