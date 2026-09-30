"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  LogisticsWorkspace,
  parseOrderReference,
} from "@/components/logistics/logistics-workspace";
import { OrderRefundSection } from "@/components/refunds/order-refund-section";
import { SellerLayout } from "./seller-layout";

/**
 * Seller sale detail. Shows only the persisted logistics record for the
 * requested order; there is no fallback sale data.
 */
export function SellerSaleDetailPage({ id }: { id: string }) {
  const orderId = parseOrderReference(id);

  return (
    <SellerLayout title="Sale detail">
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/seller/sales"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to sales
          </Link>
          <Link href="/seller/logistics" className="text-sm font-semibold text-neutral-700 underline">
            All logistics
          </Link>
        </div>
        <h1 className="mb-6 text-3xl font-bold text-neutral-900">
          Sale {orderId ? `EG-${orderId}` : id}
        </h1>
        {orderId ? (
          <div className="flex flex-col gap-6">
            <LogisticsWorkspace portal="seller" orderId={orderId} />
            <OrderRefundSection orderId={orderId} role="seller" />
          </div>
        ) : (
          <div role="status" className="rounded-2xl bg-white p-6 text-sm" style={{ border: "1px solid #F0F0F0" }}>
            <p className="font-semibold text-neutral-900">Sale unavailable.</p>
            <p className="mt-1 text-neutral-600">
              &ldquo;{id}&rdquo; is not a valid order reference. Open the sale from your sales list.
            </p>
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
