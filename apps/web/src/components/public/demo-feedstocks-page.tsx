"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Info } from "lucide-react";
import { Header } from "@/components/public/header";
import { Footer } from "@/components/public/footer";
import { ErrorState, LoadingState, useBackendData } from "@/components/shared/data-state";
import { DemoEstimateBadge } from "@/components/shared/demo-estimate-badges";
import { fetchDemoPresentations } from "@/lib/api-demo-presentations";
import { DEMO_PRICE_ESTIMATE_LABEL, DEMO_VOLUME_ESTIMATE_LABEL } from "@/lib/demo-estimate-format";
import { describeUnit, formatMoney, formatQuantity } from "@/lib/listing-format";
import {
  DEMO_PRESENTATION_COMPANY_PARAM,
  DEMO_PRESENTATION_KIND_FILTERS,
  DEMO_PRESENTATION_KIND_PARAM,
  demoPresentationCompanies,
  describeMaterialType,
  filterDemoPresentations,
  parseKindFilter,
  withDemoPresentationFilters,
  type DemoPresentation,
  type DemoPresentationKindFilter,
} from "@/lib/demo-presentations";

function DemoPresentationCard({ item }: { item: DemoPresentation }) {
  const quantity = formatQuantity(item.quantity, item.quantityUnitCode);
  const money = formatMoney(item.price, item.currencyCode);
  const priceUnit = item.priceUnitCode ? describeUnit(item.priceUnitCode) : null;
  const price = money && priceUnit ? `${money} per ${priceUnit.singular}` : money;
  return (
    <li className="flex flex-col rounded-xl bg-white p-4" style={{ border: "1px solid #F0F0F0" }}>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {item.kind === "seller" ? "Seller offer" : "Buyer need"} · Demo
      </p>
      <h2 className="mt-1 text-base font-semibold text-neutral-900">{item.title}</h2>
      <p className="mt-0.5 text-sm text-neutral-700">{item.companyName}</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-neutral-500">Material</dt>
        <dd className="text-neutral-900">{describeMaterialType(item.materialTypeCode)}</dd>
        <dt className="text-neutral-500">Quantity</dt>
        <dd className="text-neutral-900">{quantity ?? "Not stated"}</dd>
        <dt className="text-neutral-500">{item.kind === "seller" ? "Price" : "Target price"}</dt>
        <dd className="text-neutral-900">{price ?? "Not stated"}</dd>
      </dl>
      {(item.priceEstimated || item.quantityEstimated) && (
        <span className="mt-3 inline-flex flex-wrap gap-1">
          {item.priceEstimated && <DemoEstimateBadge label={DEMO_PRICE_ESTIMATE_LABEL} />}
          {item.quantityEstimated && <DemoEstimateBadge label={DEMO_VOLUME_ESTIMATE_LABEL} />}
        </span>
      )}
    </li>
  );
}

/** Public gallery of reviewed demo snapshots. Presentation only: no detail, cart or edit actions. */
export function DemoFeedstocksPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <Suspense>
        <DemoFeedstocksContent />
      </Suspense>
      <Footer />
    </main>
  );
}

function DemoFeedstocksContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const kind = parseKindFilter(searchParams.get(DEMO_PRESENTATION_KIND_PARAM));
  const company = searchParams.get(DEMO_PRESENTATION_COMPANY_PARAM) || null;
  const presentations = useBackendData(fetchDemoPresentations, [], "Demo feedstocks could not be loaded.");
  const all = presentations.data ?? [];
  const companies = demoPresentationCompanies(all);
  const visible = filterDemoPresentations(all, { kind, company });

  const setFilter = (next: { kind: DemoPresentationKindFilter; company: string | null }) =>
    router.replace(`${pathname}${withDemoPresentationFilters(searchParams.toString(), next)}`, { scroll: false });

  return (
    <section className="pb-16 pt-24 lg:pt-32">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-8">
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-4xl">Demo feedstocks</h1>
        <p
          role="note"
          className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900"
          style={{ border: "1px solid #FDE68A" }}
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Presentation only — not available for purchase. These examples show how companies could appear on
          EcoGlobe; they are not marketplace listings or open requests.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
            {DEMO_PRESENTATION_KIND_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={kind === option.value}
                onClick={() => setFilter({ kind: option.value, company })}
                className={`min-h-9 rounded-full px-3 py-1.5 text-sm font-medium ${kind === option.value ? "bg-neutral-900 text-white" : "bg-white text-neutral-700"}`}
                style={kind === option.value ? undefined : { border: "1px solid #E0E0E0" }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <select
            aria-label="Company"
            value={company ?? ""}
            onChange={(e) => setFilter({ kind, company: e.target.value || null })}
            className="w-full rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-900 outline-none sm:w-auto sm:max-w-[280px]"
            style={{ border: "1px solid #E0E0E0" }}
          >
            <option value="">All companies</option>
            {companies.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            {company && !companies.includes(company) && <option value={company}>{company}</option>}
          </select>
        </div>

        <div className="mt-6">
          {presentations.status === "loading" ? (
            <LoadingState label="Loading demo feedstocks…" />
          ) : presentations.status === "error" ? (
            <ErrorState message={presentations.error ?? "Demo feedstocks could not be loaded."} onRetry={presentations.reload} />
          ) : (
            <>
              <p className="mb-4 text-sm text-neutral-700" role="status">
                {visible.length} demo example{visible.length === 1 ? "" : "s"}
                {visible.length !== all.length && ` of ${all.length}`}
              </p>
              {visible.length === 0 ? (
                <div className="rounded-xl bg-neutral-50 px-6 py-12 text-center">
                  <p className="text-sm font-medium text-neutral-700">
                    {all.length === 0 ? "No demo feedstocks are available right now." : "No demo examples match these filters."}
                  </p>
                  {all.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilter({ kind: "all", company: null })}
                      className="mt-2 text-sm font-semibold underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((item) => (
                    <DemoPresentationCard key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <p className="mt-8 text-sm text-neutral-700">
          Looking for feedstock you can buy?{" "}
          <Link href="/browse" className="font-semibold underline">
            Browse marketplace listings
          </Link>
        </p>
      </div>
    </section>
  );
}
