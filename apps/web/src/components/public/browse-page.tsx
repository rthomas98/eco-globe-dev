"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { SlidersHorizontal, Lock, FileText, AlertTriangle } from "lucide-react";
import { Badge } from "@eco-globe/ui";
import { ListingMap, type MapListing } from "./listing-map";
import { SearchBar } from "./search-bar";
import { CartButton } from "@/components/cart/cart-panel";
import { HeaderUserMenu } from "@/components/auth/header-user-menu";
import { FiltersPanel, defaultFilters, type FilterState } from "./filters-panel";
import { listings, type Listing } from "./browse-listings";
import { useDemoUser } from "@/lib/demo-user";
import { useCustomListings } from "@/lib/custom-listings";
import { CarbonCalculatorButton } from "@/components/buyer/carbon-calculator-button";

function ListingCard({
  listing,
  selected,
  onSelect,
  isMember,
}: {
  listing: Listing;
  selected: boolean;
  onSelect: () => void;
  isMember: boolean;
}) {
  const hasSds = !!listing.sdsUrl;
  return (
    <div
      className={`group flex w-full flex-col rounded-xl p-2 text-left transition-colors ${
        selected ? "bg-neutral-100 ring-2 ring-neutral-900" : "hover:bg-neutral-50"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="mb-3 h-[200px] w-full overflow-hidden rounded-xl"
      >
        <img
          src={listing.image}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="text-left"
      >
        <h3 className="text-base font-medium text-neutral-900">
          {listing.title}
        </h3>
        {isMember ? (
          <p className="mt-1 text-sm text-neutral-700">
            {listing.location} · {listing.distance}
          </p>
        ) : (
          <p className="mt-1 text-sm text-neutral-500">
            {listing.qtyNum} tons available
          </p>
        )}
      </button>
      {isMember ? (
        <>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>MOQ: {listing.moq}</Badge>
            <Badge>{listing.co2}</Badge>
            <Badge>{listing.frequency}</Badge>
            {hasSds ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                <FileText className="size-3" /> SDS
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                <AlertTriangle className="size-3" /> SDS pending
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold text-neutral-900">
                {listing.price}
              </span>
              <span className="text-sm text-neutral-700">{listing.unit}</span>
            </div>
            <CarbonCalculatorButton listingId={listing.id} variant="ghost" label="Footprint" />
          </div>
        </>
      ) : (
        <Link
          href="/login"
          className="mt-3 flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Lock className="size-3.5" />
          Sign in to see pricing
        </Link>
      )}
    </div>
  );
}


export function BrowsePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlQuery = searchParams.get("q") || "";
  const urlLocation = searchParams.get("location") || "";
  const user = useDemoUser();
  const isMember = !!user;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [radiusMiles, setRadiusMiles] = useState<number>(0); // 0 = off
  const originFacility = user?.facilities?.find((f) => f.lat && f.lng);

  const handleSearch = (query: string, location: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (location) params.set("location", location);
    router.push(`/browse${params.toString() ? `?${params}` : ""}`);
  };

  const q = urlQuery.trim().toLowerCase();
  const loc = urlLocation.trim().toLowerCase();

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

  const customListings = useCustomListings();
  const allListings = useMemo(
    () => [...customListings, ...listings],
    [customListings],
  );
  const visibleListings = allListings.filter((l) => {
    const haystack = `${l.title} ${l.tags.join(" ")}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (loc && !l.location.toLowerCase().includes(loc)) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(l.category)) return false;
    if (filters.grades.length > 0 && !filters.grades.includes(l.grade)) return false;
    if (priceMin !== null && l.priceNum < priceMin) return false;
    if (priceMax !== null && l.priceNum > priceMax) return false;
    if (qtyMin !== null && l.qtyNum < qtyMin) return false;
    if (qtyMax !== null && l.qtyNum > qtyMax) return false;
    if (filters.carbon.length > 0 && !matchesCarbonBucket(l.co2Num)) return false;
    if (filters.carbonDataOnly && !l.hasCarbonData) return false;
    return true;
  });

  const mapListings: MapListing[] = useMemo(
    () =>
      visibleListings.map((l) => ({
        id: l.id,
        title: l.title,
        location: l.location,
        price: l.price,
        unit: l.unit,
        moq: l.moq,
        co2: l.co2,
        lng: l.lng,
        lat: l.lat,
        image: l.image,
      })),
    [visibleListings],
  );

  const activeFilterCount =
    filters.categories.length +
    (filters.priceMin || filters.priceMax ? 1 : 0) +
    (filters.qtyMin || filters.qtyMax ? 1 : 0) +
    filters.carbon.length +
    (filters.carbonDataOnly ? 1 : 0) +
    filters.grades.length;

  return (
    <div className="flex h-screen flex-col">
      {/* Search header */}
      <header className="flex h-16 items-center justify-between bg-white px-4 sm:px-6" style={{ borderBottom: "1px solid #E0E0E0" }}>
        <Link href="/" className="mr-4 shrink-0">
          <img src="/logo.svg" alt="EcoGlobe" width={100} height={28} className="invert" />
        </Link>

        <div className="hidden sm:flex items-center gap-3">
          <SearchBar
            initialQuery={urlQuery}
            initialLocation={urlLocation}
            onSearch={(q, loc) => handleSearch(q, loc)}
          />

          <button
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-neutral-900"
            style={{ border: "1px solid #E0E0E0" }}
          >
            <SlidersHorizontal className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: "#378853" }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <CartButton />
          <HeaderUserMenu />
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* Listings panel */}
        <div className="w-full lg:w-[55%] overflow-y-auto p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-900">
              {urlQuery || urlLocation ? (
                <>
                  {visibleListings.length} listing{visibleListings.length === 1 ? "" : "s"} for{" "}
                  {urlQuery && <span className="font-semibold">&quot;{urlQuery}&quot;</span>}
                  {urlQuery && urlLocation && " in "}
                  {urlLocation && <span className="font-semibold">{urlLocation}</span>}
                </>
              ) : (
                <>{visibleListings.length} listings</>
              )}
            </p>
            {(urlQuery || urlLocation || activeFilterCount > 0) && (
              <button
                onClick={() => {
                  setSelectedId(null);
                  setFilters(defaultFilters);
                  router.push("/browse");
                }}
                className="text-sm font-medium text-neutral-900 underline"
              >
                Clear all
              </button>
            )}
          </div>
          {visibleListings.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-neutral-50 py-16 text-center">
              <p className="text-base font-semibold text-neutral-900">No matches found</p>
              <p className="max-w-[360px] text-sm text-neutral-600">
                Try a different keyword, loosen the filters, or clear everything to see all listings.
              </p>
              <button
                onClick={() => {
                  setSelectedId(null);
                  setFilters(defaultFilters);
                  router.push("/browse");
                }}
                className="mt-2 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white"
              >
                Clear all
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  selected={selectedId === listing.id}
                  isMember={isMember}
                  onSelect={() =>
                    setSelectedId((curr) => (curr === listing.id ? null : listing.id))
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Map panel */}
        <div className="relative hidden lg:block lg:w-[45%] h-full p-2">
          {originFacility && (
            <div
              className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs shadow"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <span className="font-semibold text-neutral-700">Search radius</span>
              <select
                value={radiusMiles}
                onChange={(e) => setRadiusMiles(parseInt(e.target.value, 10))}
                className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs outline-none"
              >
                <option value={0}>Off</option>
                <option value={2}>2 mi</option>
                <option value={5}>5 mi</option>
                <option value={10}>10 mi</option>
                <option value={25}>25 mi</option>
                <option value={50}>50 mi</option>
                <option value={100}>100 mi</option>
                <option value={250}>250 mi</option>
              </select>
            </div>
          )}
          <ListingMap
            listings={mapListings}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
            onView={(id) => router.push(`/browse/${id}`)}
            origin={
              originFacility?.lat && originFacility?.lng
                ? {
                    lng: originFacility.lng,
                    lat: originFacility.lat,
                    label: originFacility.label,
                  }
                : undefined
            }
            radiusMiles={radiusMiles > 0 ? radiusMiles : undefined}
          />
        </div>
      </div>

      {/* Filters panel */}
      <FiltersPanel
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(defaultFilters)}
        listingCount={visibleListings.length}
      />
    </div>
  );
}
