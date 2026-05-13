"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  FileText,
  Download,
  Truck,
  PackageCheck,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  Circle,
} from "lucide-react";
import { Button } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";

interface SaleDetail {
  id: string;
  status: "Quote requested" | "Confirmed" | "Ready for pickup" | "In transit" | "Delivered" | "Completed";
  buyer: { name: string; company: string; email: string; phone: string; address: string };
  product: { name: string; sku: string; image: string };
  qty: string;
  pricePerUnit: string;
  subtotal: string;
  shipping: string;
  total: string;
  shippingMethod: "Pickup" | "Delivery";
  shippingDate: string;
  carrier: string;
  trackingNumber?: string;
  escrowStatus: "Pending" | "Held" | "Released";
  events: Array<{ event: string; time: string; complete: boolean }>;
}

const FALLBACK: SaleDetail = {
  id: "TS98765",
  status: "In transit",
  buyer: {
    name: "Joanna Bell",
    company: "AgriCorp Solutions",
    email: "joanna@agricorp.com",
    phone: "+1 (832) 555-0182",
    address: "270 Dairy Ashford Rd, Houston, TX 77079",
  },
  product: {
    name: "Wood Sawdust Industrial High Quality",
    sku: "EG-PROD-00023",
    image: "/products/wood-chips.png",
  },
  qty: "32 tons",
  pricePerUnit: "$400 / ton",
  subtotal: "$12,800.00",
  shipping: "$640.00",
  total: "$13,440.00",
  shippingMethod: "Delivery",
  shippingDate: "2026-05-08",
  carrier: "Trinity Freight",
  trackingNumber: "TRF-9281-Z",
  escrowStatus: "Held",
  events: [
    { event: "Quote requested", time: "2026-04-28 10:00 AM", complete: true },
    { event: "Quote sent", time: "2026-04-28 02:14 PM", complete: true },
    { event: "Order confirmed", time: "2026-04-30 09:22 AM", complete: true },
    { event: "Funds in escrow", time: "2026-04-30 09:25 AM", complete: true },
    { event: "Picked up by carrier", time: "2026-05-02 08:00 AM", complete: true },
    { event: "In transit", time: "2026-05-03 06:30 AM", complete: true },
    { event: "Delivered", time: "", complete: false },
    { event: "Escrow released", time: "", complete: false },
  ],
};

export function SellerSaleDetailPage({ id }: { id: string }) {
  const sale: SaleDetail = { ...FALLBACK, id };

  return (
    <SellerLayout title="Sale detail">
      <div className="px-8 py-8">
        {/* Back + actions */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/seller/sales"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
          >
            <ArrowLeft className="size-4" />
            Back to sales
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md">
              <Mail className="size-4" />
              Message buyer
            </Button>
            <Button variant="primary" size="md">
              <Truck className="size-4" />
              Update tracking
            </Button>
          </div>
        </div>

        {/* Header */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-mono text-neutral-500">Order #{sale.id}</p>
            <h1 className="mt-1 text-3xl font-bold text-neutral-900">
              {sale.buyer.company}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
              <StatusBadge status={sale.status} />
              <span>·</span>
              <span>{sale.shippingMethod}</span>
              <span>·</span>
              <span>Shipping {sale.shippingDate}</span>
            </div>
          </div>
          <div className="rounded-xl bg-neutral-50 px-6 py-4 text-right">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Order total</p>
            <p className="text-2xl font-bold text-neutral-900">{sale.total}</p>
            <p className="text-xs text-neutral-500">Escrow {sale.escrowStatus.toLowerCase()}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Product line */}
            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Product</h2>
              <div className="flex items-center gap-4">
                <div className="size-20 shrink-0 overflow-hidden rounded-lg">
                  <img src={sale.product.image} alt={sale.product.name} className="size-full object-cover" />
                </div>
                <div className="flex-1">
                  <Link
                    href={`/seller/listings/${sale.product.sku}`}
                    className="text-sm font-semibold text-neutral-900 hover:underline"
                  >
                    {sale.product.name}
                  </Link>
                  <p className="mt-0.5 font-mono text-xs text-neutral-500">{sale.product.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-neutral-700">{sale.qty}</p>
                  <p className="text-sm text-neutral-500">{sale.pricePerUnit}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-2 text-sm" style={{ borderTop: "1px solid #F0F0F0" }}>
                <div className="flex items-center justify-between pt-4">
                  <span className="text-neutral-500">Subtotal</span>
                  <span className="text-neutral-900">{sale.subtotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Shipping</span>
                  <span className="text-neutral-900">{sale.shipping}</span>
                </div>
                <div className="flex items-center justify-between text-base font-bold">
                  <span className="text-neutral-900">Total</span>
                  <span className="text-neutral-900">{sale.total}</span>
                </div>
              </div>
            </section>

            {/* Tracking timeline */}
            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">Tracking timeline</h2>
                {sale.trackingNumber && (
                  <span className="font-mono text-xs text-neutral-500">{sale.carrier} · {sale.trackingNumber}</span>
                )}
              </div>
              <div className="flex flex-col">
                {sale.events.map((e, i) => (
                  <div key={e.event} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      {e.complete ? (
                        <CheckCircle className="size-5 shrink-0 text-green-600" />
                      ) : (
                        <Circle className="size-5 shrink-0 text-neutral-300" />
                      )}
                      {i < sale.events.length - 1 && (
                        <div
                          className={`w-0.5 flex-1 ${
                            e.complete && sale.events[i + 1]?.complete
                              ? "bg-green-500"
                              : "bg-neutral-200"
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex flex-1 items-center justify-between pb-5">
                      <span className={`text-sm ${e.complete ? "font-medium text-neutral-900" : "text-neutral-400"}`}>
                        {e.event}
                      </span>
                      {e.time && <span className="text-xs text-neutral-500">{e.time}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Documents */}
            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Documents</h2>
              <div className="flex flex-col gap-2">
                {[
                  { name: `Invoice_${sale.id}.pdf`, size: "212 KB" },
                  { name: `Bill_of_Lading_${sale.id}.pdf`, size: "82 KB" },
                  { name: `SDS_${sale.product.sku}.pdf`, size: "1.2 MB" },
                ].map((doc) => (
                  <div
                    key={doc.name}
                    className="flex items-center justify-between rounded-lg px-4 py-3"
                    style={{ border: "1px solid #F4F4F5" }}
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
            </section>
          </div>

          {/* Right rail */}
          <aside className="flex flex-col gap-6">
            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Buyer</h2>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-neutral-400" />
                  <span className="font-medium text-neutral-900">{sale.buyer.company}</span>
                </div>
                <div className="text-xs text-neutral-500">{sale.buyer.name}</div>
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-neutral-400" />
                  <a href={`mailto:${sale.buyer.email}`} className="text-sm text-neutral-700 hover:underline">
                    {sale.buyer.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-neutral-400" />
                  <a href={`tel:${sale.buyer.phone}`} className="text-sm text-neutral-700 hover:underline">
                    {sale.buyer.phone}
                  </a>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 text-neutral-400" />
                  <span className="text-sm text-neutral-700">{sale.buyer.address}</span>
                </div>
              </div>
            </section>

            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Escrow</h2>
              <div className="flex items-center gap-2">
                <PackageCheck className="size-5 text-green-600" />
                <span className="text-sm font-medium text-neutral-900">
                  Funds {sale.escrowStatus.toLowerCase()}
                </span>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Funds will release once delivery is confirmed and the buyer signs off.
              </p>
              <Link
                href="/seller/accounting/escrow"
                className="mt-3 inline-block text-sm font-medium text-neutral-900 underline"
              >
                View escrow account
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </SellerLayout>
  );
}

function StatusBadge({ status }: { status: SaleDetail["status"] }) {
  const tone: Record<SaleDetail["status"], { bg: string; fg: string }> = {
    "Quote requested": { bg: "#FEF3C7", fg: "#92400E" },
    Confirmed: { bg: "#DBEAFE", fg: "#1E40AF" },
    "Ready for pickup": { bg: "#E0F2FE", fg: "#075985" },
    "In transit": { bg: "#EDE9FE", fg: "#5B21B6" },
    Delivered: { bg: "#DCFCE7", fg: "#166534" },
    Completed: { bg: "#DCFCE7", fg: "#166534" },
  };
  const t = tone[status];
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: t.bg, color: t.fg }}
    >
      {status}
    </span>
  );
}
