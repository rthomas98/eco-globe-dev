"use client";
import { matchesListingCategory } from "@/lib/listing-category";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  MapPin,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  RefreshCw,
} from "lucide-react";
import { MaterialImage } from "../public/material-image";
import { Badge } from "@eco-globe/ui";
import { ListingMap, type MapListing } from "../public/listing-map";
import {
  FiltersPanel,
  defaultFilters,
  type FilterState,
} from "../public/filters-panel";
import { hasCoordinates, type Listing } from "../public/browse-listings";
import { useListings } from "@/lib/use-listings";
import { CarbonCalculatorButton } from "./carbon-calculator-button";
import { DemoFeedstocksLink } from "@/components/shared/demo-feedstocks-link";
import { BuyerLayout } from "./buyer-layout";
import { useViewerLocation } from "@/lib/viewer-location";
import { filterByRadius, formatMiles } from "@/lib/radius-filter";
import { FeedstockIqCard, FeedstockIqPrompt } from "@/components/feedstock-iq/feedstock-iq-prompt";
import { useDemoUser } from "@/lib/demo-user";
import { useBackendData } from "@/components/shared/data-state";
import { fetchAssignedPortfolios } from "@/lib/api-market-portfolios";
import {
  PORTFOLIO_PARAM,
  parsePortfolioParam,
  shouldClearPortfolioAfterCompanyChange,
  withPortfolioParam,
} from "@/lib/market-portfolio-format";
import {
  BrowseDemoSection,
  BrowseMobileViewToggle,
  BrowseSourceControls,
  useBrowseDemoView,
  type BrowseMobileView,
} from "../public/browse-demo-results";
import {
  BROWSE_PLAYLIST_PARAM,
  BROWSE_SOURCE_PARAM,
  normalizeBrowseQuery,
  publishedMarketplaceListings,
} from "@/lib/browse-results";

function ListingCard({
  listing,
  selected,
  onSelect,
  distanceMiles,
}: {
  listing: Listing;
  selected: boolean;
  onSelect: () => void;
  distanceMiles: number | undefined;
}) {
  return (
    <div
      className={`group flex w-full flex-col rounded-xl p-2 text-left transition-colors ${
        selected
          ? "bg-neutral-100 ring-2 ring-neutral-900"
          : "hover:bg-neutral-50"
      }`}
    >
      <Link href={`/buyer/browse/${listing.id}`} className="block">
        <div className="relative mb-3 h-[200px] w-full overflow-hidden rounded-xl bg-neutral-100">
          <MaterialImage src={listing.image} title={listing.title} />
        </div>
        <h3 className="text-base font-medium text-neutral-900">
          {listing.title}
        </h3>
        <p className="mt-1 text-sm text-neutral-700">
          {listing.location || "Location not provided"}
          {distanceMiles !== undefined && <> · {formatMiles(distanceMiles)}</>}
        </p>
        <div className="mt-2 flex gap-2">
          <Badge>MOQ: {listing.moq}</Badge>
          {listing.hasCarbonData && <Badge>{listing.co2}</Badge>}
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-lg font-semibold text-neutral-900">
            {listing.price}
          </span>
          {listing.priceNum !== null && (
            <span className="text-sm text-neutral-700">{listing.unit}</span>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={onSelect}
        className="mt-3 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold"
      >
        Show {listing.title} on map
      </button>
      <div className="mt-3">
        <CarbonCalculatorButton
          listing={listing}
          portal="buyer"
          variant="primary"
          label="Open Carbon Calculator"
          returnTo="buyer-browse"
        />
      </div>
    </div>
  );
}

function LocationPill({ value }: { value: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-neutral-900"
      style={{ border: "1px solid #E0E0E0" }}
    >
      <MapPin className="size-4 text-neutral-500" />
      <span className="text-neutral-900">{value}</span>
    </div>
  );
}

/**
 * Demo portfolio selection lives in `?portfolioId=` so a link reloads the same
 * group. Groups are only offered when the company has assignments; the server
 * enforces access and never widens a refused group to the full catalogue.
 */
function useDemoPortfolioSelection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useDemoUser();
  const userKey = user ? String(user.id ?? user.email) : null;
  const companyId = user?.activeCompanyId ?? null;
  const selected = parsePortfolioParam(searchParams.get(PORTFOLIO_PARAM));
  const assigned = useBackendData(
    () => (userKey ? fetchAssignedPortfolios() : Promise.resolve([])),
    [userKey, companyId],
    "Demo portfolios could not be loaded.",
  );

  // Changing the portfolio also clears the selected Browse result.
  const select = (id: number | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("selected");
    router.replace(`${pathname}${withPortfolioParam(params.toString(), id)}`, {
      scroll: false,
    });
  };

  // Switching company clears a group the new company is not assigned to.
  const observedCompany = useRef<{ userKey: string; companyId: number | null } | null>(null);
  const [companyChanged, setCompanyChanged] = useState(false);
  useEffect(() => {
    if (!userKey) return;
    const previous = observedCompany.current;
    if (previous && previous.userKey === userKey && previous.companyId !== companyId)
      setCompanyChanged(true);
    observedCompany.current = { userKey, companyId };
  }, [userKey, companyId]);
  const assignedIds = assigned.status === "ready" ? (assigned.data ?? []).map((item) => item.id) : null;
  const clearSelection =
    shouldClearPortfolioAfterCompanyChange({ companyChanged, selected, assignedIds });
  useEffect(() => {
    if (!companyChanged || assignedIds === null) return;
    setCompanyChanged(false);
    if (clearSelection) select(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyChanged, assignedIds === null, clearSelection]);

  return { selected, assigned, select };
}

export function BuyerBrowsePage() {
  return (
    <Suspense>
      <BuyerBrowseContent />
    </Suspense>
  );
}

function BuyerBrowseContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const portfolio = useDemoPortfolioSelection();
  const selectedPortfolioId =
    portfolio.selected.kind === "valid" ? portfolio.selected.id : undefined;
  const assignedPortfolios = portfolio.assigned.data ?? [];
  const selectedPortfolioName = assignedPortfolios.find(
    (item) => item.id === selectedPortfolioId,
  )?.name;
  const showPortfolioSelector =
    assignedPortfolios.length > 0 || portfolio.selected.kind !== "none";
  const viewer = useViewerLocation();
  const viewerLocation = viewer.location;
  // Search and radius live in the URL so reload, Back and a demo gallery
  // return keep them; typing is written after a short pause.
  const urlQuery = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(urlQuery);
  const [seenQuery, setSeenQuery] = useState(urlQuery);
  if (urlQuery !== seenQuery) {
    setSeenQuery(urlQuery);
    setSearch(urlQuery);
  }
  const replaceParams = (update: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    update(params);
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };
  useEffect(() => {
    if (search.trim() === urlQuery.trim()) return;
    const timer = window.setTimeout(
      () =>
        replaceParams((params) => {
          if (search.trim()) params.set("q", search.trim());
          else params.delete("q");
          params.delete("selected");
        }),
      300,
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, urlQuery]);
  // "Any"/absent = any distance; the list is filtered only when a radius is chosen.
  const parsedRadius = parseFloat(searchParams.get("distance") ?? "");
  const radiusMiles =
    Number.isFinite(parsedRadius) && parsedRadius > 0 ? parsedRadius : 0;
  const setRadius = (miles: string) =>
    replaceParams((params) => {
      if (miles === "0") params.delete("distance");
      else params.set("distance", `${miles} mi`);
    });
  const [manualOrigin, setManualOrigin] = useState<{
    lng: number;
    lat: number;
    label: string;
  }>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Below lg only one of results/map is shown; desktop shows both.
  const [mobileView, setMobileView] = useState<BrowseMobileView>("results");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [mapExpanded, setMapExpanded] = useState(false);

  const q = normalizeBrowseQuery(urlQuery);
  const priceMin = filters.priceMin ? parseFloat(filters.priceMin) : null;
  const priceMax = filters.priceMax ? parseFloat(filters.priceMax) : null;
  const qtyMin = filters.qtyMin ? parseFloat(filters.qtyMin) : null;
  const qtyMax = filters.qtyMax ? parseFloat(filters.qtyMax) : null;

  const matchesCarbonBucket = (co2Num: number) =>
    filters.carbon.some((bucket) => {
      if (bucket.startsWith("Under 300")) return co2Num < 300;
      if (bucket.startsWith("300")) return co2Num >= 300 && co2Num <= 500;
      if (bucket.startsWith("500")) return co2Num > 500;
      return false;
    });

  const published = useListings("public", {
    // An unreadable portfolio link must not fall back to the full catalogue.
    enabled: portfolio.selected.kind !== "invalid",
    portfolioId: selectedPortfolioId,
  });
  const fallbackOrigin = useMemo(
    () =>
      manualOrigin ??
      (viewerLocation
        ? {
            lng: viewerLocation.lng,
            lat: viewerLocation.lat,
            label: viewerLocation.label,
            approximate: viewerLocation.source === "ip",
          }
        : undefined),
    [manualOrigin, viewerLocation],
  );
  const demoView = useBrowseDemoView({
    query: urlQuery,
    location: "",
    radiusMiles,
    commercialOrigin: undefined,
    fallbackOrigin,
  });
  const showMarketplace = demoView.state.source !== "demo";
  // The listings read is shared with admin and may include other statuses.
  const marketplaceListings = useMemo(
    () => publishedMarketplaceListings(published.listings),
    [published.listings],
  );

  const matchingListings = marketplaceListings.filter((l) => {
    const haystack = normalizeBrowseQuery(`${l.title} ${l.tags.join(" ")}`);
    if (q && !haystack.includes(q)) return false;
    if (
      filters.categories.length > 0 &&
      !filters.categories.some((category) =>
        matchesListingCategory(l, category),
      )
    )
      return false;
    if (
      filters.grades.length > 0 &&
      (l.grade === null || !filters.grades.includes(l.grade))
    )
      return false;
    if (
      !l.teaser &&
      priceMin !== null &&
      (l.priceNum === null || l.priceNum < priceMin)
    )
      return false;
    if (
      !l.teaser &&
      priceMax !== null &&
      (l.priceNum === null || l.priceNum > priceMax)
    )
      return false;
    if (qtyMin !== null && (l.qtyNum === null || l.qtyNum < qtyMin))
      return false;
    if (qtyMax !== null && (l.qtyNum === null || l.qtyNum > qtyMax))
      return false;
    if (
      filters.carbon.length > 0 &&
      (l.co2Num === null || !matchesCarbonBucket(l.co2Num))
    )
      return false;
    if (filters.carbonDataOnly && !l.hasCarbonData) return false;
    return true;
  });

  const origin = demoView.origin;
  // Without completed onboarding, listings are teasers with no facility coordinates.
  const locationsRedacted =
    marketplaceListings.length > 0 && marketplaceListings.every((item) => item.teaser);
  const radiusResult = filterByRadius(
    matchingListings,
    locationsRedacted ? null : origin,
    radiusMiles,
  );
  const visibleListings = useMemo(
    () => (showMarketplace ? radiusResult.items : []),
    [showMarketplace, radiusResult.items],
  );
  // Selection lives in the URL (see useBrowseDemoView).
  const selectedId = demoView.selectedId;
  // Changing marketplace filters clears the selection, like other filters.
  const changeFilters = (next: FilterState) => {
    setFilters(next);
    demoView.select(null);
  };
  const clearAll = () => {
    setFilters(defaultFilters);
    setSearch("");
    // Keep the dataset choice and any authorized portfolio; drop the rest.
    const current = new URLSearchParams(searchParams.toString());
    const params = new URLSearchParams();
    for (const key of [PORTFOLIO_PARAM, BROWSE_SOURCE_PARAM, BROWSE_PLAYLIST_PARAM]) {
      const value = current.get(key);
      if (value) params.set(key, value);
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const mapListings: MapListing[] = useMemo(
    () =>
      visibleListings.filter(hasCoordinates).map((l) => ({
        id: l.id,
        title: l.title,
        location: l.location,
        price: l.price,
        unit: l.priceNum !== null ? l.unit : "",
        moq: l.moq,
        co2: l.co2,
        lng: l.lng,
        lat: l.lat,
        image: l.image ?? undefined,
      })),
    [visibleListings],
  );

  const pricingUnavailable = published.status === "ready" && locationsRedacted;
  const mapNotice =
    !showMarketplace || published.status !== "ready" || mapListings.length > 0
      ? undefined
      : locationsRedacted
        ? "Facility locations appear once your company onboarding is complete."
        : visibleListings.length > 0
          ? "None of these listings has a saved facility location yet."
          : undefined;

  const activeFilterCount =
    filters.categories.length +
    (filters.priceMin || filters.priceMax ? 1 : 0) +
    (filters.qtyMin || filters.qtyMax ? 1 : 0) +
    filters.carbon.length +
    (filters.carbonDataOnly ? 1 : 0) +
    filters.grades.length;

  return (
    <BuyerLayout>
      <div className="flex h-full flex-col">
        {/* Top bar */}
        <header
          className="flex shrink-0 flex-col items-start justify-between gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-6"
          style={{ borderBottom: "1px solid #F0F0F0" }}
        >
          <h1 className="text-2xl font-bold text-neutral-900">Browse</h1>

          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
            <div
              className="flex min-w-[180px] flex-1 items-center gap-2 rounded-full bg-white px-4 py-2.5 sm:flex-none"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <Search className="size-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 sm:w-40"
              />
            </div>

            {showPortfolioSelector && (
              <select
                aria-label="Demo portfolio"
                value={selectedPortfolioId ? String(selectedPortfolioId) : ""}
                onChange={(e) => {
                  portfolio.select(e.target.value ? Number(e.target.value) : null);
                }}
                className="max-w-[240px] rounded-full bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 outline-none"
                style={{ border: "1px solid #E0E0E0" }}
              >
                <option value="">All available listings</option>
                {assignedPortfolios.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
                {selectedPortfolioId && !selectedPortfolioName && (
                  <option value={selectedPortfolioId}>Portfolio #{selectedPortfolioId}</option>
                )}
              </select>
            )}

            <div className="hidden sm:block">
              <LocationPill
                value={radiusMiles > 0 ? `Search radius: ${radiusMiles} mi` : "Any distance"}
              />
            </div>

            <select
              aria-label="Search radius"
              value={String(radiusMiles)}
              onChange={(e) => {
                setRadius(e.target.value);
              }}
              className="rounded-full bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 outline-none"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <option value="0">Any distance</option>
              <option value="2">2 mi</option>
              <option value="10">10 mi</option>
              <option value="50">50 mi</option>
              <option value="100">100 mi</option>
              <option value="500">500 mi</option>
            </select>

            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-neutral-900"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <SlidersHorizontal className="size-4" />
              Filters
              {activeFilterCount > 0 && (
                <span
                  className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-green-700"
                  style={{ backgroundColor: "#DCFCE7" }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <BrowseMobileViewToggle
          view={mobileView}
          onChange={(next) => {
            setMobileView(next);
            if (next === "results") setMapExpanded(false);
          }}
          pins={mapListings.length + demoView.pins.length}
        />

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Listings panel */}
          {!mapExpanded && (
            <div className={`w-full overflow-y-auto p-6 lg:w-[55%] ${mobileView === "map" ? "hidden lg:block" : ""}`}>
              <DemoFeedstocksLink />
              <div className="mb-4">
                <FeedstockIqCard />
              </div>
              <BrowseSourceControls view={demoView} />
              {portfolio.selected.kind !== "none" && (
                <p role="status" className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">
                  {portfolio.selected.kind === "invalid"
                    ? "This demo portfolio link is not valid, so no listings are shown."
                    : `Demo portfolio: ${selectedPortfolioName ?? `#${selectedPortfolioId}`}. Only listings you can already see are included.`}
                  <button
                    type="button"
                    onClick={() => {
                      portfolio.select(null);
                    }}
                    className="font-semibold underline"
                  >
                    Show all available listings
                  </button>
                </p>
              )}
              {showMarketplace ? (
              <section aria-labelledby="buyer-browse-marketplace-heading">
              <h2 id="buyer-browse-marketplace-heading" className="mb-1 text-base font-semibold text-neutral-900">
                Marketplace listings
              </h2>
              <p className="mb-4 text-sm text-neutral-700">
                {visibleListings.length} marketplace listing{visibleListings.length === 1 ? "" : "s"}
              </p>
              {published.status === "ready" && radiusMiles > 0 && (
                <p role="status" className="mb-4 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">
                  {radiusResult.applied ? (
                    <>
                      Within {radiusMiles} mi of {origin?.label ?? "your location"}.
                      {radiusResult.outside > 0 && ` ${radiusResult.outside} outside the radius hidden.`}
                      {radiusResult.unlocated > 0 &&
                        ` ${radiusResult.unlocated} without a saved facility location hidden.`}{" "}
                      <button type="button" onClick={() => setRadius("0")} className="font-semibold underline">
                        Show all distances
                      </button>
                    </>
                  ) : locationsRedacted ? (
                    "Distance filtering needs facility locations, which appear once your company onboarding is complete."
                  ) : (
                    "Allow location access or use the map center to filter by distance."
                  )}
                </p>
              )}
              {portfolio.selected.kind === "invalid" ? null : published.status === "loading" ? (
                <p
                  className="rounded-xl bg-neutral-50 py-16 text-center text-sm text-neutral-600"
                  role="status"
                >
                  Loading listings…
                </p>
              ) : published.status === "error" ? (
                <div
                  className="rounded-xl bg-red-50 p-6 text-sm text-red-700"
                  role="alert"
                >
                  <p>{published.error}</p>
                  <button
                    type="button"
                    onClick={published.reload}
                    className="mt-2 inline-flex items-center gap-1 font-semibold underline"
                  >
                    <RefreshCw className="size-3" /> Retry
                  </button>
                </div>
              ) : visibleListings.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl bg-neutral-50 py-16 text-center">
                  <p className="text-base font-semibold text-neutral-900">
                    {marketplaceListings.length === 0
                      ? selectedPortfolioId
                        ? "No listings from this demo portfolio are available to you"
                        : "No published listings yet"
                      : "No matches found"}
                  </p>
                  <p className="max-w-[360px] text-sm text-neutral-600">
                    Try a different keyword, loosen the filters, or clear
                    everything to see all listings.
                  </p>
                  {marketplaceListings.length > 0 && <FeedstockIqPrompt context="search" />}
                  <button
                    onClick={clearAll}
                    className="mt-2 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white"
                  >
                    Clear all
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {visibleListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      distanceMiles={radiusResult.distances.get(listing.id)}
                      selected={selectedId === listing.id}
                      onSelect={() => {
                        demoView.select(listing.id);
                        setMobileView("map");
                      }}
                    />
                  ))}
                </div>
              )}
              </section>
              ) : (
                <p className="mb-4 text-sm text-neutral-700">
                  Marketplace listings hidden — showing demo examples only.
                </p>
              )}
              <BrowseDemoSection
                view={demoView}
                location=""
                radiusMiles={radiusMiles}
                onShowAllDistances={() => setRadius("0")}
                onRevealMap={() => setMobileView("map")}
                marketplaceOnlyFilters={activeFilterCount}
              />
            </div>
          )}

          {/* Map panel */}
          <div
            className={`relative ${mapExpanded ? "w-full" : `${mobileView === "map" ? "w-full" : "hidden"} lg:block lg:w-[45%]`} bg-neutral-100`}
          >
            <ListingMap
              selectionRadius
              unlocatedSelection={visibleListings.find(
                (item) => item.id === selectedId && !hasCoordinates(item),
              )}
              listings={mapListings}
              onView={(id) => router.push(`/buyer/browse/${id}`)}
              selectedId={selectedId}
              onSelect={(id) => demoView.toggleSelect(id)}
              origin={origin}
              radiusFitListings={false}
              radiusMiles={radiusMiles || undefined}
              notice={mapNotice}
              onOriginChange={setManualOrigin}
              viewer={viewer}
              focusViewer
              demoPins={demoView.pins}
              onViewDemo={(key) => {
                const result = demoView.byKey.get(key);
                if (result) demoView.openInGallery(result);
              }}
            />
            <button
              type="button"
              onClick={() => setMapExpanded(!mapExpanded)}
              aria-label={mapExpanded ? "Collapse map" : "Expand map"}
              title={mapExpanded ? "Collapse map" : "Expand map"}
              className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-md bg-white text-neutral-700 hover:bg-neutral-50"
              style={{
                border: "1px solid #E0E0E0",
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
              }}
            >
              {mapExpanded ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      <FiltersPanel
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={changeFilters}
        onReset={() => changeFilters(defaultFilters)}
        pricingUnavailable={pricingUnavailable}
        listingCount={visibleListings.length}
        marketplaceOnly
      />
    </BuyerLayout>
  );
}
