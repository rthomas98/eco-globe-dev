"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Info } from "lucide-react";
import { Header } from "@/components/public/header";
import { Footer } from "@/components/public/footer";
import { ErrorState, LoadingState, useBackendData } from "@/components/shared/data-state";
import { DemoPlaylistMap, DemoPlaylistMapLegend } from "@/components/public/demo-playlist-map";
import { DemoPlaylistFilterBar } from "@/components/public/demo-playlist-filters";
import {
  DEMO_VALUE_FORMAT,
  DemoCompanyProfiles,
  DemoMaterialList,
  DemoRelationshipList,
  demoCompanyElementId,
  demoMaterialElementId,
  demoNetworkElementId,
} from "@/components/public/demo-playlist-cards";
import { fetchDemoPlaylist, fetchDemoPlaylists } from "@/lib/api-demo-playlists";
import { DEMO_GALLERY_RETURN_PARAM, safeBrowseReturnPath } from "@/lib/browse-results";
import {
  DEMO_PLAYLIST_COMPANY_PARAM,
  DEMO_PLAYLIST_KIND_PARAM,
  DEMO_PLAYLIST_MATERIAL_PARAM,
  DEMO_PLAYLIST_NETWORK_PARAM,
  DEMO_PLAYLIST_PARAM,
  DEMO_PLAYLIST_QUERY_PARAM,
  buildDemoMapPoints,
  countDemoMaterials,
  demoMapPointKey,
  demoMaterialCountsByCompany,
  filterDemoMaterials,
  parseDemoKindFilter,
  primaryDemoCompanies,
  resolveDemoCompanyId,
  resolveDemoPlaylistSlug,
  visibleDemoProfiles,
  visibleDemoRelationships,
  withDemoPlaylistParams,
  type DemoMapPoint,
  type DemoPlaylistData,
  type DemoPlaylistFilter,
  type DemoPlaylistSlug,
  type DemoPlaylistSummary,
} from "@/lib/demo-playlists";

/**
 * Public demo playlists: company profiles, material examples, a synchronized
 * map and the potential network. Presentation only: no detail, cart, quote or
 * edit actions, and nothing here is a marketplace listing.
 */
export function DemoFeedstocksPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <Suspense>
        <DemoFeedstocksContent />
      </Suspense>
      <Footer />
    </main>
  );
}

function DemoFeedstocksContent() {
  const searchParams = useSearchParams();
  const playlists = useBackendData(fetchDemoPlaylists, [], "Demo playlists could not be loaded.");
  const slug = resolveDemoPlaylistSlug(searchParams.get(DEMO_PLAYLIST_PARAM), playlists.data ?? []);
  // Only an exact public or buyer Browse path is ever offered as the way back.
  const browseReturn = safeBrowseReturnPath(searchParams.get(DEMO_GALLERY_RETURN_PARAM));

  return (
    <section className="pb-16 pt-24 lg:pt-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        {browseReturn && (
          <Link
            href={browseReturn}
            className="mb-3 inline-flex min-h-10 items-center text-sm font-semibold text-neutral-900 underline"
          >
            ← Back to Browse results
          </Link>
        )}
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-4xl">Demo feedstocks</h1>
        <p
          role="note"
          className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900"
          style={{ border: "1px solid #FDE68A" }}
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Presentation only — not available for purchase. These examples show how companies could appear on EcoGlobe;
          they are not marketplace listings, open requests or confirmed relationships.
        </p>

        <div className="mt-6">
          {playlists.status === "loading" ? (
            <LoadingState label="Loading demo playlists…" />
          ) : playlists.status === "error" ? (
            <ErrorState message={playlists.error ?? "Demo playlists could not be loaded."} onRetry={playlists.reload} />
          ) : !slug ? (
            <p className="rounded-xl bg-neutral-50 px-6 py-12 text-center text-sm font-medium text-neutral-700">
              No demo playlists are available right now.
            </p>
          ) : (
            <PlaylistView playlists={playlists.data ?? []} slug={slug} />
          )}
        </div>

        <p className="mt-8 text-sm text-neutral-700">
          Looking for feedstock you can buy?{" "}
          <Link href="/browse" className="font-semibold underline">
            Browse marketplace listings
          </Link>
        </p>
      </div>
    </section>
  );
}

function PlaylistView({ playlists, slug }: { playlists: DemoPlaylistSummary[]; slug: DemoPlaylistSlug }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const playlist = useBackendData(() => fetchDemoPlaylist(slug), [slug], "This demo playlist could not be loaded.");

  // Playlist and company changes are pushed so browser Back returns to them;
  // type, search and network toggles replace the current entry.
  const navigate = (patch: Parameters<typeof withDemoPlaylistParams>[1], mode: "push" | "replace") =>
    router[mode](`${pathname}${withDemoPlaylistParams(searchParams.toString(), patch)}`, { scroll: false });

  return (
    <>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Demo playlist">
        {playlists.map((item) => (
          <button
            key={item.slug}
            type="button"
            aria-pressed={item.slug === slug}
            onClick={() => item.slug !== slug && navigate({ playlist: item.slug }, "push")}
            className={`min-h-10 rounded-full px-4 py-2 text-sm font-semibold ${item.slug === slug ? "bg-neutral-900 text-white" : "bg-white text-neutral-800"}`}
            style={item.slug === slug ? undefined : { border: "1px solid #E0E0E0" }}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {playlist.status === "loading" ? (
          <LoadingState label="Loading demo playlist…" />
        ) : playlist.status === "error" || !playlist.data ? (
          <ErrorState message={playlist.error ?? "This demo playlist could not be loaded."} onRetry={playlist.reload} />
        ) : (
          <PlaylistContent data={playlist.data} navigate={navigate} />
        )}
      </div>
    </>
  );
}

function PlaylistContent({
  data,
  navigate,
}: {
  data: DemoPlaylistData;
  navigate: (patch: Parameters<typeof withDemoPlaylistParams>[1], mode: "push" | "replace") => void;
}) {
  const searchParams = useSearchParams();
  const filter: DemoPlaylistFilter = {
    company: resolveDemoCompanyId(searchParams.get(DEMO_PLAYLIST_COMPANY_PARAM), data.companies),
    kind: parseDemoKindFilter(searchParams.get(DEMO_PLAYLIST_KIND_PARAM)),
    query: searchParams.get(DEMO_PLAYLIST_QUERY_PARAM) ?? "",
    network: searchParams.get(DEMO_PLAYLIST_NETWORK_PARAM) === "1",
  };
  const filterKey = JSON.stringify([data.playlist.slug, filter]);

  const companies = useMemo(() => new Map(data.companies.map((company) => [company.id, company])), [data]);
  const primary = useMemo(() => primaryDemoCompanies(data), [data]);
  const materialCounts = useMemo(() => demoMaterialCountsByCompany(data.materials), [data]);
  // filterKey captures every filter field.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const materials = useMemo(() => filterDemoMaterials(data, filter), [data, filterKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const relationships = useMemo(() => visibleDemoRelationships(data, filter), [data, filterKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const profiles = useMemo(() => visibleDemoProfiles(data, filter), [data, filterKey]);
  const points = useMemo(
    () => buildDemoMapPoints(data, filter, materials, relationships, DEMO_VALUE_FORMAT),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, filterKey, materials, relationships],
  );
  const counts = countDemoMaterials(materials);
  const totalCounts = countDemoMaterials(data.materials);

  const [view, setView] = useState<"list" | "map">("list");
  // A material deep link (e.g. from Browse) starts selected when it is in this playlist.
  const linkedMaterial = searchParams.get(DEMO_PLAYLIST_MATERIAL_PARAM);
  const linkedKey =
    linkedMaterial && data.materials.some((item) => item.id === linkedMaterial)
      ? demoMapPointKey("material", linkedMaterial)
      : null;
  const [selectedKey, setSelectedKey] = useState<string | null>(linkedKey);
  const [focusNonce, setFocusNonce] = useState(0);

  const showOnMap = (key: string) => {
    setSelectedKey(key);
    setFocusNonce((nonce) => nonce + 1);
    setView("map");
  };

  // A list target may not exist yet: a profile card renders only once the
  // company filter reaches the URL. Retry after each render until it does.
  const scrollTargetRef = useRef<string | null>(linkedMaterial && linkedKey ? demoMaterialElementId(linkedMaterial) : null);
  const [scrollRequest, setScrollRequest] = useState(0);
  const scrollTo = (elementId: string) => {
    scrollTargetRef.current = elementId;
    setScrollRequest((request) => request + 1);
  };
  useEffect(() => {
    const elementId = scrollTargetRef.current;
    const element = elementId ? document.getElementById(elementId) : null;
    if (!element) return;
    scrollTargetRef.current = null;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [scrollRequest, filterKey, view]);

  // A later same-playlist material link (Back/Forward between examples A and
  // B, or a new deep link) selects and scrolls to that example too. When the
  // link is removed or no longer valid, only the state it created is undone:
  // its selection (if the visitor has not picked something else since) and
  // its pending scroll.
  const appliedLinkRef = useRef<{ key: string | null; elementId: string | null }>({
    key: linkedKey,
    elementId: linkedKey && linkedMaterial ? demoMaterialElementId(linkedMaterial) : null,
  });
  useEffect(() => {
    const previous = appliedLinkRef.current;
    if (linkedKey === previous.key) return;
    if (previous.key) {
      const staleKey = previous.key;
      setSelectedKey((current) => (current === staleKey ? null : current));
      if (scrollTargetRef.current === previous.elementId) scrollTargetRef.current = null;
    }
    if (!linkedKey || !linkedMaterial) {
      appliedLinkRef.current = { key: null, elementId: null };
      return;
    }
    const elementId = demoMaterialElementId(linkedMaterial);
    appliedLinkRef.current = { key: linkedKey, elementId };
    setSelectedKey(linkedKey);
    setView("list");
    scrollTo(elementId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedKey]);

  const showInList = (point: DemoMapPoint) => {
    setSelectedKey(point.key);
    setView("list");
    if (point.kind === "material") scrollTo(demoMaterialElementId(point.id));
    else if (point.kind === "profile") {
      navigate({ company: point.id }, "push");
      scrollTo(demoCompanyElementId(point.id));
    } else scrollTo(demoNetworkElementId(point.id));
  };

  const filtered = filter.company !== null || filter.kind !== "all" || filter.query.trim() !== "";
  const clearFilters = () => navigate({ company: null, kind: "all", query: "" }, "push");
  const selectedCompany = filter.company ? companies.get(filter.company) : undefined;

  return (
    <>
      <DemoPlaylistFilterBar filter={filter} companies={primary} onChange={navigate} />

      <p className="mt-4 text-sm text-neutral-700" role="status">
        {counts.total} example{counts.total === 1 ? "" : "s"}
        {counts.total !== totalCounts.total && ` of ${totalCounts.total}`} · {counts.mapped} mapped · {counts.pending}{" "}
        location pending
        {filtered && (
          <>
            {" · "}
            <button type="button" onClick={clearFilters} className="font-semibold underline">
              Clear filters
            </button>
          </>
        )}
      </p>

      <DemoCompanyProfiles
        profiles={profiles}
        selected={selectedCompany}
        materialCounts={materialCounts}
        onSelect={(companyId) => navigate({ company: companyId }, "push")}
      />

      <div className="mt-6 inline-flex rounded-full bg-neutral-100 p-1 lg:hidden" role="group" aria-label="View">
        {(["list", "map"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => setView(option)}
            className={`min-h-9 rounded-full px-4 text-sm font-semibold ${view === option ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600"}`}
          >
            {option === "list" ? "List" : "Map"}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className={view === "list" ? "" : "hidden lg:block"}>
          <DemoMaterialList
            materials={materials}
            companies={companies}
            selectedKey={selectedKey}
            onShowOnMap={showOnMap}
            emptyMessage={
              data.materials.length === 0
                ? "This playlist has no material examples yet."
                : selectedCompany?.materialState === "no_material_data"
                  ? `${selectedCompany.name} has no material examples supplied.`
                  : "No demo examples match these filters."
            }
            onClearFilters={filtered ? clearFilters : null}
          />
        </div>
        <div className={`${view === "map" ? "" : "hidden lg:block"} lg:sticky lg:top-24 lg:self-start`}>
          <div className="h-[60vh] overflow-hidden rounded-xl lg:h-[calc(100vh-8rem)]" style={{ border: "1px solid #F0F0F0" }}>
            <DemoPlaylistMap
              points={points}
              fitKey={filterKey}
              selectedKey={selectedKey}
              focusNonce={focusNonce}
              onSelect={showInList}
            />
          </div>
          <div className="mt-2 flex flex-col gap-1">
            <DemoPlaylistMapLegend network={filter.network} />
            <p className="text-xs text-neutral-500">
              Presentation locations only — not pickup sites, shipping origins or distances. Entries with a pending location
              are listed but not pinned. US &ldquo;address-range match&rdquo; points are interpolated from workbook business
              addresses by the{" "}
              <a
                href="https://geocoding.geo.census.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                US Census Geocoder
              </a>{" "}
              address ranges; &ldquo;approximate postal area&rdquo; points are derived from{" "}
              <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer" className="underline">
                GeoNames
              </a>{" "}
              postal code data, licensed under{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                CC BY 4.0
              </a>
              . Neither confirms a pickup site, facility or current occupancy.
            </p>
          </div>
        </div>
      </div>

      {filter.network && (
        <DemoRelationshipList
          relationships={relationships}
          companies={companies}
          onShowOnMap={(companyId) => showOnMap(demoMapPointKey("network", companyId))}
        />
      )}
    </>
  );
}
