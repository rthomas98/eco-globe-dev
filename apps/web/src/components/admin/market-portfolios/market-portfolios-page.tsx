"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@eco-globe/ui";
import {
  fetchMarketPortfolios,
  type MarketPortfolio,
  type MarketPortfolioStatusFilter,
} from "@/lib/api-market-portfolios";
import { DataBoundary, LoadingState, useBackendData } from "@/components/shared/data-state";
import { MarketRecordShell } from "../market-records/market-record-shell";
import { PortfolioNotice, PortfolioStatusBadge, border, inputClass } from "./market-portfolio-shared";

const STATUSES: { value: MarketPortfolioStatusFilter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "Active and archived" },
];

function count(value: number, noun: string, plural = `${noun}s`) {
  return `${value} ${value === 1 ? noun : plural}`;
}

function PortfolioRow({ portfolio }: { portfolio: MarketPortfolio }) {
  return (
    <li className="rounded-xl bg-white p-4" style={border}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/admin/market-portfolios/${portfolio.id}`}
          className="min-w-0 break-words font-semibold text-neutral-900 underline-offset-2 hover:underline"
        >
          {portfolio.name}
        </Link>
        <PortfolioStatusBadge status={portfolio.status} />
      </div>
      {portfolio.description && (
        <p className="mt-1 line-clamp-2 break-words text-sm text-neutral-600">{portfolio.description}</p>
      )}
      <p className="mt-2 text-sm text-neutral-700">
        {count(portfolio.listingIds.length, "published listing")} · {count(portfolio.companyIds.length, "assigned company", "assigned companies")}{" "}
        · {count(portfolio.recordIds.length, "research record")}
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        Updated <time dateTime={portfolio.updatedAt}>{new Date(portfolio.updatedAt).toLocaleString("en-US")}</time>
      </p>
    </li>
  );
}

function PortfoliosList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const status: MarketPortfolioStatusFilter =
    statusParam === "archived" || statusParam === "all" ? statusParam : "active";
  const search = searchParams.get("search")?.trim() || undefined;
  const [searchText, setSearchText] = useState(search ?? "");
  const state = useBackendData(
    () => fetchMarketPortfolios({ status, search }),
    [status, search ?? ""],
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

  return (
    <MarketRecordShell
      title="Portfolios"
      description="Internal groups of published listings, companies and research records for sign-in demos."
      backHref="/admin/market-records"
      backLabel="Market records"
      notice={<PortfolioNotice />}
      actions={
        <Link
          href="/admin/market-portfolios/new"
          className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          <Plus className="size-4" aria-hidden="true" />
          New portfolio
        </Link>
      }
    >
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]">
        <form
          role="search"
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            update({ search: searchText.trim() || undefined });
          }}
        >
          <label htmlFor="mp-search" className="sr-only">
            Search portfolios
          </label>
          <input
            id="mp-search"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search portfolio name"
            className={`${inputClass} min-w-0 flex-1`}
            style={border}
          />
          <Button type="submit" size="sm">
            <Search className="size-4" aria-hidden="true" />
            Search
          </Button>
        </form>
        <div>
          <label htmlFor="mp-status" className="sr-only">
            Status
          </label>
          <select
            id="mp-status"
            value={status}
            onChange={(event) => update({ status: event.target.value === "active" ? undefined : event.target.value })}
            className={inputClass}
            style={border}
          >
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataBoundary
        state={state}
        isEmpty={(data) => data.length === 0}
        empty={{
          title: "No portfolios match",
          description: "Change the filters or create a portfolio from existing listings, companies and records.",
        }}
        loadingLabel="Loading portfolios…"
      >
        {(portfolios) => (
          <>
            <p className="mb-3 text-sm text-neutral-600" aria-live="polite">
              {count(portfolios.length, "portfolio")}
              {portfolios.length >= 200 ? " (first 200 shown — refine the search)" : ""}
            </p>
            <ul className="flex flex-col gap-3">
              {portfolios.map((portfolio) => (
                <PortfolioRow key={portfolio.id} portfolio={portfolio} />
              ))}
            </ul>
          </>
        )}
      </DataBoundary>
    </MarketRecordShell>
  );
}

export function MarketPortfoliosPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading portfolios…" />}>
      <PortfoliosList />
    </Suspense>
  );
}
