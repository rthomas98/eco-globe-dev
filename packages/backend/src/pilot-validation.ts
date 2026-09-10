import { ApiError } from "./http.js";
import {
  object,
  exactKeys,
  string,
  choice,
  positiveId,
  strings,
} from "./lab-validation.js";
export const pilotConstraints = [
  "Booked delivery window",
  "Weighbridge ticket",
  "Tarped load",
  "Tipping only",
  "No weekend delivery",
] as const;
export const pilotStates = [
  "new",
  "call_booked",
  "call_held",
  "working_lane",
  "offer_sent",
  "won",
  "lost",
] as const;
export const pilotSteps = [
  "intro_call",
  "seller_availability",
  "equipment",
  "logistics",
  "offer",
] as const;
export function validatePilot(value: unknown) {
  const b = object(value);
  exactKeys(b, [
    "listingId",
    "clientRequestId",
    "loadChoice",
    "loadCount",
    "approximateTonnage",
    "deliveryLocationId",
    "neededBy",
    "constraints",
    "objective",
  ]);
  const loadChoice = choice(b.loadChoice, ["one", "two", "other"] as const),
    loadCount = positiveId(b.loadCount);
  if (
    loadCount > 100 ||
    (loadChoice === "one" && loadCount !== 1) ||
    (loadChoice === "two" && loadCount !== 2)
  )
    throw new ApiError(400, "Load count does not match the selection.");
  if (
    typeof b.approximateTonnage !== "number" ||
    !Number.isFinite(b.approximateTonnage) ||
    b.approximateTonnage <= 0 ||
    b.approximateTonnage > 10000
  )
    throw new ApiError(400, "Enter approximate tonnage between 0 and 10,000.");
  const clientRequestId = string(b.clientRequestId, 80);
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(clientRequestId))
    throw new ApiError(400, "Invalid request key.");
  const constraints = strings(b.constraints, 5).map((x) =>
    choice(x, pilotConstraints),
  );
  return {
    listingId: positiveId(b.listingId),
    deliveryLocationId: positiveId(b.deliveryLocationId),
    clientRequestId,
    loadChoice,
    loadCount,
    approximateTonnage: b.approximateTonnage,
    neededBy: string(b.neededBy, 240, true),
    objective: string(b.objective, 4000, true),
    constraints,
  };
}
export function assertPilotTransition(from: string, to: string) {
  const allowed: Record<string, string[]> = {
    new: ["call_held", "lost"],
    call_booked: ["call_held", "lost"],
    call_held: ["working_lane", "lost"],
    working_lane: ["offer_sent", "lost"],
    offer_sent: ["lost"],
    won: [],
    lost: [],
  };
  if (from !== to && !allowed[from]?.includes(to))
    throw new ApiError(409, "This pilot cannot move to that stage yet.");
}
export function slotStart(value: unknown) {
  const raw = string(value, 40);
  if (!/Z$/.test(raw)) throw new ApiError(400, "Use a UTC time.");
  const d = new Date(raw);
  if (
    !Number.isFinite(d.getTime()) ||
    d.getTime() <= Date.now() ||
    d.getTime() > Date.now() + 90 * 86400000 ||
    d.getUTCSeconds() ||
    d.getUTCMilliseconds()
  )
    throw new ApiError(
      400,
      "Choose a future slot within 90 days, on a whole minute.",
    );
  return d;
}
