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
    <section className="relative flex h-[768px] w-full items-center justify-center overflow-hidden">
      <img
        src="/hero.jpg"
        alt="EcoGlobe industrial facility"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-black/40" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-center px-[135px]">
        <div className="flex max-w-[1030px] flex-col items-center gap-16 text-center">
          <h1 className="text-[64px] font-bold leading-tight text-white">
            Buy verified feedstocks,
            <br />
            locally and transparently.
          </h1>

          <form onSubmit={handleSearch} className="flex w-full items-center rounded-full bg-white py-3 pl-6 pr-3">
            <div className="flex flex-1 items-center gap-6">
              <Search className="size-6 shrink-0 text-neutral-800" />
              <div className="flex flex-1 gap-6">
                <div className="flex flex-1 flex-col gap-1 pr-4" style={{ borderRight: "1px solid #E0E0E0" }}>
                  <label className="text-left text-sm text-neutral-800">Feedstocks</label>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search feedstocks"
                    className="bg-transparent text-left text-base text-neutral-900 outline-none placeholder:text-neutral-500"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1 pr-4">
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
            <Button variant="primary" size="md" className="h-12 px-8" type="submit">
              Search
            </Button>
          </form>

          <div className="flex flex-col items-center gap-4">
            <span className="text-sm font-semibold text-white">
              Popular Searches
            </span>
            <div className="flex gap-3">
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
