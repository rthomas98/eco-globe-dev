"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  ChevronDown,
  SlidersHorizontal,
  DollarSign,
  History,
  CheckCircle2,
  AlertTriangle,
  MoreHorizontal,
  X,
  Calendar,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";

type EscrowStatus = "Funded" | "Released" | "Disputed";

interface Escrow {
  id: string;
  orderId: string;
  seller: string;
  amount: number;
  orderDate: string;
  releaseDate: string;
  status: EscrowStatus;
  buyer: string;
  shippingType: "Delivery" | "Pickup";
  fundedDate: string;
}

const escrows: Escrow[] = [
  { id: "EC12345", orderId: "TS12345", seller: "Rising Star Corp",   amount: 12_900_000, orderDate: "12/12/2026", releaseDate: "ERD 03/11/2027", status: "Funded",   buyer: "Shell Refinery Louisiana", shippingType: "Delivery", fundedDate: "01/15/2027" },
  { id: "EC12355", orderId: "TS12355", seller: "Stark Industries",   amount: 12_400_000, orderDate: "10/28/2027", releaseDate: "ERD 03/11/2027", status: "Funded",   buyer: "BP North America",        shippingType: "Delivery", fundedDate: "10/28/2027" },
  { id: "EC12346", orderId: "TS12346", seller: "Wayne Enterprises",  amount:  9_750_000, orderDate: "01/15/2027", releaseDate: "ERD 03/11/2027", status: "Funded",   buyer: "ExxonMobil",              shippingType: "Pickup",   fundedDate: "01/15/2027" },
  { id: "EC12356", orderId: "TS12356", seller: "Oscorp",             amount: 22_700_000, orderDate: "11/30/2027", releaseDate: "ERD 03/11/2027", status: "Funded",   buyer: "Phillips 66",             shippingType: "Delivery", fundedDate: "11/30/2027" },
  { id: "EC12347", orderId: "TS12347", seller: "LexCorp",            amount: 14_200_000, orderDate: "02/20/2027", releaseDate: "ERD 03/11/2027", status: "Funded",   buyer: "Marathon Petroleum",      shippingType: "Delivery", fundedDate: "02/20/2027" },
  { id: "EC12357", orderId: "TS12357", seller: "Queen Industries",   amount:  8_900_000, orderDate: "12/09/2027", releaseDate: "ERD 03/11/2027", status: "Funded",   buyer: "Valero",                  shippingType: "Delivery", fundedDate: "12/09/2027" },
  { id: "EC12348", orderId: "TS12348", seller: "Roxxon Energy",      amount:  5_500_000, orderDate: "03/11/2027", releaseDate: "ERD 03/11/2027", status: "Funded",   buyer: "Chevron",                 shippingType: "Pickup",   fundedDate: "03/11/2027" },
  { id: "EC12358", orderId: "TS12358", seller: "Cyberdyne Systems",  amount:  6_300_000, orderDate: "01/02/2028", releaseDate: "01/02/2028",     status: "Released", buyer: "Sinclair Oil",            shippingType: "Delivery", fundedDate: "12/12/2027" },
  { id: "EC12349", orderId: "TS12349", seller: "Umbrella Corp.",     amount: 18_300_000, orderDate: "04/22/2027", releaseDate: "04/22/2027",     status: "Released", buyer: "ConocoPhillips",          shippingType: "Delivery", fundedDate: "03/22/2027" },
  { id: "EC12359", orderId: "TS12359", seller: "Globex Corp.",       amount: 17_600_000, orderDate: "02/14/2028", releaseDate: "02/14/2028",     status: "Released", buyer: "Hess Corp",               shippingType: "Delivery", fundedDate: "01/14/2028" },
  { id: "EC12350", orderId: "TS12350", seller: "Aperture Science",   amount:  7_150_000, orderDate: "05/30/2027", releaseDate: "05/30/2027",     status: "Released", buyer: "Citgo",                   shippingType: "Pickup",   fundedDate: "04/30/2027" },
  { id: "EC12360", orderId: "TS12360", seller: "InGen",              amount: 10_200_000, orderDate: "03/21/2028", releaseDate: "03/21/2028",     status: "Released", buyer: "Tesoro",                  shippingType: "Delivery", fundedDate: "02/21/2028" },
  { id: "EC12351", orderId: "TS12351", seller: "Buy n Large",        amount: 11_600_000, orderDate: "06/13/2027", releaseDate: "06/13/2027",     status: "Released", buyer: "PBF Energy",              shippingType: "Delivery", fundedDate: "05/13/2027" },
  { id: "EC12361", orderId: "TS12361", seller: "Tyrell Corp.",       amount: 13_900_000, orderDate: "04/15/2028", releaseDate: "04/15/2028",     status: "Released", buyer: "HollyFrontier",           shippingType: "Pickup",   fundedDate: "03/15/2028" },
  { id: "EC12352", orderId: "TS12352", seller: "Weyland-Yutani",     amount:  3_800_000, orderDate: "07/07/2027", releaseDate: "07/07/2027",     status: "Released", buyer: "Murphy Oil",              shippingType: "Delivery", fundedDate: "06/07/2027" },
  { id: "EC12362", orderId: "TS12362", seller: "Dunder Mifflin",     amount:  9_000_000, orderDate: "05/01/2028", releaseDate: "05/01/2028",     status: "Released", buyer: "Calumet",                 shippingType: "Delivery", fundedDate: "04/01/2028" },
  { id: "EC12353", orderId: "TS12353", seller: "Acme Corporation",   amount: 15_900_000, orderDate: "08/19/2027", releaseDate: "08/19/2027",     status: "Released", buyer: "Delek US",                shippingType: "Delivery", fundedDate: "07/19/2027" },
  { id: "EC12363", orderId: "TS12363", seller: "Gekko Industries",   amount: 24_800_000, orderDate: "06/18/2028", releaseDate: "06/18/2028",     status: "Released", buyer: "PBF Energy",              shippingType: "Delivery", fundedDate: "05/18/2028" },
  { id: "EC12354", orderId: "TS12354", seller: "Virtanen Inc.",      amount: 20_500_000, orderDate: "09/14/2027", releaseDate: "09/14/2027",     status: "Released", buyer: "World Fuel Services",     shippingType: "Pickup",   fundedDate: "08/14/2027" },
  { id: "EC12364", orderId: "TS12364", seller: "Frobozz Co.",        amount: 15_500_000, orderDate: "07/30/2028", releaseDate: "07/30/2028",     status: "Released", buyer: "Phillips 66",             shippingType: "Delivery", fundedDate: "06/30/2028" },
];

function formatMoney(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

function StatusBadge({ status }: { status: EscrowStatus }) {
  const styles: Record<EscrowStatus, string> = {
    Funded: "bg-blue-50 text-blue-700",
    Released: "bg-green-50 text-green-700",
    Disputed: "bg-amber-50 text-amber-700",
  };
  return (
    <span
      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  iconBg = "bg-neutral-100",
  iconColor = "text-neutral-600",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-neutral-500">{label}</p>
        <div className={`flex size-9 items-center justify-center rounded-full ${iconBg}`}>
          <Icon className={`size-4 ${iconColor}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}

function FilterPanel({
  open,
  onClose,
  statusFilter,
  onStatusToggle,
  onReset,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  statusFilter: Record<EscrowStatus, boolean>;
  onStatusToggle: (s: EscrowStatus) => void;
  onReset: () => void;
  onApply: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="absolute right-0 top-12 z-30 w-[420px] rounded-2xl bg-white p-6 shadow-xl"
      style={{ border: "1px solid #E0E0E0" }}
    >
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-bold text-neutral-900">Filters</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close filters"
          className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="border-t border-neutral-100 pt-5">
        <p className="mb-3 text-sm font-medium text-neutral-900">Order date</p>
        <div className="relative">
          <Input id="order-date" />
          <Calendar className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400" />
        </div>
      </div>

      <div className="mt-6 border-t border-neutral-100 pt-5">
        <p className="mb-3 text-sm font-medium text-neutral-900">Escrow status</p>
        <div className="grid grid-cols-2 gap-3">
          {(["Funded", "Released"] as EscrowStatus[]).map((s) => (
            <label key={s} className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={statusFilter[s]}
                onChange={() => onStatusToggle(s)}
                className="size-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span className="text-sm text-neutral-700">{s}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-5">
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-neutral-900 hover:underline"
        >
          Reset
        </button>
        <Button variant="primary" size="md" onClick={onApply}>
          Apply
        </Button>
      </div>
    </div>
  );
}

function EscrowDetailDrawer({
  escrow,
  onClose,
}: {
  escrow: Escrow;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-[760px] flex-col overflow-y-auto bg-neutral-50 shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-neutral-50 px-8 py-6" style={{ borderBottom: "1px solid #F0F0F0" }}>
          <div>
            <div className="mb-1 flex items-center gap-3">
              <h2 className="text-2xl font-bold text-neutral-900">
                Escrow ID: {escrow.id}
              </h2>
              <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                In Progress
              </span>
            </div>
            <p className="text-sm text-neutral-500">{formatMoney(escrow.amount)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="More"
              className="flex size-9 items-center justify-center rounded-full bg-white text-neutral-500 hover:text-neutral-900"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <MoreHorizontal className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-full bg-white text-neutral-500 hover:text-neutral-900"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-8 py-6">
          {/* Escrow info */}
          <div className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900">Escrow info</h3>
              <button
                type="button"
                className="text-sm font-medium text-green-700 hover:underline"
              >
                View Order Detail
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <Field label="Amount Total" value={formatMoney(escrow.amount)} />
              <Field label="Amount held" value={formatMoney(escrow.amount)} />
              <Field label="Funded date" value={escrow.fundedDate} />
              <Field label="Order ID" value={`OD${escrow.orderId.replace("TS", "204")}`} />
              <Field label="Buyer" value={escrow.buyer} />
              <Field label="Shipping type" value={escrow.shippingType} />
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
            <h3 className="mb-4 text-lg font-bold text-neutral-900">Documents</h3>
            <div className="flex flex-col gap-2">
              {["Example data name.pdf", "Example data name.pdf"].map((name, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-neutral-50 px-4 py-3">
                  <FileText className="size-5 text-neutral-500" />
                  <span className="flex-1 text-sm text-neutral-900">{name}</span>
                  <button
                    type="button"
                    aria-label="Download"
                    className="text-neutral-500 hover:text-neutral-900"
                  >
                    <Download className="size-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="More"
                    className="text-neutral-500 hover:text-neutral-900"
                  >
                    <MoreHorizontal className="size-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Activity log */}
          <div className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
            <h3 className="mb-5 text-lg font-bold text-neutral-900">Activity Log</h3>
            <Timeline />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-neutral-900">{label}</p>
      <p className="text-sm text-neutral-700">{value}</p>
    </div>
  );
}

function Timeline() {
  const events = [
    { label: "Buyer funded escrow",   ts: "Oct 29, 2024 10:10 AM", done: true },
    { label: "Seller uploaded BOL",   ts: "Oct 29, 2024 10:10 AM", done: true },
    { label: "Buyer confirms delivery", ts: "",                    done: false },
    { label: "Funds released",        ts: "",                      done: false },
  ];
  return (
    <div className="relative flex flex-col gap-5">
      {events.map((e, i) => (
        <div key={i} className="flex items-start gap-4">
          <div className="relative flex flex-col items-center">
            <span
              className={`size-2.5 shrink-0 rounded-full ${
                e.done ? "bg-green-500" : "bg-neutral-300"
              }`}
            />
            {i < events.length - 1 && (
              <span
                className={`mt-1 h-9 w-px ${
                  e.done && events[i + 1].done ? "bg-green-500" : "bg-neutral-200"
                }`}
              />
            )}
          </div>
          <div className="flex flex-1 items-start justify-between">
            <p
              className={`text-sm ${
                e.done ? "text-neutral-900" : "text-neutral-500"
              }`}
            >
              {e.label}
            </p>
            {e.ts && <p className="text-sm text-neutral-500">{e.ts}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EscrowPage() {
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Record<EscrowStatus, boolean>>({
    Funded: false,
    Released: false,
    Disputed: false,
  });
  const [appliedFilter, setAppliedFilter] = useState<Record<EscrowStatus, boolean>>({
    Funded: false,
    Released: false,
    Disputed: false,
  });
  const [selected, setSelected] = useState<Escrow | null>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filtersOpen) return;
    const handler = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filtersOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const anyStatus = Object.values(appliedFilter).some(Boolean);
    return escrows.filter((e) => {
      if (anyStatus && !appliedFilter[e.status]) return false;
      if (!q) return true;
      return (
        e.id.toLowerCase().includes(q) ||
        e.orderId.toLowerCase().includes(q) ||
        e.seller.toLowerCase().includes(q)
      );
    });
  }, [search, appliedFilter]);

  return (
    <SellerLayout title="Escrow">
      {/* Page header */}
      <div className="relative mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-neutral-900">Escrow</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-[260px] rounded-full bg-white py-2.5 pl-11 pr-4 text-sm outline-none placeholder:text-neutral-400"
              style={{ border: "1px solid #E0E0E0" }}
            />
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-neutral-900"
            style={{ border: "1px solid #E0E0E0" }}
          >
            Last 30 days <ChevronDown className="size-4" />
          </button>
          <div ref={filtersRef} className="relative">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-neutral-900"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <SlidersHorizontal className="size-4" /> Filters
            </button>
            <FilterPanel
              open={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              statusFilter={statusFilter}
              onStatusToggle={(s) =>
                setStatusFilter((p) => ({ ...p, [s]: !p[s] }))
              }
              onReset={() => {
                const empty = { Funded: false, Released: false, Disputed: false };
                setStatusFilter(empty);
                setAppliedFilter(empty);
              }}
              onApply={() => {
                setAppliedFilter(statusFilter);
                setFiltersOpen(false);
              }}
            />
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Funds on Hold"   value="$123,456,789" icon={DollarSign}    iconBg="bg-neutral-100" iconColor="text-neutral-600" />
        <KpiCard label="Pending Release" value="$123,456,789" icon={History}       iconBg="bg-neutral-100" iconColor="text-neutral-600" />
        <KpiCard label="Released Funds"  value="$123,456,789" icon={CheckCircle2}  iconBg="bg-green-50"    iconColor="text-green-600" />
        <KpiCard label="Disputed Funds"  value="$123,456,789" icon={AlertTriangle} iconBg="bg-amber-50"    iconColor="text-amber-600" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm font-semibold text-neutral-900" style={{ borderBottom: "1px solid #F0F0F0" }}>
                <th className="px-6 py-4">Escrow ID</th>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Seller</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Order Date</th>
                <th className="px-6 py-4">Release Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className="cursor-pointer text-sm text-neutral-700 hover:bg-neutral-50"
                  style={{ borderBottom: "1px solid #F5F5F5" }}
                >
                  <td className="px-6 py-4 font-medium text-neutral-900">{e.id}</td>
                  <td className="px-6 py-4">{e.orderId}</td>
                  <td className="px-6 py-4">{e.seller}</td>
                  <td className="px-6 py-4">{formatMoney(e.amount)}</td>
                  <td className="px-6 py-4">{e.orderDate}</td>
                  <td className="px-6 py-4">{e.releaseDate}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      aria-label="Actions"
                      onClick={(ev) => ev.stopPropagation()}
                      className="text-neutral-400 hover:text-neutral-900"
                    >
                      <MoreHorizontal className="size-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-sm text-neutral-500">
                    No escrows match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-4 px-6 py-4" style={{ borderTop: "1px solid #F5F5F5" }}>
          <Pagination />
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-neutral-700"
            style={{ border: "1px solid #E0E0E0" }}
          >
            20 / page <ChevronDown className="size-4" />
          </button>
        </div>
      </div>

      {selected && (
        <EscrowDetailDrawer escrow={selected} onClose={() => setSelected(null)} />
      )}
    </SellerLayout>
  );
}

function Pagination() {
  const [page, setPage] = useState(1);
  const total = 15;
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Previous"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
      >
        <ChevronLeft className="size-4" />
      </button>
      {[1, 2, 3].map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => setPage(p)}
          className={`flex size-8 items-center justify-center rounded-full text-sm font-medium ${
            page === p
              ? "bg-green-100 text-green-700"
              : "text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          {p}
        </button>
      ))}
      <span className="px-2 text-sm text-neutral-400">…</span>
      <button
        type="button"
        onClick={() => setPage(total)}
        className={`flex size-8 items-center justify-center rounded-full text-sm font-medium ${
          page === total
            ? "bg-green-100 text-green-700"
            : "text-neutral-700 hover:bg-neutral-100"
        }`}
      >
        {total}
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={() => setPage((p) => Math.min(total, p + 1))}
        className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
