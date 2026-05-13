"use client";

import Link from "next/link";
import { Lock, Unlock, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { AdminDetailPage, DetailCard, KeyValueGrid } from "./admin-detail-page";

export function AdminEscrowDetailPage({ id }: { id: string }) {
  return (
    <AdminDetailPage
      breadcrumbs={[
        { label: "Accounting", href: "/admin/accounting" },
        { label: "Escrow", href: "/admin/accounting/escrow" },
        { label: id },
      ]}
      title={`Escrow ${id}`}
      subtitle={
        <span className="inline-flex items-center gap-2">
          <span className="font-mono">{id}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "#EDE9FE", color: "#5B21B6" }}>
            <Lock className="size-3" />
            Held
          </span>
        </span>
      }
      actions={
        <>
          <Button variant="secondary" size="md">
            <RefreshCw className="size-4" />
            Refund buyer
          </Button>
          <Button variant="secondary" size="md">
            <AlertCircle className="size-4" />
            Hold pending review
          </Button>
          <Button variant="primary" size="md">
            <Unlock className="size-4" />
            Release to seller
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DetailCard title="Escrow">
            <KeyValueGrid
              items={[
                { label: "Order", value: <Link href={`/admin/sales/${id.replace("ESC-", "EG-")}`} className="underline">EG-{id.replace("ESC-", "")}</Link> },
                { label: "Transaction", value: <Link href={`/admin/accounting/transactions/TX-${id.replace("ESC-", "")}`} className="underline">TX-{id.replace("ESC-", "")}</Link> },
                { label: "Buyer", value: <Link href="/admin/buyers/B-00184" className="underline">AgriCorp Solutions</Link> },
                { label: "Seller", value: <Link href="/admin/sellers/S-00231" className="underline">EcoPack Co.</Link> },
                { label: "Funded", value: "2026-04-30 09:25 AM" },
                { label: "Release condition", value: "Delivery confirmed by buyer + 48h hold" },
              ]}
            />
          </DetailCard>

          <DetailCard title="Release rules">
            <ul className="flex flex-col gap-3 text-sm text-neutral-700">
              <li className="flex items-center gap-2"><Check /> Funds verified and held in segregated escrow account</li>
              <li className="flex items-center gap-2"><Check /> Carrier confirmed pickup</li>
              <li className="flex items-center gap-2"><Pending /> Delivery confirmation from buyer</li>
              <li className="flex items-center gap-2"><Pending /> 48-hour acceptance window</li>
              <li className="flex items-center gap-2"><Pending /> Release funds to seller minus platform fee</li>
            </ul>
          </DetailCard>
        </div>

        <aside className="flex flex-col gap-6">
          <DetailCard title="Amount">
            <p className="text-3xl font-bold text-neutral-900">$13,440.00</p>
            <p className="mt-1 text-xs text-neutral-500">USD</p>
            <div className="mt-4">
              <KeyValueGrid
                items={[
                  { label: "Seller payout", value: "$13,171.20" },
                  { label: "Platform fee", value: "$268.80" },
                ]}
              />
            </div>
          </DetailCard>
        </aside>
      </div>
    </AdminDetailPage>
  );
}

function Check() {
  return (
    <span className="inline-flex size-4 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-700">
      ✓
    </span>
  );
}

function Pending() {
  return (
    <span className="inline-flex size-4 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-400">
      ·
    </span>
  );
}
