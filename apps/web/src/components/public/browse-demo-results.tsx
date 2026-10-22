"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Info, MapPinOff, RefreshCw } from "lucide-react";
import { useBackendData } from "@/components/shared/data-state";
import { DemoEstimateBadge } from "@/components/shared/demo-estimate-badges";
import { MaterialImage } from "@/components/public/material-image";
import { DEMO_VALUE_FORMAT, GeographyLine } from "@/components/public/demo-playlist-cards";
import type { DemoMapPin } from "@/components/public/listing-map";
import { fetchDemoPlaylist } from "@/lib/api-demo-playlists";
import { describeMaterialType } from "@/lib/demo-presentations";
import {
  demoBasisLabel,
  demoMaterialFacts,
  demoPriceLabel,
  demoSourceStatusLabel,
  demoVolumeLabel,
  resolveDemoCompanyId,
} from "@/lib/demo-playlists";
import { milesBetween } from "@/lib/radius-filter";
import {
  BROWSE_DEMO_PLAYLISTS,
  BROWSE_PLAYLIST_LABELS,
  BROWSE_ROLES,
  BROWSE_SOURCES,
  DEMO_RESULT_LABEL,
  chooseBrowseOrigin,
  demoBrowseCompanies,
  demoGalleryHref,
  demoRoleLabel,
  formatDemoDistance,
  parseBrowseDemoState,
  resolveDemoOrigin,
  selectDemoResults,
  selectionMapId,
  selectionUrlKey,
  withBrowseParams,
  type BrowseDemoState,
  type DemoBrowseResult,
  type DemoOriginResolution,
} from "@/lib/browse-results";

export interface BrowseOrigin {
  lng: number;
  lat: number;
  label: string;
  /** IP lookup, postal area or similar: distances from it are approximate. */
  approximate?: boolean;
}

/**
 * Demo side of Browse: URL state, the selected playlist's read (independent
 * of the marketplace read), the origin for distance filtering and the
 * filtered demo rows. Cards and map pins both come from `selection`.
 */
export function useBrowseDemoView({
  query,
  location,
  radiusMiles,
  commercialOrigin,
  fallbackOrigin,
}: {
  query: string;
  location: string;
  radiusMiles: number;
  /** A saved marketplace location matching the Where search. */
  commercialOrigin: BrowseOrigin | undefined;
  /** Manual map center or the viewer; used only when there is no Where search. */
  fallbackOrigin: BrowseOrigin | undefined;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const state = parseBrowseDemoState(searchParams);
  const enabled = state.source !== "marketplace";
  const demo = useBackendData(
    () => (enabled ? fetchDemoPlaylist(state.playlist) : Promise.resolve(null)),
    [state.playlist, enabled],
    "Demo examples could not be loaded.",
  );
  const data = demo.status === "ready" ? demo.data : null;

  const navigate = (patch: Partial<BrowseDemoState>, mode: "push" | "replace") =>
    router[mode](`${pathname}${withBrowseParams(search, patch)}`, { scroll: false });

  // The URL is the source of truth for the selected card/pin, so reload, Back
  // and a gallery return restore it. Selecting replaces the current entry.
  const selectedId = selectionMapId(state.selected);
  const select = (id: string | null) => {
    const next = selectionUrlKey(id);
    if (next !== state.selected) navigate({ selected: next }, "replace");
  };
  const toggleSelect = (id: string) => select(selectedId === id ? null : id);

  const companyId = data ? resolveDemoCompanyId(state.company, data.companies) : null;
  const resolution: DemoOriginResolution = useMemo(
    () =>
      location.trim() && data
        ? resolveDemoOrigin(location, data.materials, data.companies, state.near)
        : { kind: "none" },
    [location, data, state.near],
  );

  const origin: BrowseOrigin | undefined = chooseBrowseOrigin({
    location,
    resolution,
    demoLoading: enabled && demo.status === "loading",
    commercialOrigin,
    fallbackOrigin,
  });

  const selection = useMemo(
    () =>
      data
        ? selectDemoResults({
            playlist: state.playlist,
            materials: data.materials,
            companies: data.companies,
            state: { source: state.source, company: companyId, kind: state.kind },
            query,
            location,
            radiusMiles,
            distanceTo: origin ? (point) => milesBetween(origin, point) : null,
            originApproximate: origin?.approximate,
          })
        : null,
    // origin is compared by value so a new object with the same point is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, state.playlist, state.source, companyId, state.kind, query, location, radiusMiles, origin?.lat, origin?.lng, origin?.approximate],
  );

  const pins: DemoMapPin[] = useMemo(
    () =>
      (selection?.items ?? []).flatMap((result) =>
        result.material.geography.kind === "point"
          ? [
              {
                key: result.key,
                title: result.material.title,
                company: result.company.name,
                role: result.material.kind,
                lat: result.material.geography.latitude,
                lng: result.material.geography.longitude,
                facts: demoMaterialFacts(result.material, DEMO_VALUE_FORMAT),
                distance: result.distance ? formatDemoDistance(result.distance) : undefined,
              },
            ]
          : [],
      ),
    [selection],
  );

  const byKey = useMemo(() => {
    const map = new Map<string, DemoBrowseResult>();
    for (const result of [...(selection?.items ?? []), ...(selection?.pending ?? [])]) map.set(result.key, result);
    return map;
  }, [selection]);

  /** Browse URL to come back to, with this result selected. */
  const returnPath = (key: string) => `${pathname}${withBrowseParams(search, { selected: key })}`;

  /**
   * Records the selection on the current history entry (so browser Back
   * restores it) and opens the example in the presentation gallery.
   */
  const openInGallery = (result: DemoBrowseResult) => {
    const back = returnPath(result.key);
    window.history.replaceState(null, "", back);
    router.push(demoGalleryHref(result, state.kind, back));
  };

  return {
    state,
    navigate,
    selectedId,
    select,
    toggleSelect,
    demo,
    data,
    companyId,
    resolution,
    origin,
    selection,
    pins,
    byKey,
    returnPath,
    openInGallery,
  };
}

export type BrowseDemoView = ReturnType<typeof useBrowseDemoView>;

const chip = (active: boolean) =>
  `min-h-9 rounded-full px-3 py-1.5 text-sm font-medium ${active ? "bg-neutral-900 text-white" : "bg-white text-neutral-700"}`;
const chipBorder = (active: boolean) => (active ? undefined : { border: "1px solid #E0E0E0" });

/** Source, playlist, demo company and role controls. Company/role scope demo rows only. */
export function BrowseSourceControls({ view }: { view: BrowseDemoView }) {
  const { state, navigate, data, companyId } = view;
  const companies = data ? demoBrowseCompanies(data.materials, data.companies) : [];
  const demoOn = state.source !== "marketplace";
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Result source">
        {BROWSE_SOURCES.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={state.source === option.value}
            onClick={() => state.source !== option.value && navigate({ source: option.value, selected: null }, "push")}
            className={chip(state.source === option.value)}
            style={chipBorder(state.source === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {demoOn && (
        <div className="flex flex-col gap-2 rounded-xl bg-amber-50/60 p-3 sm:flex-row sm:flex-wrap sm:items-center" style={{ border: "1px solid #FDE68A" }}>
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-900">Demo filters</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Demo playlist">
            {BROWSE_DEMO_PLAYLISTS.map((slug) => (
              <button
                key={slug}
                type="button"
                aria-pressed={state.playlist === slug}
                onClick={() => state.playlist !== slug && navigate({ playlist: slug }, "push")}
                className={chip(state.playlist === slug)}
                style={chipBorder(state.playlist === slug)}
              >
                {BROWSE_PLAYLIST_LABELS[slug]}
              </button>
            ))}
          </div>
          <select
            aria-label="Demo company"
            value={companyId ?? ""}
            disabled={!data}
            onChange={(e) => navigate({ company: e.target.value || null, selected: null }, "push")}
            className="w-full rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-900 outline-none sm:w-auto sm:max-w-[260px]"
            style={{ border: "1px solid #E0E0E0" }}
          >
            <option value="">All demo companies{data ? ` (${companies.length})` : ""}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Demo role">
            {BROWSE_ROLES.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={state.kind === option.value}
                onClick={() => navigate({ kind: option.value, selected: null }, "replace")}
                className={chip(state.kind === option.value)}
                style={chipBorder(state.kind === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export type BrowseMobileView = "results" | "map";

/**
 * Below the lg breakpoint Browse shows either the results or the map. This
 * switch sits outside both panels so the map can always be opened and left.
 * View-only state: selection, filters and source stay in the URL.
 */
export function BrowseMobileViewToggle({
  view,
  onChange,
  pins,
}: {
  view: BrowseMobileView;
  onChange: (view: BrowseMobileView) => void;
  /** Pins currently on the map (marketplace + demo). */
  pins: number;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-2 lg:hidden" style={{ borderBottom: "1px solid #F0F0F0" }}>
      <div className="inline-flex rounded-full bg-neutral-100 p-1" role="group" aria-label="Browse view">
        {(["results", "map"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => onChange(option)}
            className={`min-h-9 rounded-full px-4 text-sm font-semibold ${view === option ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600"}`}
          >
            {option === "results" ? "Results" : `Map (${pins} pin${pins === 1 ? "" : "s"})`}
          </button>
        ))}
      </div>
      {view === "map" && (
        <button type="button" onClick={() => onChange("results")} className="ml-auto text-sm font-semibold underline">
          Back to results
        </button>
      )}
    </div>
  );
}

export function browseDemoElementId(key: string) {
  return `browse-${key.replace(/[^A-Za-z0-9_-]/g, "-")}`;
}

/** One demo material example. Its only action opens the presentation gallery. */
export function BrowseDemoCard({
  result,
  selected,
  galleryHref,
  onSelect,
  onOpen,
}: {
  result: DemoBrowseResult;
  selected: boolean;
  galleryHref: string;
  onSelect: (() => void) | null;
  onOpen: () => void;
}) {
  const { material, company } = result;
  const price = demoPriceLabel(material.price, DEMO_VALUE_FORMAT);
  const volume = demoVolumeLabel(material.volume, DEMO_VALUE_FORMAT);
  const badges = [
    material.price.kind === "value" ? demoBasisLabel("price", material.price.basis) : null,
    material.volume.kind === "value" ? demoBasisLabel("volume", material.volume.basis) : null,
  ].filter((label): label is string => label !== null);
  const buyer = material.kind === "buyer";
  return (
    <li
      id={browseDemoElementId(result.key)}
      className={`flex scroll-mt-28 flex-col rounded-xl bg-white p-3 ${selected ? "ring-2 ring-[#FFD600]" : ""}`}
      style={{ border: "1px solid #F0F0F0" }}
    >
      <p className="mb-2 inline-flex items-center gap-1.5 self-start rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
        <Info className="size-3.5 shrink-0" aria-hidden="true" />
        {DEMO_RESULT_LABEL}
      </p>
      <div className="relative h-32 overflow-hidden rounded-lg bg-neutral-100">
        <MaterialImage title={material.title} />
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
        <span className={`rounded px-1.5 py-0.5 ${buyer ? "bg-violet-100 text-violet-800" : "bg-emerald-50 text-emerald-800"}`}>
          {demoRoleLabel(material.kind)}
        </span>
        <span className="text-neutral-500">{BROWSE_PLAYLIST_LABELS[result.playlist]} demo · Presentation only</span>
      </p>
      <h3 className="mt-1 text-base font-semibold text-neutral-900">{material.title}</h3>
      <p className="mt-0.5 text-sm text-neutral-700">{company.name}</p>
      {material.qualifier && <p className="mt-1 text-sm font-medium text-amber-900">{material.qualifier}</p>}
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-neutral-500">Material</dt>
        <dd className="text-neutral-900">{describeMaterialType(material.materialTypeCode)}</dd>
        <dt className="text-neutral-500">Volume</dt>
        <dd className="text-neutral-900">{volume ?? "Not stated"}</dd>
        <dt className="text-neutral-500">{buyer ? "Target price" : "Price"}</dt>
        <dd className="text-neutral-900">{price ?? "Not stated"}</dd>
        <dt className="text-neutral-500">Source</dt>
        <dd className="text-neutral-900">{demoSourceStatusLabel(material.sourceStatus)}</dd>
        <dt className="text-neutral-500">Location</dt>
        <dd className="text-neutral-900">
          <GeographyLine geography={material.geography} />
        </dd>
        {result.distance && (
          <>
            <dt className="text-neutral-500">Distance</dt>
            <dd className="text-neutral-900">{formatDemoDistance(result.distance)}</dd>
          </>
        )}
      </dl>
      {material.equivalents.length > 0 && (
        <p className="mt-2 text-xs text-neutral-600">
          <span className="font-medium">Equivalent materials (not confirmed requirements):</span>{" "}
          {material.equivalents.join(", ")}
        </p>
      )}
      {badges.length > 0 && (
        <span className="mt-3 inline-flex flex-wrap gap-1">
          {badges.map((label) => (
            <DemoEstimateBadge key={label} label={label} />
          ))}
        </span>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-3">
        {onSelect && (
          <button type="button" onClick={onSelect} className="text-sm font-semibold text-neutral-900 underline">
            Show on map
          </button>
        )}
        <Link
          href={galleryHref}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
            event.preventDefault();
            onOpen();
          }}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
        >
          Open in demo gallery
        </Link>
      </div>
    </li>
  );
}

/**
 * Demo examples for the current Browse view: counts, a separate error state,
 * distance disposition (outside / pending / no origin) and the cards. The
 * map pins come from the same `view.selection.items`.
 */
export function BrowseDemoSection({
  view,
  radiusMiles,
  location,
  onShowAllDistances,
  marketplaceOnlyFilters,
  onRevealMap,
}: {
  view: BrowseDemoView;
  /** Opens the map on small screens, where it is hidden behind the results. */
  onRevealMap: () => void;
  radiusMiles: number;
  /** Where search; "Show all distances" also clears it, and says so. */
  location: string;
  onShowAllDistances: () => void;
  /** Active marketplace-only filters (price, quantity, grade, carbon, category, tag). */
  marketplaceOnlyFilters: number;
}) {
  const { state, demo, selection, resolution, origin, navigate, selectedId } = view;
  // "Show on map" selects the pin and makes sure the map is actually visible.
  const onSelect = (key: string) => {
    view.select(key);
    onRevealMap();
  };

  // After a gallery return, bring the selected example back into view once.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !state.selected || !selection) return;
    restored.current = true;
    document.getElementById(browseDemoElementId(state.selected))?.scrollIntoView({ block: "center" });
  }, [selection, state.selected]);

  if (state.source === "marketplace") return null;
  const label = BROWSE_PLAYLIST_LABELS[state.playlist];
  const shown = selection ? selection.items.length : 0;
  const pending = selection?.pending ?? [];

  const cards = (items: DemoBrowseResult[], pinnable: boolean) => (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((result) => (
        <BrowseDemoCard
          key={result.key}
          result={result}
          selected={selectedId === result.key}
          galleryHref={demoGalleryHref(result, state.kind, view.returnPath(result.key))}
          onSelect={pinnable && result.material.geography.kind === "point" ? () => onSelect(result.key) : null}
          onOpen={() => view.openInGallery(result)}
        />
      ))}
    </ul>
  );

  return (
    <section aria-labelledby="browse-demo-heading" className="mt-8">
      <h2 id="browse-demo-heading" className="text-base font-semibold text-neutral-900">
        Demo examples · {label}
        {selection && (
          <span className="font-normal text-neutral-600">
            {" "}
            — {shown} shown{pending.length > 0 && ` · ${pending.length} with location pending`}
          </span>
        )}
      </h2>
      <p className="mt-1 text-sm text-neutral-600">
        Presentation-only examples from the {label} demo playlist — not marketplace listings, open requests or
        confirmed relationships. Buyer needs are stated needs, not offers.
      </p>
      {marketplaceOnlyFilters > 0 && (
        <p role="note" className="mt-2 text-sm text-neutral-700">
          {marketplaceOnlyFilters} marketplace-only filter{marketplaceOnlyFilters === 1 ? "" : "s"} (category, tag,
          price, quantity, grade or carbon) {marketplaceOnlyFilters === 1 ? "is" : "are"} not applied to demo examples.
        </p>
      )}

      {demo.status === "ready" && selection && radiusMiles > 0 && (
        <div role="status" className="mt-3 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">
          {selection.radiusApplied ? (
            <>
              {shown} demo example{shown === 1 ? "" : "s"} within {radiusMiles} mi of {origin?.label ?? "the selected location"}
              {origin?.approximate && " (approximate origin)"}.
              {selection.outside > 0 && ` ${selection.outside} outside the radius.`}{" "}
              {selection.outside > 0 && (
                <button type="button" onClick={onShowAllDistances} className="font-semibold underline">
                  {location.trim() ? `Show all distances (clears “${location.trim()}”)` : "Show all distances"}
                </button>
              )}
            </>
          ) : resolution.kind === "ambiguous" ? (
            <>
              <span className="font-medium text-neutral-900">
                Distance filter not applied: several published demo locations match this search, so none is
                assumed. Choose one (all are approximate):
              </span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                {resolution.options.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => navigate({ near: option.key }, "replace")}
                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-900"
                    style={{ border: "1px solid #E0E0E0" }}
                  >
                    {option.label}
                    <span className="font-normal text-neutral-600">
                      {" "}
                      · {option.context} ·{" "}
                      {option.basis === "postal_area" ? "approximate postal area" : "address-range estimate"}
                    </span>
                  </button>
                ))}
              </span>
            </>
          ) : (
            "Distance filter not applied to demo examples: no usable origin. Allow location access, search a saved location or a published demo postal/country code, or use the map center."
          )}
        </div>
      )}

      <div className="mt-4">
        {demo.status === "loading" ? (
          <p role="status" className="rounded-xl bg-neutral-50 py-10 text-center text-sm text-neutral-600">
            Loading demo examples…
          </p>
        ) : demo.status === "error" || !selection ? (
          <div role="alert" className="rounded-xl bg-red-50 p-6 text-sm text-red-700">
            <p>{demo.error ?? "Demo examples could not be loaded."} Marketplace listings are unaffected.</p>
            <button type="button" onClick={demo.reload} className="mt-2 inline-flex items-center gap-1 font-semibold underline">
              <RefreshCw className="size-3" /> Retry demo examples
            </button>
          </div>
        ) : shown === 0 ? (
          <p className="rounded-xl bg-neutral-50 px-6 py-10 text-center text-sm font-medium text-neutral-700">
            No demo examples match{selection.radiusApplied ? " within this radius" : " these filters"}.
          </p>
        ) : (
          cards(selection.items, true)
        )}
      </div>

      {pending.length > 0 && (
        <div className="mt-6 rounded-xl bg-amber-50/60 p-4" style={{ border: "1px solid #FDE68A" }}>
          <p className="flex items-start gap-2 text-sm text-amber-900">
            <MapPinOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              {pending.length} matching demo example{pending.length === 1 ? " has" : "s have"} a pending or conflicting
              location, so {pending.length === 1 ? "it is" : "they are"} not counted as nearby and not pinned.{" "}
              <button
                type="button"
                onClick={() => navigate({ showPending: !state.showPending }, "replace")}
                className="font-semibold underline"
              >
                {state.showPending ? "Hide matches with location pending" : "Show matches with location pending"}
              </button>
            </span>
          </p>
          {state.showPending && <div className="mt-4">{cards(pending, false)}</div>}
        </div>
      )}
    </section>
  );
}
