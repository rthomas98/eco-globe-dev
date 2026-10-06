import { test } from "node:test";
import assert from "node:assert/strict";
import { pickupFormDateTime, pickupRequestFields, pickupStartTimeLabel, type PickupFormValues } from "./checkout-pickup.ts";

const now = new Date(2026, 9, 6, 15, 0);
const form = (over: Partial<PickupFormValues>): PickupFormValues => ({
  date: "",
  timeRange: "",
  contactName: "",
  contactPhone: "",
  vehicleDetails: "",
  ...over,
});

test("a chosen date and morning slot become the local start instant", () => {
  const result = pickupRequestFields(form({ date: "2026-10-07", timeRange: "09:00" }), now);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.fields.pickupRequestedAt, new Date(2026, 9, 7, 9, 0).toISOString());
  assert.deepEqual(pickupFormDateTime(result.fields.pickupRequestedAt), { date: "2026-10-07", timeRange: "09:00" });
});

test("a date without a time uses 09:00; no date sends no pickup time", () => {
  const dated = pickupRequestFields(form({ date: "2026-10-07" }), now);
  assert.ok(dated.ok && dated.fields.pickupRequestedAt === new Date(2026, 9, 7, 9, 0).toISOString());
  assert.deepEqual(pickupRequestFields(form({}), now), { ok: true, fields: {} });
});

test("a time without a date, invalid or past dates are reported instead of dropped", () => {
  assert.equal(pickupRequestFields(form({ timeRange: "09:00" }), now).ok, false);
  assert.equal(pickupRequestFields(form({ date: "2026-02-31" }), now).ok, false);
  assert.equal(pickupRequestFields(form({ date: "10/07/2026" }), now).ok, false);
  assert.equal(pickupRequestFields(form({ date: "2026-10-05" }), now).ok, false);
  assert.equal(pickupRequestFields(form({ date: "2026-10-07", timeRange: "25:00" }), now).ok, false);
  assert.equal(pickupRequestFields(form({ date: "2026-10-06" }), now).ok, true);
});

test("contact and vehicle details are trimmed, optional and bounded", () => {
  const result = pickupRequestFields(form({ contactName: "  Kate  ", contactPhone: "", vehicleDetails: " Flatbed, LA 123 " }), now);
  assert.deepEqual(result, { ok: true, fields: { pickupContactName: "Kate", pickupVehicleDetails: "Flatbed, LA 123" } });
  assert.equal(pickupRequestFields(form({ contactName: "x".repeat(161) }), now).ok, false);
  assert.equal(pickupRequestFields(form({ contactPhone: "1".repeat(81) }), now).ok, false);
  assert.equal(pickupRequestFields(form({ vehicleDetails: "line\nbreak" }), now).ok, false);
});

test("an unreadable saved instant restores an empty form", () => {
  assert.deepEqual(pickupFormDateTime(undefined), { date: "", timeRange: "" });
  assert.deepEqual(pickupFormDateTime("not a date"), { date: "", timeRange: "" });
});

test("the shown start time matches the saved instant, including the 09:00 default", () => {
  assert.equal(pickupStartTimeLabel({ date: "", timeRange: "" }), "Not specified");
  assert.equal(pickupStartTimeLabel({ date: "2026-10-07", timeRange: "" }), "9:00 AM (default — no time chosen)");
  assert.equal(pickupStartTimeLabel({ date: "2026-10-07", timeRange: "15:00" }), "3:00 PM");
  const saved = pickupRequestFields(form({ date: "2026-10-07" }), now);
  assert.ok(saved.ok);
  if (saved.ok) assert.equal(pickupFormDateTime(saved.fields.pickupRequestedAt).timeRange, "09:00");
});
