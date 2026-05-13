"use client";

import Link from "next/link";
import { Receipt, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { AdminDetailPage, DetailCard, KeyValueGrid } from "./admin-detail-page";

export function AdminTransactionDetailPage({ id }: { id: string }) {
  return (
    <AdminDetailPage
      breadcrumbs={[
        { label: "Accounting", href: "/admin/accounting" },
        { label: "Transactions", href: "/admin/accounting/transactions" },
        { label: id },
      ]}
      title={`Transaction ${id}`}
      subtitle={
        <span className="inline-flex items-center gap-2">
          <span className="font-mono">{id}</span>
          <span>·</span>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "#EDE9FE", color: "#5B21B6" }}>
            In escrow
          </span>
        </span>
      }
      actions={
        <>
          <Button variant="secondary" size="md">
            <RefreshCw className="size-4" />
            Issue refund
          </Button>
          <Button variant="secondary" size="md">
            <AlertCircle className="size-4" />
            Flag transaction
          </Button>
          <Button variant="primary" size="md">
            <Receipt className="size-4" />
            Download invoice
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DetailCard title="Transaction">
            <KeyValueGrid
              items={[
                { label: "Order", value: <Link href={`/admin/sales/${id.replace("TX-", "EG-")}`} className="underline">EG-{id.replace("TX-", "")}</Link> },
                { label: "Buyer", value: <Link href="/admin/buyers/B-00184" className="underline">AgriCorp Solutions</Link> },
                { label: "Seller", value: <Link href="/admin/sellers/S-00231" className="underline">EcoPack Co.</Link> },
                { label: "Type", value: "Marketplace purchase" },
                { label: "Initiated", value: "2026-04-30 09:25 AM" },
                { label: "Settled", value: "Pending delivery confirmation" },
              ]}
            />
          </DetailCard>

          <DetailCard title="Ledger">
            <table className="w-full text-sm">
              <thead style={{ borderBottom: "1px solid #F0F0F0" }}>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="py-2">Entry</th>
                  <th className="py-2">Date</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { entry: "Buyer charge (Visa ····4242)", date: "2026-04-30 09:25 AM", amount: "$13,440.00" },
                  { entry: "Held in escrow", date: "2026-04-30 09:25 AM", amount: "−$13,440.00" },
                  { entry: "Platform fee accrued", date: "2026-04-30 09:25 AM", amount: "$268.80" },
                ].map((r, i, arr) => (
                  <tr key={i} style={{ borderBottom: i === arr.length - 1 ? undefined : "1px solid #F4F4F5" }}>
                    <td className="py-3 text-neutral-900">{r.entry}</td>
                    <td className="py-3 text-neutral-500">{r.date}</td>
                    <td className="py-3 text-right font-medium text-neutral-900">{r.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DetailCard>
        </div>

        <aside className="flex flex-col gap-6">
          <DetailCard title="Summary">
            <KeyValueGrid
              items={[
                { label: "Subtotal", value: "$12,800.00" },
                { label: "Shipping", value: "$640.00" },
                { label: "Platform fee", value: "$268.80" },
                { label: "Total", value: <strong>$13,440.00</strong> },
                { label: "Currency", value: "USD" },
              ]}
            />
          </DetailCard>
        </aside>
      </div>
    </AdminDetailPage>
  );
}
