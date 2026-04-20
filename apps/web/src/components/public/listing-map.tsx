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
}

const fallbackListings: MapListing[] = [
  { id: "bagasse", title: "Shredded, Refined Sugar Bagasse", location: "Port Allen, LA", price: "$48", unit: "/ton", moq: "3 tons", co2: "300 kg CO₂e", lng: -91.2103, lat: 30.4524 },
  { id: "polymer", title: "Scrap Polymer Blend", location: "Plaquemine, LA", price: "€60", unit: "/ton", moq: "3 tons", co2: "300 kg CO₂e", lng: -91.2343, lat: 30.2893 },
  { id: "pyrolysis", title: "High-Quality Recycled Pyrolysis Pitch", location: "Baker, LA", price: "$300", unit: "/ton", moq: "3 tons", co2: "300 kg CO₂e", lng: -91.1681, lat: 30.5883 },
  { id: "stover-walker", title: "Harvested and Baled Corn Stover", location: "Walker, LA", price: "$42", unit: "/ton", moq: "3 tons", co2: "300 kg CO₂e", lng: -90.8612, lat: 30.4888 },
  { id: "stover-monroe", title: "Corn Stover", location: "Monroe, LA", price: "$42", unit: "/ton", moq: "3 tons", co2: "300 kg CO₂e", lng: -92.1193, lat: 32.5093 },
  { id: "polyester", title: "Premium Recycled Polyester Fiber", location: "Gonzales, LA", price: "€200", unit: "/ton", moq: "1.5 tons", co2: "250 kg CO₂e", lng: -90.9201, lat: 30.2388 },
];

function buildPopupContent(listing: MapListing): HTMLDivElement {
  const container = document.createElement("div");
  container.style.padding = "8px";
  container.style.fontFamily = "Inter, sans-serif";

  const title = document.createElement("p");
  title.textContent = listing.title;
  Object.assign(title.style, { fontWeight: "600", fontSize: "14px", margin: "0 0 4px", color: "#090909" });
  container.appendChild(title);

  const loc = document.createElement("p");
  loc.textContent = listing.location;
  Object.assign(loc.style, { fontSize: "12px", color: "#616161", margin: "0 0 6px" });
  container.appendChild(loc);

  const badges = document.createElement("div");
  Object.assign(badges.style, { display: "flex", gap: "4px", marginBottom: "8px" });
  [listing.moq, listing.co2].forEach((text) => {
    const badge = document.createElement("span");
    badge.textContent = text;
    Object.assign(badge.style, { background: "#F5F5F5", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", color: "#424242" });
    badges.appendChild(badge);
  });
  container.appendChild(badges);

  const price = document.createElement("p");
  Object.assign(price.style, { fontWeight: "600", fontSize: "16px", margin: "0", color: "#090909" });
  price.textContent = listing.price;
  const unitSpan = document.createElement("span");
  unitSpan.textContent = " " + listing.unit;
  Object.assign(unitSpan.style, { fontWeight: "400", fontSize: "12px", color: "#9E9E9E" });
  price.appendChild(unitSpan);
  container.appendChild(price);

  return container;
}

interface ListingMapProps {
  listings?: MapListing[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

export function ListingMap({ listings, selectedId, onSelect }: ListingMapProps = {}) {
  const data = listings && listings.length > 0 ? listings : fallbackListings;
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: mapboxgl.Marker; popup: mapboxgl.Popup; el: HTMLDivElement }>>(new globalThis.Map());

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

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
  }, []);

  // Sync markers to listings
  useEffect(() => {
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
      }).setDOMContent(buildPopupContent(listing));

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
  }, [data, onSelect]);

  // React to selection changes — fly to and highlight
  useEffect(() => {
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
    }
  }, [selectedId, data]);

  return <div ref={mapContainer} className="h-full w-full rounded-xl" />;
}
