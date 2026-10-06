import { ApiError } from "./http.js";

export function validateLocationFields(body: object, patch = false) {
  const fields = Object.fromEntries(Object.entries(body));
  const text = (key: string, max: number, required = false) => {
    const value: unknown = fields[key];
    if (value === undefined) {
      if (!patch && required) throw new ApiError(400, `${key} is required.`);
      return undefined;
    }
    if (value === null && !required) return null;
    if (typeof value !== "string" || value.length > max || (required && !value.trim()))
      throw new ApiError(400, `Invalid ${key}.`);
    return value.trim() || null;
  };
  const countryCode = text("countryCode", 2, true)?.toUpperCase();
  if (countryCode !== undefined && !/^[A-Z]{2}$/.test(countryCode))
    throw new ApiError(400, "countryCode must contain two letters.");
  const coordinate = (key: string, bound: number) => {
    const value: unknown = fields[key];
    if (value === undefined || value === null) return value;
    if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > bound)
      throw new ApiError(400, `Invalid ${key}.`);
    return value;
  };
  const latitude = coordinate("latitude", 90), longitude = coordinate("longitude", 180);
  if ((latitude === undefined) !== (longitude === undefined) || (latitude === null) !== (longitude === null))
    throw new ApiError(400, "Save both coordinates together, or clear both with null.");
  const addressChanged = ["addressLine1", "addressLine2", "city", "stateProvince", "postalCode", "countryCode"].some(key => fields[key] !== undefined);
  return {
    name: text("name", 160, true), addressLine1: text("addressLine1", 240, true),
    addressLine2: text("addressLine2", 240), city: text("city", 120, true),
    stateProvince: text("stateProvince", 120), postalCode: text("postalCode", 40), countryCode,
    latitude: latitude === undefined && patch && addressChanged ? null : latitude,
    longitude: longitude === undefined && patch && addressChanged ? null : longitude,
  };
}
