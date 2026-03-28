import { Search } from "lucide-react";
import { Button } from "@eco-globe/ui";

const popularSearches = [
  "Biomass",
  "Certified Feedstocks",
  "Industrial By products",
  "Low CO\u2082 feedstocks",
];

export function HeroSection() {
  return (
    <section className="relative flex h-[768px] w-full items-center justify-center overflow-hidden">
      {/* Background image placeholder */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/75 to-black/90" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-center px-[135px]">
        <div className="flex max-w-[1030px] flex-col items-center gap-16 text-center">
          <h1 className="text-[64px] font-bold leading-tight text-white">
            Buy verified feedstocks,
            <br />
            locally and transparently.
          </h1>

          {/* Search bar */}
          <div className="flex w-full items-center rounded-full bg-white py-3 pl-6 pr-3">
            <div className="flex flex-1 items-center gap-6">
              <Search className="size-6 shrink-0 text-neutral-800" />
              <div className="flex flex-1 gap-6">
                <div className="flex flex-1 flex-col gap-1 border-r border-neutral-300 pr-4">
                  <span className="text-left text-sm text-neutral-800">
                    Feedstocks
                  </span>
                  <span className="text-left text-base text-neutral-500">
                    Search feedstocks
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1 pr-4">
                  <span className="text-left text-sm text-neutral-800">
                    Location
                  </span>
                  <span className="text-left text-base text-neutral-500">
                    Near me
                  </span>
                </div>
              </div>
            </div>
            <Button variant="primary" size="md">
              Search
            </Button>
          </div>

          {/* Popular searches */}
          <div className="flex flex-col items-center gap-4">
            <span className="text-sm font-semibold text-white">
              Popular Searches
            </span>
            <div className="flex gap-3">
              {popularSearches.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/40 bg-neutral-900/30 px-3 py-1 text-base text-white"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
