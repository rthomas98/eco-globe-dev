"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button, Badge } from "@eco-globe/ui";
import { ListingMap, type MapListing } from "./listing-map";
import { SearchBar } from "./search-bar";
import { CartButton } from "@/components/cart/cart-panel";
import { FiltersPanel, defaultFilters, type FilterState } from "./filters-panel";

interface Listing {
  id: string;
  title: string;
  location: string;
  distance: string;
  moq: string;
  co2: string;
  price: string;
  unit: string;
  image: string;
  tags: string[];
  lng: number;
  lat: number;
}

const listings: Listing[] = [
  {
    id: "bagasse",
    title: "Shredded, Refined Sugar Bagasse",
    location: "Port Allen, LA",
    distance: "3 mi",
    moq: "3 tons",
    co2: "300 kg CO₂e",
    price: "$48",
    unit: "/ton",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80",
    tags: ["biomass", "certified", "low co2", "industrial by products"],
    lng: -91.2103,
    lat: 30.4524,
  },
  {
    id: "polymer",
    title: "Scrap Polymer Blend with Impurities",
    location: "Plaquemine, LA",
    distance: "3 mi",
    moq: "3 tons",
    co2: "300 kg CO₂e",
    price: "€60",
    unit: "/ton",
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&q=80",
    tags: ["polymer", "industrial by products", "plastics"],
    lng: -91.2343,
    lat: 30.2893,
  },
  {
    id: "pyrolysis",
    title: "High-Quality Recycled Pyrolysis Pitch",
    location: "Baker, LA",
    distance: "2.1 mi",
    moq: "3 tons",
    co2: "300 kg CO₂e",
    price: "$300",
    unit: "/ton",
    image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&q=80",
    tags: ["pyrolysis", "certified feedstocks", "low co2 feedstocks"],
    lng: -91.1681,
    lat: 30.5883,
  },
  {
    id: "stover-walker",
    title: "Harvested and Baled Corn Stover",
    location: "Walker, LA",
    distance: "2.5 mi",
    moq: "3 tons",
    co2: "300 kg CO₂e",
    price: "$42",
    unit: "/ton",
    image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&q=80",
    tags: ["biomass", "certified feedstocks", "low co2 feedstocks"],
    lng: -90.8612,
    lat: 30.4888,
  },
  {
    id: "wood-pellets",
    title: "Biomass Wood Pellets, Grade A",
    location: "Lafayette, LA",
    distance: "4.2 mi",
    moq: "5 tons",
    co2: "210 kg CO₂e",
    price: "$120",
    unit: "/ton",
    image: "https://images.unsplash.com/photo-1512467526020-6ed69e71aad9?w=400&q=80",
    tags: ["biomass", "certified feedstocks", "low co2 feedstocks"],
    lng: -92.0198,
    lat: 30.2241,
  },
  {
    id: "rice-husk",
    title: "Industrial By-Product: Rice Husk",
    location: "Crowley, LA",
    distance: "5.8 mi",
    moq: "10 tons",
    co2: "180 kg CO₂e",
    price: "$28",
    unit: "/ton",
    image: "https://images.unsplash.com/photo-1591339230011-4a5527c6e6d6?w=400&q=80",
    tags: ["biomass", "industrial by products", "low co2 feedstocks"],
    lng: -92.3746,
    lat: 30.2141,
  },
  {
    id: "wood-chips",
    title: "Certified Organic Wood Chips",
    location: "Baton Rouge, LA",
    distance: "1.8 mi",
    moq: "2 tons",
    co2: "150 kg CO₂e",
    price: "$95",
    unit: "/ton",
    image: "https://images.unsplash.com/photo-1575503802870-45de6a6217c8?w=400&q=80",
    tags: ["biomass", "certified feedstocks"],
    lng: -91.1403,
    lat: 30.4515,
  },
  {
    id: "bio-ethanol",
    title: "Low-CO₂ Bio-Ethanol Feedstock",
    location: "New Orleans, LA",
    distance: "6.4 mi",
    moq: "8 tons",
    co2: "95 kg CO₂e",
    price: "$210",
    unit: "/ton",
    image: "https://images.unsplash.com/photo-1574169208507-84376144848b?w=400&q=80",
    tags: ["low co2 feedstocks", "certified feedstocks", "biomass"],
    lng: -90.0715,
    lat: 29.9511,
  },
];

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
    <button
      type="button"
      onClick={onSelect}
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
    </button>
  );
}


export function BrowsePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlQuery = searchParams.get("q") || "";
  const urlLocation = searchParams.get("location") || "";

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSearch = (query: string, location: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (location) params.set("location", location);
    router.push(`/browse${params.toString() ? `?${params}` : ""}`);
  };

  const q = urlQuery.trim().toLowerCase();
  const loc = urlLocation.trim().toLowerCase();
  const visibleListings = listings.filter((l) => {
    const haystack = `${l.title} ${l.tags.join(" ")}`.toLowerCase();
    const matchesQuery = !q || haystack.includes(q);
    const matchesLocation = !loc || l.location.toLowerCase().includes(loc);
    return matchesQuery && matchesLocation;
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
          <Link href="/register" className="hidden sm:inline-flex">
            <Button variant="secondary" size="md">Sign Up</Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-col lg:flex-row flex-1">
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
            {(urlQuery || urlLocation) && (
              <button
                onClick={() => {
                  setSelectedId(null);
                  router.push("/browse");
                }}
                className="text-sm font-medium text-neutral-900 underline"
              >
                Clear search
              </button>
            )}
          </div>
          {visibleListings.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-neutral-50 py-16 text-center">
              <p className="text-base font-semibold text-neutral-900">No matches found</p>
              <p className="max-w-[360px] text-sm text-neutral-600">
                Try a different keyword or clear the search to see all listings.
              </p>
              <button
                onClick={() => router.push("/browse")}
                className="mt-2 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        {/* Map panel */}
        <div className="hidden lg:block lg:w-[45%] p-2">
          <ListingMap
            listings={mapListings}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
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
