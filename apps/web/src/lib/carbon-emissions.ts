export type FeedstockState = "Solid" | "Liquid" | "Gas";

export type TransportMode =
  | "light-box-truck"
  | "heavy-20-wheeler"
  | "tanker-trailer"
  | "rail"
  | "barge-10k"
  | "barge-55k"
  | "gas-pipeline"
  | "liquid-pipeline";

export const TRANSPORT_LABEL: Record<TransportMode, string> = {
  "light-box-truck": "Light-Duty Box Truck (Class 2–3)",
  "heavy-20-wheeler": "Heavy-Duty 20-Wheeler",
  "tanker-trailer": "Tanker Trailer",
  rail: "Rail (Louisiana)",
  "barge-10k": "10,000 bbl Barge",
  "barge-55k": "55,000 bbl Barge",
  "gas-pipeline": "Gas Pipeline",
  "liquid-pipeline": "Liquid Pipeline",
};

export const TRANSPORT_BY_STATE: Record<FeedstockState, TransportMode[]> = {
  Solid: ["light-box-truck", "heavy-20-wheeler", "rail"],
  Liquid: [
    "heavy-20-wheeler",
    "tanker-trailer",
    "barge-10k",
    "barge-55k",
    "liquid-pipeline",
  ],
  Gas: ["gas-pipeline"],
};

/** All formulas yield tons of CO₂ equivalent. Constants come from product-supplied PPT. */
export function computeEmissionTons(
  mode: TransportMode,
  tons: number,
  miles: number,
): number {
  const t = Math.max(0, tons);
  const m = Math.max(0, miles);
  switch (mode) {
    case "light-box-truck":
      return (0.025 * (t + 1.985) * (m * 2) * 8.887) / 1000;
    case "heavy-20-wheeler":
      return (0.012 * (t + 8) * (m * 2) * 10.21) / 1000;
    case "tanker-trailer":
      return (0.02 * (t + 8) * (m * 2) * 10.21) / 1000;
    case "rail":
      return (0.0225 * t * m * 2) / 1000;
    case "barge-10k":
      return ((17.86 + 28) * t * m) / 1_000_000;
    case "barge-55k":
      return (49.9 * t * m * 2) / 1_000_000;
    case "gas-pipeline":
      return (38 * t * m) / 1_000_000;
    case "liquid-pipeline":
      return (10 * t * m) / 1_000_000;
  }
}

/** Distance in miles between two lat/lng points (haversine). */
export function distanceMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R_KM = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const km = 2 * R_KM * Math.asin(Math.sqrt(h));
  return km * 0.621371;
}

export type WeightUnit =
  | "metric-tons"
  | "pallets"
  | "barrels"
  | "gallons"
  | "pounds"
  | "kilograms"
  | "short-tons"
  | "bcf-gas";

export const WEIGHT_UNIT_LABEL: Record<WeightUnit, string> = {
  "metric-tons": "Metric tons",
  pallets: "Pallets",
  barrels: "Barrels (oil)",
  gallons: "Gallons (oil)",
  pounds: "Pounds",
  kilograms: "Kilograms",
  "short-tons": "Short (US) tons",
  "bcf-gas": "BCF (gas)",
};

/** Convert any supported unit input to metric tons. */
export function toMetricTons(value: number, unit: WeightUnit): number {
  switch (unit) {
    case "metric-tons":
      return value;
    case "pallets":
      return value / 23;
    case "barrels":
      return value / 7.61;
    case "gallons":
      return value / 308;
    case "pounds":
      return value / 2200;
    case "kilograms":
      return value / 1000;
    case "short-tons":
      return value * 0.907185;
    case "bcf-gas":
      return value * 19200;
  }
}

export const RECURRENCE_OPTIONS = [
  { value: "one-time", label: "One-time", multiplier: 1 },
  { value: "weekly", label: "Once a week", multiplier: 52 },
  { value: "monthly", label: "Once a month", multiplier: 12 },
  { value: "every-2-months", label: "Once every 2 months", multiplier: 6 },
  { value: "quarterly", label: "Once every 3 months", multiplier: 4 },
  { value: "every-4-months", label: "Once every 4 months", multiplier: 3 },
  { value: "every-6-months", label: "Once every 6 months", multiplier: 2 },
] as const;

export type Recurrence = (typeof RECURRENCE_OPTIONS)[number]["value"];

export function recurrenceMultiplier(r: Recurrence): number {
  return RECURRENCE_OPTIONS.find((o) => o.value === r)?.multiplier ?? 1;
}
