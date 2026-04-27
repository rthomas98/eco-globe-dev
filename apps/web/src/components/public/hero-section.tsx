"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Package, TrendingUp } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { listings } from "./browse-listings";

const popularSearches = [
  "Industrial Byproducts",
  "Low CO₂ feedstocks",
  "Certified Feedstocks",
  "Used products",
];

const ALL_LOCATIONS = Array.from(
  new Set(listings.map((l) => l.location)),
).sort();

function filterFeedstocks(query: string, max = 6) {
  const q = query.trim().toLowerCase();
  const scored = listings
    .map((l) => {
      const haystack = `${l.title} ${l.tags.join(" ")} ${l.category}`.toLowerCase();
      if (!q) return { listing: l, score: 1 };
      if (l.title.toLowerCase().startsWith(q)) return { listing: l, score: 3 };
      if (haystack.includes(q)) return { listing: l, score: 2 };
      return { listing: l, score: 0 };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
  return scored.map((s) => s.listing);
}

function filterLocations(query: string, max = 6) {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_LOCATIONS.slice(0, max);
  return ALL_LOCATIONS.filter((loc) => loc.toLowerCase().includes(q)).slice(
    0,
    max,
  );
}

function useLiveCount(query: string, location: string) {
  const [count, setCount] = useState(listings.length);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    setPulsing(true);
    const t = setTimeout(() => {
      const q = query.trim().toLowerCase();
      const loc = location.trim().toLowerCase();
      const next = listings.filter((l) => {
        const haystack =
          `${l.title} ${l.tags.join(" ")} ${l.category}`.toLowerCase();
        if (q && !haystack.includes(q)) return false;
        if (loc && !l.location.toLowerCase().includes(loc)) return false;
        return true;
      }).length;
      setCount(next);
      setPulsing(false);
    }, 180);
    return () => clearTimeout(t);
  }, [query, location]);

  return { count, pulsing };
}

export function HeroSection() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [openField, setOpenField] = useState<"query" | "location" | null>(null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);

  const feedstockSuggestions = useMemo(
    () => filterFeedstocks(query),
    [query],
  );
  const locationSuggestions = useMemo(
    () => filterLocations(location),
    [location],
  );

  const { count, pulsing } = useLiveCount(query, location);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!formRef.current) return;
      if (!formRef.current.contains(e.target as Node)) setOpenField(null);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOpenField(null);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (location) params.set("location", location);
    router.push(`/browse${params.toString() ? `?${params}` : ""}`);
  };

  const handleTagClick = (tag: string) => {
    router.push(`/browse?q=${encodeURIComponent(tag)}`);
  };

  return (
    <section className="relative flex h-[600px] sm:h-[600px] lg:h-[768px] w-full items-end sm:items-center justify-center overflow-hidden">
      <img
        src="/images/home-hero-marketplace.png"
        alt="EcoGlobe industrial facility"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-black/40" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-center px-4 pb-6 sm:pb-0 sm:px-8 lg:px-[135px]">
        <div className="flex max-w-[1030px] w-full flex-col items-center gap-6 sm:gap-8 lg:gap-12 text-center">
          <h1 className="text-2xl sm:text-5xl lg:text-[64px] font-bold leading-tight text-white">
            Buy verified feedstocks,
            <br />
            locally and transparently.
          </h1>

          <form
            ref={formRef}
            onSubmit={handleSearch}
            className="relative flex w-full flex-col md:flex-row items-center rounded-3xl md:rounded-full bg-white py-3 px-4 md:pl-6 md:pr-3 gap-3 md:gap-0"
          >
            <div className="flex w-full flex-1 flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-6">
              <Search className="size-6 shrink-0 text-neutral-800 hidden md:block" />
              <div className="flex w-full flex-1 flex-col md:flex-row gap-3 md:gap-6">
                {/* Feedstocks */}
                <div className="relative flex flex-1 flex-col gap-1 md:pr-4 md:border-r md:border-neutral-200">
                  <label className="text-left text-sm text-neutral-800">
                    Feedstocks
                  </label>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setOpenField("query")}
                    placeholder="Try 'biochar' or 'low CO₂'"
                    className="bg-transparent text-left text-base text-neutral-900 outline-none placeholder:text-neutral-500"
                  />
                  {openField === "query" && feedstockSuggestions.length > 0 && (
                    <div
                      className="absolute left-0 right-2 top-[calc(100%+12px)] z-20 max-h-[320px] overflow-y-auto rounded-2xl bg-white py-2 text-left"
                      style={{
                        border: "1px solid #E0E0E0",
                        boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
                      }}
                    >
                      {feedstockSuggestions.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setQuery(l.title);
                            setOpenField(null);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-neutral-50"
                        >
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-neutral-100">
                            <Package className="size-4 text-neutral-600" />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-medium text-neutral-900">
                              {l.title}
                            </p>
                            <p className="truncate text-xs text-neutral-500">
                              {l.location} · {l.price}
                              {l.unit}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="relative flex flex-1 flex-col gap-1 md:pr-4">
                  <label className="text-left text-sm text-neutral-800">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onFocus={() => setOpenField("location")}
                    placeholder="City, state, or facility"
                    className="bg-transparent text-left text-base text-neutral-900 outline-none placeholder:text-neutral-500"
                  />
                  {openField === "location" &&
                    locationSuggestions.length > 0 && (
                      <div
                        className="absolute left-0 right-0 top-[calc(100%+12px)] z-20 max-h-[320px] overflow-y-auto rounded-2xl bg-white py-2 text-left"
                        style={{
                          border: "1px solid #E0E0E0",
                          boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
                        }}
                      >
                        {locationSuggestions.map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setLocation(loc);
                              setOpenField(null);
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-neutral-50"
                          >
                            <MapPin className="size-4 shrink-0 text-neutral-500" />
                            <span className="truncate text-sm text-neutral-900">
                              {loc}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            </div>
            <Button
              variant="primary"
              size="md"
              className="h-12 px-8 w-full md:w-auto"
              type="submit"
            >
              Search
            </Button>
          </form>

          {/* Live count */}
          <div className="flex items-center gap-2 text-sm text-white/80">
            <TrendingUp
              className={`size-4 transition-transform ${pulsing ? "scale-125" : ""}`}
            />
            <span aria-live="polite">
              <span
                className={`font-bold text-white tabular-nums transition-opacity ${
                  pulsing ? "opacity-50" : "opacity-100"
                }`}
              >
                {count}
              </span>{" "}
              {count === 1 ? "feedstock" : "feedstocks"} match
              {query || location ? " your filters" : " right now"}
            </span>
          </div>

          <div className="flex flex-col items-center gap-4">
            <span className="text-sm font-semibold text-white">
              Popular Searches
            </span>
            <div className="flex flex-wrap justify-center gap-3">
              {popularSearches.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="rounded-full border border-white/40 bg-neutral-900/30 px-3 py-1 text-base text-white transition-colors hover:bg-white/20"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
