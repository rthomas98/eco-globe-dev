"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

const recentSearches = [
  "Wood Pellets",
  "LDPE Film Scrap",
  "Refined Pyrolysis Oil",
  "Corn Stover",
];

const recommendedTags = ["Sawdust", "Polymer", "Pyrolysis", "Biomass"];

const recentLocations = [
  "Erath, LA",
  "Kaplan, LA",
  "Abbeville, LA",
  "Delcambre, LA",
  "Maurice, LA",
];

const radiusOptions = ["10 mi", "25 mi", "50 mi", "100 mi", "200 mi"];

export function SearchBar({
  onSearch,
  initialQuery = "",
  initialLocation = "",
}: {
  onSearch?: (query: string, location: string, radius: string) => void;
  initialQuery?: string;
  initialLocation?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState(initialLocation);
  const [radius, setRadius] = useState("100 mi");
  const [activeDropdown, setActiveDropdown] = useState<"feedstock" | "location" | null>(null);
  const [radiusOpen, setRadiusOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
        setRadiusOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = () => {
    setActiveDropdown(null);
    onSearch?.(query, location, radius);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search pill */}
      <div className="flex items-center rounded-full bg-white px-1 py-1" style={{ border: "1px solid #E0E0E0" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { setActiveDropdown("feedstock"); setRadiusOpen(false); }}

          className="w-28 sm:w-44 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-neutral-500"
        />
        <div className="h-5 w-px bg-neutral-300" />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onFocus={() => { setActiveDropdown("location"); setRadiusOpen(false); }}

          className="w-24 sm:w-48 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-neutral-500"
        />
        <button
          onClick={handleSearch}
          className="flex size-9 items-center justify-center rounded-full bg-neutral-900 text-white"
        >
          <Search className="size-4" />
        </button>
      </div>

      {/* Feedstock dropdown */}
      {activeDropdown === "feedstock" && (
        <div
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-[calc(100vw-2rem)] sm:w-[380px] rounded-xl bg-white py-3"
          style={{ boxShadow: "0 8px 32px -4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)" }}
        >
          <p className="px-5 pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Recent searches
          </p>
          {recentSearches.map((item) => (
            <button
              key={item}
              onClick={() => { setQuery(item); setActiveDropdown(null); }}
              className="w-full px-5 py-2.5 text-left text-sm text-neutral-900 hover:bg-neutral-50"
            >
              {item}
            </button>
          ))}
          <div className="mx-5 my-3 h-px bg-neutral-200" />
          <p className="px-5 pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Recommended
          </p>
          <div className="flex flex-wrap gap-2 px-5">
            {recommendedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => { setQuery(tag); setActiveDropdown(null); }}
                className="rounded-full px-3 py-1.5 text-sm text-neutral-900"
                style={{ backgroundColor: "#F0F0F0" }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Location dropdown */}
      {activeDropdown === "location" && (
        <div
          className="absolute left-0 sm:left-0 top-[calc(100%+8px)] z-50 w-[calc(100vw-2rem)] sm:w-[380px] rounded-xl bg-white py-3"
          style={{ boxShadow: "0 8px 32px -4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)" }}
        >
          {/* Radius selector */}
          <div className="mx-5 mb-3">
            <button
              onClick={() => setRadiusOpen(!radiusOpen)}
              className="flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-sm"
              style={{ backgroundColor: "#F5F5F5" }}
            >
              <span>
                <span className="font-medium text-neutral-900">Radius:</span>{" "}
                <span className="text-neutral-700">{radius}</span>
              </span>
              {radiusOpen ? (
                <ChevronUp className="size-4 text-neutral-500" />
              ) : (
                <ChevronDown className="size-4 text-neutral-500" />
              )}
            </button>
            {radiusOpen && (
              <div className="mt-1 rounded-lg bg-white" style={{ border: "1px solid #E0E0E0" }}>
                {radiusOptions.map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRadius(r); setRadiusOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 ${r === radius ? "font-medium text-neutral-900" : "text-neutral-700"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {location && (
            <p className="px-5 pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Recent searches
            </p>
          )}

          {recentLocations.map((loc) => (
            <button
              key={loc}
              onClick={() => { setLocation(loc); setActiveDropdown(null); }}
              className="w-full px-5 py-2.5 text-left text-sm text-neutral-900 hover:bg-neutral-50"
            >
              {loc}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
