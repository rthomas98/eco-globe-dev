import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_CALCULATOR_LIMIT,
  DEMO_GATE_FEE_REASON,
  computeDemoSavings,
  computeDemoTransport,
  demoSavingsPrice,
  demoTransportModes,
  formatDemoEmissionTons,
  knownDemoMode,
  knownDemoState,
  parseDemoAmount,
  type DemoSavingsInput,
  type DemoSavingsPrice,
} from "./demo-calculator.ts";
import type { DemoPlaylistMaterial } from "./demo-playlists.ts";

function material(overrides: Partial<DemoPlaylistMaterial> = {}): DemoPlaylistMaterial {
  return {
    id: "m1",
    companyId: "c1",
    kind: "seller",
    title: "Example feedstock",
    materialTypeCode: "other",
    sourceStatus: "estimate",
    qualifier: null,
    equivalents: [],
    price: { kind: "missing" },
    volume: { kind: "missing" },
    geography: { kind: "pending", reason: "missing_location" },
    ...overrides,
  };
}

function scalarPrice(value: number, direction: "buyer_pays" | "seller_pays_gate_fee" = "buyer_pays"): DemoPlaylistMaterial["price"] {
  return { kind: "value", amount: { kind: "scalar", value }, currencyCode: "USD", perUnit: "t", direction, basis: "demo_estimate" };
}

function savings(price: DemoSavingsPrice, overrides: Partial<DemoSavingsInput> = {}): DemoSavingsInput {
  return {
    price,
    quantity: "10",
    baselineRate: "50",
    targetConfirmed: false,
    manualPrice: "",
    manualCurrency: "",
    manualUnit: "",
    ...overrides,
  };
}

const SELLER_30: DemoSavingsPrice = { kind: "scalar", amount: 30, currencyCode: "USD", perUnit: "t", basis: "source", isTarget: false };
const MANUAL: DemoSavingsPrice = { kind: "manual", reason: "missing" };

function blockedReason(outcome: { kind: string; reason?: string }) {
  assert.equal(outcome.kind, "blocked");
  return outcome.reason ?? "";
}

// --- parseDemoAmount ---------------------------------------------------------

test("blank input is missing, never zero", () => {
  for (const raw of ["", "   "]) {
    const parsed = parseDemoAmount("a quantity", raw, { allowZero: true });
    assert.deepEqual(parsed, { ok: false, message: "Enter a quantity." });
  }
});

test("zero is accepted only where allowed", () => {
  assert.deepEqual(parseDemoAmount("a price", "0", { allowZero: true }), { ok: true, value: 0 });
  assert.equal(parseDemoAmount("a quantity", "0", { allowZero: false }).ok, false);
  assert.equal(parseDemoAmount("a quantity", "0.000", { allowZero: false }).ok, false);
});

test("only plain decimals parse", () => {
  assert.deepEqual(parseDemoAmount("x", " 12.5 ", { allowZero: false }), { ok: true, value: 12.5 });
  assert.deepEqual(parseDemoAmount("x", ".5", { allowZero: false }), { ok: true, value: 0.5 });
  assert.deepEqual(parseDemoAmount("x", "5.", { allowZero: false }), { ok: true, value: 5 });
  for (const raw of ["-1", "+1", "1e3", "0x10", "Infinity", "NaN", "1,000", "1 000", "$5", "abc", "."]) {
    assert.equal(parseDemoAmount("x", raw, { allowZero: true }).ok, false, raw);
  }
});

test("inputs above the validation limit are rejected", () => {
  assert.deepEqual(parseDemoAmount("x", String(DEMO_CALCULATOR_LIMIT), { allowZero: false }), {
    ok: true,
    value: DEMO_CALCULATOR_LIMIT,
  });
  assert.equal(parseDemoAmount("x", "1000000000001", { allowZero: false }).ok, false);
  assert.equal(parseDemoAmount("x", "9".repeat(400), { allowZero: false }).ok, false);
});

// --- demoSavingsPrice --------------------------------------------------------

test("a scalar buyer-pays seller price prefills with currency, unit and basis", () => {
  assert.deepEqual(demoSavingsPrice(material({ price: scalarPrice(30) })), {
    kind: "scalar",
    amount: 30,
    currencyCode: "USD",
    perUnit: "t",
    basis: "demo_estimate",
    isTarget: false,
  });
});

test("a buyer need's scalar price is marked as a target", () => {
  const price = demoSavingsPrice(material({ kind: "buyer", price: scalarPrice(30) }));
  assert.equal(price.kind === "scalar" && price.isTarget, true);
});

test("a seller-paid gate fee is never a savings price", () => {
  assert.deepEqual(demoSavingsPrice(material({ price: scalarPrice(80, "seller_pays_gate_fee") })), { kind: "gate_fee" });
});

test("missing, range and text prices need a scenario price", () => {
  assert.deepEqual(demoSavingsPrice(material()), { kind: "manual", reason: "missing" });
  assert.deepEqual(
    demoSavingsPrice(
      material({
        price: { kind: "value", amount: { kind: "range", min: 10, max: 20 }, currencyCode: "USD", perUnit: "t", direction: "buyer_pays", basis: "source" },
      }),
    ),
    { kind: "manual", reason: "range" },
  );
  assert.deepEqual(
    demoSavingsPrice(
      material({
        price: { kind: "value", amount: { kind: "text", text: "negotiable" }, currencyCode: "USD", perUnit: "t", direction: "buyer_pays", basis: "source" },
      }),
    ),
    { kind: "manual", reason: "text" },
  );
});

test("a scalar without currency or unit is not prefilled", () => {
  const price = { ...scalarPrice(30), currencyCode: " " } as DemoPlaylistMaterial["price"];
  assert.deepEqual(demoSavingsPrice(material({ price })), { kind: "manual", reason: "missing" });
});

// --- computeDemoSavings ------------------------------------------------------

test("savings: 10 t at a USD 50 baseline versus USD 30 saves USD 200", () => {
  const outcome = computeDemoSavings(savings(SELLER_30));
  assert.equal(outcome.kind, "estimate");
  if (outcome.kind !== "estimate") return;
  assert.equal(outcome.currencyCode, "USD");
  assert.equal(outcome.unit, "t");
  assert.deepEqual(outcome.priceSource, { kind: "supplied", basis: "source", isTarget: false });
  assert.equal(outcome.result.baselineCost, 500);
  assert.equal(outcome.result.purchaseCost, 300);
  assert.equal(outcome.result.savings, 200);
  assert.ok(outcome.result.exclusions.length > 0);
});

test("negative savings are kept as additional cost", () => {
  const outcome = computeDemoSavings(
    savings({ ...SELLER_30, amount: 12.5 }, { quantity: "4", baselineRate: "10" }),
  );
  assert.equal(outcome.kind === "estimate" && outcome.result.savings, -10);
});

test("a zero price and zero baseline are valid inputs", () => {
  const outcome = computeDemoSavings(savings({ ...SELLER_30, amount: 0 }, { baselineRate: "0" }));
  assert.equal(outcome.kind === "estimate" && outcome.result.savings, 0);
});

test("a gate fee is blocked with its explanation", () => {
  assert.equal(blockedReason(computeDemoSavings(savings({ kind: "gate_fee" }))), DEMO_GATE_FEE_REASON);
});

test("a buyer target price requires explicit confirmation", () => {
  const target: DemoSavingsPrice = { ...SELLER_30, isTarget: true };
  assert.match(blockedReason(computeDemoSavings(savings(target))), /target price/);
  const confirmed = computeDemoSavings(savings(target, { targetConfirmed: true }));
  assert.equal(confirmed.kind, "estimate");
  if (confirmed.kind === "estimate") {
    assert.deepEqual(confirmed.priceSource, { kind: "supplied", basis: "source", isTarget: true });
  }
});

test("a manual price needs price, currency and unit", () => {
  assert.equal(computeDemoSavings(savings(MANUAL)).kind, "blocked");
  assert.match(blockedReason(computeDemoSavings(savings(MANUAL, { manualPrice: "30", manualUnit: "t" }))), /currency/);
  assert.match(blockedReason(computeDemoSavings(savings(MANUAL, { manualPrice: "30", manualCurrency: "US$", manualUnit: "t" }))), /currency/);
  assert.match(blockedReason(computeDemoSavings(savings(MANUAL, { manualPrice: "30", manualCurrency: "usd" }))), /unit/);
  assert.match(
    blockedReason(computeDemoSavings(savings(MANUAL, { manualPrice: "30", manualCurrency: "usd", manualUnit: "x".repeat(41) }))),
    /too long/,
  );
  const outcome = computeDemoSavings(savings(MANUAL, { manualPrice: "30", manualCurrency: " usd ", manualUnit: " gal " }));
  assert.equal(outcome.kind, "estimate");
  if (outcome.kind === "estimate") {
    assert.equal(outcome.currencyCode, "USD");
    assert.equal(outcome.unit, "gal");
    assert.deepEqual(outcome.priceSource, { kind: "entered" });
    assert.equal(outcome.result.savings, 200);
  }
});

test("a manual price is ignored when the example supplies one", () => {
  const outcome = computeDemoSavings(savings(SELLER_30, { manualPrice: "1", manualCurrency: "EUR", manualUnit: "kg" }));
  assert.equal(outcome.kind === "estimate" && outcome.currencyCode, "USD");
  assert.equal(outcome.kind === "estimate" && outcome.result.purchaseCost, 300);
});

test("blank or zero quantity and blank baseline are blocked, not zeroed", () => {
  assert.match(blockedReason(computeDemoSavings(savings(SELLER_30, { quantity: "" }))), /Enter a quantity/);
  assert.match(blockedReason(computeDemoSavings(savings(SELLER_30, { quantity: "0" }))), /greater than zero/);
  assert.match(blockedReason(computeDemoSavings(savings(SELLER_30, { baselineRate: " " }))), /Enter a baseline/);
});

test("products above the validation limit are blocked", () => {
  assert.match(
    blockedReason(computeDemoSavings(savings(SELLER_30, { quantity: String(DEMO_CALCULATOR_LIMIT), baselineRate: "2" }))),
    /limit/,
  );
  assert.match(
    blockedReason(computeDemoSavings(savings({ ...SELLER_30, amount: DEMO_CALCULATOR_LIMIT }, { quantity: "2", baselineRate: "0" }))),
    /limit/,
  );
});

// --- computeDemoTransport ----------------------------------------------------

test("modes follow the chosen state", () => {
  assert.deepEqual(demoTransportModes(null), []);
  assert.deepEqual(demoTransportModes("Gas"), ["gas-pipeline"]);
  assert.ok(demoTransportModes("Solid").includes("rail"));
});

test("transport requires state, mode and a compatible pair", () => {
  assert.match(blockedReason(computeDemoTransport({ state: null, mode: "rail", metricTons: "1", miles: "1" })), /physical state/);
  assert.match(blockedReason(computeDemoTransport({ state: "Solid", mode: null, metricTons: "1", miles: "1" })), /transport mode/);
  assert.match(
    blockedReason(computeDemoTransport({ state: "Gas", mode: "rail", metricTons: "1", miles: "1" })),
    /not available for a gas material/,
  );
});

test("known lookups return the exact option or null", () => {
  assert.equal(knownDemoState("Liquid"), "Liquid");
  assert.equal(knownDemoMode("tanker-trailer"), "tanker-trailer");
  assert.equal(knownDemoMode("light-box-truck"), "light-box-truck");
  assert.equal(knownDemoMode("gas-pipeline"), "gas-pipeline");
  for (const value of ["", null, undefined, "solid", "Plasma", 1, {}]) {
    assert.equal(knownDemoState(value), null, String(value));
  }
  for (const value of ["", null, undefined, "Rail", "teleport", 1, {}]) {
    assert.equal(knownDemoMode(value), null, String(value));
  }
});

test("unknown runtime state or mode blocks instead of throwing", () => {
  assert.deepEqual(demoTransportModes("Plasma"), []);
  assert.deepEqual(demoTransportModes("solid"), []);
  assert.match(
    blockedReason(computeDemoTransport({ state: "Plasma", mode: "rail", metricTons: "1", miles: "1" })),
    /physical state/,
  );
  assert.match(
    blockedReason(computeDemoTransport({ state: "Solid", mode: "teleport", metricTons: "1", miles: "1" })),
    /transport mode/,
  );
});

test("transport requires positive tonnes and miles", () => {
  assert.match(blockedReason(computeDemoTransport({ state: "Solid", mode: "rail", metricTons: "", miles: "10" })), /Enter the shipment weight/);
  assert.match(blockedReason(computeDemoTransport({ state: "Solid", mode: "rail", metricTons: "5", miles: "0" })), /greater than zero/);
  assert.equal(computeDemoTransport({ state: "Solid", mode: "rail", metricTons: "5", miles: "-3" }).kind, "blocked");
});

test("heavy truck: 10 t over 100 miles is 0.441072 t CO2e", () => {
  // 0.012 × (10 + 8) × (100 × 2) × 10.21 / 1000
  const outcome = computeDemoTransport({ state: "Solid", mode: "heavy-20-wheeler", metricTons: "10", miles: "100" });
  assert.equal(outcome.kind, "estimate");
  if (outcome.kind !== "estimate") return;
  assert.ok(Math.abs(outcome.emissionTons - 0.441072) < 1e-9, String(outcome.emissionTons));
  assert.equal(outcome.metricTons, 10);
  assert.equal(outcome.miles, 100);
  assert.equal(outcome.modeLabel, "Heavy-Duty 20-Wheeler");
});

test("rail: 20 t over 50 miles is 0.045 t CO2e", () => {
  // 0.0225 × 20 × 50 × 2 / 1000
  const outcome = computeDemoTransport({ state: "Solid", mode: "rail", metricTons: "20", miles: "50" });
  assert.ok(outcome.kind === "estimate" && Math.abs(outcome.emissionTons - 0.045) < 1e-12);
});

test("a tiny positive footprint displays as <0.001, never 0", () => {
  // 0.0225 × 1 × 1 × 2 / 1000 = 0.000045
  const outcome = computeDemoTransport({ state: "Solid", mode: "rail", metricTons: "1", miles: "1" });
  assert.equal(outcome.kind, "estimate");
  if (outcome.kind !== "estimate") return;
  assert.ok(outcome.emissionTons > 0);
  assert.equal(formatDemoEmissionTons(outcome.emissionTons), "<0.001");
});

test("footprint display keeps zero distinct and rounds to three decimals", () => {
  assert.equal(formatDemoEmissionTons(0), "0");
  assert.equal(formatDemoEmissionTons(0.000045), "<0.001");
  assert.equal(formatDemoEmissionTons(0.0009999), "<0.001");
  assert.equal(formatDemoEmissionTons(0.001), "0.001");
  assert.equal(formatDemoEmissionTons(0.0014), "0.001");
  assert.equal(formatDemoEmissionTons(0.441072), "0.441");
  assert.equal(formatDemoEmissionTons(1234.5678), "1,234.568");
});

test("transport results above the validation limit are blocked", () => {
  const outcome = computeDemoTransport({
    state: "Liquid",
    mode: "barge-55k",
    metricTons: String(DEMO_CALCULATOR_LIMIT),
    miles: String(DEMO_CALCULATOR_LIMIT),
  });
  assert.match(blockedReason(outcome), /limit/);
});
