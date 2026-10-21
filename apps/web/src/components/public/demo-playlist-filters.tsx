"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  DEMO_PLAYLIST_KIND_FILTERS,
  type DemoPlaylistCompany,
  type DemoPlaylistFilter,
} from "@/lib/demo-playlists";

export type DemoPlaylistFilterPatch = Partial<DemoPlaylistFilter>;

/**
 * Type, company, material search and network controls. The URL is the source
 * of truth; `onChange` writes it (company changes are pushed for Back).
 */
export function DemoPlaylistFilterBar({
  filter,
  companies,
  onChange,
}: {
  filter: DemoPlaylistFilter;
  companies: DemoPlaylistCompany[];
  onChange: (patch: DemoPlaylistFilterPatch, mode: "push" | "replace") => void;
}) {
  // Search typing stays local and is written to the URL after a pause; a URL
  // change from elsewhere (Back, clear filters) resets the box.
  const [draft, setDraft] = useState(filter.query);
  const [seenQuery, setSeenQuery] = useState(filter.query);
  if (filter.query !== seenQuery) {
    setSeenQuery(filter.query);
    setDraft(filter.query);
  }
  useEffect(() => {
    if (draft.trim() === filter.query.trim()) return;
    const timer = window.setTimeout(() => onChange({ query: draft }, "replace"), 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, filter.query]);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
        {DEMO_PLAYLIST_KIND_FILTERS.map((option) => {
          const active = filter.kind === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ kind: option.value }, "replace")}
              className={`min-h-9 rounded-full px-3 py-1.5 text-sm font-medium ${active ? "bg-neutral-900 text-white" : "bg-white text-neutral-700"}`}
              style={active ? undefined : { border: "1px solid #E0E0E0" }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <select
        aria-label="Company"
        value={filter.company ?? ""}
        onChange={(e) => onChange({ company: e.target.value || null }, "push")}
        className="w-full rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-900 outline-none lg:w-auto lg:max-w-[280px]"
        style={{ border: "1px solid #E0E0E0" }}
      >
        <option value="">All companies ({companies.length})</option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>
      <label className="flex w-full items-center gap-2 rounded-full bg-white px-4 py-2 lg:w-72" style={{ border: "1px solid #E0E0E0" }}>
        <Search className="size-4 shrink-0 text-neutral-500" aria-hidden="true" />
        <span className="sr-only">Search materials</span>
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search materials"
          className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none"
        />
      </label>
      <label className="inline-flex min-h-9 items-center gap-2 text-sm font-medium text-neutral-800">
        <input
          type="checkbox"
          checked={filter.network}
          onChange={(e) => onChange({ network: e.target.checked }, "replace")}
          className="size-4"
        />
        Show potential network
      </label>
    </div>
  );
}
