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
import { uploadBillOfLading } from "@/lib/api-fulfilment";
import {
  fetchLogisticsWorkspace,
  MAX_BOL_BYTES,
  type LogisticsCarrier,
  type LogisticsOrder,
} from "@/lib/api-logistics";
import { LogisticsQuoteForm } from "@/components/logistics/logistics-quote-form";
import {
  logisticsStage,
  stageLabel,
} from "@/components/logistics/logistics-stage";
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
  const [logistics, setLogistics] = useState<LogisticsOrder[]>([]);
  const [listings, setListings] = useState<BackendListing[]>([]);
  const [escrows, setEscrows] = useState<ApiEscrowRecord[]>([]);
  const [carriers, setCarriers] = useState<LogisticsCarrier[]>([]);
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
  const load = useCallback(async () => {
    if (!user?.activeCompanyId) return;
    setBusy(true);
    setError("");
    try {
      const [next, workspace, materials, funds] = await Promise.all([
        fetchOrders({ sellerCompanyId: user.activeCompanyId }),
        fetchLogisticsWorkspace(),
        fetchListings("owned"),
        fetchEscrows(),
      ]);
      setOrders(next);
      setLogistics(workspace.orders);
      setCarriers(workspace.carriers);
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
  const logisticsFor = (id: number) => logistics.find((l) => l.id === id);
  // Pickup orders never need a quote; the stage already accounts for that.
  const needsQuote = (o: ApiOrder) => {
    const record = logisticsFor(o.id);
    return record ? logisticsStage(record).kind === "needs_quote" : false;
  };
  const canUploadBol = (o: ApiOrder) => {
    const record = logisticsFor(o.id);
    const kind = record ? logisticsStage(record).kind : null;
    return kind === "bol_needed" || kind === "ready_to_dispatch";
  };
  const quoteRecord = quote ? logisticsFor(quote.id) : undefined;
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
  async function uploadBol(file: File | undefined) {
    if (!selected || !file || busy) return;
    if (file.type !== "application/pdf" || file.size > MAX_BOL_BYTES) {
      setError("Choose a PDF up to 5 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await uploadBillOfLading({
        orderId: selected.id,
        fileName: file.name,
        dataBase64: await readFileAsBase64(file),
      });
      setNotice(
        `Bill of lading attached to EG-${selected.id}. Record dispatch in Logistics when the carrier collects the load.`,
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
              const record = logisticsFor(o.id);
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
                    {record && (record.shipment || record.quote) && (
                      <p className="mt-1 font-medium text-emerald-700">
                        {stageLabel(logisticsStage(record)).label}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    {needsQuote(o) ? (
                      <button
                        className={button}
                        onClick={() => {
                          setError("");
                          setQuote(o);
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
      {quote && quoteRecord && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sales-quote-heading"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5"
        >
          <div className="max-h-full w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-6">
            <h2 id="sales-quote-heading" className="text-xl font-bold">
              Shipping quote · EG-{quote.id}
            </h2>
            <p>{quote.deliveryAddress || "Delivery address not recorded"}</p>
            <LogisticsQuoteForm
              order={quoteRecord}
              carriers={carriers}
              onCancel={() => setQuote(null)}
              onSaved={async () => {
                setNotice(
                  `Shipping quote recorded for EG-${quote.id}. Awaiting buyer acceptance.`,
                );
                setQuote(null);
                await load();
              }}
            />
          </div>
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
            {canUploadBol(selected) && (
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
            <Link className="mt-5 block underline" href="/seller/logistics">
              Manage quotes, BOL and dispatch in Logistics
            </Link>
            <Link
              className="mt-3 block underline"
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
