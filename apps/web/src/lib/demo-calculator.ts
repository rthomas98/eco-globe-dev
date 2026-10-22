/**
 * Presentation-only calculators for public demo feedstock examples.
 *
 * Demo examples are not marketplace listings, so nothing here fetches,
 * persists or records anything. Every figure is either a value the demo
 * example itself supplies (with its currency, unit and basis shown) or a
 * value the visitor typed. No unit, currency, volume-period or density
 * conversion is performed, and no material emission factor is assumed.
 */

import { computeBuyerSavings, type BuyerSavingsResult } from "./value-recovery";
import {
  TRANSPORT_BY_STATE,
  TRANSPORT_LABEL,
  computeEmissionTons,
  type FeedstockState,
  type TransportMode,
} from "./carbon-emissions";
import type { DemoPlaylistMaterial } from "./demo-playlists";

type DemoPriceValue = Extract<DemoPlaylistMaterial["price"], { kind: "value" }>;
export type DemoPriceBasis = DemoPriceValue["basis"];

/** Validation limit for any entered or computed amount; not a source value. */
export const DEMO_CALCULATOR_LIMIT = 1_000_000_000_000;

export const DEMO_SAVINGS_NOTE =
  "Demo example — scenario estimate only, not a quote, offer or confirmed price.";
export const DEMO_TRANSPORT_NOTE =
  "Transport footprint estimate from the shipment weight, distance and mode you entered, using EcoGlobe's existing transport factors. It is not a lifecycle or material carbon saving and not a quote.";
export const DEMO_GATE_FEE_REASON =
  "This example is a gate fee the seller pays to dispose of the material, so the buyer-savings estimate does not apply to it.";

// Plain decimal only: no sign, exponent, hex, separators, Infinity or NaN.
const DECIMAL = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

export type ParsedAmount = { ok: true; value: number } | { ok: false; message: string };

/** Parses a raw input string; a blank input is missing, never zero. */
export function parseDemoAmount(label: string, raw: string, options: { allowZero: boolean }): ParsedAmount {
  const text = raw.trim();
  if (text === "") return { ok: false, message: `Enter ${label}.` };
  if (!DECIMAL.test(text)) return { ok: false, message: `${capitalize(label)} must be a plain number.` };
  const value = Number(text);
  if (!Number.isFinite(value)) return { ok: false, message: `${capitalize(label)} must be a plain number.` };
  if (value > DEMO_CALCULATOR_LIMIT) return { ok: false, message: `${capitalize(label)} is above this calculator's limit.` };
  if (value === 0 && !options.allowZero) return { ok: false, message: `${capitalize(label)} must be greater than zero.` };
  return { ok: true, value };
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function withinLimit(value: number) {
  return Number.isFinite(value) && Math.abs(value) <= DEMO_CALCULATOR_LIMIT;
}

// ---------------------------------------------------------------------------
// Savings (prospective buyer's perspective, whatever the example's role)
// ---------------------------------------------------------------------------

export type DemoSavingsPrice =
  /** One supplied buyer-pays amount; a buyer need's amount is its target price. */
  | {
      kind: "scalar";
      amount: number;
      currencyCode: string;
      perUnit: string;
      basis: DemoPriceBasis;
      isTarget: boolean;
    }
  /** Seller pays to dispose: buyer savings do not apply. */
  | { kind: "gate_fee" }
  /** No single usable amount; the visitor enters the scenario price, currency and unit. */
  | { kind: "manual"; reason: "missing" | "range" | "text" };

export function demoSavingsPrice(material: DemoPlaylistMaterial): DemoSavingsPrice {
  const price = material.price;
  if (price.kind !== "value") return { kind: "manual", reason: "missing" };
  if (price.direction === "seller_pays_gate_fee") return { kind: "gate_fee" };
  if (price.amount.kind === "range") return { kind: "manual", reason: "range" };
  if (price.amount.kind === "text") return { kind: "manual", reason: "text" };
  const amount = price.amount.value;
  const currencyCode = price.currencyCode.trim();
  const perUnit = price.perUnit.trim();
  if (!Number.isFinite(amount) || amount < 0 || amount > DEMO_CALCULATOR_LIMIT || !currencyCode || !perUnit) {
    return { kind: "manual", reason: "missing" };
  }
  return { kind: "scalar", amount, currencyCode, perUnit, basis: price.basis, isTarget: material.kind === "buyer" };
}

export interface DemoSavingsInput {
  price: DemoSavingsPrice;
  /** Quantity in the price unit, as typed. */
  quantity: string;
  /** Baseline delivered cost per price unit, as typed. */
  baselineRate: string;
  /** A buyer need's target price must be confirmed as a scenario input. */
  targetConfirmed: boolean;
  /** Used only when `price.kind` is "manual". */
  manualPrice: string;
  manualCurrency: string;
  manualUnit: string;
}

export type DemoPriceSource =
  | { kind: "supplied"; basis: DemoPriceBasis; isTarget: boolean }
  | { kind: "entered" };

export type DemoSavingsOutcome =
  | { kind: "blocked"; reason: string }
  | {
      kind: "estimate";
      currencyCode: string;
      unit: string;
      priceSource: DemoPriceSource;
      result: BuyerSavingsResult;
    };

const CURRENCY_CODE = /^[A-Z]{3}$/;
const MAX_UNIT_LENGTH = 40;

export function computeDemoSavings(input: DemoSavingsInput): DemoSavingsOutcome {
  const { price } = input;
  if (price.kind === "gate_fee") return { kind: "blocked", reason: DEMO_GATE_FEE_REASON };

  let pricePerUnit: number;
  let currencyCode: string;
  let unit: string;
  let priceSource: DemoPriceSource;
  if (price.kind === "scalar") {
    if (price.isTarget && !input.targetConfirmed) {
      return {
        kind: "blocked",
        reason: "Confirm that you want to use this buyer's target price as a scenario price. It is not an offer.",
      };
    }
    pricePerUnit = price.amount;
    currencyCode = price.currencyCode;
    unit = price.perUnit;
    priceSource = { kind: "supplied", basis: price.basis, isTarget: price.isTarget };
  } else {
    const entered = parseDemoAmount("a scenario price per unit", input.manualPrice, { allowZero: true });
    if (!entered.ok) return { kind: "blocked", reason: entered.message };
    currencyCode = input.manualCurrency.trim().toUpperCase();
    if (!CURRENCY_CODE.test(currencyCode)) {
      return { kind: "blocked", reason: "Enter the scenario price currency as a three-letter code, such as USD." };
    }
    unit = input.manualUnit.trim();
    if (!unit) return { kind: "blocked", reason: "Enter the unit the scenario price is per." };
    if (unit.length > MAX_UNIT_LENGTH) return { kind: "blocked", reason: "The price unit is too long." };
    pricePerUnit = entered.value;
    priceSource = { kind: "entered" };
  }

  const quantity = parseDemoAmount("a quantity", input.quantity, { allowZero: false });
  if (!quantity.ok) return { kind: "blocked", reason: quantity.message };
  const baseline = parseDemoAmount("a baseline delivered cost per unit", input.baselineRate, { allowZero: true });
  if (!baseline.ok) return { kind: "blocked", reason: baseline.message };

  if (!withinLimit(quantity.value * baseline.value) || !withinLimit(quantity.value * pricePerUnit)) {
    return { kind: "blocked", reason: "These amounts are above this calculator's limit." };
  }

  let result: BuyerSavingsResult;
  try {
    result = computeBuyerSavings({
      quantity: quantity.value,
      baselineDeliveredRatePerUnit: baseline.value,
      listingPricePerUnit: pricePerUnit,
    });
  } catch {
    return { kind: "blocked", reason: "These amounts cannot be estimated." };
  }
  if (!withinLimit(result.baselineCost) || !withinLimit(result.purchaseCost) || !withinLimit(result.savings)) {
    return { kind: "blocked", reason: "These amounts are above this calculator's limit." };
  }
  return { kind: "estimate", currencyCode, unit, priceSource, result };
}

// ---------------------------------------------------------------------------
// Transport footprint
// ---------------------------------------------------------------------------

export const DEMO_FEEDSTOCK_STATES: readonly FeedstockState[] = ["Solid", "Liquid", "Gas"];

const DEMO_TRANSPORT_MODES: readonly TransportMode[] = DEMO_FEEDSTOCK_STATES.flatMap((state) => TRANSPORT_BY_STATE[state]);

/** The matching known state, or null for anything else (e.g. a raw select value). */
export function knownDemoState(value: unknown): FeedstockState | null {
  return DEMO_FEEDSTOCK_STATES.find((state) => state === value) ?? null;
}

/** The matching known transport mode, or null for anything else. */
export function knownDemoMode(value: unknown): TransportMode | null {
  return DEMO_TRANSPORT_MODES.find((mode) => mode === value) ?? null;
}

export function demoTransportModes(value: unknown): TransportMode[] {
  const state = knownDemoState(value);
  return state ? [...TRANSPORT_BY_STATE[state]] : [];
}

export interface DemoTransportInput {
  /** Raw choice; anything other than a known state is treated as not chosen. */
  state: string | null;
  /** Raw choice; anything other than a known mode is treated as not chosen. */
  mode: string | null;
  /** Shipment weight in metric tonnes, as typed. */
  metricTons: string;
  /** One-way distance in miles, as typed. */
  miles: string;
}

export type DemoTransportOutcome =
  | { kind: "blocked"; reason: string }
  | {
      kind: "estimate";
      state: FeedstockState;
      mode: TransportMode;
      modeLabel: string;
      metricTons: number;
      miles: number;
      emissionTons: number;
    };

export function computeDemoTransport(input: DemoTransportInput): DemoTransportOutcome {
  // Narrow raw choices before any table lookup so unknown values block, never throw.
  const state = knownDemoState(input.state);
  if (!state) return { kind: "blocked", reason: "Choose the material's physical state." };
  const mode = knownDemoMode(input.mode);
  if (!mode) return { kind: "blocked", reason: "Choose a transport mode." };
  if (!TRANSPORT_BY_STATE[state].includes(mode)) {
    return { kind: "blocked", reason: `${TRANSPORT_LABEL[mode]} is not available for a ${state.toLowerCase()} material.` };
  }
  const tons = parseDemoAmount("the shipment weight in metric tonnes", input.metricTons, { allowZero: false });
  if (!tons.ok) return { kind: "blocked", reason: tons.message };
  const miles = parseDemoAmount("the distance in miles", input.miles, { allowZero: false });
  if (!miles.ok) return { kind: "blocked", reason: miles.message };

  const emissionTons = computeEmissionTons(mode, tons.value, miles.value);
  if (!withinLimit(emissionTons)) {
    return { kind: "blocked", reason: "These amounts are above this calculator's limit." };
  }
  return {
    kind: "estimate",
    state,
    mode,
    modeLabel: TRANSPORT_LABEL[mode],
    metricTons: tons.value,
    miles: miles.value,
    emissionTons,
  };
}

/**
 * Tonnes CO2e for display: up to three decimals, a positive result too small
 * to show as "<0.001" (never "0"), and an actual zero as "0".
 */
export function formatDemoEmissionTons(tons: number): string {
  if (tons === 0) return "0";
  if (tons > 0 && tons < 0.001) return "<0.001";
  return tons.toLocaleString("en-US", { maximumFractionDigits: 3 });
}
