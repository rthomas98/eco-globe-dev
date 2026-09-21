"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@eco-globe/ui";
import {
  fetchShipments,
  updateShipment,
  type ApiShipment,
} from "@/lib/api-fulfilment";
import {
  fetchOrderById,
  fetchEscrows,
  fetchPayments,
  trailingNumericId,
  type ApiEscrowRecord,
  type ApiPayment,
} from "@/lib/api-portal";
import { AdminDetailPage, DetailCard, KeyValueGrid } from "./admin-detail-page";

interface OrderDetail {
  order: Awaited<ReturnType<typeof fetchOrderById>>;
  shipments: ApiShipment[];
  escrows: ApiEscrowRecord[];
  payments: ApiPayment[];
}

export function AdminSaleDetailPage({ id }: { id: string }) {
  const [data, setData] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    const orderId = trailingNumericId(id);
    if (!orderId) {
      setError("Invalid order reference.");
      return;
    }
    Promise.all([
      fetchOrderById(orderId),
      fetchShipments(orderId),
      fetchEscrows(),
      fetchPayments(),
    ])
      .then(([order, shipments, escrows, payments]) => {
        if (active)
          setData({
            order,
            shipments,
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
  const overrideTracking = async (shipment: ApiShipment) => {
    const trackingNumber = window.prompt(
      "Override tracking number:",
      shipment.trackingNumber ?? "",
    );
    if (!trackingNumber?.trim()) return;
    setSaving(true);
    try {
      await updateShipment(shipment.id, {
        trackingNumber: trackingNumber.trim(),
      });
      setRevision((n) => n + 1);
    } catch (reason) {
      window.alert(
        reason instanceof Error ? reason.message : "Tracking update failed.",
      );
    } finally {
      setSaving(false);
    }
  };
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
            <DetailCard title="Shipments">
              {data.shipments.length ? (
                data.shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="space-y-3 border-b py-3 last:border-0"
                  >
                    <p>
                      Shipment {shipment.id} · {shipment.shipmentStatusName}
                    </p>
                    <p>
                      {shipment.carrierName ?? "Carrier not assigned"} ·{" "}
                      {shipment.trackingNumber ?? "Tracking not recorded"}
                    </p>
                    <p>
                      Carrier cost:{" "}
                      {shipment.shippingCost == null
                        ? "Not recorded"
                        : money(shipment.shippingCost)}
                    </p>
                    <Button
                      disabled={saving}
                      onClick={() => void overrideTracking(shipment)}
                    >
                      Override tracking for shipment {shipment.id}
                    </Button>
                  </div>
                ))
              ) : (
                <p>No shipment has been recorded for this order.</p>
              )}
            </DetailCard>
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
