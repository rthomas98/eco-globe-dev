"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { STREET_STYLE } from "@/lib/street-map-style";
import { isMaterialIllustration, materialImage } from "@/lib/material-images";
import {
  clusterDemoMapSites,
  groupDemoMapSites,
  type DemoMapPoint,
  type DemoMapSite,
} from "@/lib/demo-playlists";

const CLUSTER_RADIUS_PX = 34;
/** At or beyond this zoom a cluster opens as a list instead of zooming further. */
const LIST_ZOOM = 13;

const PIN_STYLES: Record<string, { fill: string; border: string; dashed?: boolean; label: string }> = {
  seller: { fill: "#378853", border: "#FFFFFF", label: "Seller offer" },
  buyer: { fill: "#2563EB", border: "#FFFFFF", label: "Buyer need" },
  profile: { fill: "#FFFFFF", border: "#404040", label: "Company profile" },
  network: { fill: "#FFFFFF", border: "#7C3AED", dashed: true, label: "Potential relationship" },
};

function pinStyle(point: DemoMapPoint) {
  return PIN_STYLES[point.kind === "material" ? (point.role ?? "seller") : point.kind]!;
}

function pointLabel(point: DemoMapPoint) {
  return `${point.title}${point.subtitle ? ` — ${point.subtitle}` : ""} (${pinStyle(point).label})`;
}

/** Popup listing every point at a site/cluster; text only, never HTML from data. */
function buildPopupList(points: DemoMapPoint[], onSelect: (point: DemoMapPoint) => void): HTMLDivElement {
  const container = document.createElement("div");
  container.style.cssText = "width:260px;max-height:320px;overflow:auto;font-family:Inter,sans-serif;padding:4px";
  if (points.length > 1) {
    const heading = document.createElement("p");
    heading.textContent = `${points.length} entries at this location`;
    heading.style.cssText = "margin:4px 4px 6px;font-size:11px;font-weight:600;color:#525252;text-transform:uppercase;letter-spacing:.04em";
    container.appendChild(heading);
  }
  for (const point of points) {
    const button = document.createElement("button");
    button.type = "button";
    button.style.cssText =
      "display:flex;width:100%;gap:8px;align-items:flex-start;text-align:left;padding:6px 4px;border-radius:6px;background:none;border:0;cursor:pointer";
    button.addEventListener("mouseenter", () => (button.style.background = "#F5F5F5"));
    button.addEventListener("mouseleave", () => (button.style.background = "none"));
    const image = point.kind === "material" ? materialImage(point.title) : null;
    if (image) {
      const img = document.createElement("img");
      img.src = image;
      img.alt = isMaterialIllustration(image) ? `Illustrative image of ${point.title}` : point.title;
      img.style.cssText = "width:40px;height:40px;border-radius:6px;object-fit:cover;flex-shrink:0;background:#F5F5F5";
      img.addEventListener("error", () => img.remove());
      button.appendChild(img);
    }
    const body = document.createElement("span");
    body.style.cssText = "display:flex;flex-direction:column;min-width:0";
    const kind = document.createElement("span");
    kind.textContent = `${pinStyle(point).label} · Presentation only`;
    kind.style.cssText = "font-size:10px;font-weight:600;color:#737373;text-transform:uppercase;letter-spacing:.04em";
    const title = document.createElement("span");
    title.textContent = point.title;
    title.style.cssText = "font-size:13px;font-weight:600;color:#171717";
    const subtitle = document.createElement("span");
    subtitle.textContent = point.subtitle;
    subtitle.style.cssText = "font-size:12px;color:#525252";
    const facts = document.createElement("span");
    facts.style.cssText = "display:flex;flex-direction:column;gap:1px;margin-top:3px;font-size:11px;line-height:1.35;color:#404040";
    for (const fact of point.facts) {
      const line = document.createElement("span");
      const label = document.createElement("span");
      label.textContent = `${fact.label}: `;
      label.style.cssText = "color:#737373";
      line.append(label, fact.value);
      facts.appendChild(line);
    }
    const action = document.createElement("span");
    action.textContent = "Show in list";
    action.style.cssText = "margin-top:3px;font-size:12px;font-weight:600;color:#171717;text-decoration:underline";
    body.append(kind, title, subtitle, facts, action);
    button.appendChild(body);
    button.addEventListener("click", () => onSelect(point));
    container.appendChild(button);
  }
  return container;
}

function markerElement(points: DemoMapPoint[], active: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("role", "button");
  el.tabIndex = 0;
  el.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      el.click();
    }
  });
  const ring = active ? "box-shadow:0 0 0 3px #FFD600,0 2px 6px rgba(0,0,0,.3);" : "box-shadow:0 2px 6px rgba(0,0,0,.25);";
  if (points.length === 1) {
    const style = pinStyle(points[0]!);
    el.setAttribute("aria-label", pointLabel(points[0]!));
    const size = active ? 26 : 22;
    el.style.cssText = `width:${size}px;height:${size}px;border-radius:${points[0]!.kind === "material" ? "50%" : "6px"};background:${style.fill};border:2.5px ${style.dashed ? "dashed" : "solid"} ${style.border};cursor:pointer;${ring}`;
    return el;
  }
  el.setAttribute("aria-label", `${points.length} entries at or near this location`);
  el.textContent = String(points.length);
  const size = points.length > 99 ? 40 : 32;
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:#171717;color:#fff;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;font:600 12px Inter,sans-serif;cursor:pointer;${ring}`;
  return el;
}

function showPopup(
  map: maplibregl.Map,
  popupRef: { current: maplibregl.Popup | null },
  at: { lat: number; lng: number },
  list: DemoMapPoint[],
  onSelect: (point: DemoMapPoint) => void,
) {
  popupRef.current?.remove();
  popupRef.current = new maplibregl.Popup({ offset: 16, closeButton: true, maxWidth: "260px" })
    .setLngLat([at.lng, at.lat])
    .setDOMContent(buildPopupList(list, onSelect))
    .addTo(map);
}

function fitPoints(map: maplibregl.Map, points: Array<{ lat: number; lng: number }>) {
  if (points.length === 0) {
    map.jumpTo({ center: [-40, 25], zoom: 1 });
    return;
  }
  if (points.length === 1) {
    map.jumpTo({ center: [points[0]!.lng, points[0]!.lat], zoom: 9 });
    return;
  }
  const bounds = new maplibregl.LngLatBounds();
  points.forEach((point) => bounds.extend([point.lng, point.lat]));
  map.fitBounds(bounds, { padding: 48, maxZoom: 10, duration: 0 });
}

export interface DemoPlaylistMapProps {
  points: DemoMapPoint[];
  /** The map refits to every point whenever this changes (playlist or filters). */
  fitKey: string;
  selectedKey: string | null;
  /** Bumped by the list to fly to `selectedKey` again. */
  focusNonce: number;
  /** A popup entry was chosen: show it in the list. */
  onSelect: (point: DemoMapPoint) => void;
}

/**
 * Presentation map for one playlist. Starts at any distance and fits the
 * shown entries — never the visitor's location. Points at the same site and
 * nearby pins collapse into a counted marker so every entry stays reachable.
 */
export function DemoPlaylistMap({ points, fitKey, selectedKey, focusNonce, onSelect }: DemoPlaylistMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const selectRef = useRef(onSelect);
  const pointsRef = useRef(points);
  const flyingRef = useRef(false);
  const [zoomTick, setZoomTick] = useState(0);
  const [mapError, setMapError] = useState(false);
  const sites = useMemo(() => groupDemoMapSites(points), [points]);

  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    // Same served worker as the marketplace map; see listing-map.tsx.
    maplibregl.setWorkerUrl(new URL("/vendor/maplibre/maplibre-gl-worker.mjs", window.location.origin).href);
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STREET_STYLE,
      attributionControl: { compact: false },
      maxZoom: 18,
      renderWorldCopies: false,
      center: [-40, 25],
      zoom: 1,
    });
    map.addControl(new maplibregl.NavigationControl(), "bottom-right");
    map.on("error", () => setMapError(true));
    map.on("idle", () => {
      if (map.areTilesLoaded()) setMapError(false);
    });
    map.on("zoomend", () => setZoomTick((tick) => tick + 1));
    mapRef.current = map;
    // A map hidden behind the mobile List view has no size; fit again once it
    // is shown, unless it is already flying to an entry chosen in the list.
    let lastWidth = containerRef.current.clientWidth;
    const resize = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      map.resize();
      if (lastWidth === 0 && width > 0 && !flyingRef.current) fitPoints(map, pointsRef.current);
      lastWidth = width;
      setZoomTick((tick) => tick + 1);
    });
    resize.observe(containerRef.current);
    return () => {
      resize.disconnect();
      // map.remove() also removes any open popup.
      map.remove();
      popupRef.current = null;
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []);

  // Markers: re-cluster when the points, zoom, size or selection change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const openPopup = (at: DemoMapSite, list: DemoMapPoint[]) =>
      showPopup(map, popupRef, at, list, (point) => selectRef.current(point));
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    const clusters = clusterDemoMapSites(sites, (site) => map.project([site.lng, site.lat]), CLUSTER_RADIUS_PX);
    for (const cluster of clusters) {
      const clusterPoints = cluster.flatMap((site) => site.points);
      const anchor: DemoMapSite = cluster[0]!;
      const el = markerElement(clusterPoints, clusterPoints.some((point) => point.key === selectedKey));
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        if (cluster.length === 1 || map.getZoom() >= LIST_ZOOM) {
          openPopup(anchor, clusterPoints);
        } else {
          const bounds = new maplibregl.LngLatBounds();
          cluster.forEach((site) => bounds.extend([site.lng, site.lat]));
          map.fitBounds(bounds, { padding: 80, maxZoom: LIST_ZOOM + 1 });
        }
      });
      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([anchor.lng, anchor.lat]).addTo(map));
    }
  }, [sites, zoomTick, selectedKey]);

  // Fit the playlist/filter result. Selection changes never refit.
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    popupRef.current?.remove();
    fitPoints(map, pointsRef.current);
    setZoomTick((tick) => tick + 1);
  }, [fitKey]);

  // Fly to the entry chosen in the list and list everything at its site.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedKey || focusNonce === 0) return;
    const site = sites.find((item) => item.points.some((point) => point.key === selectedKey));
    if (!site) return;
    // The container may have just been revealed (mobile Map view).
    map.resize();
    flyingRef.current = true;
    map.flyTo({ center: [site.lng, site.lat], zoom: Math.max(map.getZoom(), 11), duration: 600 });
    map.once("moveend", () => {
      flyingRef.current = false;
      showPopup(map, popupRef, site, site.points, (point) => selectRef.current(point));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" aria-label="Map of demo entries" role="region" />
      {mapError && (
        <p className="absolute left-3 top-3 rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-neutral-700 shadow">
          Some map tiles could not load. Entries remain listed.
        </p>
      )}
    </div>
  );
}

/** Legend for the pin styles; network styles only while the network is shown. */
export function DemoPlaylistMapLegend({ network }: { network: boolean }) {
  const items = ["seller", "buyer", "profile", ...(network ? ["network"] : [])];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-700" aria-label="Map legend">
      {items.map((key) => {
        const style = PIN_STYLES[key]!;
        return (
          <li key={key} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={key === "seller" || key === "buyer" ? "size-3 rounded-full" : "size-3 rounded-[3px]"}
              style={{ background: style.fill, border: `2px ${style.dashed ? "dashed" : "solid"} ${style.border === "#FFFFFF" ? style.fill : style.border}` }}
            />
            {style.label}
          </li>
        );
      })}
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="inline-flex size-4 items-center justify-center rounded-full bg-neutral-900 text-[9px] font-semibold text-white">
          n
        </span>
        Grouped entries
      </li>
    </ul>
  );
}
