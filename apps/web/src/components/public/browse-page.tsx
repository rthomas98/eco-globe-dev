"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button, Badge } from "@eco-globe/ui";
import { ListingMap } from "./listing-map";
import { SearchBar } from "./search-bar";
import { CartButton } from "@/components/cart/cart-panel";
import { FiltersPanel, defaultFilters, type FilterState } from "./filters-panel";

const listings = [
  {
    title: "Shredded, Refined Sugar Bagasse",
    location: "Port Allen, LA",
    distance: "3 mi",
    moq: "3 tons",
    co2: "300 kg CO₂e",
    price: "$48",
    unit: "/ton",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80",
  },
  {
    title: "Scrap Polymer Blend with Impurities",
    location: "Plaquemine, LA",
    distance: "3 mi",
    moq: "3 tons",
    co2: "300 kg CO₂e",
    price: "€60",
    unit: "/ton",
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&q=80",
  },
  {
    title: "High-Quality Recycled Pyrolysis Pitch",
    location: "Baker, LA",
    distance: "2.1 mi",
    moq: "3 tons",
    co2: "300 kg CO₂e",
    price: "$300",
    unit: "/ton",
    image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&q=80",
  },
  {
    title: "Harvested and Baled Corn Stover",
    location: "Walker, LA",
    distance: "2.5 mi",
    moq: "3 tons",
    co2: "300 kg CO₂e",
    price: "$42",
    unit: "/ton",
    image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&q=80",
  },
];

function ListingCard({ listing }: { listing: (typeof listings)[0] }) {
  return (
    <div className="cursor-pointer">
      <div className="mb-3 h-[200px] overflow-hidden rounded-xl">
        <img
          src={listing.image}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <h3 className="text-base font-medium text-neutral-900">
        {listing.title}
      </h3>
      <p className="mt-1 text-sm text-neutral-700">
        {listing.location} · {listing.distance}
      </p>
      <div className="mt-2 flex gap-2">
        <Badge>MOQ: {listing.moq}</Badge>
        <Badge>{listing.co2}</Badge>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-lg font-semibold text-neutral-900">
          {listing.price}
        </span>
        <span className="text-sm text-neutral-700">{listing.unit}</span>
      </div>
    </div>
  );
}


export function BrowsePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlQuery = searchParams.get("q") || "";
  const urlLocation = searchParams.get("location") || "";

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const handleSearch = (query: string, location: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (location) params.set("location", location);
    router.push(`/browse${params.toString() ? `?${params}` : ""}`);
  };

  const activeFilterCount =
    filters.categories.length +
    (filters.priceMin || filters.priceMax ? 1 : 0) +
    (filters.qtyMin || filters.qtyMax ? 1 : 0) +
    filters.carbon.length +
    (filters.carbonDataOnly ? 1 : 0) +
    filters.grades.length;

  return (
    <div className="flex min-h-screen flex-col">
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
          <Link href="/login" className="hidden sm:inline text-base font-bold text-neutral-900">Login</Link>
          <Button variant="secondary" size="md" className="hidden sm:inline-flex">Sign Up</Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-col lg:flex-row flex-1">
        {/* Listings panel */}
        <div className="w-full lg:w-[55%] overflow-y-auto p-6">
          <p className="mb-6 text-sm text-neutral-900">
            {urlQuery ? (
              <>Result for <span className="font-semibold">&quot;{urlQuery}&quot;</span> {listings.length} listings</>
            ) : (
              <>{listings.length} listings</>
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.title} listing={listing} />
            ))}
          </div>
        </div>

        {/* Map panel */}
        <div className="hidden lg:block lg:w-[45%] p-2">
          <ListingMap />
        </div>
      </div>

      {/* Filters panel */}
      <FiltersPanel
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(defaultFilters)}
        listingCount={listings.length}
      />
    </div>
  );
}
