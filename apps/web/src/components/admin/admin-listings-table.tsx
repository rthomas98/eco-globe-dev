"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileWarning, Plus, Search, ShieldCheck } from "lucide-react";
import { ExportDropdown } from "@/components/admin/export-dropdown";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";
import { describeBackendError } from "@/lib/backend-client";
import { fetchOrders, type ApiOrder } from "@/lib/api-orders";
import { portalMoney } from "@/lib/api-portal";
import { closeListing, fetchListings, reopenListing, type BackendListing } from "@/lib/listings-api";
import { formatNumber } from "@/lib/listing-format";
import { LISTING_SEARCH_FIELDS, type ListingSearchField } from "@/lib/listing-search";
import {
  ADMIN_LISTING_STATUS_FILTERS,
  adminListingActions,
  countByStatus,
  filterAdminListings,
  listingHasSds,
  listingStatusLabel,
  listingStatusTone,
  type AdminListingStatusFilter,
} from "@/lib/admin-listings";
import { CloseListingDialog } from "./close-listing-dialog";

const PAGE_SIZE = 20;

interface OrderActivity {
  orders: number;
  unitsSold: number;
  value: string;
}

/** Only currency-consistent totals are summed; mixed currencies are listed separately. */
function sumByCurrency(orders: ApiOrder[]) {
  const totals = new Map<string, number>();
  for (const o of orders) totals.set(o.currencyCode, (totals.get(o.currencyCode) ?? 0) + Number(o.totalAmount));
  return [...totals.entries()].map(([currency, total]) => portalMoney(total, currency)).join(" + ");
}

/** A write response may omit joined fields; keep what the table already showed. */
function mergeListing(previous: BackendListing, next: BackendListing): BackendListing {
  return {
    ...previous,
    ...next,
    sellerCompanyName: next.sellerCompanyName ?? previous.sellerCompanyName,
    documents: next.documents ?? previous.documents,
  };
}

const TONE_CLASS = {
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  neutral: "bg-neutral-100 text-neutral-600",
} as const;

const CONTROL_CLASS = "rounded-full bg-white px-3 py-2 text-sm";
const CONTROL_STYLE = { border: "1px solid #F0F0F0" };

/** Admin listing management: every listing in every status, with create, edit, close and reopen. */
export function AdminListingsTable() {
  const listings = useBackendData(
    // For platform admins the owned scope returns every listing in every status.
    () => fetchListings("owned"),
    [],
    "Listings could not be loaded.",
  );
  const orders = useBackendData(() => fetchOrders(), [], "Orders could not be loaded.");
  // Rows changed by an action on this page, shown until the next full reload.
  const [updated, setUpdated] = useState<Record<number, BackendListing>>({});
  const [status, setStatus] = useState<AdminListingStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [searchIn, setSearchIn] = useState<ListingSearchField>("product");
  const [page, setPage] = useState(1);
  const [closing, setClosing] = useState<BackendListing | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const all = useMemo(
    () => (listings.data ?? []).map((l) => updated[l.id] ?? l),
    [listings.data, updated],
  );
  const activity = useMemo(() => {
    const byListing = new Map<number, ApiOrder[]>();
    for (const o of orders.data ?? []) {
      if (o.listingId === null || o.orderStatusCode === "cancelled") continue;
      byListing.set(o.listingId, [...(byListing.get(o.listingId) ?? []), o]);
    }
    const result = new Map<number, OrderActivity>();
    for (const [id, list] of byListing) {
      result.set(id, {
        orders: list.length,
        unitsSold: list.reduce((sum, o) => sum + Number(o.quantity ?? 0), 0),
        value: sumByCurrency(list),
      });
    }
    return result;
  }, [orders.data]);
  const rows = useMemo(() => filterAdminListings(all, { status, search, searchIn }), [all, status, search, searchIn]);
  const counts = useMemo(() => countByStatus(all), [all]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const searchField = LISTING_SEARCH_FIELDS.find((f) => f.value === searchIn) ?? LISTING_SEARCH_FIELDS[0]!;

  const applyUpdate = (previous: BackendListing, next: BackendListing) =>
    setUpdated((prev) => ({ ...prev, [previous.id]: mergeListing(previous, next) }));

  const confirmClose = async () => {
    if (!closing || busyId !== null) return;
    setBusyId(closing.id);
    setDialogError(null);
    try {
      applyUpdate(closing, await closeListing(closing.id));
      setNotice(`LS-${closing.id} was closed. Its order history is kept.`);
      setRowError(null);
      setClosing(null);
    } catch (err) {
      setDialogError(describeBackendError(err, "The listing could not be closed."));
    } finally {
      setBusyId(null);
    }
  };

  const reopen = async (listing: BackendListing) => {
    if (busyId !== null) return;
    setBusyId(listing.id);
    setRowError(null);
    try {
      applyUpdate(listing, await reopenListing(listing.id));
      setNotice(`LS-${listing.id} was reopened as a draft. Edit it to publish again.`);
    } catch (err) {
      setRowError({ id: listing.id, message: describeBackendError(err, "The listing could not be reopened.") });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <h1 className="text-2xl font-bold text-neutral-900">Listings</h1>
        <div className="flex flex-wrap items-center gap-3">
          <ExportDropdown
            filename="listings"
            columns={[{ key: "id", label: "Listing ID" }, { key: "name", label: "Product" }, { key: "seller", label: "Seller" }, { key: "status", label: "Status" }, { key: "sds", label: "SDS" }, { key: "orders", label: "Orders" }, { key: "value", label: "Order value" }]}
            data={rows.map((l) => ({ id: `LS-${l.id}`, name: l.title, seller: l.sellerCompanyName ?? "", status: l.listingStatusCode, sds: listingHasSds(l) ? "Yes" : "No", orders: activity.get(l.id)?.orders ?? 0, value: activity.get(l.id)?.value ?? "" }))}
          />
          <Link href="/admin/listings/import" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-900" style={{ border: "1px solid #E0E0E0" }}>
            Import from spreadsheet
          </Link>
          <Link href="/admin/listings/new" className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
            <Plus className="size-4" aria-hidden /> New listing
          </Link>
        </div>
      </div>

      {listings.data && (
        <div className="grid grid-cols-2 gap-3 px-4 pb-5 sm:px-6 lg:grid-cols-4">
          {[
            { label: "Listings", value: all.length },
            { label: "Published", value: counts.published ?? 0 },
            { label: "Awaiting review", value: counts.pending_review ?? 0 },
            { label: "Drafts", value: counts.draft ?? 0 },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-2 rounded-xl px-5 py-4" style={CONTROL_STYLE}>
              <span className="text-sm text-neutral-500">{item.label}</span>
              <span className="text-xl font-bold text-neutral-900 sm:text-2xl">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 px-4 pb-4 sm:px-6">
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => { setStatus(e.target.value as AdminListingStatusFilter); setPage(1); }}
          className={CONTROL_CLASS}
          style={CONTROL_STYLE}
        >
          {ADMIN_LISTING_STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}{f.value === "all" ? "" : ` (${counts[f.value] ?? 0})`}
            </option>
          ))}
        </select>
        <select
          aria-label="Search in"
          value={searchIn}
          onChange={(e) => { setSearchIn(e.target.value as ListingSearchField); setPage(1); }}
          className={CONTROL_CLASS}
          style={CONTROL_STYLE}
        >
          {LISTING_SEARCH_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>Search in: {f.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2" style={CONTROL_STYLE}>
          <Search className="size-4 text-neutral-400" aria-hidden />
          <input
            type="search"
            aria-label={searchField.inputLabel}
            placeholder={searchIn === "seller" ? "Seller name or LS-id" : "Product title or LS-id"}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-48 bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
        </div>
        {(status !== "all" || search.trim()) && (
          <button
            type="button"
            onClick={() => { setStatus("all"); setSearch(""); setPage(1); }}
            className="text-sm font-medium text-neutral-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {notice && (
        <p role="status" className="mx-4 mb-4 flex items-center justify-between gap-3 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 sm:mx-6">
          {notice}
          <button type="button" onClick={() => setNotice(null)} className="text-xs font-semibold underline">Dismiss</button>
        </p>
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
        empty={{
          title: all.length === 0 ? "No listings yet" : "No listings match your search or filters",
          description: all.length === 0 ? "Create a listing for a seller company or import them from a spreadsheet." : undefined,
        }}
      >
        {() => (
          <>
            <div className="flex-1 overflow-x-auto px-4 sm:px-6">
              <table className="w-full min-w-[1080px] text-left">
                <thead>
                  <tr style={{ borderBottom: "1px solid #F0F0F0" }}>
                    {["Listing", "Product", "Seller", "Status", "SDS", "Price / unit", "Available", "Orders", "Order value", "Actions"].map((h) => (
                      <th key={h} className="pb-3 pr-4 text-sm font-medium text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((l) => (
                    <ListingRow
                      key={l.id}
                      listing={l}
                      activity={orders.data ? activity.get(l.id) ?? { orders: 0, unitsSold: 0, value: "—" } : null}
                      busy={busyId === l.id}
                      disabled={busyId !== null}
                      error={rowError?.id === l.id ? rowError.message : null}
                      onClose={() => { setDialogError(null); setClosing(l); }}
                      onReopen={() => void reopen(l)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-4 sm:px-6" style={{ borderTop: "1px solid #F0F0F0" }}>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Previous page" onClick={() => setPage(Math.max(1, currentPage - 1))} className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronLeft className="size-4" /></button>
                <span className="px-2 text-sm text-neutral-600">Page {currentPage} of {pages}</span>
                <button type="button" aria-label="Next page" onClick={() => setPage(Math.min(pages, currentPage + 1))} className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronRight className="size-4" /></button>
              </div>
              <span className="text-sm text-neutral-500">{rows.length} records</span>
            </div>
          </>
        )}
      </DataBoundary>

      {closing && (
        <CloseListingDialog
          listingLabel={`LS-${closing.id} (${closing.title})`}
          busy={busyId === closing.id}
          error={dialogError}
          onConfirm={() => void confirmClose()}
          onClose={() => setClosing(null)}
        />
      )}
    </div>
  );
}

function formatPrice(l: BackendListing) {
  if (l.pricePerUnit === null || l.pricePerUnit === undefined) return "—";
  return `${portalMoney(Number(l.pricePerUnit), l.currencyCode ?? "USD")} / ${l.quantityUnit ?? "unit"}`;
}

function formatAvailable(l: BackendListing) {
  return l.quantity === null ? "—" : `${formatNumber(l.quantity)} ${l.quantityUnit ?? ""}`;
}

function SellerLink({ listing: l }: { listing: BackendListing }) {
  if (!l.sellerCompanyId) return <>{l.sellerCompanyName ?? "—"}</>;
  return (
    <Link href={`/admin/sellers/${l.sellerCompanyId}`} className="hover:underline">
      {l.sellerCompanyName ?? `Company ${l.sellerCompanyId}`}
    </Link>
  );
}

function SdsIndicator({ listing }: { listing: BackendListing }) {
  if (listingHasSds(listing)) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><ShieldCheck className="size-4" aria-hidden /> On file</span>;
  }
  return (
    <Link href={`/admin/listings/LS-${listing.id}/edit#sds`} className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline">
      <FileWarning className="size-4" aria-hidden /> Missing
    </Link>
  );
}

function RowActions({
  listing,
  busy,
  disabled,
  onClose,
  onReopen,
}: {
  listing: BackendListing;
  busy: boolean;
  disabled: boolean;
  onClose: () => void;
  onReopen: () => void;
}) {
  const { canClose, canReopen } = adminListingActions(listing.listingStatusCode);
  return (
    <div className="flex items-center gap-3 whitespace-nowrap">
      <Link href={`/admin/listings/LS-${listing.id}`} className="font-medium text-neutral-700 hover:underline">View</Link>
      <Link href={`/admin/listings/LS-${listing.id}/edit`} className="font-medium text-neutral-900 hover:underline">Edit</Link>
      {canClose && (
        <button type="button" onClick={onClose} disabled={disabled} className="font-medium text-red-700 hover:underline disabled:opacity-50">
          Close
        </button>
      )}
      {canReopen && (
        <button type="button" onClick={onReopen} disabled={disabled} aria-busy={busy} className="font-medium text-green-700 hover:underline disabled:opacity-50">
          {busy ? "Reopening…" : "Reopen"}
        </button>
      )}
    </div>
  );
}

function ListingRow({
  listing: l,
  activity,
  busy,
  disabled,
  error,
  onClose,
  onReopen,
}: {
  listing: BackendListing;
  activity: OrderActivity | null;
  busy: boolean;
  disabled: boolean;
  error: string | null;
  onClose: () => void;
  onReopen: () => void;
}) {
  const view = `/admin/listings/LS-${l.id}`;
  const td = "py-3.5 pr-4 text-sm text-neutral-700";
  return (
    <>
      <tr style={{ borderBottom: error ? undefined : "1px solid #F8F8F8" }} className="hover:bg-neutral-50">
        <td className="py-3.5 pr-4 text-sm text-neutral-900">
          <Link href={view} className="font-medium hover:underline">LS-{l.id}</Link>
        </td>
        <td className="max-w-[240px] truncate py-3.5 pr-4 text-sm text-neutral-700">
          <Link href={view} className="hover:underline" title={l.title}>{l.title}</Link>
        </td>
        <td className={td}><SellerLink listing={l} /></td>
        <td className="py-3.5 pr-4">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${TONE_CLASS[listingStatusTone(l.listingStatusCode)]}`}>
            {listingStatusLabel(l.listingStatusCode)}
          </span>
        </td>
        <td className="py-3.5 pr-4"><SdsIndicator listing={l} /></td>
        <td className={td}>{formatPrice(l)}</td>
        <td className={td}>{formatAvailable(l)}</td>
        <td className={td}>{activity?.orders ?? "—"}</td>
        <td className="py-3.5 pr-4 text-sm text-neutral-900">{activity?.orders ? activity.value : "—"}</td>
        <td className="py-3.5 pr-4 text-sm">
          <RowActions listing={l} busy={busy} disabled={disabled} onClose={onClose} onReopen={onReopen} />
        </td>
      </tr>
      {error && (
        <tr style={{ borderBottom: "1px solid #F8F8F8" }}>
          <td colSpan={10} className="pb-3 pr-4">
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          </td>
        </tr>
      )}
    </>
  );
}
