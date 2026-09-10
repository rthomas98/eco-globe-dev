import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adminNextStatuses,
  bucketForStatus,
  centralDayKey,
  centralWallClockToUtcIso,
  formatCentralDateTime,
  formatCentralTime,
  formatLoads,
  groupSlotsByCentralDay,
  isValidClientRequestId,
  laneLabel,
  loadCountForChoice,
  makeClientRequestId,
  tidyLabel,
  toPilotRequestWrite,
  validatePilotForm,
  type PilotFormValues,
} from "./pilots.ts";

const valid: PilotFormValues = {
  loadChoice: "two",
  loadCount: "",
  approximateTonnage: "45",
  deliveryLocationId: "12",
  neededBy: "Mid October 2026",
  constraints: ["Booked delivery window"],
  objective: "Moisture consistency across two deliveries.",
};

test("form requires load choice, tonnage and a delivery site", () => {
  const errors = validatePilotForm({ ...valid, loadChoice: "", approximateTonnage: "", deliveryLocationId: "" });
  assert.deepEqual(
    errors.map((e) => e.field),
    ["loadChoice", "approximateTonnage", "deliveryLocationId"],
  );
  assert.equal(validatePilotForm(valid).length, 0);
});

test("other load choice needs a whole load count", () => {
  assert.equal(loadCountForChoice("one", "9"), 1);
  assert.equal(loadCountForChoice("two", ""), 2);
  assert.equal(loadCountForChoice("other", "3"), 3);
  assert.equal(loadCountForChoice("other", "0"), null);
  assert.equal(loadCountForChoice("other", "2.5"), null);
  assert.equal(validatePilotForm({ ...valid, loadChoice: "other", loadCount: "" })[0]?.field, "loadCount");
});

test("tonnage must be positive and within range", () => {
  assert.equal(validatePilotForm({ ...valid, approximateTonnage: "0" })[0]?.field, "approximateTonnage");
  assert.equal(validatePilotForm({ ...valid, approximateTonnage: "10001" })[0]?.field, "approximateTonnage");
  assert.equal(validatePilotForm({ ...valid, approximateTonnage: "abc" })[0]?.field, "approximateTonnage");
});

test("write body carries numbers and the retained request key", () => {
  const body = toPilotRequestWrite(valid, 7, "0f9b6d4e-1111-4222-8333-444455556666");
  assert.deepEqual(body, {
    listingId: 7,
    clientRequestId: "0f9b6d4e-1111-4222-8333-444455556666",
    loadChoice: "two",
    loadCount: 2,
    approximateTonnage: 45,
    deliveryLocationId: 12,
    neededBy: "Mid October 2026",
    constraints: ["Booked delivery window"],
    objective: "Moisture consistency across two deliveries.",
  });
  assert.equal(toPilotRequestWrite({ ...valid, deliveryLocationId: "" }, 7, "k".repeat(20)), null);
});

test("client request ids match the contract", () => {
  assert.ok(isValidClientRequestId(makeClientRequestId()));
  assert.ok(isValidClientRequestId(makeClientRequestId(() => 0.5)));
  assert.equal(isValidClientRequestId("short"), false);
  assert.equal(isValidClientRequestId("has_underscore_0123456"), false);
});

test("Central Time labels honour daylight saving", () => {
  // 15:30 UTC on 25 Aug 2026 is 10:30 AM CDT.
  assert.equal(formatCentralTime("2026-08-25T15:30:00.000Z"), "10:30 AM");
  assert.equal(formatCentralDateTime("2026-08-25T15:30:00.000Z"), "Tuesday 25 August, 10:30 AM");
  // 15:30 UTC on 12 Jan 2027 is 9:30 AM CST.
  assert.equal(formatCentralTime("2027-01-12T15:30:00.000Z"), "9:30 AM");
  assert.equal(centralDayKey("2026-08-26T03:30:00.000Z"), "2026-08-25");
});

test("wall clock conversion round-trips in both offsets", () => {
  assert.equal(centralWallClockToUtcIso("2026-08-25", "10:30"), "2026-08-25T15:30:00.000Z");
  assert.equal(centralWallClockToUtcIso("2027-01-12", "09:30"), "2027-01-12T15:30:00.000Z");
  assert.equal(centralWallClockToUtcIso("2026-8-25", "10:30"), null);
  assert.equal(centralWallClockToUtcIso("2026-08-25", "10:3"), null);
});

test("slots group by Central day and drop past slots", () => {
  const now = new Date("2026-08-24T12:00:00.000Z");
  const slot = (id: number, startsAt: string) => ({ id, startsAt, endsAt: startsAt, ownerUserId: 1, ownerName: "Ana" });
  const days = groupSlotsByCentralDay(
    [slot(3, "2026-08-26T14:00:00.000Z"), slot(1, "2026-08-25T15:30:00.000Z"), slot(2, "2026-08-25T14:00:00.000Z"), slot(9, "2026-08-20T14:00:00.000Z")],
    now,
  );
  assert.deepEqual(
    days.map((d) => [d.key, d.weekday, d.dayNumber, d.slots.map((s) => s.id)]),
    [
      ["2026-08-25", "TUE", "25", [2, 1]],
      ["2026-08-26", "WED", "26", [3]],
    ],
  );
  assert.deepEqual(groupSlotsByCentralDay([], now), []);
});

test("desk buckets and admin transitions follow the lifecycle", () => {
  assert.equal(bucketForStatus("call_held"), "working_lane");
  assert.equal(bucketForStatus("won"), "moving");
  assert.equal(bucketForStatus("lost"), null);
  assert.deepEqual(adminNextStatuses("new"), ["call_held", "lost"]);
  assert.deepEqual(adminNextStatuses("working_lane"), ["offer_sent", "lost"]);
  assert.deepEqual(adminNextStatuses("offer_sent"), ["lost"]);
  assert.deepEqual(adminNextStatuses("won"), []);
});

test("load labels never invent tonnage", () => {
  assert.equal(formatLoads(2, 45), "2 loads, ~45 t");
  assert.equal(formatLoads(1, null), "1 load");
  assert.equal(formatLoads(3, "22.5"), "3 loads, ~22.5 t");
});

test("place labels drop stray separators from partial addresses", () => {
  assert.equal(tidyLabel("Austin, "), "Austin");
  assert.equal(tidyLabel(", TX"), "TX");
  assert.equal(tidyLabel("Port Allen,  LA"), "Port Allen, LA");
  assert.equal(laneLabel("Austin, ", ""), "Austin");
  assert.equal(laneLabel("Port Allen, LA", "Geismar, LA"), "Port Allen, LA → Geismar, LA");
});
