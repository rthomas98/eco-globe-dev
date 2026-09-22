"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SellerLayout } from "./seller-layout";
import { DemoOrdersPanel } from "@/components/demo/demo-orders-panel";
import { SampleRequestsPanel } from "@/components/samples/sample-requests-panel";
import {
  readFileAsBase64,
  fetchListings,
  type BackendListing,
} from "@/lib/listings-api";
import { fetchEscrows, type ApiEscrowRecord } from "@/lib/api-portal";
import { useDemoUser } from "@/lib/demo-user";
import { fetchOrders, formatOrderMoney, type ApiOrder } from "@/lib/api-orders";
import {
  fetchShipments,
  fetchCarriers,
  sendShippingQuote,
  uploadBillOfLading,
  type ApiShipment,
  type ApiCarrier,
} from "@/lib/api-fulfilment";
const button =
  "rounded-full border border-neutral-300 px-5 py-2 text-sm disabled:opacity-50";
const nice = (value: string) => value.replaceAll("_", " ");
type Filters = {
  category: string;
  shipping: string;
  status: string;
  escrow: string;
  from: string;
  to: string;
};
const emptyFilters: Filters = {
  category: "",
  shipping: "",
  status: "",
  escrow: "",
  from: "",
  to: "",
};
export function SellerSalesPage() {
  const user = useDemoUser();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [shipments, setShipments] = useState<ApiShipment[]>([]);
  const [listings, setListings] = useState<BackendListing[]>([]);
  const [escrows, setEscrows] = useState<ApiEscrowRecord[]>([]);
  const [carriers, setCarriers] = useState<ApiCarrier[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [query, setQuery] = useState(""),
    [tab, setTab] = useState("All orders");
  const [filters, setFilters] = useState(emptyFilters),
    [draft, setDraft] = useState(emptyFilters),
    [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<ApiOrder | null>(null),
    [quote, setQuote] = useState<ApiOrder | null>(null);
  const [cost, setCost] = useState(""),
    [carrier, setCarrier] = useState(""),
    [pickup, setPickup] = useState("");
  const load = useCallback(async () => {
    if (!user?.activeCompanyId) return;
    setBusy(true);
    setError("");
    try {
      const [next, shipping, options, materials, funds] = await Promise.all([
        fetchOrders({ sellerCompanyId: user.activeCompanyId }),
        fetchShipments(),
        fetchCarriers(),
        fetchListings("owned"),
        fetchEscrows(),
      ]);
      setOrders(next);
      setShipments(shipping);
      setCarriers(options);
      setListings(materials);
      setEscrows(funds);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load sales.");
    } finally {
      setBusy(false);
    }
  }, [user?.activeCompanyId]);
  useEffect(() => {
    void load();
  }, [load]);
  const shipmentFor = (id: number) =>
    shipments.filter((s) => s.orderId === id).sort((a, b) => b.id - a.id)[0];
  const needsQuote = (o: ApiOrder) =>
    !shipmentFor(o.id) &&
    ["approval_required", "escrow_required", "in_progress"].includes(
      o.orderStatusCode,
    ) &&
    o.deliveryMethod !== "pickup";
  const filtered = orders.filter((o) => {
    const text =
      `EG-${o.id} ${o.buyerCompanyName} ${o.listingTitle}`.toLowerCase();
    return (
      text.includes(query.trim().toLowerCase()) &&
      (!filters.shipping || o.deliveryMethod === filters.shipping) &&
      (!filters.status || o.orderStatusCode === filters.status) &&
      (!filters.escrow ||
        escrows.some(
          (e) => e.orderId === o.id && e.escrowStatusCode === filters.escrow,
        )) &&
      (!filters.category ||
        listings.some(
          (l) =>
            l.id === o.listingId &&
            (l.specifications?.category || l.materialTypeCode) ===
              filters.category,
        )) &&
      (!filters.from || o.createdAt.slice(0, 10) >= filters.from) &&
      (!filters.to || o.createdAt.slice(0, 10) <= filters.to) &&
      (tab === "All orders" ||
        (tab === "Completed"
          ? o.orderStatusCode === "completed"
          : tab === "Action needed"
            ? needsQuote(o)
            : o.orderStatusCode === "in_progress"))
    );
  });
  async function submitQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!quote || busy) return;
    const amount = Number(cost);
    if (!cost.trim() || !Number.isFinite(amount) || amount < 0 || !carrier) {
      setError("Choose a carrier and enter a valid shipping cost.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await sendShippingQuote({
        orderId: quote.id,
        carrierCode: carrier,
        shippingCost: amount,
        ...(pickup
          ? { pickupScheduledAt: new Date(pickup).toISOString() }
          : {}),
      });
      setNotice(
        `Shipping quote saved for EG-${quote.id}. Awaiting buyer approval.`,
      );
      setQuote(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quote could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  async function uploadBol(file: File | undefined) {
    if (!selected || !file || busy) return;
    if (file.type !== "application/pdf" || file.size > 5 * 1024 * 1024) {
      setError("Choose a PDF up to 5 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await uploadBillOfLading({
        orderId: selected.id,
        fileName: file.name,
        contentType: file.type,
        dataBase64: await readFileAsBase64(file),
      });
      setNotice(
        `Bill of lading uploaded for EG-${selected.id}. Shipment is in transit.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <SellerLayout title="Sales">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Sales</h1>
        <div className="flex gap-2">
          <input
            aria-label="Search sales"
            placeholder="Search order, buyer or material"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-lg border bg-white p-2"
          />
          <button
            className={button}
            onClick={() => {
              setDraft(filters);
              setFilterOpen(true);
            }}
          >
            Filters
          </button>
          <button
            className={button}
            disabled={busy}
            onClick={() => void load()}
          >
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3">
          {notice}
        </p>
      )}
      <DemoOrdersPanel />
      <SampleRequestsPanel role="seller" />
      <div className="my-5 flex flex-wrap gap-2">
        {["All orders", "Action needed", "Processing", "Completed"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`${button} ${tab === t ? "bg-black text-white" : "bg-white"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm text-neutral-500">
        {filtered.length} of {orders.length} saved orders
      </p>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {[
                "Order",
                "Buyer",
                "Material",
                "Quantity",
                "Shipping",
                "Status",
                "Action",
              ].map((h) => (
                <th key={h} className="p-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const shipment = shipmentFor(o.id);
              return (
                <tr key={o.id} className="border-t">
                  <td className="p-4">
                    <button
                      className="underline"
                      onClick={() => setSelected(o)}
                    >
                      EG-{o.id}
                    </button>
                  </td>
                  <td className="p-4">{o.buyerCompanyName}</td>
                  <td className="p-4">
                    {o.listingTitle}
                    <p>{formatOrderMoney(o.totalAmount, o.currencyCode)}</p>
                  </td>
                  <td className="p-4">
                    {o.quantity ?? "Not recorded"} {o.quantityUnit}
                  </td>
                  <td className="p-4">
                    {o.deliveryMethod ? nice(o.deliveryMethod) : "Not recorded"}
                  </td>
                  <td className="p-4">
                    {nice(o.orderStatusCode)}
                    {shipment && (
                      <p className="mt-1 font-medium text-emerald-700">
                        {shipment.shipmentStatusCode === "quote_pending"
                          ? "Quote sent · awaiting approval"
                          : nice(shipment.shipmentStatusCode)}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    {needsQuote(o) ? (
                      <button
                        className={button}
                        onClick={() => {
                          setQuote(o);
                          setCost("");
                          setCarrier("");
                          setPickup("");
                        }}
                      >
                        Send quote
                      </button>
                    ) : (
                      <button className={button} onClick={() => setSelected(o)}>
                        View details
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!busy && !filtered.length && (
          <p className="p-6">No orders match these filters.</p>
        )}
      </div>
      {filterOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sales filters"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5"
        >
          <form
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6"
            onSubmit={(e) => {
              e.preventDefault();
              setFilters(draft);
              setFilterOpen(false);
            }}
          >
            <h2 className="text-xl font-bold">Filters</h2>
            {(
              [
                [
                  "shipping",
                  "Shipping type",
                  [
                    ["delivery", "Delivery"],
                    ["pickup", "Pickup"],
                  ],
                ],
                [
                  "status",
                  "Order status",
                  Array.from(new Set(orders.map((o) => o.orderStatusCode))).map(
                    (s) => [s, nice(s)],
                  ),
                ],
                [
                  "category",
                  "Product category",
                  Array.from(
                    new Set(
                      listings.map(
                        (l) => l.specifications?.category || l.materialTypeCode,
                      ),
                    ),
                  ).map((c) => [c, nice(c)]),
                ],
                [
                  "escrow",
                  "Escrow status",
                  Array.from(
                    new Set(escrows.map((e) => e.escrowStatusCode)),
                  ).map((s) => [s, nice(s)]),
                ],
              ] as [keyof Filters, string, string[][]][]
            ).map(([key, label, options]) => (
              <label key={key} className="block">
                {label}
                <select
                  className="mt-1 w-full rounded-lg border p-2"
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                >
                  <option value="">All</option>
                  {options.map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="block">
              From date
              <input
                type="date"
                value={draft.from}
                onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                className="ml-3 rounded border p-2"
              />
            </label>
            <label className="block">
              To date
              <input
                type="date"
                min={draft.from}
                value={draft.to}
                onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                className="ml-3 rounded border p-2"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className={button}
                onClick={() => {
                  setDraft(emptyFilters);
                  setFilters(emptyFilters);
                }}
              >
                Reset
              </button>
              <button type="submit" className={`${button} bg-black text-white`}>
                Apply
              </button>
              <button
                type="button"
                className={button}
                onClick={() => setFilterOpen(false)}
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}
      {quote && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Shipping quote"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5"
        >
          <form
            onSubmit={submitQuote}
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6"
          >
            <h2 className="text-xl font-bold">
              Shipping quote · EG-{quote.id}
            </h2>
            <p>{quote.deliveryAddress || "Delivery address not recorded"}</p>
            <label className="block">
              Carrier
              <select
                required
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="block w-full rounded border p-2"
              >
                <option value="">Choose carrier</option>
                {carriers.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Shipping cost ({quote.currencyCode})
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="block w-full rounded border p-2"
              />
            </label>
            <label className="block">
              Pickup date and time (optional)
              <input
                type="datetime-local"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className="block w-full rounded border p-2"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className={`${button} bg-black text-white`}
            >
              {busy ? "Saving…" : "Send quote"}
            </button>
            <button
              type="button"
              disabled={busy}
              className={button}
              onClick={() => setQuote(null)}
            >
              Cancel
            </button>
            {error && <p role="alert">{error}</p>}
          </form>
        </div>
      )}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Order details"
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
        >
          <section className="h-full w-full max-w-lg overflow-auto bg-white p-6">
            <button className={button} onClick={() => setSelected(null)}>
              Close details
            </button>
            <h2 className="my-5 text-2xl font-bold">
              EG-{selected.id} · {selected.listingTitle}
            </h2>
            <dl className="space-y-3">
              <div>Buyer: {selected.buyerCompanyName}</div>
              <div>
                Quantity: {selected.quantity ?? "Not recorded"}{" "}
                {selected.quantityUnit}
              </div>
              <div>
                Order total:{" "}
                {formatOrderMoney(selected.totalAmount, selected.currencyCode)}
              </div>
              <div>Status: {nice(selected.orderStatusCode)}</div>
              <div>
                Destination: {selected.deliveryAddress || "Not recorded"}
              </div>
            </dl>
            {selected.orderStatusCode === "in_progress" &&
              shipmentFor(selected.id)?.shipmentStatusCode !== "delivered" && (
                <label className="mt-5 block">
                  Upload Bill of Lading (BOL)
                  <input
                    type="file"
                    accept="application/pdf"
                    disabled={busy}
                    onChange={(e) => void uploadBol(e.target.files?.[0])}
                    className="mt-2 block"
                  />
                </label>
              )}
            <Link
              className="mt-5 block underline"
              href="/seller/delivery-tracking"
            >
              View saved shipments and delivery status
            </Link>
            <Link className="mt-3 block underline" href="/seller/documents">
              Order documents
            </Link>
          </section>
        </div>
      )}
    </SellerLayout>
  );
}
