"use client";

import Link from "next/link";
import { Lock, Unlock, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { AdminDetailPage, DetailCard, KeyValueGrid } from "./admin-detail-page";
import { formatEscrowMoney, getEscrowRecord } from "@/components/escrow/escrow-demo-data";

export function AdminEscrowDetailPage({ id }: { id: string }) {
  const escrow = getEscrowRecord(id);
  const isReleased = escrow.status === "Released";
  const isDisputed = escrow.status === "Disputed";

  return (
    <AdminDetailPage
      breadcrumbs={[
        { label: "Accounting", href: "/admin/accounting" },
        { label: "Escrow", href: "/admin/accounting/escrow" },
        { label: id },
      ]}
      title={`Escrow ${escrow.id}`}
      subtitle={
        <span className="inline-flex items-center gap-2">
          <span className="font-mono">{escrow.id}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: isReleased ? "#DCFCE7" : isDisputed ? "#FEF3C7" : "#EDE9FE", color: isReleased ? "#166534" : isDisputed ? "#92400E" : "#5B21B6" }}>
            <Lock className="size-3" />
            {escrow.status}
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
                { label: "Order", value: <Link href={`/admin/sales/${escrow.orderId}`} className="underline">{escrow.orderId}</Link> },
                { label: "Transaction", value: <Link href={`/admin/accounting/transactions/${escrow.transactionId}`} className="underline">{escrow.transactionId}</Link> },
                { label: "Buyer", value: <Link href="/admin/buyers/B-00184" className="underline">{escrow.buyer}</Link> },
                { label: "Seller", value: <Link href="/admin/sellers/S-00231" className="underline">{escrow.seller}</Link> },
                { label: "Product", value: escrow.product },
                { label: "Funded", value: escrow.fundedDate },
                { label: "Provider", value: escrow.provider },
                { label: "Provider ref", value: escrow.providerReference },
                { label: "Release condition", value: escrow.releaseTrigger },
                { label: "Automated release", value: escrow.automatedTrigger },
              ]}
            />
          </DetailCard>

          <DetailCard title="Release rules">
            <ul className="flex flex-col gap-3 text-sm text-neutral-700">
              {escrow.activity.map((event) => (
                <li key={event.label} className="flex items-center gap-2">
                  {event.complete ? <Check /> : <Pending />}
                  {event.label}
                  {event.date ? <span className="text-neutral-400">· {event.date}</span> : null}
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-800">
              Admin next step: {escrow.adminNextStep}
            </div>
            {escrow.disputeReason && (
              <div className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                Dispute reason: {escrow.disputeReason}
              </div>
            )}
          </DetailCard>
        </div>

        <aside className="flex flex-col gap-6">
          <DetailCard title="Amount">
            <p className="text-3xl font-bold text-neutral-900">{formatEscrowMoney(escrow.amount)}</p>
            <p className="mt-1 text-xs text-neutral-500">USD</p>
            <div className="mt-4">
              <KeyValueGrid
                items={[
                  { label: "Amount held", value: formatEscrowMoney(escrow.amountHeld) },
                  { label: "Seller payout", value: formatEscrowMoney(escrow.sellerPayout) },
                  { label: "Platform fee", value: formatEscrowMoney(escrow.platformFee) },
                  { label: "Inspection window", value: escrow.inspectionWindow },
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
