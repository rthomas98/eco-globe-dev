export type RequestLocation = {
  lat: number;
  lng: number;
  label: string;
  source: "ip";
};

/** Vercel geoIP is approximate and can reflect a VPN or ISP rather than the viewer.
 * Ignore forwarded location headers outside Vercel; never read or retain raw IPs.
 */
export function requestLocation(
  headers: Pick<Headers, "get">,
  vercel = process.env.VERCEL,
): RequestLocation | null {
  if (vercel !== "1") return null;
  const latitude = headers.get("x-vercel-ip-latitude")?.trim();
  const longitude = headers.get("x-vercel-ip-longitude")?.trim();
  if (!latitude || !longitude) return null;
  const lat = Number(latitude),
    lng = Number(longitude);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  )
    return null;
  const parts = ["city", "country-region", "country"]
    .map((key) => {
      const value = headers.get(`x-vercel-ip-${key}`)?.trim();
      if (!value) return null;
      try {
        return (
          Array.from(decodeURIComponent(value))
            .filter(
              (character) =>
                character.charCodeAt(0) >= 32 &&
                character.charCodeAt(0) !== 127,
            )
            .join("")
            .slice(0, 120)
            .trim() || null
        );
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return {
    lat: Number(lat.toFixed(2)),
    lng: Number(lng.toFixed(2)),
    label: parts.join(", ") || "Approximate location",
    source: "ip",
  };
}
