import { ApiError } from "./http.js";

/** Parcel dimensions and maximum packed weights are controlled by EcoGlobe. */
export const sampleBoxes = [
  {
    code: "small",
    name: "Small",
    maxWeightKg: 2,
    lengthCm: 30,
    widthCm: 20,
    heightCm: 15,
  },
  {
    code: "medium",
    name: "Medium",
    maxWeightKg: 10,
    lengthCm: 40,
    widthCm: 30,
    heightCm: 25,
  },
  {
    code: "large",
    name: "Large",
    maxWeightKg: 25,
    lengthCm: 50,
    widthCm: 40,
    heightCm: 35,
  },
] as const;
export type SampleBox = (typeof sampleBoxes)[number];
export function sampleBox(value: unknown): SampleBox {
  const box = sampleBoxes.find((box) => box.code === value);
  if (!box)
    throw new ApiError(
      400,
      "Choose Small, Medium or Large. Custom parcel sizes are not supported.",
    );
  return box;
}
export type SampleEligibility =
  | { eligible: true }
  | {
      eligible: false;
      code: "disabled" | "restricted" | "international" | "unverified";
      reason: string;
      canRefer: boolean;
    };
export function sampleEligibility(input: {
  enabled: boolean;
  classification:
    | "standard_solid"
    | "restricted"
    | "liquid"
    | "gas"
    | "unreviewed";
  specialHandling: boolean;
  originCountry: string;
  destinationCountry: string;
  receivingSiteVerified: boolean;
}): SampleEligibility {
  if (!input.enabled)
    return {
      eligible: false,
      code: "disabled",
      reason: "The seller has switched off samples for this listing.",
      canRefer: false,
    };
  if (input.classification !== "standard_solid" || input.specialHandling)
    return {
      eligible: false,
      code: "restricted",
      reason:
        "This material needs EcoGlobe review before shipping. No payment or parcel label will be created.",
      canRefer: true,
    };
  if (input.originCountry !== "US" || input.destinationCountry !== "US")
    return {
      eligible: false,
      code: "international",
      reason:
        "Online sample shipping is available for domestic US routes only. EcoGlobe can review your request.",
      canRefer: true,
    };
  if (!input.receivingSiteVerified)
    return {
      eligible: false,
      code: "unverified",
      reason:
        "Choose a verified company receiving site before requesting shipping rates.",
      canRefer: true,
    };
  return { eligible: true };
}

export const shippingStates = [
  "payment_pending",
  "paid",
  "awaiting_dispatch",
  "in_transit",
  "delivered",
  "declined",
  "expired",
  "delivery_failed",
] as const;
export type ShippingState = (typeof shippingStates)[number];
export type ShippingActor =
  | "payment_provider"
  | "shipping_worker"
  | "seller"
  | "tracking_provider"
  | "deadline_worker";
const transitions: Record<
  ShippingState,
  Partial<Record<ShippingState, ShippingActor>>
> = {
  payment_pending: { paid: "payment_provider" },
  paid: {
    awaiting_dispatch: "shipping_worker",
    delivery_failed: "shipping_worker",
  },
  awaiting_dispatch: {
    in_transit: "seller",
    declined: "seller",
    expired: "deadline_worker",
  },
  in_transit: {
    delivered: "tracking_provider",
    delivery_failed: "tracking_provider",
  },
  delivered: {},
  declined: {},
  expired: {},
  delivery_failed: {},
};
export function assertShippingTransition(
  from: ShippingState,
  to: ShippingState,
  actor: ShippingActor,
) {
  const required = transitions[from][to];
  // A carrier acceptance scan is also authoritative evidence of dispatch.
  if (
    from === "awaiting_dispatch" &&
    to === "in_transit" &&
    actor === "tracking_provider"
  )
    return;
  if (!required)
    throw new ApiError(409, "This sample state transition is not available.");
  if (actor !== required)
    throw new ApiError(
      403,
      "This sample transition requires the responsible party or confirmed provider event.",
    );
}
export function requiresShippingRefund(state: ShippingState) {
  return (
    state === "declined" || state === "expired" || state === "delivery_failed"
  );
}

export const dispatchBusinessDays = 10;
const centralDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
/** Business days are Monday-Friday; deadline is end of the tenth Central calendar business day. */
export function dispatchDeadline(paidAt: Date): Date {
  if (!Number.isFinite(paidAt.getTime()))
    throw new ApiError(400, "Invalid payment date.");
  const parts = centralDate.formatToParts(paidAt);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  let remaining = dispatchBusinessDays;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) remaining--;
  }
  // Compute Central midnight after that day, allowing daylight-saving offset changes.
  const midnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
  );
  const offsetName = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    timeZoneName: "shortOffset",
  })
    .formatToParts(new Date(midnight + 6 * 3600000))
    .find((p) => p.type === "timeZoneName")?.value;
  const offset = offsetName === "GMT-5" ? 5 : 6;
  return new Date(midnight + offset * 3600000 - 1);
}

/** Calendar-day remainder in Central Time, independent of UTC offset and wall-clock hour. */
export function remainingBusinessDays(now: Date, deadline: Date): number {
  const dayNumber = (value: Date) => {
    const parts = centralDate.formatToParts(value);
    return Date.UTC(
      Number(parts.find((p) => p.type === "year")?.value),
      Number(parts.find((p) => p.type === "month")?.value) - 1,
      Number(parts.find((p) => p.type === "day")?.value),
    );
  };
  let days = 0;
  for (
    let day = dayNumber(now) + 86400000;
    day <= dayNumber(deadline);
    day += 86400000
  ) {
    const weekday = new Date(day).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days++;
  }
  return days;
}
