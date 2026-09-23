import cities from "cities.json";
import regions from "cities.json/admin1";

export interface CityLocationQuery {
  city: string;
  region: string;
  country: string;
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

/** City reference coordinates only. Never a verified facility or shipping address. */
export function resolveCityLocation(query: CityLocationQuery) {
  const country = query.country.trim().toUpperCase();
  const city = normalize(query.city);
  const region = normalize(query.region);
  if (!city) return null;
  const hasCountry = /^[A-Z]{2}$/.test(country);
  if (!hasCountry && !region) return null;
  const regionCodes = new Set(
    regions
      .filter(
        (item) =>
          (!hasCountry || item.code.startsWith(`${country}.`)) &&
          (normalize(item.name) === region ||
            normalize(item.code.slice(3)) === region),
      )
      .map((item) => item.code),
  );
  const matches = cities.filter(
    (item) =>
      (!hasCountry || item.country === country) &&
      normalize(item.name) === city &&
      (!region || regionCodes.has(`${item.country}.${item.admin1}`)),
  );
  // Ambiguous names must not silently choose the first place.
  if (matches.length !== 1) return null;
  const match = matches[0]!;
  const lat = Number(match.lat);
  const lng = Number(match.lng);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    return null;
  return {
    lat,
    lng,
    label: [match.name, query.region.trim(), match.country]
      .filter(Boolean)
      .join(", "),
  };
}
