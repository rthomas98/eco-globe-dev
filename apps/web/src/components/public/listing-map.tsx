"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapListing {
  title: string;
  location: string;
  price: string;
  unit: string;
  moq: string;
  co2: string;
  lng: number;
  lat: number;
}

const mapListings: MapListing[] = [
  { title: "Shredded, Refined Sugar Bagasse", location: "Port Allen, LA", price: "$48", unit: "/ton", moq: "3 tons", co2: "300 kg CO₂e", lng: -91.2103, lat: 30.4524 },
  { title: "Scrap Polymer Blend", location: "Plaquemine, LA", price: "€60", unit: "/ton", moq: "3 tons", co2: "300 kg CO₂e", lng: -91.2343, lat: 30.2893 },
  { title: "High-Quality Recycled Pyrolysis Pitch", location: "Baker, LA", price: "$300", unit: "/ton", moq: "3 tons", co2: "300 kg CO₂e", lng: -91.1681, lat: 30.5883 },
  { title: "Harvested and Baled Corn Stover", location: "Walker, LA", price: "$42", unit: "/ton", moq: "3 tons", co2: "300 kg CO₂e", lng: -90.8612, lat: 30.4888 },
  { title: "Corn Stover", location: "Monroe, LA", price: "$42", unit: "/ton", moq: "3 tons", co2: "300 kg CO₂e", lng: -92.1193, lat: 32.5093 },
  { title: "Premium Recycled Polyester Fiber", location: "Gonzales, LA", price: "€200", unit: "/ton", moq: "1.5 tons", co2: "250 kg CO₂e", lng: -90.9201, lat: 30.2388 },
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

export function ListingMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-91.15, 30.45],
      zoom: 8.5,
    });

    mapInstance.addControl(new mapboxgl.NavigationControl(), "top-right");

    mapListings.forEach((listing) => {
      const el = document.createElement("div");
      el.style.cssText =
        "width:28px;height:28px;border-radius:50%;background:#090909;border:2px solid white;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);";

      const popup = new mapboxgl.Popup({
        offset: 20,
        closeButton: false,
        maxWidth: "240px",
      }).setDOMContent(buildPopupContent(listing));

      new mapboxgl.Marker(el)
        .setLngLat([listing.lng, listing.lat])
        .setPopup(popup)
        .addTo(mapInstance);
    });

    mapRef.current = mapInstance;

    return () => {
      mapInstance.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={mapContainer} className="h-full w-full rounded-xl" />;
}
