"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Leaf, LocateFixed, MapPin, Route, Search, Truck } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type LngLat = [number, number];
type Optimization = "balanced" | "cost" | "carbon" | "speed";

export interface MapIntelligenceWorkspaceProps {
  role: "buyer" | "seller" | "admin";
}

interface ZipLocation {
  zip: string;
  label: string;
  coordinate: LngLat;
}

interface FacilityDefinition {
  id: string;
  name: string;
  location: string;
  coordinate: LngLat;
  material: string;
  ratePerMile: number;
  carbonPerMile: number;
  averageMph: number;
  verified: boolean;
}

interface FacilityResult extends FacilityDefinition {
  distanceMiles: number;
  cost: number;
  carbonKg: number;
  eta: string;
  score: number;
}

interface GeocodingResponse {
  features?: Array<{
    geometry?: { coordinates?: number[] };
    properties?: {
      full_address?: string;
      name?: string;
      place_formatted?: string;
    };
  }>;
}

const FALLBACK_ZIPS: Record<string, ZipLocation> = {
  "70802": {
    zip: "70802",
    label: "Baton Rouge, Louisiana 70802",
    coordinate: [-91.1871, 30.4515],
  },
  "77002": {
    zip: "77002",
    label: "Houston, Texas 77002",
    coordinate: [-95.3698, 29.7604],
  },
  "75201": {
    zip: "75201",
    label: "Dallas, Texas 75201",
    coordinate: [-96.797, 32.7767],
  },
  "70112": {
    zip: "70112",
    label: "New Orleans, Louisiana 70112",
    coordinate: [-90.0715, 29.9511],
  },
  "30303": {
    zip: "30303",
    label: "Atlanta, Georgia 30303",
    coordinate: [-84.388, 33.749],
  },
};

const FACILITIES: FacilityDefinition[] = [
  {
    id: "FAC-PLAQUEMINE",
    name: "Plaquemine Recovery Yard",
    location: "Plaquemine, LA",
    coordinate: [-91.234, 30.2891],
    material: "Scrap Polymer Blend",
    ratePerMile: 8.4,
    carbonPerMile: 1.05,
    averageMph: 48,
    verified: true,
  },
  {
    id: "FAC-PORT-ALLEN",
    name: "Port Allen Circular Terminal",
    location: "Port Allen, LA",
    coordinate: [-91.2068, 30.4515],
    material: "Black Gypsum",
    ratePerMile: 7.9,
    carbonPerMile: 0.92,
    averageMph: 45,
    verified: true,
  },
  {
    id: "FAC-NEW-ORLEANS",
    name: "New Orleans Materials Exchange",
    location: "New Orleans, LA",
    coordinate: [-90.0715, 29.9511],
    material: "Reclaimed Carbon Feedstock",
    ratePerMile: 7.4,
    carbonPerMile: 0.98,
    averageMph: 52,
    verified: true,
  },
  {
    id: "FAC-HOUSTON",
    name: "Houston Circular Materials",
    location: "Houston, TX",
    coordinate: [-95.3698, 29.7604],
    material: "Black Gypsum",
    ratePerMile: 8.1,
    carbonPerMile: 1.12,
    averageMph: 56,
    verified: true,
  },
  {
    id: "FAC-DALLAS",
    name: "Dallas Equipment Recovery",
    location: "Dallas, TX",
    coordinate: [-96.797, 32.7767],
    material: "Used Dry Transformers",
    ratePerMile: 7.2,
    carbonPerMile: 1.24,
    averageMph: 58,
    verified: true,
  },
  {
    id: "FAC-ATLANTA",
    name: "Atlanta Biofeedstock Hub",
    location: "Atlanta, GA",
    coordinate: [-84.388, 33.749],
    material: "Pyrolysis Pitch",
    ratePerMile: 7.7,
    carbonPerMile: 1.08,
    averageMph: 55,
    verified: true,
  },
];

const RADIUS_SOURCE_ID = "zip-radius-source";
const RADIUS_FILL_ID = "zip-radius-fill";
const RADIUS_LINE_ID = "zip-radius-line";
const ROUTE_SOURCE_ID = "intelligence-route-source";
const ROUTE_LINE_ID = "intelligence-route-line";
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function isValidToken(token: string | undefined): token is string {
  return !!token && token !== "placeholder" && token.startsWith("pk.");
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceInMiles(from: LngLat, to: LngLat) {
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = toRadians(to[1] - from[1]);
  const longitudeDelta = toRadians(to[0] - from[0]);
  const firstLatitude = toRadians(from[1]);
  const secondLatitude = toRadians(to[1]);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const directDistance =
    2 * earthRadiusMiles * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(1, Math.round(directDistance * 1.16));
}

function calculateEta(distanceMiles: number, averageMph: number) {
  const hours = distanceMiles / averageMph + 1.5;
  if (hours <= 8) return "Same day";
  if (hours <= 24) return "1 day";
  return `${Math.ceil(hours / 24)} days`;
}

function createRadiusPolygon(center: LngLat, radiusMiles: number) {
  const points: LngLat[] = [];
  const earthRadiusMiles = 3958.8;
  const angularDistance = radiusMiles / earthRadiusMiles;
  const centerLat = toRadians(center[1]);
  const centerLng = toRadians(center[0]);

  for (let index = 0; index <= 72; index += 1) {
    const bearing = toRadians(index * 5);
    const latitude = Math.asin(
      Math.sin(centerLat) * Math.cos(angularDistance) +
        Math.cos(centerLat) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const longitude =
      centerLng +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(centerLat),
        Math.cos(angularDistance) - Math.sin(centerLat) * Math.sin(latitude),
      );
    points.push([(longitude * 180) / Math.PI, (latitude * 180) / Math.PI]);
  }

  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Polygon" as const,
      coordinates: [points],
    },
  };
}

function createMarkerElement(
  label: string,
  color: string,
  size: number,
  onClick?: () => void,
) {
  const element = document.createElement("button");
  element.type = "button";
  element.setAttribute("aria-label", label);
  element.title = label;
  element.onclick = onClick ?? null;
  Object.assign(element.style, {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "999px",
    border: "3px solid white",
    background: color,
    boxShadow: "0 3px 12px rgba(15,23,42,0.3)",
    cursor: onClick ? "pointer" : "default",
  });
  return element;
}

function removeMapData(map: mapboxgl.Map) {
  [ROUTE_LINE_ID, RADIUS_LINE_ID, RADIUS_FILL_ID].forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  [ROUTE_SOURCE_ID, RADIUS_SOURCE_ID].forEach((id) => {
    if (map.getSource(id)) map.removeSource(id);
  });
}

async function resolveZip(zip: string, token: string | undefined) {
  const fallback = FALLBACK_ZIPS[zip];
  if (!isValidToken(token)) return fallback ?? null;

  try {
    const query = new URLSearchParams({
      q: zip,
      country: "US",
      types: "postcode",
      autocomplete: "false",
      limit: "1",
      access_token: token,
    });
    const response = await fetch(
      `https://api.mapbox.com/search/geocode/v6/forward?${query.toString()}`,
    );
    if (!response.ok) throw new Error("ZIP lookup failed");
    const data = (await response.json()) as GeocodingResponse;
    const feature = data.features?.[0];
    const coordinates = feature?.geometry?.coordinates;
    if (!coordinates || coordinates.length < 2) return fallback ?? null;
    return {
      zip,
      label:
        feature.properties?.full_address ??
        [feature.properties?.name, feature.properties?.place_formatted]
          .filter(Boolean)
          .join(", ") ??
        `ZIP ${zip}`,
      coordinate: [coordinates[0], coordinates[1]] as LngLat,
    };
  } catch {
    return fallback ?? null;
  }
}

function IntelligenceMap({
  location,
  radiusMiles,
  results,
  selectedId,
  onSelect,
}: {
  location: ZipLocation;
  radiusMiles: number;
  results: FacilityResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const validToken = isValidToken(token);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!validToken || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: location.coordinate,
      zoom: 7,
      cooperativeGestures: true,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.scrollZoom.disable();
    const handleLoad = () => setMapReady(true);
    map.on("load", handleLoad);
    mapRef.current = map;

    return () => {
      map.off("load", handleLoad);
      map.remove();
      mapRef.current = null;
    };
  }, [token, validToken]);

  useEffect(() => {
    if (!validToken || !mapReady || !mapRef.current) return;
    const map = mapRef.current;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    removeMapData(map);

    map.addSource(RADIUS_SOURCE_ID, {
      type: "geojson",
      data: createRadiusPolygon(location.coordinate, radiusMiles),
    });
    map.addLayer({
      id: RADIUS_FILL_ID,
      type: "fill",
      source: RADIUS_SOURCE_ID,
      paint: { "fill-color": "#10B981", "fill-opacity": 0.08 },
    });
    map.addLayer({
      id: RADIUS_LINE_ID,
      type: "line",
      source: RADIUS_SOURCE_ID,
      paint: {
        "line-color": "#059669",
        "line-width": 2,
        "line-opacity": 0.65,
        "line-dasharray": [2, 2],
      },
    });

    const selected = results.find((result) => result.id === selectedId);
    if (selected) {
      const route: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [location.coordinate, selected.coordinate],
        },
      };
      map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: route });
      map.addLayer({
        id: ROUTE_LINE_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#0F172A",
          "line-width": 4,
          "line-opacity": 0.85,
        },
      });
    }

    const zipMarker = new mapboxgl.Marker({
      element: createMarkerElement(
        `ZIP ${location.zip} search center`,
        "#2563EB",
        28,
      ),
    })
      .setLngLat(location.coordinate)
      .setPopup(
        new mapboxgl.Popup({ offset: 18, closeButton: false }).setText(
          `Search center: ${location.label}`,
        ),
      )
      .addTo(map);
    markersRef.current.push(zipMarker);

    results.forEach((result) => {
      const marker = new mapboxgl.Marker({
        element: createMarkerElement(
          `Select ${result.name}`,
          result.id === selectedId ? "#0F172A" : "#10B981",
          result.id === selectedId ? 30 : 24,
          () => onSelect(result.id),
        ),
      })
        .setLngLat(result.coordinate)
        .setPopup(
          new mapboxgl.Popup({ offset: 18, closeButton: false }).setText(
            `${result.name} · ${result.distanceMiles} mi · ${currencyFormatter.format(result.cost)}`,
          ),
        )
        .addTo(map);
      markersRef.current.push(marker);
    });

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend(location.coordinate);
    results.forEach((result) => bounds.extend(result.coordinate));
    map.resize();
    if (results.length) {
      map.fitBounds(bounds, {
        padding: { top: 70, right: 55, bottom: 60, left: 55 },
        maxZoom: 9,
        duration: 650,
      });
    } else {
      map.flyTo({ center: location.coordinate, zoom: 8, duration: 650 });
    }

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (mapRef.current) removeMapData(mapRef.current);
    };
  }, [
    location,
    mapReady,
    onSelect,
    radiusMiles,
    results,
    selectedId,
    validToken,
  ]);

  const fitResults = () => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend(location.coordinate);
    results.forEach((result) => bounds.extend(result.coordinate));
    if (results.length) {
      map.fitBounds(bounds, {
        padding: { top: 70, right: 55, bottom: 60, left: 55 },
        maxZoom: 9,
        duration: 650,
      });
    } else {
      map.flyTo({ center: location.coordinate, zoom: 8 });
    }
  };

  return (
    <section
      aria-label={`Map intelligence results for ZIP ${location.zip}`}
      className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div>
          <h2 className="font-bold text-neutral-950">
            Mapbox lane intelligence
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {location.label} · {radiusMiles} mile radius
          </p>
        </div>
        <button
          type="button"
          onClick={fitResults}
          disabled={!validToken || !mapReady}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-40"
        >
          <LocateFixed className="size-4" aria-hidden="true" />
          Fit results
        </button>
      </div>
      <div className="relative h-[420px] sm:h-[500px]">
        {validToken ? (
          <>
            <div ref={containerRef} className="h-full w-full" />
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sm font-medium text-slate-500">
                Loading Mapbox intelligence…
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 via-emerald-50 to-blue-100 p-6 text-center">
            <div className="max-w-sm rounded-2xl bg-white/90 p-6 shadow-lg">
              <MapPin className="mx-auto size-6 text-emerald-700" />
              <p className="mt-3 font-bold text-neutral-950">
                Mapbox token required
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                Add NEXT_PUBLIC_MAPBOX_TOKEN to enable the interactive map.
              </p>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
            Blue · ZIP center
          </span>
          <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
            Green · Facilities
          </span>
        </div>
      </div>
    </section>
  );
}

export function MapIntelligenceWorkspace({
  role,
}: MapIntelligenceWorkspaceProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [zipInput, setZipInput] = useState("70802");
  const [location, setLocation] = useState(FALLBACK_ZIPS["70802"]);
  const [radiusMiles, setRadiusMiles] = useState(500);
  const [optimization, setOptimization] = useState<Optimization>("balanced");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(
    "FAC-PORT-ALLEN",
  );
  const [savedLaneId, setSavedLaneId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchMessage, setSearchMessage] = useState(
    "Showing verified lanes around Baton Rouge.",
  );

  const results = useMemo(() => {
    const facilities = FACILITIES.map((facility) => {
      const distanceMiles = distanceInMiles(
        location.coordinate,
        facility.coordinate,
      );
      const cost = Math.round(480 + distanceMiles * facility.ratePerMile);
      const carbonKg = Math.round(24 + distanceMiles * facility.carbonPerMile);
      const score = Math.max(
        35,
        Math.min(
          99,
          Math.round(
            98 -
              distanceMiles / 30 -
              facility.ratePerMile * 0.8 -
              facility.carbonPerMile * 4,
          ),
        ),
      );
      return {
        ...facility,
        distanceMiles,
        cost,
        carbonKg,
        eta: calculateEta(distanceMiles, facility.averageMph),
        score,
      };
    }).filter((facility) => facility.distanceMiles <= radiusMiles);

    return facilities.sort((first, second) => {
      if (optimization === "cost") return first.cost - second.cost;
      if (optimization === "carbon") return first.carbonKg - second.carbonKg;
      if (optimization === "speed")
        return (
          first.distanceMiles / first.averageMph -
          second.distanceMiles / second.averageMph
        );
      return second.score - first.score;
    });
  }, [location, optimization, radiusMiles]);

  const selectedResult =
    results.find((result) => result.id === selectedFacilityId) ??
    results[0] ??
    null;
  const activeSelectedId = selectedResult?.id ?? null;

  const searchZip = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedZip = zipInput.trim();
    if (!/^\d{5}$/.test(normalizedZip)) {
      setSearchError("Enter a valid five-digit U.S. ZIP code.");
      return;
    }

    setSearching(true);
    setSearchError("");
    const resolved = await resolveZip(normalizedZip, token);
    setSearching(false);
    if (!resolved) {
      setSearchError(
        "That ZIP code could not be located. Check the number and try again.",
      );
      return;
    }

    setLocation(resolved);
    setSelectedFacilityId(null);
    setSavedLaneId(null);
    setSearchMessage(
      `Map and lane comparisons refreshed for ZIP ${normalizedZip}.`,
    );
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
        <form
          onSubmit={searchZip}
          className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.9fr_auto]"
        >
          <div>
            <label
              htmlFor="map-zip"
              className="mb-2 block text-sm font-semibold text-neutral-800"
            >
              U.S. ZIP code
            </label>
            <input
              id="map-zip"
              value={zipInput}
              onChange={(event) =>
                setZipInput(event.target.value.replace(/\D/g, "").slice(0, 5))
              }
              inputMode="numeric"
              pattern="[0-9]{5}"
              placeholder="70802"
              required
              className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label
              htmlFor="map-radius"
              className="mb-2 block text-sm font-semibold text-neutral-800"
            >
              Search radius
            </label>
            <select
              id="map-radius"
              value={radiusMiles}
              onChange={(event) => {
                setRadiusMiles(Number(event.target.value));
                setSavedLaneId(null);
              }}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value={100}>100 miles</option>
              <option value={300}>300 miles</option>
              <option value={500}>500 miles</option>
              <option value={1000}>1,000 miles</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="map-optimization"
              className="mb-2 block text-sm font-semibold text-neutral-800"
            >
              Prioritize
            </label>
            <select
              id="map-optimization"
              value={optimization}
              onChange={(event) => {
                setOptimization(event.target.value as Optimization);
                setSavedLaneId(null);
              }}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="balanced">Best overall score</option>
              <option value="cost">Lowest landed cost</option>
              <option value="carbon">Lowest carbon</option>
              <option value="speed">Fastest delivery</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={searching}
            className="mt-auto inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white disabled:bg-neutral-400"
          >
            <Search className="size-4" aria-hidden="true" />
            {searching ? "Searching…" : "Search ZIP"}
          </button>
        </form>
        {searchError ? (
          <p role="alert" className="mt-3 text-sm font-medium text-red-700">
            {searchError}
          </p>
        ) : (
          <p
            role="status"
            className="mt-3 text-sm font-medium text-emerald-700"
          >
            {searchMessage}
          </p>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <IntelligenceMap
          location={location}
          radiusMiles={radiusMiles}
          results={results}
          selectedId={activeSelectedId}
          onSelect={setSelectedFacilityId}
        />

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-neutral-950">
                {role === "admin"
                  ? "Network scenarios"
                  : "Best-fit feedstock lanes"}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                {results.length} verified facilities inside {radiusMiles} miles
              </p>
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
              Sorted by {optimization}
            </span>
          </div>

          {results.length ? (
            <div className="mt-4 max-h-[430px] space-y-3 overflow-y-auto pr-1">
              {results.map((result) => {
                const isSelected = result.id === activeSelectedId;
                return (
                  <button
                    type="button"
                    key={result.id}
                    onClick={() => setSelectedFacilityId(result.id)}
                    className={`w-full rounded-xl p-4 text-left ring-1 transition ${
                      isSelected
                        ? "bg-neutral-950 text-white ring-neutral-950"
                        : "bg-white text-neutral-950 ring-neutral-200 hover:bg-neutral-50"
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{result.name}</p>
                        <p
                          className={`mt-1 text-sm ${
                            isSelected ? "text-neutral-300" : "text-neutral-500"
                          }`}
                        >
                          {result.material} · {result.location}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isSelected
                            ? "bg-white/15 text-white"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        Score {result.score}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      <LaneMetric
                        label="Distance"
                        value={`${result.distanceMiles} mi`}
                        inverted={isSelected}
                      />
                      <LaneMetric
                        label="Cost"
                        value={currencyFormatter.format(result.cost)}
                        inverted={isSelected}
                      />
                      <LaneMetric
                        label="CO2"
                        value={`${result.carbonKg} kg`}
                        inverted={isSelected}
                      />
                      <LaneMetric
                        label="ETA"
                        value={result.eta}
                        inverted={isSelected}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-amber-50 p-5 text-sm text-amber-900">
              No verified facilities are inside this radius. Increase the search
              radius to compare more lanes.
            </div>
          )}
        </section>
      </div>

      {selectedResult && (
        <section className="grid gap-5 rounded-2xl bg-slate-950 p-5 text-white shadow-sm md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Route className="size-5 text-emerald-300" aria-hidden="true" />
              <h2 className="text-lg font-bold">{selectedResult.name}</h2>
              <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                Verified lane
              </span>
            </div>
            <p className="mt-2 text-sm text-neutral-300">
              {location.label} to {selectedResult.location} ·{" "}
              {selectedResult.material}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-2">
                <Truck className="size-4 text-emerald-300" />
                {selectedResult.distanceMiles} miles
              </span>
              <span className="inline-flex items-center gap-2">
                <Leaf className="size-4 text-emerald-300" />
                {selectedResult.carbonKg} kg CO2e
              </span>
              <span className="font-semibold">
                {currencyFormatter.format(selectedResult.cost)} estimated
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSavedLaneId(selectedResult.id)}
            disabled={savedLaneId === selectedResult.id}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-neutral-950 disabled:bg-emerald-200 disabled:text-emerald-900"
          >
            {savedLaneId === selectedResult.id
              ? "Lane added to comparison"
              : "Add lane to comparison"}
          </button>
          {savedLaneId === selectedResult.id && (
            <p
              role="status"
              className="text-sm font-medium text-emerald-200 md:col-span-2"
            >
              {selectedResult.name} is ready for sourcing and shipping review.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function LaneMetric({
  label,
  value,
  inverted,
}: {
  label: string;
  value: string;
  inverted: boolean;
}) {
  return (
    <span>
      <span
        className={`block text-[10px] uppercase tracking-wide ${
          inverted ? "text-neutral-400" : "text-neutral-500"
        }`}
      >
        {label}
      </span>
      <span className="mt-1 block text-xs font-bold">{value}</span>
    </span>
  );
}
