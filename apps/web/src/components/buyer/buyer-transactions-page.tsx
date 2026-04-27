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
  BuyerTransactionDetailPanel,
  type TransactionDetail,
} from "./buyer-transaction-detail-panel";

type TxStatus = "Processing" | "Completed" | "Failed";
type TxType = "Escrow funding" | "Escrow released" | "Refund";

interface Transaction {
  id: string;
  date: string;
  orderId: string;
  seller: string;
  amount: string;
  type: TxType;
  status: TxStatus;
}

const TRANSACTIONS: Transaction[] = [
  {
    id: "TS12346",
    date: "01/15/2027",
    orderId: "OD12346",
    seller: "Acme Company",
    amount: "$15,500,000",
    type: "Escrow funding",
    status: "Processing",
  },
  {
    id: "TS12348",
    date: "03/05/2027",
    orderId: "OD12348",
    seller: "Vought Int",
    amount: "$10,300,000",
    type: "Escrow released",
    status: "Completed",
  },
  {
    id: "TS12349",
    date: "04/10/2027",
    orderId: "OD12349",
    seller: "Reynholm Ind",
    amount: "$9,450,000",
    type: "Escrow released",
    status: "Completed",
  },
  {
    id: "TS12350",
    date: "05/15/2027",
    orderId: "OD12350",
    seller: "Dunder Mifflin",
    amount: "$14,200,000",
    type: "Escrow released",
    status: "Completed",
  },
  {
    id: "TS12347",
    date: "02/20/2027",
    orderId: "OD12347",
    seller: "Krieger LLC",
    amount: "$8,750,000",
    type: "Refund",
    status: "Failed",
  },
  {
    id: "TS12351",
    date: "06/20/2027",
    orderId: "OD12351",
    seller: "Nakatomi Corp",
    amount: "$20,000,000",
    type: "Escrow released",
    status: "Completed",
  },
  {
    id: "TS12352",
    date: "07/25/2027",
    orderId: "OD12352",
    seller: "Soylent Corp",
    amount: "$18,750,000",
    type: "Escrow released",
    status: "Completed",
  },
  {
    id: "TS12353",
    date: "08/30/2027",
    orderId: "OD12353",
    seller: "Enron",
    amount: "$16,850,000",
    type: "Escrow released",
    status: "Completed",
  },
  {
    id: "TS12354",
    date: "09/14/2027",
    orderId: "OD12354",
    seller: "Omni Consumer",
    amount: "$7,900,000",
    type: "Escrow released",
    status: "Completed",
  },
  {
    id: "TS12355",
    date: "10/18/2027",
    orderId: "OD12355",
    seller: "Frobozz Co.",
    amount: "$22,100,000",
    type: "Escrow released",
    status: "Completed",
  },
  {
    id: "TS12356",
    date: "11/22/2027",
    orderId: "OD12356",
    seller: "MomCorp",
    amount: "$11,600,000",
    type: "Escrow released",
    status: "Completed",
  },
  {
    id: "TS12357",
    date: "12/01/2027",
    orderId: "OD12357",
    seller: "Bubba Gump",
    amount: "$13,300,000",
    type: "Escrow released",
    status: "Completed",
  },
  {
    id: "TS12358",
    date: "01/12/2028",
    orderId: "OD12358",
    seller: "Springfield Power",
    amount: "$10,950,000",
    type: "Escrow released",
    status: "Completed",
  },
  {
    id: "TS12359",
    date: "02/16/2028",
    orderId: "OD12359",
    seller: "Strickland Propane",
    amount: "$9,200,000",
    type: "Escrow released",
    status: "Completed",
  },
  {
    id: "TS12360",
    date: "03/21/2028",
    orderId: "OD12360",
    seller: "Olivia Pope & Assoc.",
    amount: "$12,400,000",
    type: "Escrow released",
    status: "Completed",
  },
  {
    id: "TS12361",
    date: "04/24/2028",
    orderId: "OD12361",
    seller: "Veidt Ent.",
    amount: "$19,800,000",
    type: "Escrow released",
    status: "Completed",
  },
  {
    id: "TS12362",
    date: "05/30/2028",
    orderId: "OD12362",
    seller: "Massive Dynamics",
    amount: "$21,500,000",
    type: "Escrow released",
    status: "Completed",
  },
  {
    id: "TS12363",
    date: "06/15/2028",
    orderId: "OD12363",
    seller: "Good Burger",
    amount: "$17,750,000",
    type: "Escrow released",
    status: "Completed",
  },
  {
    id: "TS12364",
    date: "07/10/2028",
    orderId: "OD12364",
    seller: "Cheers Bar",
    amount: "$15,900,000",
    type: "Escrow released",
    status: "Completed",
  },
  {
    id: "TS12365",
    date: "08/22/2028",
    orderId: "OD12365",
    seller: "Pemberton Softa",
    amount: "$13,600,000",
    type: "Escrow released",
    status: "Completed",
  },
];

interface Filters {
  statuses: TxStatus[];
  date: string;
}

const defaultFilters: Filters = { statuses: [], date: "" };

const STATUS_PILL: Record<TxStatus, string> = {
  Processing: "bg-amber-100 text-amber-700",
  Completed: "bg-green-100 text-green-700",
  Failed: "bg-red-100 text-red-700",
};

function StatusPill({ status }: { status: TxStatus }) {
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
  const toggleStatus = (s: TxStatus) => {
    const next = filters.statuses.includes(s)
      ? filters.statuses.filter((x) => x !== s)
      : [...filters.statuses, s];
    onChange({ ...filters, statuses: next });
  };
  const allStatuses: TxStatus[] = ["Processing", "Failed", "Completed"];

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

function buildTransactionDetail(t: Transaction): TransactionDetail {
  return {
    id: t.id,
    amount: t.amount,
    status: t.status,
    order: {
      id: "OD20411",
      placedAt: "Oct 24, 2024 10:10 AM",
      seller: "Shell Refinery Louisiana",
      quantity: "20 tons",
      shipping: "Delivery",
      paymentMethod: "US Bank Account ****4567",
    },
    payment: {
      grossAmount: t.amount,
      ecoglobeFee: "$200.00",
      escrowFee: "$100.00",
      netAmount: "$15,100,000",
      escrowFundedDate: "Oct 24, 2024 10:10 AM",
      releaseDate: "ERD Oct 29, 2024 10:10 AM",
      bankAccount: "US Bank Account ****4567",
      payoutStatus: t.status === "Completed" ? "Paid" : "Pending",
    },
    documents: [
      { name: "Example data name.pdf" },
      { name: "Example data name.pdf" },
    ],
    activity: [
      { label: "Escrow funded", date: "Oct 29, 2024 10:10 AM", complete: true },
      {
        label: "Quote approved",
        date: "Oct 29, 2024 10:10 AM",
        complete: true,
      },
      {
        label: "Buyer confirmed",
        complete: t.status === "Completed",
      },
      {
        label: "Escrow released",
        complete: t.status === "Completed",
      },
      {
        label: "Payout completed",
        complete: t.status === "Completed",
      },
    ],
  };
}

const PAGE_SIZE = 20;

export function BuyerTransactionsPage() {
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = TRANSACTIONS.filter((t) => {
    if (filters.statuses.length && !filters.statuses.includes(t.status))
      return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !t.id.toLowerCase().includes(q) &&
        !t.orderId.toLowerCase().includes(q) &&
        !t.seller.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const selected = selectedId
    ? TRANSACTIONS.find((t) => t.id === selectedId) ?? null
    : null;

  return (
    <BuyerLayout>
      <div className="flex h-full flex-col bg-neutral-50">
        <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-6">
          <h1 className="text-2xl font-bold text-neutral-900">Transactions</h1>
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
                    Transctn ID
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-700">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-700">
                    Order ID
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-700">
                    Seller
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-700">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-700">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-neutral-700">
                    Status
                  </th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className="cursor-pointer hover:bg-neutral-50"
                    style={{ borderTop: "1px solid #F8F8F8" }}
                  >
                    <td className="px-6 py-4 text-sm text-neutral-900">
                      {t.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-700">
                      {t.date}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-700">
                      {t.orderId}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-900">
                      {t.seller}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-900">
                      {t.amount}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-700">
                      {t.type}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill status={t.status} />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(t.id);
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
                      No transactions found.
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

      <BuyerTransactionDetailPanel
        transaction={selected ? buildTransactionDetail(selected) : null}
        onClose={() => setSelectedId(null)}
      />
    </BuyerLayout>
  );
}
