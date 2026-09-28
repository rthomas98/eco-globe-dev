"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ApiShipment } from "@/lib/api-fulfilment";
import { STREET_STYLE } from "@/lib/street-map-style";

/** Only saved endpoints are needed, so order shipments from the logistics workspace fit too. */
export type SavedShipmentLocation = Pick<
  ApiShipment,
  | "id"
  | "originName"
  | "originLatitude"
  | "originLongitude"
  | "destinationName"
  | "destinationLatitude"
  | "destinationLongitude"
>;

export function SavedShipmentMap({ shipment }: { shipment: SavedShipmentLocation }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const {
    id,
    originLatitude,
    originLongitude,
    originName,
    destinationLatitude,
    destinationLongitude,
    destinationName,
  } = shipment;
  const points = [
    {
      label: `Origin: ${originName ?? "Seller facility"}`,
      lat: originLatitude,
      lng: originLongitude,
    },
    {
      label: `Destination: ${destinationName ?? "Buyer facility"}`,
      lat: destinationLatitude,
      lng: destinationLongitude,
    },
  ].filter(
    (point): point is { label: string; lat: number; lng: number } =>
      typeof point.lat === "number" &&
      Number.isFinite(point.lat) &&
      Math.abs(point.lat) <= 90 &&
      typeof point.lng === "number" &&
      Number.isFinite(point.lng) &&
      Math.abs(point.lng) <= 180,
  );
  const pointsKey = JSON.stringify(points);

  useEffect(() => {
    if (!container.current || !points.length) return;
    setError("");
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: container.current,
        style: STREET_STYLE,
        center: [points[0]!.lng, points[0]!.lat],
        zoom: 8,
      });
    } catch {
      setError(
        "The interactive map could not load. Saved locations are listed below.",
      );
      return;
    }
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.on("error", () =>
      setError(
        "Some map tiles could not load. Saved locations are listed below.",
      ),
    );
    const bounds = new maplibregl.LngLatBounds();
    for (const point of points) {
      bounds.extend([point.lng, point.lat]);
      const marker = document.createElement("button");
      marker.type = "button";
      marker.setAttribute("aria-label", point.label);
      marker.style.cssText =
        "width:22px;height:22px;border-radius:50%;background:#047857;border:3px solid white;box-shadow:0 1px 6px #444";
      new maplibregl.Marker({ element: marker })
        .setLngLat([point.lng, point.lat])
        .setPopup(new maplibregl.Popup({ offset: 16 }).setText(point.label))
        .addTo(map);
    }
    if (points.length > 1)
      map.fitBounds(bounds, { padding: 60, maxZoom: 11, duration: 0 });
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      map.remove();
    };
    // The serialized points capture every map input, including coordinate zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, pointsKey]);

  return (
    <section
      aria-label={`Shipment map for SHP-${id}`}
      className="overflow-hidden rounded-xl border bg-white"
    >
      <div className="p-5">
        <h2 className="text-xl font-bold">Shipment map · SHP-{id}</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Saved shipment locations. Live vehicle tracking is not available for
          this shipment.
        </p>
      </div>
      {points.length > 0 ? (
        <div ref={container} className="h-80 w-full" />
      ) : (
        <p role="status" className="bg-neutral-50 p-5">
          No coordinates are recorded for this shipment. A map will appear when
          an origin or destination with coordinates is saved.
        </p>
      )}
      <div className="space-y-2 p-5 text-sm">
        {points.length > 0 && points.length < 2 && (
          <p>
            Only one shipment location has saved coordinates; the other endpoint
            is unavailable.
          </p>
        )}
        {points.map((point) => (
          <p key={point.label}>
            {point.label} · {point.lat}, {point.lng}
          </p>
        ))}
        {error && points.length > 0 && <p role="alert">{error}</p>}
      </div>
    </section>
  );
}
