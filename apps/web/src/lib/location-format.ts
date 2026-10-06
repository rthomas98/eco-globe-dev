/** ISO 3166-1 alpha-2 country code, or undefined for malformed values such as a truncated ZIP ("70"). */
export function normalizeCountryCode(code: string | null | undefined) {
  const trimmed = code?.trim().toUpperCase();
  return trimmed && /^[A-Z]{2}$/.test(trimmed) ? trimmed : undefined;
}

export interface FacilityDraft {
  name: string;
  addressLine1: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  countryCode: string;
  latitude: string;
  longitude: string;
}

export interface ValidFacility {
  name: string;
  addressLine1: string;
  city: string;
  stateProvince?: string;
  postalCode?: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Validate a facility form before it is saved. Coordinates are optional but
 * must be entered as a pair within range; nothing is geocoded or guessed.
 */
export function validateFacilityDraft(
  draft: FacilityDraft,
): { ok: true; value: ValidFacility } | { ok: false; error: string } {
  const name = draft.name.trim();
  const addressLine1 = draft.addressLine1.trim();
  const city = draft.city.trim();
  if (!name || !addressLine1 || !city) {
    return { ok: false, error: "Enter a facility name, street address and city." };
  }
  const countryCode = normalizeCountryCode(draft.countryCode);
  if (!countryCode) {
    return { ok: false, error: "Country must be a two-letter code such as US. Put the ZIP or postal code in Postal code." };
  }
  const postalCode = draft.postalCode.trim();
  if (countryCode === "US" && postalCode && !/^\d{5}(-\d{4})?$/.test(postalCode)) {
    return { ok: false, error: "US ZIP codes must be 5 digits (or ZIP+4)." };
  }
  const latText = draft.latitude.trim();
  const lngText = draft.longitude.trim();
  if (!!latText !== !!lngText) {
    return { ok: false, error: "Enter both latitude and longitude, or leave both blank." };
  }
  let latitude: number | undefined;
  let longitude: number | undefined;
  if (latText && lngText) {
    latitude = Number(latText);
    longitude = Number(lngText);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return { ok: false, error: "Latitude must be a number between -90 and 90." };
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return { ok: false, error: "Longitude must be a number between -180 and 180." };
    }
  }
  return {
    ok: true,
    value: {
      name,
      addressLine1,
      city,
      stateProvince: draft.stateProvince.trim() || undefined,
      postalCode: postalCode || undefined,
      countryCode,
      latitude,
      longitude,
    },
  };
}
