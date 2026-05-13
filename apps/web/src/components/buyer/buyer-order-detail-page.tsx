"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@eco-globe/ui";
import { BuyerLayout } from "./buyer-layout";
import { BuyerOrderDetailPanel } from "./buyer-order-detail-panel";
import { buildOrderDetail, orders, type Order } from "./buyer-orders-page";

export function BuyerOrderDetailPage({ id }: { id: string }) {
  const router = useRouter();
  // Try to match by either the row id (e.g. "2") or the formatted orderId (e.g. "OD20411").
  const order: Order | undefined = orders.find(
    (o) => o.id === id || o.orderId.toLowerCase() === id.toLowerCase(),
  );

  if (!order) {
    return (
      <BuyerLayout>
        <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
          <p className="text-lg font-bold text-neutral-900">Order not found</p>
          <p className="mt-2 text-sm text-neutral-500">
            We couldn&apos;t find an order with id{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5">{id}</code>.
          </p>
          <Link href="/buyer/orders" className="mt-6">
            <Button variant="primary" size="md">
              Back to my orders
            </Button>
          </Link>
        </div>
      </BuyerLayout>
    );
  }

  // The panel is a fixed-position drawer that takes over the viewport.
  // Closing it routes back to the orders index.
  return (
    <BuyerOrderDetailPanel
      order={buildOrderDetail(order)}
      onClose={() => router.push("/buyer/orders")}
    />
  );
}
