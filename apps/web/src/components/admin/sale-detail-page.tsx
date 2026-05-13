"use client";

import Link from "next/link";
import {
  Mail,
  AlertCircle,
  Truck,
  CheckCircle,
  Circle,
  FileText,
  Download,
} from "lucide-react";
import { Button } from "@eco-globe/ui";
import { AdminDetailPage, DetailCard, KeyValueGrid } from "./admin-detail-page";

export function AdminSaleDetailPage({ id }: { id: string }) {
  return (
    <AdminDetailPage
      breadcrumbs={[{ label: "Sales", href: "/admin/sales" }, { label: id }]}
      title={`Order ${id}`}
      subtitle={
        <span className="inline-flex items-center gap-2">
          <span className="font-mono">{id}</span>
          <span>·</span>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "#EDE9FE", color: "#5B21B6" }}>
            In transit
          </span>
        </span>
      }
      actions={
        <>
          <Button variant="secondary" size="md">
            <Mail className="size-4" />
            Message parties
          </Button>
          <Button variant="secondary" size="md">
            <AlertCircle className="size-4" />
            Open dispute
          </Button>
          <Button variant="primary" size="md">
            <Truck className="size-4" />
            Override tracking
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DetailCard title="Order">
            <KeyValueGrid
              items={[
                { label: "Buyer", value: <Link href="/admin/buyers/B-00184" className="underline">AgriCorp Solutions</Link> },
                { label: "Seller", value: <Link href="/admin/sellers/S-00231" className="underline">EcoPack Co.</Link> },
                { label: "Product", value: <Link href="/admin/listings/EG-PROD-00023" className="underline">Wood Sawdust Industrial High Quality</Link> },
                { label: "Quantity", value: "32 tons" },
                { label: "Unit price", value: "$400 / ton" },
                { label: "Order total", value: <strong>$13,440.00</strong> },
                { label: "Placed", value: "2026-04-30 09:22 AM" },
                { label: "Shipping", value: "Delivery · 2026-05-08" },
              ]}
            />
          </DetailCard>

          <DetailCard title="Lifecycle">
            <div className="flex flex-col">
              {[
                { event: "Quote requested", time: "2026-04-28 10:00 AM", complete: true },
                { event: "Quote sent", time: "2026-04-28 02:14 PM", complete: true },
                { event: "Order confirmed", time: "2026-04-30 09:22 AM", complete: true },
                { event: "Funds held in escrow", time: "2026-04-30 09:25 AM", complete: true },
                { event: "Picked up by carrier", time: "2026-05-02 08:00 AM", complete: true },
                { event: "In transit", time: "2026-05-03 06:30 AM", complete: true },
                { event: "Delivered", time: "", complete: false },
                { event: "Escrow released", time: "", complete: false },
              ].map((e, i, arr) => (
                <div key={e.event} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    {e.complete ? (
                      <CheckCircle className="size-5 shrink-0 text-green-600" />
                    ) : (
                      <Circle className="size-5 shrink-0 text-neutral-300" />
                    )}
                    {i < arr.length - 1 && (
                      <div className={`w-0.5 flex-1 ${e.complete && arr[i + 1]?.complete ? "bg-green-500" : "bg-neutral-200"}`} />
                    )}
                  </div>
                  <div className="flex flex-1 items-center justify-between pb-5">
                    <span className={`text-sm ${e.complete ? "font-medium text-neutral-900" : "text-neutral-400"}`}>{e.event}</span>
                    {e.time && <span className="text-xs text-neutral-500">{e.time}</span>}
                  </div>
                </div>
              ))}
            </div>
          </DetailCard>

          <DetailCard title="Documents">
            {[
              { name: `Invoice_${id}.pdf`, size: "212 KB" },
              { name: `Bill_of_Lading_${id}.pdf`, size: "82 KB" },
              { name: `SDS_EG-PROD-00023.pdf`, size: "1.2 MB" },
            ].map((d) => (
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
          </DetailCard>
        </div>

        <aside className="flex flex-col gap-6">
          <DetailCard title="Financial">
            <KeyValueGrid
              items={[
                { label: "Subtotal", value: "$12,800.00" },
                { label: "Shipping", value: "$640.00" },
                { label: "Platform fee", value: "$268.80" },
                { label: "Total", value: <strong>$13,440.00</strong> },
                { label: "Escrow", value: <Link href="/admin/accounting/escrow/ESC-50021" className="underline">Held — ESC-50021</Link> },
                { label: "Transaction", value: <Link href="/admin/accounting/transactions/TX-50021" className="underline">TX-50021</Link> },
              ]}
            />
          </DetailCard>
        </aside>
      </div>
    </AdminDetailPage>
  );
}
