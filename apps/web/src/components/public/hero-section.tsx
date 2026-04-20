"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@eco-globe/ui";

const popularSearches = [
  "Biomass",
  "Certified Feedstocks",
  "Industrial By products",
  "Low CO\u2082 feedstocks",
];

export function HeroSection() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
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
        src="/hero.jpg"
        alt="EcoGlobe industrial facility"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-black/40" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-center px-4 pb-6 sm:pb-0 sm:px-8 lg:px-[135px]">
        <div className="flex max-w-[1030px] w-full flex-col items-center gap-6 sm:gap-8 lg:gap-16 text-center">
          <h1 className="text-2xl sm:text-5xl lg:text-[64px] font-bold leading-tight text-white">
            Buy verified feedstocks,
            <br />
            locally and transparently.
          </h1>

          <form onSubmit={handleSearch} className="flex w-full flex-col md:flex-row items-center rounded-3xl md:rounded-full bg-white py-3 px-4 md:pl-6 md:pr-3 gap-3 md:gap-0">
            <div className="flex w-full flex-1 flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-6">
              <Search className="size-6 shrink-0 text-neutral-800 hidden md:block" />
              <div className="flex w-full flex-1 flex-col md:flex-row gap-3 md:gap-6">
                <div className="flex flex-1 flex-col gap-1 md:pr-4 md:border-r md:border-neutral-200">
                  <label className="text-left text-sm text-neutral-800">Feedstocks</label>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search feedstocks"
                    className="bg-transparent text-left text-base text-neutral-900 outline-none placeholder:text-neutral-500"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1 md:pr-4">
                  <label className="text-left text-sm text-neutral-800">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Near me"
                    className="bg-transparent text-left text-base text-neutral-900 outline-none placeholder:text-neutral-500"
                  />
                </div>
              </div>
            </div>
            <Button variant="primary" size="md" className="h-12 px-8 w-full md:w-auto" type="submit">
              Search
            </Button>
          </form>

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
