"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, MapPin, Building2, Ban, Check, Star } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { AdminDetailPage, DetailCard, KeyValueGrid } from "./admin-detail-page";

const BUYER = {
  id: "B-00184",
  name: "AgriCorp Solutions",
  contact: "Joanna Bell",
  email: "joanna@agricorp.com",
  phone: "+1 (832) 555-0182",
  hq: "Houston, TX, USA",
  industry: "Carbon black manufacturing",
  founded: 2009,
  employees: "500 – 1,000",
  joinedAt: "2025-02-04",
  totalOrders: 28,
  lifetimeSpend: "$486,820",
  trustScore: 92,
  rating: 4.9,
};

type Tab = "overview" | "orders" | "addresses" | "activity";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "orders", label: "Orders" },
  { id: "addresses", label: "Addresses" },
  { id: "activity", label: "Activity" },
];

export function AdminBuyerDetailPage({ id }: { id: string }) {
  const buyer = { ...BUYER, id };
  const [tab, setTab] = useState<Tab>("overview");
  const [suspended, setSuspended] = useState(false);

  return (
    <AdminDetailPage
      breadcrumbs={[{ label: "Buyers", href: "/admin/buyers" }, { label: id }]}
      title={buyer.name}
      subtitle={
        <span className="inline-flex items-center gap-2">
          <span className="font-mono">{buyer.id}</span>
          <span>·</span>
          <span>Joined {buyer.joinedAt}</span>
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
            Message
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

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <DetailCard title="Company">
              <KeyValueGrid
                items={[
                  { label: "Industry", value: buyer.industry },
                  { label: "Founded", value: String(buyer.founded) },
                  { label: "Employees", value: buyer.employees },
                  { label: "Contact", value: buyer.contact },
                  { label: "Email", value: <a href={`mailto:${buyer.email}`} className="underline">{buyer.email}</a> },
                  { label: "Phone", value: <a href={`tel:${buyer.phone}`} className="underline">{buyer.phone}</a> },
                ]}
              />
            </DetailCard>
            <DetailCard title="Purchase activity">
              <KeyValueGrid
                items={[
                  { label: "Total orders", value: <strong>{buyer.totalOrders}</strong> },
                  { label: "Lifetime spend", value: <strong>{buyer.lifetimeSpend}</strong> },
                  { label: "Trust score", value: <strong>{buyer.trustScore} / 100</strong> },
                  { label: "Avg. rating", value: <strong>{buyer.rating}</strong> },
                ]}
              />
            </DetailCard>
          </div>
          <aside className="flex flex-col gap-6">
            <DetailCard title="Status">
              <div className="flex flex-col gap-3 text-sm text-neutral-700">
                <Row icon={Building2}>{buyer.name}</Row>
                <Row icon={MapPin}>{buyer.hq}</Row>
                <Row icon={Star}>{buyer.rating} avg seller rating</Row>
              </div>
            </DetailCard>
          </aside>
        </div>
      )}

      {tab === "orders" && (
        <DetailCard title={`Orders by ${buyer.id}`}>
          <div className="flex flex-col">
            {[
              { id: "EG-50021", product: "Pyrolysis Pitch", value: "$48,000", status: "In transit" },
              { id: "EG-50012", product: "Recycled Tire Crumb Rubber", value: "$18,000", status: "Delivered" },
              { id: "EG-50009", product: "Refined Used Cooking Oil", value: "$26,000", status: "Dispute" },
            ].map((o, i, arr) => (
              <Link
                key={o.id}
                href={`/admin/sales/${o.id}`}
                className="flex items-center justify-between px-2 py-3 hover:bg-neutral-50"
                style={{ borderBottom: i === arr.length - 1 ? undefined : "1px solid #F4F4F5" }}
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900">{o.product}</p>
                  <p className="mt-0.5 font-mono text-xs text-neutral-500">{o.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-neutral-900">{o.value}</span>
                  <span className="text-xs text-neutral-500">{o.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </DetailCard>
      )}

      {tab === "addresses" && (
        <DetailCard title="Saved addresses">
          <ul className="flex flex-col gap-3">
            <li className="rounded-lg px-4 py-3 text-sm text-neutral-700" style={{ border: "1px solid #F4F4F5" }}>
              270 Dairy Ashford Rd, Houston, TX 77079 · <span className="text-xs uppercase text-green-700 font-bold">Primary</span>
            </li>
            <li className="rounded-lg px-4 py-3 text-sm text-neutral-700" style={{ border: "1px solid #F4F4F5" }}>
              7777 Allen Parkway, Houston, TX 77019
            </li>
            <li className="rounded-lg px-4 py-3 text-sm text-neutral-700" style={{ border: "1px solid #F4F4F5" }}>
              5412 Huldy Street, Houston, TX 77019
            </li>
          </ul>
        </DetailCard>
      )}

      {tab === "activity" && (
        <DetailCard title="Recent activity">
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex justify-between"><span>Order placed EG-50021</span><span className="text-neutral-500">2026-05-01</span></li>
            <li className="flex justify-between"><span>RFQ submitted RFQ-30021</span><span className="text-neutral-500">2026-05-02</span></li>
            <li className="flex justify-between"><span>Payment method added</span><span className="text-neutral-500">2026-04-29</span></li>
            <li className="flex justify-between"><span>Account verified</span><span className="text-neutral-500">2025-02-04</span></li>
          </ul>
        </DetailCard>
      )}
    </AdminDetailPage>
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
