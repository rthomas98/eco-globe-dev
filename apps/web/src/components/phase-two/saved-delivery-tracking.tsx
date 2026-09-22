"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchOrders, type ApiOrder } from "@/lib/api-orders";
import {
  fetchShipments,
  updateShipment,
  type ApiShipment,
} from "@/lib/api-fulfilment";
const button = "rounded-full border px-5 py-2 text-sm disabled:opacity-50";
export function SavedDeliveryTracking({
  role,
}: {
  role: "buyer" | "seller" | "admin";
}) {
  const [shipments, setShipments] = useState<ApiShipment[]>([]),
    [orders, setOrders] = useState<ApiOrder[]>([]),
    [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [shipping, sales] = await Promise.all([
        fetchShipments(),
        fetchOrders(),
      ]);
      setShipments(shipping);
      setOrders(sales);
      setSelected((id) => id ?? shipping[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load shipments.");
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const shipment = shipments.find((s) => s.id === selected),
    order = orders.find((o) => o.id === shipment?.orderId);
  async function confirm() {
    if (!shipment) return;
    setBusy(true);
    setError("");
    try {
      await updateShipment(shipment.id, {
        shipmentStatusCode: "delivered",
        deliveryConfirmedAt: new Date().toISOString(),
      });
      setNotice(`Delivery recorded for SHP-${shipment.id}.`);
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Delivery could not be recorded.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-5">
      <div className="flex justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-emerald-700">
            DELIVERY TRACKING
          </p>
          <h1 className="mt-2 text-3xl font-bold">Saved shipments</h1>
        </div>
        <button className={button} disabled={busy} onClick={() => void load()}>
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <p className="text-neutral-500">
        Shipment status is saved to EcoGlobe and shared with the order
        participants.
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4">
          {notice}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          {shipments.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              aria-pressed={s.id === selected}
              className={`block w-full rounded-xl border p-5 text-left ${s.id === selected ? "border-black bg-neutral-100" : "bg-white"}`}
            >
              <strong>
                SHP-{s.id} ·{" "}
                {orders.find((o) => o.id === s.orderId)?.listingTitle ??
                  (s.pilotRequestId
                    ? `Pilot PR-${s.pilotRequestId}`
                    : "Shipment")}
              </strong>
              <p className="mt-2">
                {s.shipmentStatusName ||
                  s.shipmentStatusCode.replaceAll("_", " ")}
              </p>
              <p>
                {s.carrierName ?? "Carrier not recorded"} ·{" "}
                {s.trackingNumber ?? "Tracking not recorded"}
              </p>
            </button>
          ))}
          {!busy && !shipments.length && (
            <p className="rounded-xl bg-white p-6">
              No saved shipments yet. Shipments appear after a shipping quote or
              dispatch is recorded.
            </p>
          )}
        </div>
        {shipment && (
          <section className="space-y-4 rounded-xl border bg-white p-6">
            <h2 className="text-xl font-bold">SHP-{shipment.id}</h2>
            <p>
              Status:{" "}
              {shipment.shipmentStatusName ||
                shipment.shipmentStatusCode.replaceAll("_", " ")}
            </p>
            {order && (
              <>
                <p>
                  Order EG-{order.id} · {order.listingTitle}
                </p>
                <p>Buyer: {order.buyerCompanyName}</p>
                <p>Seller: {order.sellerCompanyName}</p>
                <p>Destination: {order.deliveryAddress ?? "Not recorded"}</p>
              </>
            )}
            <p>Carrier: {shipment.carrierName ?? "Not recorded"}</p>
            <p>Tracking: {shipment.trackingNumber ?? "Not recorded"}</p>
            <p>
              Delivery confirmed:{" "}
              {shipment.deliveryConfirmedAt
                ? new Date(shipment.deliveryConfirmedAt).toLocaleString()
                : "Not yet confirmed"}
            </p>
            {shipment.shipmentStatusCode !== "delivered" &&
              (!shipment.pilotRequestId || role === "admin") && (
                <button
                  disabled={busy}
                  className={`${button} bg-black text-white`}
                  onClick={() => void confirm()}
                >
                  Confirm delivery
                </button>
              )}
            <p className="text-xs text-neutral-500">
              Recording delivery updates this shipment. Payment and escrow
              settlement are managed separately.
            </p>
          </section>
        )}
      </div>
    </section>
  );
}
