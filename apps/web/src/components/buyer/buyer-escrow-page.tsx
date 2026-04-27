"use client";

import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  MoreHorizontal,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Button } from "@eco-globe/ui";
import { BuyerLayout } from "./buyer-layout";
import {
  BuyerEscrowDetailPanel,
  type EscrowDetail,
} from "./buyer-escrow-detail-panel";

type EscrowStatus = "In escrow" | "Released";

interface Escrow {
  id: string;
  orderId: string;
  buyer: string;
  amount: string;
  orderDate: string;
  releaseDate: string;
  status: EscrowStatus;
}

const ESCROWS: Escrow[] = [
  {
    id: "EC12345",
    orderId: "TS12345",
    buyer: "Rising Star Corp",
    amount: "$12,900,000",
    orderDate: "12/12/2026",
    releaseDate: "12/12/2026",
    status: "In escrow",
  },
  {
    id: "EC12355",
    orderId: "TS12355",
    buyer: "Stark Industries",
    amount: "$12,400,000",
    orderDate: "10/28/2027",
    releaseDate: "10/28/2027",
    status: "In escrow",
  },
  {
    id: "EC12346",
    orderId: "TS12346",
    buyer: "Wayne Enterprises",
    amount: "$9,750,000",
    orderDate: "01/15/2027",
    releaseDate: "01/15/2027",
    status: "In escrow",
  },
  {
    id: "EC12356",
    orderId: "TS12356",
    buyer: "Oscorp",
    amount: "$22,700,000",
    orderDate: "11/30/2027",
    releaseDate: "11/30/2027",
    status: "In escrow",
  },
  {
    id: "EC12347",
    orderId: "TS12347",
    buyer: "LexCorp",
    amount: "$14,200,000",
    orderDate: "02/20/2027",
    releaseDate: "02/20/2027",
    status: "In escrow",
  },
  {
    id: "EC12357",
    orderId: "TS12357",
    buyer: "Queen Industries",
    amount: "$8,900,000",
    orderDate: "12/09/2027",
    releaseDate: "12/09/2027",
    status: "In escrow",
  },
  {
    id: "EC12348",
    orderId: "TS12348",
    buyer: "Roxxon Energy",
    amount: "$5,500,000",
    orderDate: "03/11/2027",
    releaseDate: "03/11/2027",
    status: "In escrow",
  },
  {
    id: "EC12358",
    orderId: "TS12358",
    buyer: "Cyberdyne Systems",
    amount: "$6,300,000",
    orderDate: "01/02/2028",
    releaseDate: "01/02/2028",
    status: "Released",
  },
  {
    id: "EC12349",
    orderId: "TS12349",
    buyer: "Umbrella Corp.",
    amount: "$18,300,000",
    orderDate: "04/22/2027",
    releaseDate: "04/22/2027",
    status: "Released",
  },
  {
    id: "EC12359",
    orderId: "TS12359",
    buyer: "Globex Corp.",
    amount: "$17,600,000",
    orderDate: "02/14/2028",
    releaseDate: "02/14/2028",
    status: "Released",
  },
  {
    id: "EC12350",
    orderId: "TS12350",
    buyer: "Aperture Science",
    amount: "$7,150,000",
    orderDate: "05/30/2027",
    releaseDate: "05/30/2027",
    status: "Released",
  },
  {
    id: "EC12360",
    orderId: "TS12360",
    buyer: "InGen",
    amount: "$10,200,000",
    orderDate: "03/21/2028",
    releaseDate: "03/21/2028",
    status: "Released",
  },
  {
    id: "EC12351",
    orderId: "TS12351",
    buyer: "Buy n Large",
    amount: "$11,600,000",
    orderDate: "06/13/2027",
    releaseDate: "06/13/2027",
    status: "Released",
  },
  {
    id: "EC12361",
    orderId: "TS12361",
    buyer: "Tyrell Corp.",
    amount: "$13,900,000",
    orderDate: "04/15/2028",
    releaseDate: "04/15/2028",
    status: "Released",
  },
  {
    id: "EC12352",
    orderId: "TS12352",
    buyer: "Weyland-Yutani",
    amount: "$3,800,000",
    orderDate: "07/07/2027",
    releaseDate: "07/07/2027",
    status: "Released",
  },
  {
    id: "EC12362",
    orderId: "TS12362",
    buyer: "Dunder Mifflin",
    amount: "$9,000,000",
    orderDate: "05/01/2028",
    releaseDate: "05/01/2028",
    status: "Released",
  },
  {
    id: "EC12353",
    orderId: "TS12353",
    buyer: "Acme Corporation",
    amount: "$15,900,000",
    orderDate: "08/19/2027",
    releaseDate: "08/19/2027",
    status: "Released",
  },
  {
    id: "EC12363",
    orderId: "TS12363",
    buyer: "Gekko Industries",
    amount: "$24,800,000",
    orderDate: "06/18/2028",
    releaseDate: "06/18/2028",
    status: "Released",
  },
  {
    id: "EC12354",
    orderId: "TS12354",
    buyer: "Virtanen Inc.",
    amount: "$20,500,000",
    orderDate: "09/14/2027",
    releaseDate: "09/14/2027",
    status: "Released",
  },
  {
    id: "EC12364",
    orderId: "TS12364",
    buyer: "Frobozz Co.",
    amount: "$15,500,000",
    orderDate: "07/30/2028",
    releaseDate: "07/30/2028",
    status: "Released",
  },
];

interface Filters {
  statuses: EscrowStatus[];
  date: string;
}

const defaultFilters: Filters = { statuses: [], date: "" };

const STATUS_PILL: Record<EscrowStatus, string> = {
  "In escrow": "bg-blue-100 text-blue-700",
  Released: "bg-green-100 text-green-700",
};

function StatusPill({ status }: { status: EscrowStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${STATUS_PILL[status]}`}
    >
      {status}
    </span>
  );
}

function FiltersPanel({
  open,
  onClose,
  filters,
  onChange,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (f: Filters) => void;
  onReset: () => void;
}) {
  if (!open) return null;
  const toggleStatus = (s: EscrowStatus) => {
    const next = filters.statuses.includes(s)
      ? filters.statuses.filter((x) => x !== s)
      : [...filters.statuses, s];
    onChange({ ...filters, statuses: next });
  };
  const allStatuses: EscrowStatus[] = ["In escrow", "Released"];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed right-6 top-20 z-50 w-[460px] overflow-hidden rounded-2xl bg-white"
        style={{
          border: "1px solid #F0F0F0",
          boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid #F0F0F0" }}
        >
          <h2 className="text-lg font-bold text-neutral-900">Filters</h2>
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-6 py-6">
          <h3 className="mb-3 text-base font-bold text-neutral-900">Status</h3>
          <div className="grid grid-cols-2 gap-y-3">
            {allStatuses.map((s) => (
              <label
                key={s}
                className="flex cursor-pointer items-center gap-2.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={filters.statuses.includes(s)}
                  onChange={() => toggleStatus(s)}
                  className="sr-only peer"
                />
                <span
                  className="flex size-5 items-center justify-center rounded transition-colors peer-checked:bg-neutral-900"
                  style={{
                    border: filters.statuses.includes(s)
                      ? "1px solid #090909"
                      : "1px solid #D0D0D0",
                  }}
                >
                  {filters.statuses.includes(s) && (
                    <svg
                      className="size-3 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span className="text-neutral-900">{s}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6" style={{ borderTop: "1px solid #F0F0F0" }}>
          <h3 className="mb-3 mt-6 text-base font-bold text-neutral-900">
            Date
          </h3>
          <div className="relative">
            <input
              type="text"
              value={filters.date}
              onChange={(e) => onChange({ ...filters, date: e.target.value })}
              className="w-full rounded-lg bg-white px-4 py-3 pr-11 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/20"
              style={{ border: "1px solid #E0E0E0" }}
            />
            <Calendar className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-neutral-500" />
          </div>
        </div>

        <div
          className="flex items-center justify-between gap-4 px-6 py-4"
          style={{ borderTop: "1px solid #F0F0F0" }}
        >
          <button
            onClick={onReset}
            className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
          >
            Reset
          </button>
          <Button variant="primary" size="md" onClick={onClose}>
            Apply
          </Button>
        </div>
      </div>
    </>
  );
}

function buildEscrowDetail(e: Escrow): EscrowDetail {
  const released = e.status === "Released";
  return {
    id: e.id,
    amount: e.amount,
    status: released ? "Released" : "In Progress",
    info: {
      amountTotal: e.amount,
      amountHeld: released ? "$0" : e.amount,
      fundedDate: e.orderDate,
      orderId: "OD20411",
      seller: "Shell Refinery Louisiana",
      shippingType: "Delivery",
    },
    documents: [
      { name: "Example data name.pdf" },
      { name: "Example data name.pdf" },
    ],
    activity: [
      {
        label: "Buyer funded escrow",
        date: "Oct 29, 2024 10:10 AM",
        complete: true,
      },
      {
        label: "Seller uploaded BOL",
        date: "Oct 29, 2024 10:10 AM",
        complete: true,
      },
      { label: "Buyer confirms delivery", complete: released },
      { label: "Funds released", complete: released },
    ],
  };
}

const PAGE_SIZE = 20;

export function BuyerEscrowPage() {
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = ESCROWS.filter((e) => {
    if (filters.statuses.length && !filters.statuses.includes(e.status))
      return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !e.id.toLowerCase().includes(q) &&
        !e.orderId.toLowerCase().includes(q) &&
        !e.buyer.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = selectedId
    ? ESCROWS.find((e) => e.id === selectedId) ?? null
    : null;

  return (
    <BuyerLayout>
      <div className="flex h-full flex-col bg-neutral-50">
        <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-6">
          <h1 className="text-2xl font-bold text-neutral-900">Escrow</h1>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <Search className="size-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Seach"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-40 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
              />
            </div>
            <button
              onClick={() => setFiltersOpen(true)}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-neutral-900"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <SlidersHorizontal className="size-4" />
              Filters
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-6">
          <div
            className="overflow-hidden rounded-2xl bg-white"
            style={{ border: "1px solid #F0F0F0" }}
          >
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #F0F0F0" }}>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-700">
                    Escrow ID
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-700">
                    Order ID
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-700">
                    Buyer
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-700">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-700">
                    Order Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-700">
                    Release Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-700">
                    Status
                  </th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setSelectedId(e.id)}
                    className="cursor-pointer hover:bg-neutral-50"
                    style={{ borderTop: "1px solid #F8F8F8" }}
                  >
                    <td className="px-6 py-4 text-sm text-neutral-900">
                      {e.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-700">
                      {e.orderId}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-900">
                      {e.buyer}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-900">
                      {e.amount}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-700">
                      {e.orderDate}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-700">
                      {e.releaseDate}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill status={e.status} />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setSelectedId(e.id);
                        }}
                        aria-label="More"
                        className="text-neutral-400 hover:text-neutral-700"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {pageItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-16 text-center text-sm text-neutral-500"
                    >
                      No escrow records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className="flex size-8 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 disabled:opacity-30"
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
              {totalPages > 4 && <span className="px-2 text-neutral-500">…</span>}
              {totalPages > 3 && (
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  className={`flex size-8 items-center justify-center rounded-full text-sm font-medium ${
                    page === totalPages
                      ? "bg-green-100 text-green-700"
                      : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  {totalPages}
                </button>
              )}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
                className="flex size-8 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-900"
              style={{ border: "1px solid #E0E0E0" }}
            >
              {PAGE_SIZE} / page
              <ChevronDown className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <FiltersPanel
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(defaultFilters)}
      />

      <BuyerEscrowDetailPanel
        escrow={selected ? buildEscrowDetail(selected) : null}
        onClose={() => setSelectedId(null)}
      />
    </BuyerLayout>
  );
}
