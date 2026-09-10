import test from "node:test";
import assert from "node:assert/strict";
import {
  validatePilot,
  assertPilotTransition,
  slotStart,
} from "./pilot-validation.js";
const input = {
  listingId: 1,
  clientRequestId: "01234567-1234-1234-1234-0123456789ab",
  loadChoice: "two",
  loadCount: 2,
  approximateTonnage: 45,
  deliveryLocationId: 2,
  neededBy: "October",
  constraints: [],
  objective: "Trial",
};
test("pilot load choice and approximate tonnage validate independently", () => {
  assert.equal(validatePilot(input).approximateTonnage, 45);
  for (const change of [
    { loadCount: 1 },
    { approximateTonnage: 0 },
    { approximateTonnage: Infinity },
    { constraints: ["invented"] },
    { price: 100 },
  ])
    assert.throws(() => validatePilot({ ...input, ...change }));
});
test("staff cannot grant buyer consent or skip the workflow", () => {
  assert.throws(() => assertPilotTransition("offer_sent", "won"));
  assert.throws(() => assertPilotTransition("new", "offer_sent"));
  assert.throws(() => assertPilotTransition("won", "lost"));
  assertPilotTransition("call_held", "working_lane");
});
test("slots require real future UTC dates", () => {
  assert.throws(() => slotStart("2020-01-01T10:00:00Z"));
  assert.throws(() => slotStart("tomorrow"));
  assert.throws(() => slotStart("2026-10-01T10:00:00"));
  const d = new Date(Date.now() + 86400000);
  d.setUTCSeconds(0, 0);
  assert.equal(slotStart(d.toISOString()).toISOString(), d.toISOString());
});
