"use client";

import { useDemoUser } from "@/lib/demo-user";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { LineChart } from "@/components/admin/line-chart";
import { ExportDropdown } from "@/components/admin/export-dropdown";
import { DateRangeDropdown } from "@/components/admin/date-range-dropdown";
import { DataBoundary, useBackendData, type LoadState } from "@/components/shared/data-state";
import { fetchOrders, type ApiOrder } from "@/lib/api-orders";
import {
  fetchCompanies,
  fetchEscrows,
  fetchPayments,
  portalDate,
  portalMoney,
  type ApiCompany,
  type ApiEscrowRecord,
} from "@/lib/api-portal";
import { fetchListings, type BackendListing } from "@/lib/listings-api";
import { describeUnit, formatNumber } from "@/lib/listing-format";

/**
 * Reports calculated only from records returned by the backend for the
 * signed-in session (all companies for platform admins, the active company
 * otherwise). Nothing here is illustrative: empty data renders as empty.
 */

export type ReportScope = { kind: "admin" } | { kind: "seller"; companyId?: number };

const PAGE_SIZE = 20;

const RANGE_DAYS: Record<string, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "6m": 183,
  "1y": 365,
  all: null,
};

function inRange(dateIso: string, range: string) {
  const days = RANGE_DAYS[range] ?? null;
  if (days === null) return true;
  return Date.now() - new Date(dateIso).getTime() <= days * 86_400_000;
}

/** Last 12 calendar months, oldest first, as { key: "YYYY-MM", label }. */
function lastTwelveMonths() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
    };
  });
}

function monthKey(dateIso: string) {
  const d = new Date(dateIso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Only currency-consistent totals are summed; mixed currencies are reported separately. */
function sumByCurrency(rows: Array<{ amount: number; currencyCode: string }>) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.currencyCode, (totals.get(row.currencyCode) ?? 0) + Number(row.amount));
  return [...totals.entries()].map(([currency, total]) => portalMoney(total, currency)).join(" + ") || portalMoney(0);
}

function useOrders(scope: ReportScope) {
  const companyId = scope.kind === "seller" ? scope.companyId : undefined;
  return useBackendData(
    () => fetchOrders(companyId ? { sellerCompanyId: companyId } : undefined),
    [companyId],
    "Orders could not be loaded.",
  );
}

function ReportFrame({
  title,
  controls,
  children,
}: {
  title: string;
  controls?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
        {controls && <div className="flex flex-wrap items-center gap-3">{controls}</div>}
      </div>
      {children}
    </div>
  );
}

function SearchBox({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2" style={{ border: "1px solid #F0F0F0" }}>
      <Search className="size-4 text-neutral-400" />
      <input
        type="search"
        aria-label={label}
        placeholder="Search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-400"
      />
    </div>
  );
}

function KpiGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pb-5 sm:px-6 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-2 rounded-xl px-5 py-4" style={{ border: "1px solid #F0F0F0" }}>
          <span className="text-sm text-neutral-500">{item.label}</span>
          <span className="text-xl font-bold text-neutral-900 sm:text-2xl">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 pb-6 sm:px-6">
      <h3 className="mb-4 text-lg font-semibold text-neutral-900">{title}</h3>
      <div className="rounded-xl p-4" style={{ border: "1px solid #F0F0F0" }}>
        {children}
      </div>
    </div>
  );
}

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="flex items-center justify-between px-4 py-4 sm:px-6" style={{ borderTop: "1px solid #F0F0F0" }}>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous page" onClick={() => onPage(Math.max(1, page - 1))} className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronLeft className="size-4" /></button>
        <span className="px-2 text-sm text-neutral-600">Page {Math.min(page, pages)} of {pages}</span>
        <button type="button" aria-label="Next page" onClick={() => onPage(Math.min(pages, page + 1))} className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronRight className="size-4" /></button>
      </div>
      <span className="text-sm text-neutral-500">{total} records</span>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="pb-3 pr-4 text-sm font-medium text-neutral-500">{children}</th>;
}

function Td({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return <td className={`py-3.5 pr-4 text-sm ${strong ? "text-neutral-900" : "text-neutral-700"}`}>{children}</td>;
}

function StatusPill({ label, tone }: { label: string; tone: "green" | "amber" | "red" | "neutral" }) {
  const cls = {
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    neutral: "bg-neutral-100 text-neutral-600",
  }[tone];
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${cls}`}>{label}</span>;
}

function orderTone(code: string): "green" | "amber" | "red" | "neutral" {
  if (code === "completed") return "green";
  if (code === "cancelled") return "red";
  if (code === "in_progress" || code === "escrow_required" || code === "approval_required") return "amber";
  return "neutral";
}

/* ─── Summary tiles computed from the filtered order rows ─── */

function OrderSummaryTiles({ orders }: { orders: ApiOrder[] }) {
  const live = orders.filter((o) => o.orderStatusCode !== "cancelled");
  return (
    <KpiGrid
      items={[
        { label: "Orders", value: String(orders.length) },
        { label: "Completed", value: String(orders.filter((o) => o.orderStatusCode === "completed").length) },
        { label: "Cancelled", value: String(orders.filter((o) => o.orderStatusCode === "cancelled").length) },
        {
          label: "Order value (excl. cancelled)",
          value: sumByCurrency(live.map((o) => ({ amount: Number(o.totalAmount), currencyCode: o.currencyCode }))),
        },
      ]}
    />
  );
}

/* ═══════════════════ SALES ═══════════════════ */

export function LiveSalesReport({
  scope,
  title = "Sales Reports",
  rowHref,
}: {
  scope: ReportScope;
  title?: string;
  rowHref?: (order: ApiOrder) => string;
}) {
  const router = useRouter();
  const orders = useOrders(scope);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (orders.data ?? []).filter(
      (o) =>
        inRange(o.createdAt, range) &&
        (!q || `${o.id} ${o.buyerCompanyName} ${o.sellerCompanyName} ${o.listingTitle ?? ""}`.toLowerCase().includes(q)),
    );
  }, [orders.data, search, range]);

  const months = lastTwelveMonths();
  const primaryCurrency = filtered[0]?.currencyCode ?? "USD";
  const monthly = months.map((m) =>
    filtered
      .filter((o) => o.currencyCode === primaryCurrency && o.orderStatusCode !== "cancelled" && monthKey(o.createdAt) === m.key)
      .reduce((sum, o) => sum + Number(o.totalAmount), 0),
  );
  const exportRows = filtered.map((o) => ({
    id: `EG-${o.id}`,
    buyer: o.buyerCompanyName,
    seller: o.sellerCompanyName,
    product: o.listingTitle ?? "",
    qty: o.quantity === null ? "" : `${o.quantity} ${o.quantityUnit ?? ""}`.trim(),
    amount: `${o.totalAmount} ${o.currencyCode}`,
    status: o.orderStatusName,
    created: portalDate(o.createdAt),
  }));

  return (
    <ReportFrame
      title={title}
      controls={
        <>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} label="Search orders" />
          <DateRangeDropdown value={range} onChange={(v) => { setRange(v); setPage(1); }} />
          <ExportDropdown
            filename="sales-report"
            columns={[{ key: "id", label: "Order ID" }, { key: "buyer", label: "Buyer" }, { key: "seller", label: "Seller" }, { key: "product", label: "Product" }, { key: "qty", label: "Qty" }, { key: "amount", label: "Amount" }, { key: "status", label: "Status" }, { key: "created", label: "Created" }]}
            data={exportRows}
          />
        </>
      }
    >
      {orders.data && <OrderSummaryTiles orders={filtered} />}
      <DataBoundary
        state={orders}
        loadingLabel="Loading orders…"
        isEmpty={() => filtered.length === 0}
        empty={{ title: (orders.data ?? []).length === 0 ? "No orders yet" : "No orders match these filters", description: "Orders placed on EcoGlobe appear here." }}
      >
        {() => (
          <>
            <ChartCard
              title={`Order value by month (${primaryCurrency} only, excluding cancelled${
                filtered.some((o) => o.currencyCode !== primaryCurrency) ? "; other currencies in the table" : ""
              })`}
            >
              <LineChart data={monthly} labels={months.map((m) => m.label)} />
            </ChartCard>
            <div className="flex-1 overflow-x-auto px-4 sm:px-6">
              <table className="w-full min-w-[960px] text-left">
                <thead><tr style={{ borderBottom: "1px solid #F0F0F0" }}><Th>Order</Th><Th>Buyer</Th><Th>Seller</Th><Th>Product</Th><Th>Qty</Th><Th>Fulfilment</Th><Th>Amount</Th><Th>Created</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((o: ApiOrder) => (
                    <tr
                      key={o.id}
                      style={{ borderBottom: "1px solid #F8F8F8" }}
                      className={`hover:bg-neutral-50 ${rowHref ? "cursor-pointer" : ""}`}
                      onClick={rowHref ? () => router.push(rowHref(o)) : undefined}
                    >
                      <Td strong>EG-{o.id}</Td>
                      <Td>{o.buyerCompanyName}</Td>
                      <Td>{o.sellerCompanyName}</Td>
                      <Td>{o.listingTitle ?? "—"}</Td>
                      <Td>{o.quantity === null ? "—" : `${formatNumber(o.quantity)} ${o.quantityUnit ?? ""}`}</Td>
                      <Td>{o.deliveryMethod === "pickup" ? "Pickup" : o.deliveryMethod === "delivery" ? "Delivery" : "—"}</Td>
                      <Td strong>{portalMoney(Number(o.totalAmount), o.currencyCode)}</Td>
                      <Td>{portalDate(o.createdAt)}</Td>
                      <td className="py-3.5"><StatusPill label={o.orderStatusName} tone={orderTone(o.orderStatusCode)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={filtered.length} onPage={setPage} />
          </>
        )}
      </DataBoundary>
    </ReportFrame>
  );
}

/* ═══════════════════ PRODUCTS ═══════════════════ */

interface ProductRow {
  listing: BackendListing;
  orders: number;
  revenue: string;
  unitsSold: number;
}

export function LiveProductsReport({
  scope,
  title = "Product Performance",
  rowHref,
}: {
  scope: ReportScope;
  title?: string;
  rowHref?: (listing: BackendListing) => string;
}) {
  const router = useRouter();
  const companyId = scope.kind === "seller" ? scope.companyId : undefined;
  const listings = useBackendData(
    // "owned" requires a session; for platform admins the backend returns every
    // listing (all statuses), for sellers only their own company's listings.
    () => fetchListings("owned", { sellerCompanyId: companyId }),
    [scope.kind, companyId],
    "Listings could not be loaded.",
  );
  const orders = useOrders(scope);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // Filters apply to the loaded listing rows (price is the listing's saved
  // price per unit in its own currency).
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const categories = useMemo(
    () => [...new Set((listings.data ?? []).map((l) => l.materialTypeCode).filter(Boolean))].sort(),
    [listings.data],
  );

  const rows: ProductRow[] = useMemo(() => {
    const byListing = new Map<number, ApiOrder[]>();
    for (const o of orders.data ?? []) {
      if (o.listingId === null || o.orderStatusCode === "cancelled") continue;
      byListing.set(o.listingId, [...(byListing.get(o.listingId) ?? []), o]);
    }
    const q = search.trim().toLowerCase();
    return (listings.data ?? [])
      .filter((l) => !q || `${l.title} ${l.sellerCompanyName ?? ""}`.toLowerCase().includes(q))
      .filter((l) => !category || l.materialTypeCode === category)
      .filter((l) => {
        const min = minPrice.trim() === "" ? null : Number(minPrice);
        const max = maxPrice.trim() === "" ? null : Number(maxPrice);
        if (min === null && max === null) return true;
        if (l.pricePerUnit === null || l.pricePerUnit === undefined) return false;
        const price = Number(l.pricePerUnit);
        return (min === null || price >= min) && (max === null || price <= max);
      })
      .map((listing) => {
        const listingOrders = byListing.get(listing.id) ?? [];
        return {
          listing,
          orders: listingOrders.length,
          revenue: listingOrders.length
            ? sumByCurrency(listingOrders.map((o) => ({ amount: Number(o.totalAmount), currencyCode: o.currencyCode })))
            : "—",
          unitsSold: listingOrders.reduce((sum, o) => sum + Number(o.quantity ?? 0), 0),
        };
      })
      .sort((a, b) => b.orders - a.orders);
  }, [listings.data, orders.data, search, category, minPrice, maxPrice]);

  const all = listings.data ?? [];
  const filtersActive = Boolean(category || minPrice.trim() || maxPrice.trim());
  const count = (code: string) => all.filter((l) => l.listingStatusCode === code).length;

  return (
    <ReportFrame
      title={title}
      controls={
        <>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} label="Search products" />
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="rounded-full bg-white px-3 py-2 text-sm"
            style={{ border: "1px solid #F0F0F0" }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            aria-label="Minimum price per unit"
            placeholder="Min price"
            value={minPrice}
            onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
            className="w-24 rounded-full bg-white px-3 py-2 text-sm"
            style={{ border: "1px solid #F0F0F0" }}
          />
          <input
            type="number"
            min="0"
            inputMode="decimal"
            aria-label="Maximum price per unit"
            placeholder="Max price"
            value={maxPrice}
            onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
            className="w-24 rounded-full bg-white px-3 py-2 text-sm"
            style={{ border: "1px solid #F0F0F0" }}
          />
          {filtersActive && (
            <button
              type="button"
              onClick={() => { setCategory(""); setMinPrice(""); setMaxPrice(""); setPage(1); }}
              className="text-sm font-medium text-neutral-700 underline"
            >
              Clear filters
            </button>
          )}
          <ExportDropdown
            filename="product-report"
            columns={[{ key: "id", label: "Listing ID" }, { key: "name", label: "Product" }, { key: "seller", label: "Seller" }, { key: "status", label: "Status" }, { key: "orders", label: "Orders" }, { key: "revenue", label: "Order value" }]}
            data={rows.map((r) => ({ id: `LS-${r.listing.id}`, name: r.listing.title, seller: r.listing.sellerCompanyName ?? "", status: r.listing.listingStatusCode, orders: r.orders, revenue: r.revenue }))}
          />
        </>
      }
    >
      {listings.data && (
        <KpiGrid
          items={[
            { label: "Listings", value: String(all.length) },
            { label: "Published", value: String(count("published")) },
            { label: "Awaiting review", value: String(count("pending_review")) },
            { label: "Drafts", value: String(count("draft")) },
          ]}
        />
      )}
      {orders.status === "error" && (
        <p className="mx-4 mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6">
          Order totals are unavailable: {orders.error}
        </p>
      )}
      <DataBoundary
        state={listings}
        loadingLabel="Loading listings…"
        isEmpty={() => rows.length === 0}
        empty={{ title: all.length === 0 ? "No listings yet" : "No listings match your search or filters" }}
      >
        {() => (
          <>
            <div className="flex-1 overflow-x-auto px-4 sm:px-6">
              <table className="w-full min-w-[860px] text-left">
                <thead><tr style={{ borderBottom: "1px solid #F0F0F0" }}><Th>Listing</Th><Th>Product</Th><Th>Seller</Th><Th>Status</Th><Th>Price / unit</Th><Th>Available</Th><Th>Orders</Th><Th>Quantity ordered</Th><Th>Order value</Th></tr></thead>
                <tbody>
                  {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => (
                    <tr
                      key={r.listing.id}
                      style={{ borderBottom: "1px solid #F8F8F8" }}
                      className={`hover:bg-neutral-50 ${rowHref ? "cursor-pointer" : ""}`}
                      onClick={rowHref ? () => router.push(rowHref(r.listing)) : undefined}
                    >
                      <Td strong>LS-{r.listing.id}</Td>
                      <td className="max-w-[260px] truncate py-3.5 pr-4 text-sm text-neutral-700">{r.listing.title}</td>
                      <Td>{r.listing.sellerCompanyName ?? "—"}</Td>
                      <td className="py-3.5 pr-4"><StatusPill label={r.listing.listingStatusCode.replace(/_/g, " ")} tone={r.listing.listingStatusCode === "published" ? "green" : "neutral"} /></td>
                      <Td>{r.listing.pricePerUnit === null || r.listing.pricePerUnit === undefined ? "—" : `${portalMoney(Number(r.listing.pricePerUnit), r.listing.currencyCode ?? "USD")} / ${r.listing.quantityUnit ?? "unit"}`}</Td>
                      <Td>{r.listing.quantity === null ? "—" : `${formatNumber(r.listing.quantity)} ${r.listing.quantityUnit ?? ""}`}</Td>
                      <Td>{orders.data ? r.orders : "—"}</Td>
                      <Td>{orders.data && r.orders ? `${formatNumber(r.unitsSold)} ${r.listing.quantityUnit ?? ""}` : "—"}</Td>
                      <Td strong>{orders.data ? r.revenue : "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={rows.length} onPage={setPage} />
          </>
        )}
      </DataBoundary>
    </ReportFrame>
  );
}

/* ═══════════════════ ESCROW ═══════════════════ */

function escrowTone(code: string): "green" | "amber" | "red" | "neutral" {
  if (code === "released") return "green";
  if (code === "funded" || code === "funding_required") return "amber";
  if (code === "disputed" || code === "refunded") return "red";
  return "neutral";
}

export function LiveEscrowReport({
  title = "Escrow",
  rowHref,
}: {
  title?: string;
  rowHref?: (escrow: ApiEscrowRecord) => string;
}) {
  const router = useRouter();
  // Session-scoped read: reload when the active company changes.
  const companyId = useDemoUser()?.activeCompanyId;
  const escrows = useBackendData(fetchEscrows, [companyId], "Escrow records could not be loaded.");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = (escrows.data ?? []).filter(
    (e) =>
      inRange(e.createdAt, range) &&
      (!search.trim() || `ESC-${e.id} EG-${e.orderId} ${e.escrowStatusCode}`.toLowerCase().includes(search.trim().toLowerCase())),
  );
  const byStatus = (codes: string[]) =>
    sumByCurrency(filtered.filter((e) => codes.includes(e.escrowStatusCode)).map((e) => ({ amount: Number(e.amount), currencyCode: e.currencyCode })));
  const months = lastTwelveMonths();
  // Charts plot one currency only; other currencies stay in the KPIs/table.
  const chartCurrency = filtered[0]?.currencyCode ?? "USD";
  const otherCurrencies = new Set(filtered.map((e) => e.currencyCode).filter((c) => c !== chartCurrency)).size > 0;
  const series = (codes: string[]) =>
    months.map((m) =>
      filtered
        .filter((e) => e.currencyCode === chartCurrency && codes.includes(e.escrowStatusCode) && monthKey(e.updatedAt) === m.key)
        .reduce((sum, e) => sum + Number(e.amount), 0),
    );

  return (
    <ReportFrame
      title={title}
      controls={
        <>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} label="Search escrow" />
          <DateRangeDropdown value={range} onChange={(v) => { setRange(v); setPage(1); }} />
          <ExportDropdown
            filename="escrow-report"
            columns={[{ key: "escrowId", label: "Escrow ID" }, { key: "orderId", label: "Order" }, { key: "amount", label: "Amount" }, { key: "status", label: "Status" }, { key: "updated", label: "Updated" }]}
            data={filtered.map((e: ApiEscrowRecord) => ({ escrowId: `ESC-${e.id}`, orderId: `EG-${e.orderId}`, amount: `${e.amount} ${e.currencyCode}`, status: e.escrowStatusCode, updated: portalDate(e.updatedAt) }))}
          />
        </>
      }
    >
      <DataBoundary
        state={escrows}
        loadingLabel="Loading escrow records…"
        isEmpty={() => filtered.length === 0}
        empty={{ title: (escrows.data ?? []).length === 0 ? "No escrow records yet" : "No escrow records match these filters" }}
      >
        {() => (
          <>
            <KpiGrid
              items={[
                { label: "Awaiting funding", value: byStatus(["funding_required"]) },
                { label: "Funded (held)", value: byStatus(["funded"]) },
                { label: "Released", value: byStatus(["released"]) },
                { label: "Disputed", value: String(filtered.filter((e) => e.disputeLocked || e.escrowStatusCode === "disputed").length) },
              ]}
            />
            <ChartCard
              title={`Escrow funded and released by month (${chartCurrency}${otherCurrencies ? " only; other currencies in the table" : ""})`}
            >
              <LineChart
                data={series(["funded"])}
                secondaryData={series(["released"])}
                labels={months.map((m) => m.label)}
                legend={{ primary: "Funded", secondary: "Released" }}
              />
            </ChartCard>
            <div className="flex-1 overflow-x-auto px-4 sm:px-6">
              <table className="w-full min-w-[720px] text-left">
                <thead><tr style={{ borderBottom: "1px solid #F0F0F0" }}><Th>Escrow</Th><Th>Order</Th><Th>Amount</Th><Th>Release rule</Th><Th>Created</Th><Th>Updated</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((e) => (
                    <tr
                      key={e.id}
                      style={{ borderBottom: "1px solid #F8F8F8" }}
                      className={`hover:bg-neutral-50 ${rowHref ? "cursor-pointer" : ""}`}
                      onClick={rowHref ? () => router.push(rowHref(e)) : undefined}
                    >
                      <Td strong>ESC-{e.id}</Td>
                      <Td>EG-{e.orderId}</Td>
                      <Td strong>{portalMoney(Number(e.amount), e.currencyCode)}</Td>
                      <Td>{e.releaseRuleCode.replace(/_/g, " ")}</Td>
                      <Td>{portalDate(e.createdAt)}</Td>
                      <Td>{portalDate(e.updatedAt)}</Td>
                      <td className="py-3.5"><StatusPill label={e.escrowStatusCode.replace(/_/g, " ")} tone={escrowTone(e.escrowStatusCode)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={filtered.length} onPage={setPage} />
          </>
        )}
      </DataBoundary>
    </ReportFrame>
  );
}

/* ═══════════════════ CARBON ═══════════════════ */

/**
 * Recorded footprint of ordered material: order quantity (converted to
 * tonnes for mass units) × the listing's recorded carbon intensity
 * (kg CO₂e per tonne). Orders without both values are counted, not estimated.
 */
export function LiveCarbonReport({ scope, title = "Carbon" }: { scope: ReportScope; title?: string }) {
  const companyId = scope.kind === "seller" ? scope.companyId : undefined;
  const orders = useOrders(scope);
  const listings = useBackendData(
    // "owned" requires a session; for platform admins the backend returns every
    // listing (all statuses), for sellers only their own company's listings.
    () => fetchListings("owned", { sellerCompanyId: companyId }),
    [scope.kind, companyId],
    "Listings could not be loaded.",
  );
  const [search, setSearch] = useState("");

  const intensity = new Map((listings.data ?? []).map((l) => [l.id, l.carbonIntensityKgCo2e]));
  const measured: Array<{ order: ApiOrder; tonnes: number; kg: number }> = [];
  let unmeasured = 0;
  for (const o of orders.data ?? []) {
    if (o.orderStatusCode === "cancelled") continue;
    const kgPerTonne = o.listingId === null ? null : intensity.get(o.listingId) ?? null;
    const perUnit = describeUnit(o.quantityUnit).tonnesPerUnit;
    if (kgPerTonne === null || kgPerTonne === undefined || perUnit === null || o.quantity === null) {
      unmeasured += 1;
      continue;
    }
    const tonnes = Number(o.quantity) * perUnit;
    measured.push({ order: o, tonnes, kg: tonnes * Number(kgPerTonne) });
  }
  const q = search.trim().toLowerCase();
  const visible = measured.filter((m) => !q || (m.order.listingTitle ?? "").toLowerCase().includes(q));
  const months = lastTwelveMonths();

  const combined: LoadState<true> = {
    status: orders.status === "error" || listings.status === "error" ? "error" : orders.data && listings.data ? "ready" : "loading",
    data: orders.data && listings.data ? true : null,
    error: orders.error ?? listings.error,
    reload: () => {
      orders.reload();
      listings.reload();
    },
  };

  return (
    <ReportFrame
      title={title}
      controls={
        <>
          <SearchBox value={search} onChange={setSearch} label="Search products" />
          <ExportDropdown
            filename="carbon-report"
            columns={[{ key: "order", label: "Order" }, { key: "product", label: "Product" }, { key: "tonnes", label: "Tonnes" }, { key: "kg", label: "kg CO2e" }, { key: "created", label: "Created" }]}
            data={visible.map((m) => ({ order: `EG-${m.order.id}`, product: m.order.listingTitle ?? "", tonnes: m.tonnes.toFixed(3), kg: Math.round(m.kg), created: portalDate(m.order.createdAt) }))}
          />
        </>
      }
    >
      <DataBoundary
        state={combined}
        loadingLabel="Loading orders…"
        isEmpty={() => measured.length === 0 && unmeasured === 0}
        empty={{ title: "No orders yet", description: "Carbon totals are calculated from orders once they exist." }}
      >
        {() => (
          <>
            <KpiGrid
              items={[
                { label: "Orders with carbon data", value: String(measured.length) },
                { label: "Orders without carbon data", value: String(unmeasured) },
                { label: "Tonnes ordered (measured)", value: formatNumber(measured.reduce((s, m) => s + m.tonnes, 0)) },
                { label: "Recorded footprint (t CO₂e)", value: formatNumber(measured.reduce((s, m) => s + m.kg, 0) / 1000) },
              ]}
            />
            <p className="mx-4 mb-4 text-xs text-neutral-500 sm:mx-6">
              Footprint uses each listing&apos;s recorded carbon intensity. It is not an avoided-emissions
              estimate.
            </p>
            <ChartCard title="Recorded footprint by month (t CO₂e)">
              <LineChart
                yPrefix=""
                data={months.map((mo) => measured.filter((m) => monthKey(m.order.createdAt) === mo.key).reduce((s, m) => s + m.kg / 1000, 0))}
                labels={months.map((m) => m.label)}
              />
            </ChartCard>
            <div className="flex-1 overflow-x-auto px-4 pb-6 sm:px-6">
              <table className="w-full min-w-[640px] text-left">
                <thead><tr style={{ borderBottom: "1px solid #F0F0F0" }}><Th>Order</Th><Th>Product</Th><Th>Tonnes</Th><Th>kg CO₂e</Th><Th>Created</Th></tr></thead>
                <tbody>
                  {visible.map((m) => (
                    <tr key={m.order.id} style={{ borderBottom: "1px solid #F8F8F8" }}>
                      <Td strong>EG-{m.order.id}</Td>
                      <Td>{m.order.listingTitle ?? "—"}</Td>
                      <Td>{formatNumber(m.tonnes, 3)}</Td>
                      <Td>{Math.round(m.kg).toLocaleString("en-US")}</Td>
                      <Td>{portalDate(m.order.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visible.length === 0 && (
                <p className="py-8 text-center text-sm text-neutral-500">No orders with recorded carbon data.</p>
              )}
            </div>
          </>
        )}
      </DataBoundary>
    </ReportFrame>
  );
}

/* ═══════════════════ PAYMENTS (admin transactions) ═══════════════════ */

export function LivePaymentsLedger({
  title = "Transactions",
  rowHref,
}: {
  title?: string;
  rowHref?: (paymentId: number) => string;
}) {
  const router = useRouter();
  const activeCompanyId = useDemoUser()?.activeCompanyId;
  const payments = useBackendData(fetchPayments, [activeCompanyId], "Payments could not be loaded.");
  const orders = useOrders({ kind: "admin" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const orderById = new Map((orders.data ?? []).map((o) => [o.id, o]));
  const q = search.trim().toLowerCase();
  const rows = (payments.data ?? []).filter((p) => {
    const order = orderById.get(p.orderId);
    return !q || `TX-${p.id} EG-${p.orderId} ${p.payerCompanyName} ${order?.sellerCompanyName ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <ReportFrame
      title={title}
      controls={
        <>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} label="Search transactions" />
          <ExportDropdown
            filename="ecoglobe-transactions"
            columns={[{ key: "id", label: "Transaction ID" }, { key: "date", label: "Date" }, { key: "orderId", label: "Order" }, { key: "payer", label: "Payer" }, { key: "amount", label: "Amount" }, { key: "type", label: "Type" }, { key: "status", label: "Status" }]}
            data={rows.map((p) => ({ id: `TX-${p.id}`, date: portalDate(p.createdAt), orderId: `EG-${p.orderId}`, payer: p.payerCompanyName, amount: `${p.amount} ${p.currencyCode}`, type: p.paymentTypeCode, status: p.paymentStatusCode }))}
          />
        </>
      }
    >
      <DataBoundary
        state={payments}
        loadingLabel="Loading payments…"
        isEmpty={() => rows.length === 0}
        empty={{
          title: (payments.data ?? []).length === 0 ? "No payment records yet" : "No payments match your search",
          description: "Payments appear once a payment provider confirms funding for an order.",
        }}
      >
        {() => (
          <>
            <div className="flex-1 overflow-x-auto px-4 sm:px-6">
              <table className="w-full min-w-[860px] text-left">
                <thead><tr style={{ borderBottom: "1px solid #F0F0F0" }}><Th>Transaction</Th><Th>Date</Th><Th>Order</Th><Th>Payer</Th><Th>Seller</Th><Th>Amount</Th><Th>Type</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => (
                    <tr
                      key={p.id}
                      style={{ borderBottom: "1px solid #F8F8F8" }}
                      className={`hover:bg-neutral-50 ${rowHref ? "cursor-pointer" : ""}`}
                      onClick={rowHref ? () => router.push(rowHref(p.id)) : undefined}
                    >
                      <Td strong>TX-{p.id}</Td>
                      <Td>{portalDate(p.createdAt)}</Td>
                      <Td>EG-{p.orderId}</Td>
                      <Td>{p.payerCompanyName}</Td>
                      <Td>{orderById.get(p.orderId)?.sellerCompanyName ?? "—"}</Td>
                      <Td strong>{portalMoney(Number(p.amount), p.currencyCode)}</Td>
                      <Td>{p.paymentTypeCode.replace(/_/g, " ")}</Td>
                      <td className="py-3.5 pr-4"><StatusPill label={p.paymentStatusCode.replace(/_/g, " ")} tone={p.paymentStatusCode === "captured" ? "green" : p.paymentStatusCode === "refunded" || p.paymentStatusCode === "failed" ? "red" : "amber"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={rows.length} onPage={setPage} />
          </>
        )}
      </DataBoundary>
    </ReportFrame>
  );
}

/* ═══════════════════ COMPANY DIRECTORY (admin sellers / buyers) ═══════════════════ */

export function LiveCompanyDirectory({ kind, title }: { kind: "seller" | "buyer"; title: string }) {
  const router = useRouter();
  const companies = useBackendData(fetchCompanies, [], "Companies could not be loaded.");
  const orders = useOrders({ kind: "admin" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const stats = useMemo(() => {
    const map = new Map<number, { count: number; value: Array<{ amount: number; currencyCode: string }> }>();
    for (const o of orders.data ?? []) {
      if (o.orderStatusCode === "cancelled") continue;
      const id = kind === "seller" ? o.sellerCompanyId : o.buyerCompanyId;
      const entry = map.get(id) ?? { count: 0, value: [] };
      entry.count += 1;
      entry.value.push({ amount: Number(o.totalAmount), currencyCode: o.currencyCode });
      map.set(id, entry);
    }
    return map;
  }, [orders.data, kind]);

  const q = search.trim().toLowerCase();
  const rows = (companies.data ?? []).filter(
    (c: ApiCompany) => c.companyTypeCode === kind && (!q || c.legalName.toLowerCase().includes(q)),
  );

  return (
    <ReportFrame
      title={title}
      controls={
        <>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} label={`Search ${kind}s`} />
          <ExportDropdown
            filename={`ecoglobe-${kind}s`}
            columns={[{ key: "id", label: "Company ID" }, { key: "name", label: "Company" }, { key: "status", label: "Verification" }, { key: "orders", label: "Orders" }, { key: "value", label: "Order value" }, { key: "registered", label: "Registered" }]}
            data={rows.map((c) => ({ id: c.id, name: c.legalName, status: c.verificationStatusName ?? c.verificationStatusCode, orders: stats.get(c.id)?.count ?? 0, value: stats.get(c.id) ? sumByCurrency(stats.get(c.id)!.value) : "", registered: portalDate(c.createdAt) }))}
          />
        </>
      }
    >
      {orders.status === "error" && (
        <p className="mx-4 mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6">Order totals are unavailable: {orders.error}</p>
      )}
      <DataBoundary
        state={companies}
        loadingLabel={`Loading ${kind}s…`}
        isEmpty={() => rows.length === 0}
        empty={{ title: q ? `No ${kind}s match your search` : `No ${kind} companies yet` }}
      >
        {() => (
          <>
            <div className="flex-1 overflow-x-auto px-4 sm:px-6">
              <table className="w-full min-w-[760px] text-left">
                <thead><tr style={{ borderBottom: "1px solid #F0F0F0" }}><Th>Company</Th><Th>Verification</Th><Th>Orders</Th><Th>Order value</Th><Th>Registered</Th></tr></thead>
                <tbody>
                  {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((c) => {
                    const stat = stats.get(c.id);
                    return (
                      <tr
                        key={c.id}
                        style={{ borderBottom: "1px solid #F8F8F8" }}
                        className="cursor-pointer hover:bg-neutral-50"
                        onClick={() => router.push(`/admin/${kind}s/${c.id}`)}
                      >
                        <td className="py-3.5 pr-4">
                          <p className="text-sm font-medium text-neutral-900">{c.legalName}</p>
                          <p className="font-mono text-xs text-neutral-500">CO-{c.id}</p>
                        </td>
                        <td className="py-3.5 pr-4"><StatusPill label={c.verificationStatusName ?? c.verificationStatusCode} tone={c.verificationStatusCode === "verified" ? "green" : c.verificationStatusCode === "suspended" ? "red" : "amber"} /></td>
                        <Td>{orders.data ? stat?.count ?? 0 : "—"}</Td>
                        <Td strong>{orders.data ? (stat ? sumByCurrency(stat.value) : "—") : "—"}</Td>
                        <Td>{portalDate(c.createdAt)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={rows.length} onPage={setPage} />
          </>
        )}
      </DataBoundary>
    </ReportFrame>
  );
}
