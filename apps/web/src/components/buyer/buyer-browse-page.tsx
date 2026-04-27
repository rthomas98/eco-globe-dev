"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, MapPin, SlidersHorizontal, Maximize2, Minimize2 } from "lucide-react";
import { Badge } from "@eco-globe/ui";
import { ListingMap, type MapListing } from "../public/listing-map";
import { FiltersPanel, defaultFilters, type FilterState } from "../public/filters-panel";
import { listings, type Listing } from "../public/browse-listings";
import { BuyerLayout } from "./buyer-layout";

function ListingCard({
  listing,
  selected,
  onSelect,
}: {
  listing: Listing;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Link
      href={`/buyer/browse/${listing.id}`}
      onMouseEnter={onSelect}
      className={`group flex w-full flex-col rounded-xl p-2 text-left transition-colors ${
        selected ? "bg-neutral-100 ring-2 ring-neutral-900" : "hover:bg-neutral-50"
      }`}
    >
      <div className="mb-3 h-[200px] w-full overflow-hidden rounded-xl">
        <img
          src={listing.image}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <h3 className="text-base font-medium text-neutral-900">{listing.title}</h3>
      <p className="mt-1 text-sm text-neutral-700">
        {listing.location} · {listing.distance}
      </p>
      <div className="mt-2 flex gap-2">
        <Badge>MOQ: {listing.moq}</Badge>
        <Badge>{listing.co2}</Badge>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-lg font-semibold text-neutral-900">{listing.price}</span>
        <span className="text-sm text-neutral-700">{listing.unit}</span>
      </div>
    </Link>
  );
}

function LocationPill({
  value,
  onClick,
}: {
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-neutral-900"
      style={{ border: "1px solid #E0E0E0" }}
    >
      <MapPin className="size-4 text-neutral-500" />
      <span className={value ? "text-neutral-900" : "text-neutral-400"}>
        {value || "Location"}
      </span>
    </button>
  );
}

export function BuyerBrowsePage() {
  const [search, setSearch] = useState("");
  const [location] = useState("Louisiana · 100 mi");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);

  const q = search.trim().toLowerCase();
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

  const visibleListings = listings.filter((l) => {
    const haystack = `${l.title} ${l.tags.join(" ")}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
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
    <BuyerLayout>
      <div className="flex h-full flex-col">
        {/* Top bar */}
        <header
          className="flex h-20 shrink-0 items-center justify-between gap-4 px-6"
          style={{ borderBottom: "1px solid #F0F0F0" }}
        >
          <h1 className="text-2xl font-bold text-neutral-900">Browse</h1>

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
                onChange={(e) => setSearch(e.target.value)}
                className="w-40 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
              />
            </div>

            <LocationPill value={location} onClick={() => { /* picker stub */ }} />

            <button
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

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Listings panel */}
          {!mapExpanded && (
            <div className="w-full overflow-y-auto p-6 lg:w-[55%]">
              <p className="mb-4 text-sm text-neutral-700">
                {visibleListings.length} listings
              </p>
              {visibleListings.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl bg-neutral-50 py-16 text-center">
                  <p className="text-base font-semibold text-neutral-900">No matches found</p>
                  <p className="max-w-[360px] text-sm text-neutral-600">
                    Try a different keyword, loosen the filters, or clear everything to see all
                    listings.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedId(null);
                      setFilters(defaultFilters);
                      setSearch("");
                    }}
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
                      selected={selectedId === listing.id}
                      onSelect={() =>
                        setSelectedId((curr) => (curr === listing.id ? null : listing.id))
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Map panel */}
          <div
            className={`relative ${mapExpanded ? "w-full" : "hidden lg:block lg:w-[45%]"} bg-neutral-100`}
          >
            <ListingMap
              listings={mapListings}
              selectedId={selectedId}
              onSelect={(id) =>
                setSelectedId((curr) => (curr === id ? null : id))
              }
            />
            <button
              type="button"
              onClick={() => setMapExpanded(!mapExpanded)}
              aria-label={mapExpanded ? "Collapse map" : "Expand map"}
              title={mapExpanded ? "Collapse map" : "Expand map"}
              className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-md bg-white text-neutral-700 hover:bg-neutral-50"
              style={{ border: "1px solid #E0E0E0", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}
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
        onChange={setFilters}
        onReset={() => setFilters(defaultFilters)}
        listingCount={visibleListings.length}
      />
    </BuyerLayout>
  );
}
