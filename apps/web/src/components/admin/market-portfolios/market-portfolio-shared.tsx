"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Info, Loader2, Plus, X } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { describeBackendError } from "@/lib/backend-client";
import { fetchCompanies } from "@/lib/api-portal";
import { fetchListings } from "@/lib/listings-api";
import { fetchMarketRecords } from "@/lib/api-market-records";
import { formatAddressLine } from "@/lib/market-record-format";
import {
  isEligiblePortfolioCompany,
  isEligiblePortfolioListing,
  mergeIds,
  parseIdList,
} from "@/lib/market-portfolio-format";
import { useBackendData } from "@/components/shared/data-state";

export const border = { border: "1px solid #E0E0E0" };
export const inputClass =
  "w-full rounded-lg bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20";

export function PortfolioNotice() {
  return (
    <p
      className="mb-6 flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900"
      style={{ border: "1px solid #BAE6FD" }}
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        Demo portfolios group existing published listings and companies for sign-in demos, plus
        internal research records for admins. A portfolio never grants access: buyers still see
        only listings they are already allowed to see, and research records are never shown
        outside admin.
      </span>
    </p>
  );
}

export function PortfolioStatusBadge({ status }: { status: "active" | "archived" }) {
  return status === "archived" ? (
    <span className="inline-flex items-center rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-semibold text-white">
      Archived
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-800">
      Active
    </span>
  );
}

export interface LookupOption {
  id: number;
  label: string;
  detail?: string;
}

export interface Lookup {
  status: "loading" | "ready" | "error";
  error: string | null;
  options: LookupOption[];
  byId: Map<number, LookupOption>;
}

function toLookup(state: { status: Lookup["status"]; error: string | null; data: LookupOption[] | null }): Lookup {
  const options = state.data ?? [];
  return {
    status: state.status,
    error: state.error,
    options,
    byId: new Map(options.map((option) => [option.id, option])),
  };
}

/**
 * Labels for IDs from existing APIs, limited to what the server accepts:
 * published listings and active (not inactive/suspended) companies. An admin
 * session can see paused/draft listings, so they are filtered out here.
 */
export function usePortfolioLookups() {
  const listings = useBackendData(
    async () =>
      (await fetchListings("public")).filter(isEligiblePortfolioListing).map((listing) => ({
        id: listing.id,
        label: listing.title,
        detail: listing.sellerCompanyName ?? undefined,
      })),
    [],
    "Published listings could not be loaded for lookup.",
  );
  const companies = useBackendData(
    async () =>
      (await fetchCompanies()).filter(isEligiblePortfolioCompany).map((company) => ({
        id: company.id,
        label: company.legalName,
        detail: company.companyTypeName ?? company.companyTypeCode,
      })),
    [],
    "Companies could not be loaded for lookup.",
  );
  return { listings: toLookup(listings), companies: toLookup(companies) };
}

function recordOption(record: Awaited<ReturnType<typeof fetchMarketRecords>>["records"][number]): LookupOption {
  return {
    id: record.id,
    label: `${record.companyName}${record.facilityName ? ` · ${record.facilityName}` : ""}`,
    detail: `${record.feedstock} · ${formatAddressLine(record.address)}${record.status === "archived" ? " · archived" : ""}`,
  };
}

/**
 * Labels for the records already in a portfolio (admin-only research data).
 * Pass the portfolio version so labels refetch after a save adds records.
 */
export function usePortfolioRecordLabels(portfolioId: number | null, version?: string) {
  const state = useBackendData(
    async () =>
      portfolioId
        ? (await fetchMarketRecords({ portfolioId, status: "all", limit: 200 })).records.map(recordOption)
        : [],
    [portfolioId, version ?? null],
    "Research record labels could not be loaded.",
  );
  return toLookup(state);
}

export async function searchRecordOptions(search: string) {
  const page = await fetchMarketRecords({ search, status: "active", limit: 20 });
  return page.records.map(recordOption);
}

/**
 * Explicit ID entry with labels from real lookups. Unknown IDs are kept and
 * flagged; the server validates every ID on save.
 */
export function IdPicker({
  label,
  help,
  ids,
  onChange,
  lookup,
  search,
  error,
  disabled,
}: {
  label: string;
  help: string;
  ids: number[];
  onChange: (ids: number[]) => void;
  lookup: Lookup;
  /** Server-side search; when omitted the lookup options are filtered locally. */
  search?: (text: string) => Promise<LookupOption[]>;
  error?: string;
  disabled?: boolean;
}) {
  const inputId = useId();
  const searchId = useId();
  const [idText, setIdText] = useState("");
  const [invalid, setInvalid] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<{ query: string; options: LookupOption[]; error: string | null } | null>(null);
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<Map<number, LookupOption>>(new Map());

  const q = query.trim().toLowerCase();
  useEffect(() => {
    if (!search || q.length < 2) return;
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      search(q)
        .then((options) => {
          if (cancelled) return;
          setRemote({ query: q, options, error: null });
          setFound((current) => {
            const next = new Map(current);
            options.forEach((option) => next.set(option.id, option));
            return next;
          });
        })
        .catch((err: unknown) => {
          if (!cancelled) setRemote({ query: q, options: [], error: describeBackendError(err, "Search failed.") });
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [q, search]);

  const results = useMemo(() => {
    if (q.length < 2) return [];
    if (search) return remote?.query === q ? remote.options : [];
    return lookup.options
      .filter((option) => `${option.id} ${option.label} ${option.detail ?? ""}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [q, search, remote, lookup.options]);

  const labelFor = (id: number) => lookup.byId.get(id) ?? found.get(id);

  const addTyped = () => {
    const parsed = parseIdList(idText);
    setInvalid(parsed.invalid);
    if (parsed.ids.length) onChange(mergeIds(ids, parsed.ids));
    if (!parsed.invalid.length) setIdText("");
  };

  return (
    <fieldset className="rounded-xl bg-white p-4" style={border} disabled={disabled}>
      <legend className="px-1 text-sm font-semibold text-neutral-900">
        {label} <span className="font-normal text-neutral-500">({ids.length})</span>
      </legend>
      <p className="mb-3 text-xs text-neutral-500">{help}</p>
      {lookup.status === "error" && (
        <p className="mb-2 text-xs text-amber-800">{lookup.error} IDs can still be entered directly.</p>
      )}
      {ids.length > 0 ? (
        <ul className="mb-3 flex flex-col gap-1.5">
          {ids.map((id) => {
            const option = labelFor(id);
            return (
              <li key={id} className="flex items-start justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                <span className="min-w-0 break-words">
                  <span className="font-mono text-xs text-neutral-500">#{id}</span>{" "}
                  {option ? (
                    <>
                      <span className="text-neutral-900">{option.label}</span>
                      {option.detail && <span className="block text-xs text-neutral-500">{option.detail}</span>}
                    </>
                  ) : (
                    <span className="text-neutral-500">
                      {lookup.status === "loading" ? "Loading label…" : "Unavailable or not eligible — remove it before saving"}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(ids.filter((value) => value !== id))}
                  aria-label={`Remove ${label} ID ${id}`}
                  className="shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-neutral-500">None selected.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-neutral-700">
            Add {label} by ID
          </label>
          <div className="flex gap-2">
            <input
              id={inputId}
              value={idText}
              onChange={(event) => setIdText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTyped();
                }
              }}
              placeholder="e.g. 12, 15"
              inputMode="numeric"
              className={`${inputClass} min-w-0 flex-1`}
              style={border}
            />
            <Button type="button" size="sm" variant="secondary" style={border} onClick={addTyped}>
              <Plus className="size-4" aria-hidden="true" />
              Add
            </Button>
          </div>
          {invalid.length > 0 && (
            <p role="alert" className="mt-1 text-xs text-red-700">
              Not valid IDs: {invalid.join(", ")}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={searchId} className="mb-1 block text-xs font-medium text-neutral-700">
            Find {label}
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type at least 2 characters"
            className={inputClass}
            style={border}
          />
        </div>
      </div>
      {q.length >= 2 && (
        <div className="mt-2" aria-live="polite">
          {searching && search ? (
            <p className="flex items-center gap-2 text-xs text-neutral-500">
              <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Searching…
            </p>
          ) : remote?.error && search ? (
            <p className="text-xs text-red-700">{remote.error}</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-neutral-500">No matches.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {results.map((option) => {
                const added = ids.includes(option.id);
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      disabled={added}
                      onClick={() => onChange(mergeIds(ids, [option.id]))}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:cursor-default disabled:opacity-60"
                      style={border}
                    >
                      <span className="font-mono text-xs text-neutral-500">#{option.id}</span> {option.label}
                      {option.detail && <span className="block text-xs text-neutral-500">{option.detail}</span>}
                      {added && <span className="text-xs text-neutral-500"> · added</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}
