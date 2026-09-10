/**
 * Pure helpers for the pilot request workflow. No browser or network
 * dependencies so the same rules are unit-tested and shared by the buyer,
 * seller and internal desk screens.
 *
 * Times from the API are UTC ISO strings; every label is rendered in
 * America/Chicago with daylight saving handled by Intl.
 */

export const PILOT_TIME_ZONE = "America/Chicago";

export type PilotStatus =
  | "new"
  | "call_booked"
  | "call_held"
  | "working_lane"
  | "offer_sent"
  | "won"
  | "lost";

export const PILOT_STATUSES: PilotStatus[] = [
  "new",
  "call_booked",
  "call_held",
  "working_lane",
  "offer_sent",
  "won",
  "lost",
];

export type PilotLoadChoice = "one" | "two" | "other";

export type PilotStepKey =
  | "intro_call"
  | "seller_availability"
  | "equipment"
  | "logistics"
  | "offer";

export const PILOT_STEP_KEYS: PilotStepKey[] = [
  "intro_call",
  "seller_availability",
  "equipment",
  "logistics",
  "offer",
];

export const PILOT_STEP_LABELS: Record<PilotStepKey, string> = {
  intro_call: "Intro call held",
  seller_availability: "Seller confirmed availability and dates",
  equipment: "Equipment agreed",
  logistics: "Talking to logistics partners about this lane",
  offer: "Offer sent to buyer",
};

export const PILOT_STATUS_LABELS: Record<PilotStatus, string> = {
  new: "New",
  call_booked: "Call due",
  call_held: "Call held",
  working_lane: "Working the lane",
  offer_sent: "Offer sent",
  won: "Moving",
  lost: "Closed",
};

export function pilotStatusLabel(code: string | null | undefined) {
  return PILOT_STATUS_LABELS[code as PilotStatus] ?? (code ? String(code) : "Unknown");
}

/** Desk buckets shown as counts. `working_lane` covers call_held as well. */
export type PilotBucket = "new" | "call_due" | "working_lane" | "offer_sent" | "moving";

export const PILOT_BUCKETS: { key: PilotBucket; label: string }[] = [
  { key: "new", label: "New" },
  { key: "call_due", label: "Call due" },
  { key: "working_lane", label: "Working the lane" },
  { key: "offer_sent", label: "Offer sent" },
  { key: "moving", label: "Moving" },
];

export function bucketForStatus(status: string): PilotBucket | null {
  switch (status) {
    case "new":
      return "new";
    case "call_booked":
      return "call_due";
    case "call_held":
    case "working_lane":
      return "working_lane";
    case "offer_sent":
      return "offer_sent";
    case "won":
      return "moving";
    default:
      return null;
  }
}

/**
 * Stage moves the desk may make. Mirrors the backend transition table:
 * the buyer alone moves a request to `won`; scheduling alone sets `call_booked`.
 */
export function adminNextStatuses(status: string): PilotStatus[] {
  switch (status) {
    case "new":
    case "call_booked":
      return ["call_held", "lost"];
    case "call_held":
      return ["working_lane", "lost"];
    case "working_lane":
      return ["offer_sent", "lost"];
    case "offer_sent":
      return ["lost"];
    default:
      return [];
  }
}

export const ADMIN_STATUS_ACTION_LABELS: Record<PilotStatus, string> = {
  new: "New",
  call_booked: "Call booked",
  call_held: "Mark call held",
  working_lane: "Start working the lane",
  offer_sent: "Mark offer sent",
  won: "Buyer proceeds",
  lost: "Close as lost",
};

/** True while the buyer may still pick or change a call time. */
export function canBuyerSchedule(status: string) {
  return status === "new" || status === "call_booked";
}

export function canBuyerProceed(status: string) {
  return status === "offer_sent";
}

/* ── Form validation ── */

export interface PilotFormValues {
  loadChoice: PilotLoadChoice | "";
  loadCount: string;
  approximateTonnage: string;
  deliveryLocationId: string;
  neededBy: string;
  constraints: string[];
  objective: string;
}

export const EMPTY_PILOT_FORM: PilotFormValues = {
  loadChoice: "",
  loadCount: "",
  approximateTonnage: "",
  deliveryLocationId: "",
  neededBy: "",
  constraints: [],
  objective: "",
};

export interface PilotFormError {
  field: keyof PilotFormValues;
  message: string;
}

export const MAX_OBJECTIVE_LENGTH = 4000;
export const MAX_NEEDED_BY_LENGTH = 240;
export const MAX_LOAD_COUNT = 100;
export const MAX_TONNAGE = 10000;

export function loadCountForChoice(choice: PilotLoadChoice | "", other: string): number | null {
  if (choice === "one") return 1;
  if (choice === "two") return 2;
  if (choice === "other") {
    const n = Number(other);
    return Number.isInteger(n) && n >= 1 && n <= MAX_LOAD_COUNT ? n : null;
  }
  return null;
}

export function validatePilotForm(values: PilotFormValues): PilotFormError[] {
  const errors: PilotFormError[] = [];
  if (!values.loadChoice) errors.push({ field: "loadChoice", message: "Choose roughly how much you want to trial." });
  else if (values.loadChoice === "other" && loadCountForChoice("other", values.loadCount) === null)
    errors.push({ field: "loadCount", message: `Enter a whole number of loads between 1 and ${MAX_LOAD_COUNT}.` });
  const tonnage = Number(values.approximateTonnage);
  if (!values.approximateTonnage.trim() || !Number.isFinite(tonnage) || tonnage <= 0 || tonnage > MAX_TONNAGE)
    errors.push({ field: "approximateTonnage", message: `Enter an approximate tonnage between 0 and ${MAX_TONNAGE.toLocaleString()}.` });
  if (!values.deliveryLocationId) errors.push({ field: "deliveryLocationId", message: "Choose the site this pilot will deliver to." });
  if (values.neededBy.length > MAX_NEEDED_BY_LENGTH)
    errors.push({ field: "neededBy", message: `Keep the timing under ${MAX_NEEDED_BY_LENGTH} characters.` });
  if (values.objective.length > MAX_OBJECTIVE_LENGTH)
    errors.push({ field: "objective", message: `Keep the objective under ${MAX_OBJECTIVE_LENGTH.toLocaleString()} characters.` });
  return errors;
}

export interface PilotRequestWrite {
  listingId: number;
  clientRequestId: string;
  loadChoice: PilotLoadChoice;
  loadCount: number;
  approximateTonnage: number;
  deliveryLocationId: number;
  neededBy: string;
  constraints: string[];
  objective: string;
}

/** Build the API body once the form validates. Returns null when it does not. */
export function toPilotRequestWrite(
  values: PilotFormValues,
  listingId: number,
  clientRequestId: string,
): PilotRequestWrite | null {
  if (validatePilotForm(values).length > 0 || !values.loadChoice) return null;
  const loadCount = loadCountForChoice(values.loadChoice, values.loadCount);
  if (loadCount === null) return null;
  return {
    listingId,
    clientRequestId,
    loadChoice: values.loadChoice,
    loadCount,
    approximateTonnage: Number(values.approximateTonnage),
    deliveryLocationId: Number(values.deliveryLocationId),
    neededBy: values.neededBy.trim(),
    constraints: values.constraints,
    objective: values.objective.trim(),
  };
}

/** Contract key format: 16..80 characters of [A-Za-z0-9-]; UUIDs qualify. */
export function isValidClientRequestId(key: string) {
  return /^[a-zA-Z0-9-]{16,80}$/.test(key);
}

export function makeClientRequestId(random: () => number = Math.random): string {
  const globalCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") return globalCrypto.randomUUID();
  let out = "";
  for (let i = 0; i < 32; i += 1) out += Math.floor(random() * 16).toString(16);
  return `${out.slice(0, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}-${out.slice(16, 20)}-${out.slice(20)}`;
}

/* ── Central Time formatting ── */

function parts(date: Date, options: Intl.DateTimeFormatOptions) {
  const out: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", { timeZone: PILOT_TIME_ZONE, ...options }).formatToParts(date)) {
    if (part.type !== "literal") out[part.type] = part.value;
  }
  return out;
}

export function parseIso(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** Calendar day key in Central Time, e.g. "2026-08-25". */
export function centralDayKey(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const p = parts(date, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}

/** "10:30 AM" in Central Time. */
export function formatCentralTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", { timeZone: PILOT_TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(date);
}

/** "Tuesday 25 August, 10:30 AM" in Central Time. */
export function formatCentralDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const p = parts(date, { weekday: "long", day: "numeric", month: "long" });
  return `${p.weekday} ${p.day} ${p.month}, ${formatCentralTime(date)}`;
}

/** "25 Aug" in Central Time. */
export function formatCentralShortDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const p = parts(date, { day: "numeric", month: "short" });
  return `${p.day} ${p.month}`;
}

/** Zone abbreviation for the instant, "CDT" or "CST". */
export function centralZoneAbbreviation(value: string | Date = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return parts(date, { timeZoneName: "short", hour: "numeric" }).timeZoneName ?? "CT";
}

export interface SlotLike {
  id: number;
  startsAt: string;
  endsAt: string;
  ownerUserId: number;
  ownerName: string;
}

export interface SlotDay {
  key: string;
  weekday: string;
  dayNumber: string;
  slots: SlotLike[];
}

/** Group future slots by Central calendar day, ordered by start time. */
export function groupSlotsByCentralDay(slots: SlotLike[], now: Date = new Date()): SlotDay[] {
  const days = new Map<string, SlotDay>();
  const ordered = [...slots]
    .filter((slot) => {
      const start = parseIso(slot.startsAt);
      return start !== null && start.getTime() > now.getTime();
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  for (const slot of ordered) {
    const key = centralDayKey(slot.startsAt);
    let day = days.get(key);
    if (!day) {
      const p = parts(new Date(slot.startsAt), { weekday: "short", day: "numeric" });
      day = { key, weekday: p.weekday.toUpperCase(), dayNumber: p.day, slots: [] };
      days.set(key, day);
    }
    day.slots.push(slot);
  }
  return [...days.values()];
}

/* ── Central wall-clock → UTC (admin slot creation) ── */

function centralOffsetMs(utcMs: number) {
  const p = parts(new Date(utcMs), { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second));
  return asUtc - utcMs;
}

/**
 * Convert a Central wall-clock date ("2026-08-25") and time ("10:30") into a
 * UTC ISO string with zero seconds. Returns null for malformed input.
 */
export function centralWallClockToUtcIso(dateKey: string, time: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;
  const naive = Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]), Number(timeMatch[1]), Number(timeMatch[2]));
  if (!Number.isFinite(naive)) return null;
  let utc = naive - centralOffsetMs(naive);
  utc = naive - centralOffsetMs(utc);
  const result = new Date(utc);
  if (centralDayKey(result) !== dateKey) return null;
  return result.toISOString();
}

/** Fifteen-minute wall-clock choices from 07:00 to 18:45 Central. */
export function quarterHourOptions(): string[] {
  const out: string[] = [];
  for (let h = 7; h < 19; h += 1) for (const m of [0, 15, 30, 45]) out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  return out;
}

/* ── Display helpers ── */

export function formatLoads(loadCount: number, approximateTonnage: number | string | null | undefined) {
  const loads = `${loadCount} ${loadCount === 1 ? "load" : "loads"}`;
  const tonnage = Number(approximateTonnage);
  return Number.isFinite(tonnage) && tonnage > 0 ? `${loads}, ~${formatTonnage(tonnage)} t` : loads;
}

export function formatTonnage(value: number | string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n % 1 === 0 ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

/** Trim stray separators from place labels built from partial addresses ("Austin, " → "Austin"). */
export function tidyLabel(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").replace(/^[\s,·-]+|[\s,·-]+$/g, "").trim();
}

/** Short lane label "Port Allen, LA → Geismar, LA". */
export function laneLabel(origin: string, destination: string) {
  return [tidyLabel(origin), tidyLabel(destination)].filter(Boolean).join(" → ");
}

/** Buyer-facing progress description for a request status. */
export function describeBuyerStage(status: string, contactPreference: string): string {
  switch (status) {
    case "new":
      return contactPreference === "email"
        ? "We will follow up by email. No call is booked."
        : "Your request is with us. Pick a time to talk it through.";
    case "call_booked":
      return "Your call is booked. We will have spoken to the seller before then.";
    case "call_held":
      return "We have spoken. We are confirming availability and dates with the seller.";
    case "working_lane":
      return "We are working out the movement with our logistics partners.";
    case "offer_sent":
      return "Your offer is with you. Decide when you have seen everything in writing.";
    case "won":
      return "You agreed to proceed. Your company is now shared with the seller and the pilot is moving.";
    case "lost":
      return "This pilot is closed.";
    default:
      return "";
  }
}
