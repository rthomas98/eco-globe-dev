"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@eco-globe/ui";
import { LogisticsWorkspace } from "@/components/logistics/logistics-workspace";
import {
  fetchOrderById,
  fetchEscrows,
  fetchPayments,
  trailingNumericId,
  type ApiEscrowRecord,
  type ApiPayment,
} from "@/lib/api-portal";
import { OrderRefundSection } from "@/components/refunds/order-refund-section";
import { AdminDetailPage, DetailCard, KeyValueGrid } from "./admin-detail-page";

interface OrderDetail {
  order: Awaited<ReturnType<typeof fetchOrderById>>;
  escrows: ApiEscrowRecord[];
  payments: ApiPayment[];
}

export function AdminSaleDetailPage({ id }: { id: string }) {
  const [data, setData] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    const orderId = trailingNumericId(id);
    if (!orderId) {
      setError("Invalid order reference.");
      return;
    }
    Promise.all([fetchOrderById(orderId), fetchEscrows(), fetchPayments()])
      .then(([order, escrows, payments]) => {
        if (active)
          setData({
            order,
            escrows: escrows.filter((item) => item.orderId === orderId),
            payments: payments.filter((item) => item.orderId === orderId),
          });
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load this order.",
          );
      });
    return () => {
      active = false;
    };
  }, [id, revision]);
  const order = data?.order;
  const routeOrderId = trailingNumericId(id);
  const value = (key: string) =>
    order?.[key] == null ? "Not recorded" : String(order[key]);
  const money = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(order?.currencyCode ?? "USD"),
    }).format(amount);
  const date = (input: string) => new Date(input).toLocaleString();
  const total = Number(order?.totalAmount ?? 0);
  const credit = Number(order?.sampleShippingCreditCents ?? 0) / 100;
  const subtotal = total + credit;
  const checkout = order?.creationSourceCode === "listing_checkout";
  const quantity = Number(order?.quantity ?? 0);
  return (
    <AdminDetailPage
      breadcrumbs={[{ label: "Sales", href: "/admin/sales" }, { label: id }]}
      title={`Order ${id}`}
      subtitle={order ? value("orderStatusName") : undefined}
    >
      {error ? (
        <div role="alert" className="rounded-xl bg-amber-50 p-5">
          {error}{" "}
          <Button onClick={() => setRevision((n) => n + 1)}>Retry</Button>
        </div>
      ) : !data ? (
        <p role="status">Loading saved order…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <DetailCard title="Order">
              <KeyValueGrid
                items={[
                  {
                    label: "Buyer",
                    value: (
                      <Link
                        className="underline"
                        href={`/admin/buyers/${value("buyerCompanyId")}`}
                      >
                        {value("buyerCompanyName")}
                      </Link>
                    ),
                  },
                  {
                    label: "Seller",
                    value: (
                      <Link
                        className="underline"
                        href={`/admin/sellers/${value("sellerCompanyId")}`}
                      >
                        {value("sellerCompanyName")}
                      </Link>
                    ),
                  },
                  {
                    label: "Product",
                    value: order?.listingId ? (
                      <Link
                        className="underline"
                        href={`/admin/listings/${value("listingId")}`}
                      >
                        {value("listingTitle")}
                      </Link>
                    ) : (
                      "Not linked"
                    ),
                  },
                  {
                    label: "Quantity",
                    value:
                      order?.quantity == null
                        ? "Not recorded"
                        : `${quantity} ${value("quantityUnit")}`,
                  },
                  { label: "Placed", value: date(value("createdAt")) },
                  { label: "Last updated", value: date(value("updatedAt")) },
                  { label: "Delivery method", value: value("deliveryMethod") },
                  {
                    label: "Delivery address",
                    value: value("deliveryAddress"),
                  },
                ]}
              />
            </DetailCard>
            <DetailCard title="Logistics">
              {routeOrderId && (
                <LogisticsWorkspace portal="admin" orderId={routeOrderId} />
              )}
            </DetailCard>
            {routeOrderId && (
              <OrderRefundSection orderId={routeOrderId} role="admin" />
            )}
            <DetailCard title="Documents">
              <p className="mb-3 text-sm text-neutral-500">
                Review saved documents in the document center. No invoice or
                bill of lading is generated by this summary.
              </p>
              <Link className="underline" href="/admin/documents">
                Open documents
              </Link>
            </DetailCard>
          </div>
          <aside className="space-y-6">
            <DetailCard title="Financial">
              <KeyValueGrid
                items={[
                  ...(checkout
                    ? [{ label: "Material subtotal", value: money(subtotal) }]
                    : []),
                  {
                    label: "Shipping in order total",
                    value: "Not separately recorded",
                  },
                  { label: "Platform fee", value: "Not separately recorded" },
                  ...(credit > 0
                    ? [
                        {
                          label: "Sample shipping credit",
                          value: `−${money(credit)}`,
                        },
                      ]
                    : []),
                  {
                    label: "Saved order total",
                    value: <strong>{money(total)}</strong>,
                  },
                ]}
              />
              <p className="mt-4 text-sm text-neutral-500">
                {checkout && quantity > 0
                  ? `${quantity} ${value("quantityUnit")} × ${money(subtotal / quantity)} per ${value("quantityUnit")} = ${money(subtotal)} before credits. The unit amount is derived from the saved order, not today's listing price. `
                  : "This is the total recorded when the order was created. "}
                Shipping costs shown on shipments are not added again. No
                separate platform fee is recorded on this order.
              </p>
            </DetailCard>
            <DetailCard title="Escrow">
              {data.escrows.length ? (
                data.escrows.map((escrow) => (
                  <p key={escrow.id}>
                    <Link
                      className="underline"
                      href={`/admin/accounting/escrow/ESC-${escrow.id}`}
                    >
                      ESC-{escrow.id} · {escrow.escrowStatusCode} ·{" "}
                      {money(escrow.amount)}
                    </Link>
                  </p>
                ))
              ) : (
                <p>No escrow recorded.</p>
              )}
            </DetailCard>
            <DetailCard title="Payments">
              {data.payments.length ? (
                data.payments.map((payment) => (
                  <p key={payment.id}>
                    <Link
                      className="underline"
                      href={`/admin/accounting/payments/TX-${payment.id}`}
                    >
                      TX-{payment.id} · {payment.paymentStatusCode} ·{" "}
                      {money(payment.amount)}
                    </Link>
                  </p>
                ))
              ) : (
                <p>No payments recorded.</p>
              )}
            </DetailCard>
          </aside>
        </div>
      )}
    </AdminDetailPage>
  );
}
