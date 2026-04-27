"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export interface MapListing {
  id: string;
  title: string;
  location: string;
  price: string;
  unit: string;
  moq: string;
  co2: string;
  lng: number;
  lat: number;
  image?: string;
}

const fallbackListings: MapListing[] = [
  { id: "bagasse", title: "Shredded, Refined Sugar Bagasse", location: "Port Allen, LA", price: "$48", unit: "/ton", moq: "3 tons", co2: "300 kg CO₂e", lng: -91.2103, lat: 30.4524 },
  { id: "polymer", title: "Scrap Polymer Blend", location: "Plaquemine, LA", price: "€60", unit: "/ton", moq: "3 tons", co2: "300 kg CO₂e", lng: -91.2343, lat: 30.2893 },
  { id: "pyrolysis", title: "High-Quality Recycled Pyrolysis Pitch", location: "Baker, LA", price: "$300", unit: "/ton", moq: "3 tons", co2: "300 kg CO₂e", lng: -91.1681, lat: 30.5883 },
  { id: "stover-walker", title: "Harvested and Baled Corn Stover", location: "Walker, LA", price: "$42", unit: "/ton", moq: "3 tons", co2: "300 kg CO₂e", lng: -90.8612, lat: 30.4888 },
  { id: "stover-monroe", title: "Corn Stover", location: "Monroe, LA", price: "$42", unit: "/ton", moq: "3 tons", co2: "300 kg CO₂e", lng: -92.1193, lat: 32.5093 },
  { id: "polyester", title: "Premium Recycled Polyester Fiber", location: "Gonzales, LA", price: "€200", unit: "/ton", moq: "1.5 tons", co2: "250 kg CO₂e", lng: -90.9201, lat: 30.2388 },
];

function buildPopupContent(
  listing: MapListing,
  onView?: (id: string) => void,
): HTMLDivElement {
  const container = document.createElement("div");
  Object.assign(container.style, {
    width: "240px",
    fontFamily: "Inter, sans-serif",
    overflow: "hidden",
    borderRadius: "8px",
  });

  if (listing.image) {
    const imgWrap = document.createElement("div");
    Object.assign(imgWrap.style, {
      width: "100%",
      height: "120px",
      overflow: "hidden",
      background: "#F5F5F5",
    });
    const img = document.createElement("img");
    img.src = listing.image;
    img.alt = listing.title;
    Object.assign(img.style, {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    });
    imgWrap.appendChild(img);
    container.appendChild(imgWrap);
  }

  const body = document.createElement("div");
  Object.assign(body.style, { padding: "10px 4px 4px" });

  const title = document.createElement("p");
  title.textContent = listing.title;
  Object.assign(title.style, {
    fontWeight: "600",
    fontSize: "14px",
    margin: "0 0 4px",
    color: "#090909",
  });
  body.appendChild(title);

  const loc = document.createElement("p");
  loc.textContent = listing.location;
  Object.assign(loc.style, {
    fontSize: "12px",
    color: "#616161",
    margin: "0 0 6px",
  });
  body.appendChild(loc);

  const badges = document.createElement("div");
  Object.assign(badges.style, {
    display: "flex",
    gap: "4px",
    marginBottom: "8px",
  });
  [listing.moq, listing.co2].forEach((text) => {
    const badge = document.createElement("span");
    badge.textContent = text;
    Object.assign(badge.style, {
      background: "#F5F5F5",
      padding: "2px 6px",
      borderRadius: "4px",
      fontSize: "10px",
      color: "#424242",
    });
    badges.appendChild(badge);
  });
  body.appendChild(badges);

  const price = document.createElement("p");
  Object.assign(price.style, {
    fontWeight: "600",
    fontSize: "16px",
    margin: "0 0 10px",
    color: "#090909",
  });
  price.textContent = listing.price;
  const unitSpan = document.createElement("span");
  unitSpan.textContent = " " + listing.unit;
  Object.assign(unitSpan.style, {
    fontWeight: "400",
    fontSize: "12px",
    color: "#9E9E9E",
  });
  price.appendChild(unitSpan);
  body.appendChild(price);

  const viewBtn = document.createElement("button");
  viewBtn.type = "button";
  viewBtn.textContent = "View details";
  Object.assign(viewBtn.style, {
    width: "100%",
    padding: "8px 12px",
    background: "#090909",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  });
  viewBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (onView) onView(listing.id);
    else window.location.href = `/browse/${listing.id}`;
  });
  body.appendChild(viewBtn);

  container.appendChild(body);

  return container;
}

interface ListingMapProps {
  listings?: MapListing[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onView?: (id: string) => void;
}

function isValidToken(t: string | undefined): t is string {
  return !!t && t !== "placeholder" && t.startsWith("pk.");
}

function FallbackMap({ data, selectedId, onSelect, onView }: {
  data: MapListing[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onView?: (id: string) => void;
}) {
  const lngs = data.map((d) => d.lng);
  const lats = data.map((d) => d.lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const padX = (maxLng - minLng) * 0.15 || 0.3;
  const padY = (maxLat - minLat) * 0.15 || 0.3;
  const lngRange = (maxLng - minLng) + padX * 2 || 1;
  const latRange = (maxLat - minLat) + padY * 2 || 1;

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl"
      style={{
        background:
          "linear-gradient(135deg, #E8F1ED 0%, #F4F8F2 50%, #E0EAE3 100%)",
      }}
    >
      {/* Decorative grid */}
      <svg className="absolute inset-0 h-full w-full opacity-40" aria-hidden>
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#C8D7CD" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Pins */}
      {data.map((listing) => {
        const xPct = ((listing.lng - minLng + padX) / lngRange) * 100;
        const yPct = (1 - (listing.lat - minLat + padY) / latRange) * 100;
        const isSelected = listing.id === selectedId;
        return (
          <button
            key={listing.id}
            type="button"
            onClick={() => onSelect?.(listing.id)}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform hover:scale-110"
            style={{
              left: `${xPct}%`,
              top: `${yPct}%`,
              width: 24,
              height: 24,
              background: isSelected ? "#1F5F3A" : "#378853",
              border: "2.5px solid white",
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
              transform: `translate(-50%, -50%) scale(${isSelected ? 1.35 : 1})`,
            }}
            aria-label={listing.title}
          />
        );
      })}

      {/* Selected popup */}
      {selectedId &&
        (() => {
          const sel = data.find((l) => l.id === selectedId);
          if (!sel) return null;
          const xPct = ((sel.lng - minLng + padX) / lngRange) * 100;
          const yPct = (1 - (sel.lat - minLat + padY) / latRange) * 100;
          return (
            <div
              className="absolute z-20 w-[240px] -translate-x-1/2 overflow-hidden rounded-lg bg-white shadow-lg"
              style={{ left: `${xPct}%`, top: `calc(${yPct}% - 18px)`, transform: "translate(-50%, -100%)" }}
            >
              {sel.image && (
                <div className="h-[120px] w-full overflow-hidden bg-neutral-100">
                  <img
                    src={sel.image}
                    alt={sel.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="p-3">
                <p className="text-sm font-semibold text-neutral-900">{sel.title}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{sel.location}</p>
                <div className="mt-2 flex gap-1">
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">{sel.moq}</span>
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">{sel.co2}</span>
                </div>
                <p className="mt-2 text-base font-semibold text-neutral-900">
                  {sel.price}
                  <span className="ml-1 text-xs font-normal text-neutral-400">{sel.unit}</span>
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onView) onView(sel.id);
                    else window.location.href = `/browse/${sel.id}`;
                  }}
                  className="mt-3 w-full rounded-full bg-neutral-900 py-2 text-xs font-semibold text-white hover:opacity-90"
                >
                  View details
                </button>
              </div>
            </div>
          );
        })()}

      {/* Subtle hint */}
      <div className="absolute bottom-3 right-3 rounded-md bg-white/80 px-2 py-1 text-[10px] text-neutral-500 backdrop-blur-sm">
        Map preview · Set NEXT_PUBLIC_MAPBOX_TOKEN to enable
      </div>
    </div>
  );
}

export function ListingMap({ listings, selectedId, onSelect, onView }: ListingMapProps = {}) {
  const data = listings && listings.length > 0 ? listings : fallbackListings;
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const validToken = isValidToken(token);

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: mapboxgl.Marker; popup: mapboxgl.Popup; el: HTMLDivElement }>>(new globalThis.Map());

  useEffect(() => {
    if (!validToken) return;
    if (!mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken = token!;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-91.15, 30.45],
      zoom: 8.5,
    });

    mapInstance.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = mapInstance;

    return () => {
      mapInstance.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, [validToken, token]);

  // Sync markers to listings
  useEffect(() => {
    if (!validToken) return;
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    // Clear existing
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current.clear();

    data.forEach((listing) => {
      const el = document.createElement("div");
      el.style.cssText =
        "width:24px;height:24px;border-radius:50%;background:#378853;border:2.5px solid white;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.25);transition:transform 150ms ease, background 150ms ease;";

      const popup = new mapboxgl.Popup({
        offset: 16,
        closeButton: false,
        maxWidth: "260px",
      }).setDOMContent(buildPopupContent(listing, onView));

      const marker = new mapboxgl.Marker(el)
        .setLngLat([listing.lng, listing.lat])
        .setPopup(popup)
        .addTo(mapInstance);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect?.(listing.id);
      });

      markersRef.current.set(listing.id, { marker, popup, el });
    });

    // Fit bounds to all markers when listings change (but not on first render with default view)
    if (data.length > 0 && data.length !== fallbackListings.length) {
      const bounds = new mapboxgl.LngLatBounds();
      data.forEach((l) => bounds.extend([l.lng, l.lat]));
      mapInstance.fitBounds(bounds, { padding: 80, maxZoom: 11, duration: 600 });
    }
  }, [data, onSelect, onView, validToken]);

  // React to selection changes — fly to and highlight
  useEffect(() => {
    if (!validToken) return;
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    markersRef.current.forEach(({ el, popup }, id) => {
      if (id === selectedId) {
        el.style.background = "#1F5F3A";
        el.style.transform = "scale(1.35)";
        popup.addTo(mapInstance);
      } else {
        el.style.background = "#378853";
        el.style.transform = "scale(1)";
        popup.remove();
      }
    });

    if (selectedId) {
      const target = data.find((l) => l.id === selectedId);
      if (target) {
        mapInstance.flyTo({
          center: [target.lng, target.lat],
          zoom: 13,
          duration: 900,
          essential: true,
        });
      }
    } else if (data.length > 0) {
      // Deselected: zoom back out to fit all visible listings
      const bounds = new mapboxgl.LngLatBounds();
      data.forEach((l) => bounds.extend([l.lng, l.lat]));
      mapInstance.fitBounds(bounds, {
        padding: 80,
        maxZoom: 11,
        duration: 700,
      });
    }
  }, [selectedId, data, validToken]);

  if (!validToken) {
    return (
      <FallbackMap
        data={data}
        selectedId={selectedId}
        onSelect={onSelect}
        onView={onView}
      />
    );
  }

  return <div ref={mapContainer} className="h-full w-full rounded-xl" />;
}
