"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@eco-globe/ui";
import { fetchOrders } from "@/lib/api-orders";
import { useDemoUser } from "@/lib/demo-user";
import { ErrorState, LoadingState, useBackendData } from "@/components/shared/data-state";
import { BuyerLayout } from "./buyer-layout";
import { BuyerOrderDetailPanel } from "./buyer-order-detail-panel";
import { buildOrderDetail, mapApiOrderToBuyerRow } from "./buyer-orders-page";

/** Accepts the saved order id as "12", "EG-12" or "api-12"; anything else is not an order reference. */
export function parseBuyerOrderRouteId(id: string): number | null {
  let raw: string;
  try {
    raw = decodeURIComponent(id).trim();
  } catch {
    return null;
  }
  const match = /^(?:EG-|api-)?(\d+)$/i.exec(raw);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isSafeInteger(value) && value > 0 && String(value) === match[1] ? value : null;
}

/**
 * Direct link to one buyer order. The order is read from the same backend
 * list as My Orders, scoped to the active buyer company, and mapped the same
 * way; an id outside that scope renders "not found", never a sample order.
 */
export function BuyerOrderDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const user = useDemoUser();
  const orderId = parseBuyerOrderRouteId(id);
  const companyId = user?.activeCompanyId ?? null;

  const state = useBackendData(
    async () => {
      if (orderId === null || companyId === null) return null;
      const orders = await fetchOrders({ buyerCompanyId: companyId });
      const match = orders.find((order) => order.id === orderId);
      return { order: match ? mapApiOrderToBuyerRow(match) : null };
    },
    [orderId, companyId],
    "This order could not be loaded.",
  );

  if (orderId === null) return <NotFound id={id} />;
  if (user && companyId === null) {
    return (
      <BuyerLayout>
        <ErrorState message="Select an active buyer company to view this order." />
      </BuyerLayout>
    );
  }
  if (!user || (state.status === "loading" && state.data === null)) {
    return (
      <BuyerLayout>
        <LoadingState label="Loading order…" />
      </BuyerLayout>
    );
  }
  if (state.status === "error") {
    return (
      <BuyerLayout>
        <ErrorState message={state.error ?? "This order could not be loaded."} onRetry={state.reload} />
      </BuyerLayout>
    );
  }
  const order = state.data?.order;
  if (!order) return <NotFound id={id} />;

  // The panel is a fixed-position drawer that takes over the viewport.
  // Closing it routes back to the orders index.
  return (
    <BuyerOrderDetailPanel
      order={buildOrderDetail(order)}
      onClose={() => router.push("/buyer/orders")}
      onOrderChanged={state.reload}
    />
  );
}

function NotFound({ id }: { id: string }) {
  return (
    <BuyerLayout>
      <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
        <p className="text-lg font-bold text-neutral-900">Order not found</p>
        <p className="mt-2 text-sm text-neutral-500">
          We couldn&apos;t find an order{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5">{id}</code> for your company.
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
