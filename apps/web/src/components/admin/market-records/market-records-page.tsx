"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Download, FileSpreadsheet, FolderKanban, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { BackendApiError, describeBackendError } from "@/lib/backend-client";
import {
  fetchMarketRecords,
  type MarketRecord,
  type MarketRecordListParams,
  type MarketRecordRole,
  type MarketRecordStatusFilter,
  type MarketSourceType,
} from "@/lib/api-market-records";
import { fetchMarketPortfolios } from "@/lib/api-market-portfolios";
import { parsePortfolioParam } from "@/lib/market-portfolio-format";
import {
  FIELD_STATUS_LABELS,
  SOURCE_RECORD_TYPE_LABELS,
  csvCell,
  describeResearchPrice,
  describeResearchVolume,
  fieldStatusLabel,
  formatAddressLine,
  sourceCheckedLabel,
  sourceRecordTypeLabel,
  type MarketFieldStatus,
} from "@/lib/market-record-format";
import { DataBoundary, LoadingState, useBackendData } from "@/components/shared/data-state";
import {
  AddressPurposeBadge,
  ArchivedBadge,
  FieldStatusBadge,
  RoleBadge,
  SourceCheckedBadge,
  SourceRecordTypeBadge,
} from "./market-record-badges";
import { MarketRecordShell } from "./market-record-shell";

const PAGE_SIZE = 50;
const border = { border: "1px solid #E0E0E0" };
const selectClass =
  "w-full rounded-lg bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20";

const FIELD_STATUS_FILTERS = (["price", "volume", "address"] as const).flatMap((field) =>
  (Object.keys(FIELD_STATUS_LABELS) as MarketFieldStatus[]).map((status) => ({
    value: `${field}:${status}`,
    label: `${field[0].toUpperCase()}${field.slice(1)}: ${FIELD_STATUS_LABELS[status]}`,
  })),
);

function readParams(search: URLSearchParams): MarketRecordListParams {
  const pick = <T extends string>(key: string, allowed: readonly T[]) => {
    const value = search.get(key);
    return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
  };
  return {
    role: pick<MarketRecordRole>("role", ["seller", "buyer"]),
    status: pick<MarketRecordStatusFilter>("status", ["active", "archived", "all"]) ?? "active",
    sourceRecordType: pick<MarketSourceType>(
      "sourceRecordType",
      Object.keys(SOURCE_RECORD_TYPE_LABELS) as MarketSourceType[],
    ),
    sourceChecked: pick("sourceChecked", ["true", "false"] as const),
    fieldStatus: pick(
      "fieldStatus",
      FIELD_STATUS_FILTERS.map((option) => option.value) as NonNullable<MarketRecordListParams["fieldStatus"]>[],
    ),
    search: search.get("search")?.trim() || undefined,
    importBatchId: search.get("importBatchId") || undefined,
    portfolioId: (() => {
      const portfolio = parsePortfolioParam(search.get("portfolioId"));
      return portfolio.kind === "valid" ? portfolio.id : undefined;
    })(),
  };
}

function downloadCsv(records: MarketRecord[]) {
  const header = [
    "ID",
    "Side",
    "Company",
    "Facility",
    "Feedstock",
    "Feedstock group",
    "Record type",
    "Source check claim",
    "Address",
    "Address role",
    "Address review",
    "Annual volume",
    "Volume unit",
    "Volume review",
    "Research price (signed; negative = gate fee)",
    "Currency",
    "Price per",
    "Price review",
    "Status",
  ];
  const rows = records.map((r) => [
    r.id,
    r.role,
    r.companyName,
    r.facilityName,
    r.feedstock,
    r.feedstockGroup,
    sourceRecordTypeLabel(r.sourceRecordType),
    sourceCheckedLabel(r.sourceChecked),
    formatAddressLine(r.address),
    r.address.purpose,
    fieldStatusLabel(r.addressReview.status),
    // Decimal strings are exported as text (exactly as stored) with formula escaping.
    r.volume.value,
    r.volume.unit,
    fieldStatusLabel(r.volume.status),
    r.price.value,
    r.price.currencyCode,
    r.price.perUnit,
    fieldStatusLabel(r.price.status),
    r.status,
  ]);
  const text = [header, ...rows].map((cells) => cells.map((cell) => csvCell(cell)).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `ecoglobe-market-records-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function RecordCard({ record }: { record: MarketRecord }) {
  return (
    <li className="rounded-xl bg-white p-4" style={border}>
      <Link href={`/admin/market-records/${record.id}`} className="block font-semibold text-neutral-900 underline-offset-2 hover:underline">
        {record.companyName}
        {record.facilityName ? ` · ${record.facilityName}` : ""}
      </Link>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <RoleBadge role={record.role} />
        <SourceRecordTypeBadge code={record.sourceRecordType} />
        <SourceCheckedBadge checked={record.sourceChecked} />
        {record.status === "archived" && <ArchivedBadge />}
      </div>
      <dl className="mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-neutral-500">Feedstock</dt>
        <dd className="min-w-0 break-words">{record.feedstock}</dd>
        <dt className="text-neutral-500">Location</dt>
        <dd className="min-w-0 break-words">{formatAddressLine(record.address)}</dd>
        <dt className="text-neutral-500">Annual volume</dt>
        <dd>
          {describeResearchVolume(record.volume).label} <FieldStatusBadge status={record.volume.status} />
        </dd>
        <dt className="text-neutral-500">Research price</dt>
        <dd>
          {describeResearchPrice(record.price).label} <FieldStatusBadge status={record.price.status} />
        </dd>
      </dl>
    </li>
  );
}

function RecordsTable({ records, total }: { records: MarketRecord[]; total: number }) {
  return (
    <div className="hidden overflow-x-auto rounded-2xl bg-white md:block" style={border}>
      <table className="w-full min-w-[1100px] text-left text-sm">
        <caption className="sr-only">
          Market records, showing {records.length} of {total}. Source check claim and field review status are separate columns.
        </caption>
        <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-600">
          <tr>
            <th scope="col" className="px-4 py-3">Company / facility</th>
            <th scope="col" className="px-4 py-3">Side</th>
            <th scope="col" className="px-4 py-3">Feedstock</th>
            <th scope="col" className="px-4 py-3">Location</th>
            <th scope="col" className="px-4 py-3">Annual volume</th>
            <th scope="col" className="px-4 py-3">Research price</th>
            <th scope="col" className="px-4 py-3">Record type</th>
            <th scope="col" className="px-4 py-3">Source check claim</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {records.map((record) => (
            <tr key={record.id} className="align-top">
              <th scope="row" className="px-4 py-3 font-medium">
                <Link href={`/admin/market-records/${record.id}`} className="text-neutral-900 underline-offset-2 hover:underline">
                  {record.companyName}
                </Link>
                {record.facilityName && <div className="text-xs font-normal text-neutral-500">{record.facilityName}</div>}
                {record.status === "archived" && (
                  <div className="mt-1">
                    <ArchivedBadge />
                  </div>
                )}
              </th>
              <td className="px-4 py-3">
                <RoleBadge role={record.role} />
              </td>
              <td className="max-w-[220px] break-words px-4 py-3">
                {record.feedstock}
                {record.feedstockGroup && <div className="text-xs text-neutral-500">{record.feedstockGroup}</div>}
              </td>
              <td className="max-w-[240px] break-words px-4 py-3">
                {formatAddressLine(record.address)}
                <div className="mt-1 flex flex-wrap gap-1">
                  <AddressPurposeBadge purpose={record.address.purpose} />
                  <FieldStatusBadge field="Address" status={record.addressReview.status} />
                </div>
              </td>
              <td className="px-4 py-3">
                {describeResearchVolume(record.volume).label}
                <div className="mt-1">
                  <FieldStatusBadge status={record.volume.status} />
                </div>
              </td>
              <td className="px-4 py-3">
                {describeResearchPrice(record.price).label}
                <div className="mt-1">
                  <FieldStatusBadge status={record.price.status} />
                </div>
              </td>
              <td className="px-4 py-3">
                <SourceRecordTypeBadge code={record.sourceRecordType} />
              </td>
              <td className="px-4 py-3">
                <SourceCheckedBadge checked={record.sourceChecked} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarketRecordsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = readParams(new URLSearchParams(searchParams.toString()));
  // A present but unreadable portfolio filter never falls back to all records.
  const portfolioFilterInvalid =
    parsePortfolioParam(searchParams.get("portfolioId")).kind === "invalid";
  const scope = JSON.stringify({ ...params, portfolioFilterInvalid });
  const [searchText, setSearchText] = useState(params.search ?? "");
  const state = useBackendData(
    () =>
      portfolioFilterInvalid
        ? Promise.reject(new BackendApiError("The portfolio filter in this link is not valid. Choose a portfolio or Any portfolio.", 400))
        : fetchMarketRecords({ ...params, limit: PAGE_SIZE }),
    [scope],
    "Market records could not be loaded.",
  );
  const [more, setMore] = useState<{ scope: string; records: MarketRecord[]; nextCursor: string | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const extra = more?.scope === scope ? more : null;
  const portfolios = useBackendData(
    () => fetchMarketPortfolios({ status: "all" }),
    [],
    "Portfolios could not be loaded.",
  );

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const text = next.toString();
    router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false });
  };

  const loadMore = async (cursor: string) => {
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await fetchMarketRecords({ ...params, limit: PAGE_SIZE, cursor });
      setMore({ scope, records: [...(extra?.records ?? []), ...page.records], nextCursor: page.nextCursor });
    } catch (error) {
      setMoreError(describeBackendError(error, "More records could not be loaded."));
    } finally {
      setLoadingMore(false);
    }
  };

  const filter = (
    key: string,
    label: string,
    value: string | undefined,
    options: { value: string; label: string }[],
  ) => (
    <div className="min-w-0">
      <label htmlFor={`mr-filter-${key}`} className="mb-1 block text-xs font-medium text-neutral-700">
        {label}
      </label>
      <select
        id={`mr-filter-${key}`}
        value={value ?? ""}
        onChange={(event) => update({ [key]: event.target.value || undefined })}
        className={selectClass}
        style={border}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <MarketRecordShell
      title="Market records"
      description="Seller and buyer sources from research and workbook imports. Kept separate from accounts, listings and KYC."
      actions={
        <>
          <Link
            href="/admin/market-portfolios"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-neutral-900 hover:bg-neutral-50"
            style={border}
          >
            <FolderKanban className="size-4" aria-hidden="true" />
            Portfolios
          </Link>
          <Link
            href="/admin/market-records/references"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-neutral-900 hover:bg-neutral-50"
            style={border}
          >
            <BookOpen className="size-4" aria-hidden="true" />
            Reference library
          </Link>
          <Link
            href="/admin/market-records/import"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-neutral-900 hover:bg-neutral-50"
            style={border}
          >
            <FileSpreadsheet className="size-4" aria-hidden="true" />
            Import workbook
          </Link>
          <Link
            href="/admin/market-records/new"
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            <Plus className="size-4" aria-hidden="true" />
            New record
          </Link>
        </>
      }
    >
      <form
        role="search"
        className="mb-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          update({ search: searchText.trim() || undefined });
        }}
      >
        <label htmlFor="mr-search" className="sr-only">
          Search company, facility or feedstock
        </label>
        <input
          id="mr-search"
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search company, facility or feedstock"
          className={`${selectClass} min-w-0 flex-1`}
          style={border}
        />
        <Button type="submit" size="sm">
          <Search className="size-4" aria-hidden="true" />
          Search
        </Button>
      </form>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {filter("status", "Status", params.status, [
          { value: "active", label: "Active" },
          { value: "archived", label: "Archived" },
          { value: "all", label: "Active and archived" },
        ])}
        {filter("role", "Side", params.role, [
          { value: "", label: "Sellers and buyers" },
          { value: "seller", label: "Sellers" },
          { value: "buyer", label: "Buyers" },
        ])}
        {filter("sourceRecordType", "Record type", params.sourceRecordType, [
          { value: "", label: "All record types" },
          ...Object.entries(SOURCE_RECORD_TYPE_LABELS).map(([value, label]) => ({ value, label })),
        ])}
        {filter("sourceChecked", "Source check claim", params.sourceChecked, [
          { value: "", label: "Any" },
          { value: "true", label: "Source marked checked" },
          { value: "false", label: "Source not marked checked" },
        ])}
        {filter("fieldStatus", "Field review", params.fieldStatus, [
          { value: "", label: "Any review status" },
          ...FIELD_STATUS_FILTERS,
        ])}
        {filter("portfolioId", "Portfolio", params.portfolioId ? String(params.portfolioId) : undefined, [
          { value: "", label: portfolios.status === "error" ? "Any (portfolios unavailable)" : "Any portfolio" },
          ...(portfolios.data ?? []).map((portfolio) => ({
            value: String(portfolio.id),
            label: `${portfolio.name}${portfolio.status === "archived" ? " (archived)" : ""}`,
          })),
          ...(params.portfolioId && !(portfolios.data ?? []).some((portfolio) => portfolio.id === params.portfolioId)
            ? [{ value: String(params.portfolioId), label: `Portfolio #${params.portfolioId}` }]
            : []),
        ])}
      </div>

      {params.importBatchId && (
        <p className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-neutral-100 px-4 py-2 text-sm text-neutral-800">
          Showing records from import <span className="font-mono text-xs">{params.importBatchId}</span>
          <button type="button" className="underline" onClick={() => update({ importBatchId: undefined })}>
            Show all
          </button>
        </p>
      )}

      <DataBoundary
        state={state}
        isEmpty={(data) => data.records.length === 0}
        empty={{
          title: "No market records match",
          description: "Change the filters, add a record or import the research workbook.",
        }}
        loadingLabel="Loading market records…"
      >
        {(data) => {
          const records = [...data.records, ...(extra?.records ?? [])];
          const cursor = extra ? extra.nextCursor : data.nextCursor;
          return (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-neutral-600" aria-live="polite">
                  Showing {records.length} of {data.total} record{data.total === 1 ? "" : "s"}
                  {state.status === "loading" ? " (refreshing…)" : ""}
                </p>
                <Button type="button" variant="secondary" size="sm" style={border} onClick={() => downloadCsv(records)}>
                  <Download className="size-4" aria-hidden="true" />
                  Export {records.length} loaded record{records.length === 1 ? "" : "s"} (CSV)
                </Button>
              </div>
              <RecordsTable records={records} total={data.total} />
              <ul className="flex flex-col gap-3 md:hidden">
                {records.map((record) => (
                  <RecordCard key={record.id} record={record} />
                ))}
              </ul>
              {moreError && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {moreError}
                </p>
              )}
              {cursor && (
                <div className="mt-4 flex justify-center">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    style={border}
                    disabled={loadingMore}
                    aria-busy={loadingMore}
                    onClick={() => void loadMore(cursor)}
                  >
                    {loadingMore && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    Load more
                  </Button>
                </div>
              )}
            </>
          );
        }}
      </DataBoundary>
    </MarketRecordShell>
  );
}

export function MarketRecordsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading market records…" />}>
      <MarketRecordsList />
    </Suspense>
  );
}
