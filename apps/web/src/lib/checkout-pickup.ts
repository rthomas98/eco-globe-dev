/**
 * Pure conversion of the checkout pickup form into the request fields the
 * backend persists. Nothing is defaulted silently: an invalid or partial date
 * is reported, never dropped.
 */

export interface PickupFormValues {
  /** Native date input value, "YYYY-MM-DD" (local calendar date). */
  date: string;
  /** Preferred start time, "HH:MM" local, or "" when not chosen. */
  timeRange: string;
  contactName: string;
  contactPhone: string;
  vehicleDetails: string;
}

export interface PickupRequestFields {
  pickupRequestedAt?: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  pickupVehicleDetails?: string;
}

export const PICKUP_LIMITS = { contactName: 160, contactPhone: 80, vehicleDetails: 400 } as const;

export type PickupConversion =
  | { ok: true; fields: PickupRequestFields }
  | { ok: false; error: string };

/** Start time requested when a date is chosen without a time. */
export const DEFAULT_PICKUP_TIME = "09:00";

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x1f\x7f]/;

/**
 * Builds the pickup request. The date is a local calendar date combined with
 * the chosen start time (09:00 when only a date is chosen) and sent as an ISO
 * instant; `now` bounds it to today or later.
 */
export function pickupRequestFields(form: PickupFormValues, now: Date = new Date()): PickupConversion {
  const fields: PickupRequestFields = {};
  const date = form.date.trim();
  const time = form.timeRange.trim();
  if (date) {
    const match = DATE.exec(date);
    if (!match) return { ok: false, error: "Enter a valid pickup date." };
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const clock = TIME.exec(time || DEFAULT_PICKUP_TIME);
    if (!clock) return { ok: false, error: "Choose a valid preferred start time." };
    const at = new Date(year, month - 1, day, Number(clock[1]), Number(clock[2]), 0, 0);
    // Reject roll-over dates such as 2026-02-31.
    if (Number.isNaN(at.getTime()) || at.getFullYear() !== year || at.getMonth() !== month - 1 || at.getDate() !== day)
      return { ok: false, error: "Enter a valid pickup date." };
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (new Date(year, month - 1, day) < today) return { ok: false, error: "Choose a pickup date from today onwards." };
    fields.pickupRequestedAt = at.toISOString();
  } else if (time) {
    return { ok: false, error: "Choose a pickup date for the preferred start time, or clear the time." };
  }
  const text = (value: string, max: number, label: string): string | undefined | Error => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (trimmed.length > max || CONTROL.test(trimmed)) return new Error(`${label} must be at most ${max} characters on one line.`);
    return trimmed;
  };
  const name = text(form.contactName, PICKUP_LIMITS.contactName, "Pickup contact name");
  const phone = text(form.contactPhone, PICKUP_LIMITS.contactPhone, "Pickup contact phone");
  const vehicle = text(form.vehicleDetails, PICKUP_LIMITS.vehicleDetails, "Vehicle details");
  for (const value of [name, phone, vehicle]) if (value instanceof Error) return { ok: false, error: value.message };
  if (name) fields.pickupContactName = name as string;
  if (phone) fields.pickupContactPhone = phone as string;
  if (vehicle) fields.pickupVehicleDetails = vehicle as string;
  return { ok: true, fields };
}

/** Restores the form's date and time from a saved ISO instant (local time). */
export function pickupFormDateTime(iso: string | undefined | null): { date: string; timeRange: string } {
  const at = iso ? new Date(iso) : null;
  if (!at || Number.isNaN(at.getTime())) return { date: "", timeRange: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`,
    timeRange: `${pad(at.getHours())}:${pad(at.getMinutes())}`,
  };
}

/**
 * The start time exactly as it will be saved: the chosen time, the 09:00
 * default (labelled as such) when only a date is chosen, or nothing when no
 * date is requested.
 */
export function pickupStartTimeLabel(form: Pick<PickupFormValues, "date" | "timeRange">): string {
  if (!form.date.trim()) return "Not specified";
  const time = form.timeRange.trim() || DEFAULT_PICKUP_TIME;
  const match = TIME.exec(time);
  if (!match) return time;
  const hours = Number(match[1]);
  const label = `${hours % 12 || 12}:${match[2]} ${hours < 12 ? "AM" : "PM"}`;
  return form.timeRange.trim() ? label : `${label} (default — no time chosen)`;
}
