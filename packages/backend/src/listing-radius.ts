import { ApiError } from "./http.js";

export function parseListingRadius(params: URLSearchParams) {
  const keys = ["latitude", "longitude", "radiusMiles"] as const;
  if (keys.every(key => !params.has(key))) return null;
  const values = keys.map(key => {
    const raw = params.get(key);
    if (raw === null || raw.trim() === "" || !Number.isFinite(Number(raw)))
      throw new ApiError(400, "Radius requires a valid latitude, longitude and radiusMiles.");
    return Number(raw);
  });
  const latitude = values[0]!, longitude = values[1]!, radiusMiles = values[2]!;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || radiusMiles <= 0 || radiusMiles > 12500)
    throw new ApiError(400, "Invalid search origin or radius (maximum 12500 miles).");
  return { latitude, longitude, radiusMiles };
}

export function withinListingRadius(latitude: unknown, longitude: unknown, origin: NonNullable<ReturnType<typeof parseListingRadius>>) {
  if (typeof latitude !== "number" || typeof longitude !== "number" || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
  const radians = (value: number) => value * Math.PI / 180;
  const a = Math.sin(radians(latitude - origin.latitude) / 2) ** 2 +
    Math.cos(radians(origin.latitude)) * Math.cos(radians(latitude)) *
    Math.sin(radians(longitude - origin.longitude) / 2) ** 2;
  const miles = 3958.7613 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
  return miles <= origin.radiusMiles;
}
