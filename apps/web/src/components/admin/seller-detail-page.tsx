"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Mail,
  MapPin,
  Check,
  Ban,
  Globe,
  FileText,
  Download,
  Star,
} from "lucide-react";
import { Button } from "@eco-globe/ui";
import { AdminDetailPage, DetailCard, KeyValueGrid } from "./admin-detail-page";

const SELLER = {
  id: "S-00231",
  name: "EcoPack Co.",
  contact: "Maria Hernandez",
  email: "maria@ecopack.com",
  phone: "+1 (504) 555-0114",
  hq: "Baton Rouge, LA, USA",
  industry: "Recycled packaging",
  founded: 2018,
  employees: "50 – 200",
  website: "ecopack.com",
  kycStatus: "Verified" as "Verified" | "In review" | "Rejected" | "Expired",
  joinedAt: "2024-08-12",
  rating: 4.7,
  totalListings: 12,
  activeListings: 9,
  lifetimeRevenue: "$1,284,300",
  trustScore: 88,
};

type Tab = "overview" | "listings" | "documents" | "activity";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "listings", label: "Listings" },
  { id: "documents", label: "Documents" },
  { id: "activity", label: "Activity" },
];

export function AdminSellerDetailPage({ id }: { id: string }) {
  const seller = { ...SELLER, id };
  const [tab, setTab] = useState<Tab>("overview");
  const [suspended, setSuspended] = useState(false);

  return (
    <AdminDetailPage
      breadcrumbs={[{ label: "Sellers", href: "/admin/sellers" }, { label: id }]}
      title={seller.name}
      subtitle={
        <span className="inline-flex items-center gap-2">
          <span className="font-mono">{seller.id}</span>
          <span>·</span>
          <KycBadge status={seller.kycStatus} />
          {suspended && (
            <>
              <span>·</span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "#FEE2E2", color: "#991B1B" }}>
                Suspended
              </span>
            </>
          )}
        </span>
      }
      actions={
        <>
          <Button variant="secondary" size="md">
            <Mail className="size-4" />
            Message seller
          </Button>
          {!suspended ? (
            <Button variant="secondary" size="md" onClick={() => setSuspended(true)}>
              <Ban className="size-4" />
              Suspend
            </Button>
          ) : (
            <Button variant="primary" size="md" onClick={() => setSuspended(false)}>
              <Check className="size-4" />
              Reinstate
            </Button>
          )}
        </>
      }
    >
      <div className="mb-6 flex gap-6" style={{ borderBottom: "1px solid #F0F0F0" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px pb-3 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-400 hover:text-neutral-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview seller={seller} />}
      {tab === "listings" && <Listings sellerId={seller.id} />}
      {tab === "documents" && <Documents />}
      {tab === "activity" && <Activity />}
    </AdminDetailPage>
  );
}

function Overview({ seller }: { seller: typeof SELLER }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <DetailCard title="Company">
          <KeyValueGrid
            items={[
              { label: "Industry", value: seller.industry },
              { label: "Founded", value: String(seller.founded) },
              { label: "Employees", value: seller.employees },
              { label: "Website", value: <a href="#" className="underline">{seller.website}</a> },
              { label: "Contact", value: seller.contact },
              { label: "Email", value: <a href={`mailto:${seller.email}`} className="underline">{seller.email}</a> },
              { label: "Phone", value: <a href={`tel:${seller.phone}`} className="underline">{seller.phone}</a> },
              { label: "HQ", value: seller.hq },
            ]}
          />
        </DetailCard>

        <DetailCard title="Performance">
          <KeyValueGrid
            items={[
              { label: "Total listings", value: <strong>{seller.totalListings}</strong> },
              { label: "Active listings", value: <strong>{seller.activeListings}</strong> },
              { label: "Lifetime revenue", value: <strong>{seller.lifetimeRevenue}</strong> },
              { label: "Trust score", value: <strong>{seller.trustScore} / 100</strong> },
            ]}
          />
        </DetailCard>
      </div>

      <aside className="flex flex-col gap-6">
        <DetailCard title="Status">
          <div className="flex flex-col gap-3 text-sm">
            <Row icon={Building2}>{seller.name}</Row>
            <Row icon={MapPin}>{seller.hq}</Row>
            <Row icon={Globe}>{seller.website}</Row>
            <Row icon={Star}>{seller.rating} avg buyer rating</Row>
          </div>
          <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700">
            Joined {seller.joinedAt} · KYC last verified {seller.joinedAt}
          </div>
        </DetailCard>
      </aside>
    </div>
  );
}

function Listings({ sellerId }: { sellerId: string }) {
  const rows = [
    { id: "EG-PROD-00023", name: "Wood Sawdust Industrial High Quality", status: "Approved" },
    { id: "EG-PROD-00024", name: "Household Cleaning Tools & Accessories Wood Chips", status: "Pending" },
    { id: "EG-PROD-00029", name: "Granules Polypropylene Factory Plastic Raw Material Pellets", status: "Approved" },
  ];
  return (
    <DetailCard title={`Listings by ${sellerId}`}>
      <div className="flex flex-col">
        {rows.map((r, i) => (
          <Link
            key={r.id}
            href={`/admin/listings/${r.id}`}
            className="flex items-center justify-between px-2 py-3 hover:bg-neutral-50"
            style={{ borderBottom: i === rows.length - 1 ? undefined : "1px solid #F4F4F5" }}
          >
            <div>
              <p className="text-sm font-medium text-neutral-900">{r.name}</p>
              <p className="mt-0.5 font-mono text-xs text-neutral-500">{r.id}</p>
            </div>
            <span className="text-xs text-neutral-500">{r.status}</span>
          </Link>
        ))}
      </div>
    </DetailCard>
  );
}

function Documents() {
  const docs = [
    { name: "Articles_of_Incorporation.pdf", size: "1.4 MB" },
    { name: "EIN_Letter.pdf", size: "212 KB" },
    { name: "GRS_Certificate.pdf", size: "640 KB" },
    { name: "Insurance_Certificate.pdf", size: "880 KB" },
  ];
  return (
    <DetailCard title="KYC & compliance documents">
      <div className="flex flex-col gap-2">
        {docs.map((d) => (
          <div key={d.name} className="flex items-center justify-between rounded-lg px-4 py-3" style={{ border: "1px solid #F4F4F5" }}>
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
  );
}

function Activity() {
  const events = [
    { event: "Listing approved: EG-PROD-00023", time: "2026-05-02 09:15 AM" },
    { event: "KYC documents uploaded", time: "2026-04-28 02:00 PM" },
    { event: "Listing submitted: EG-PROD-00024", time: "2026-04-26 11:42 AM" },
    { event: "Bank account verified", time: "2026-04-20 08:30 AM" },
    { event: "Account created", time: "2024-08-12 10:00 AM" },
  ];
  return (
    <DetailCard title="Recent activity">
      <ul className="flex flex-col gap-3">
        {events.map((e, i) => (
          <li key={i} className="flex justify-between text-sm">
            <span className="text-neutral-900">{e.event}</span>
            <span className="text-neutral-500">{e.time}</span>
          </li>
        ))}
      </ul>
    </DetailCard>
  );
}

function Row({ icon: Icon, children }: { icon: typeof Building2; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-neutral-700">
      <Icon className="size-4 text-neutral-400" />
      <span>{children}</span>
    </div>
  );
}

function KycBadge({ status }: { status: typeof SELLER["kycStatus"] }) {
  const tone: Record<typeof SELLER["kycStatus"], { bg: string; fg: string }> = {
    Verified: { bg: "#DCFCE7", fg: "#166534" },
    "In review": { bg: "#FEF3C7", fg: "#92400E" },
    Rejected: { bg: "#FEE2E2", fg: "#991B1B" },
    Expired: { bg: "#F1F5F9", fg: "#475569" },
  };
  const t = tone[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: t.bg, color: t.fg }}
    >
      KYC {status}
    </span>
  );
}
