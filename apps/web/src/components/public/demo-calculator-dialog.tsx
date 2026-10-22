"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Coins, Info, TrendingDown, X } from "lucide-react";
import { DemoEstimateBadge } from "@/components/shared/demo-estimate-badges";
import { TRANSPORT_LABEL } from "@/lib/carbon-emissions";
import { describeUnit, formatMoney } from "@/lib/listing-format";
import { demoBasisLabel, demoPriceLabel, type DemoPlaylistMaterial } from "@/lib/demo-playlists";
import {
  DEMO_FEEDSTOCK_STATES,
  DEMO_GATE_FEE_REASON,
  DEMO_SAVINGS_NOTE,
  DEMO_TRANSPORT_NOTE,
  computeDemoSavings,
  computeDemoTransport,
  demoSavingsPrice,
  demoTransportModes,
  formatDemoEmissionTons,
  knownDemoMode,
  knownDemoState,
  type DemoPriceSource,
  type DemoSavingsPrice,
} from "@/lib/demo-calculator";

export type DemoCalculatorTab = "savings" | "transport";

const TAB_LABEL: Record<DemoCalculatorTab, string> = {
  savings: "Estimate savings",
  transport: "Transport footprint",
};

const MANUAL_REASON: Record<Extract<DemoSavingsPrice, { kind: "manual" }>["reason"], string> = {
  missing: "This example does not state a single price, so enter a scenario price to estimate with.",
  range: "This example gives a price range, so enter the single scenario price you want to estimate with.",
  text: "This example describes its price in words, so enter a scenario price to estimate with.",
};

/**
 * Calculator actions for one demo example card. Presentation only: the dialog
 * runs locally on values the example supplies or the visitor types, and never
 * fetches, saves or records anything. Closing returns focus to the button
 * that opened it, so the card, map and filters are left as they were.
 */
export function DemoCalculatorActions({ material, companyName }: { material: DemoPlaylistMaterial; companyName: string }) {
  const [tab, setTab] = useState<DemoCalculatorTab | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const open = (next: DemoCalculatorTab, button: HTMLButtonElement) => {
    openerRef.current = button;
    setTab(next);
  };
  const close = () => {
    setTab(null);
    openerRef.current?.focus();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={(event) => open("savings", event.currentTarget)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
          style={{ border: "1px solid #E0E0E0" }}
        >
          <Coins className="size-4" aria-hidden="true" />
          {TAB_LABEL.savings}
        </button>
        <button
          type="button"
          onClick={(event) => open("transport", event.currentTarget)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
          style={{ border: "1px solid #E0E0E0" }}
        >
          <TrendingDown className="size-4" aria-hidden="true" />
          {TAB_LABEL.transport}
        </button>
      </div>
      {tab && (
        // Keyed by example so a different card always starts from blank inputs.
        <DemoCalculatorDialog
          key={material.id}
          material={material}
          companyName={companyName}
          initialTab={tab}
          onClose={close}
        />
      )}
    </>
  );
}

export function DemoCalculatorDialog({
  material,
  companyName,
  initialTab,
  onClose,
}: {
  material: DemoPlaylistMaterial;
  companyName: string;
  initialTab: DemoCalculatorTab;
  onClose: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [tab, setTab] = useState<DemoCalculatorTab>(initialTab);

  // Both tabs keep their inputs while the dialog stays open.
  const [quantity, setQuantity] = useState("");
  const [baselineRate, setBaselineRate] = useState("");
  const [targetConfirmed, setTargetConfirmed] = useState(false);
  const [manualPrice, setManualPrice] = useState("");
  const [manualCurrency, setManualCurrency] = useState("");
  const [manualUnit, setManualUnit] = useState("");
  const [state, setState] = useState("");
  const [mode, setMode] = useState("");
  const [metricTons, setMetricTons] = useState("");
  const [miles, setMiles] = useState("");

  // Focus the title, and lock page scroll while open; unmount restores the
  // page's previous overflow value exactly.
  useEffect(() => {
    headingRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Keep keyboard focus inside the dialog; Escape closes it.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !panelRef.current) return;
    const focusable = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]',
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="flex max-h-[100dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-100 px-4 pb-3 pt-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
              <Info className="size-3.5 shrink-0" aria-hidden="true" />
              Demo example · Presentation only
            </p>
            <h2
              id={titleId}
              ref={headingRef}
              tabIndex={-1}
              className="mt-1.5 break-words text-base font-semibold text-neutral-900 outline-none"
            >
              {material.title}
            </h2>
            <p className="break-words text-sm text-neutral-600">{companyName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calculator"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="shrink-0 px-4 pt-3">
          <div className="inline-flex rounded-full bg-neutral-100 p-1" role="group" aria-label="Calculator">
            {(["savings", "transport"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={tab === option}
                onClick={() => setTab(option)}
                className={`min-h-9 rounded-full px-3 text-sm font-semibold ${tab === option ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600"}`}
              >
                {TAB_LABEL[option]}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {tab === "savings" ? (
            <SavingsPanel
              material={material}
              quantity={quantity}
              setQuantity={setQuantity}
              baselineRate={baselineRate}
              setBaselineRate={setBaselineRate}
              targetConfirmed={targetConfirmed}
              setTargetConfirmed={setTargetConfirmed}
              manualPrice={manualPrice}
              setManualPrice={setManualPrice}
              manualCurrency={manualCurrency}
              setManualCurrency={setManualCurrency}
              manualUnit={manualUnit}
              setManualUnit={setManualUnit}
            />
          ) : (
            <TransportPanel
              state={state}
              setState={setState}
              mode={mode}
              setMode={setMode}
              metricTons={metricTons}
              setMetricTons={setMetricTons}
              miles={miles}
              setMiles={setMiles}
            />
          )}
        </div>

        <div className="shrink-0 border-t border-neutral-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 w-full rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
          >
            Back to {material.title}
          </button>
        </div>
      </div>
    </div>
  );
}

function SavingsPanel({
  material,
  quantity,
  setQuantity,
  baselineRate,
  setBaselineRate,
  targetConfirmed,
  setTargetConfirmed,
  manualPrice,
  setManualPrice,
  manualCurrency,
  setManualCurrency,
  manualUnit,
  setManualUnit,
}: {
  material: DemoPlaylistMaterial;
  quantity: string;
  setQuantity: (value: string) => void;
  baselineRate: string;
  setBaselineRate: (value: string) => void;
  targetConfirmed: boolean;
  setTargetConfirmed: (value: boolean) => void;
  manualPrice: string;
  setManualPrice: (value: string) => void;
  manualCurrency: string;
  setManualCurrency: (value: string) => void;
  manualUnit: string;
  setManualUnit: (value: string) => void;
}) {
  const price = useMemo(() => demoSavingsPrice(material), [material]);
  const outcome = computeDemoSavings({
    price,
    quantity,
    baselineRate,
    targetConfirmed,
    manualPrice,
    manualCurrency,
    manualUnit,
  });
  // Same formatting as the cards' DEMO_VALUE_FORMAT, built locally so this
  // module does not import the card module that renders it.
  const exampleLabel =
    demoPriceLabel(material.price, {
      money: (amount, currencyCode) => formatMoney(amount, currencyCode) ?? String(amount),
      unit: describeUnit,
    }) ?? "Not stated";
  const basis = material.price.kind === "value" ? demoBasisLabel("price", material.price.basis) : null;
  const unitText =
    price.kind === "scalar"
      ? describeUnit(price.perUnit).singular
      : manualUnit.trim()
        ? describeUnit(manualUnit).singular
        : "price unit";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-700">
        Compare what a buyer pays today with buying this example&apos;s material. {DEMO_SAVINGS_NOTE}
      </p>

      <section aria-label="Price from the demo example" className="rounded-xl bg-neutral-50 p-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {material.kind === "buyer" ? "Buyer's target price (from the example)" : "Price (from the example)"}
        </p>
        <p className="mt-0.5 break-words font-medium text-neutral-900">{exampleLabel}</p>
        {basis && (
          <span className="mt-1.5 inline-flex">
            <DemoEstimateBadge label={basis} />
          </span>
        )}
      </section>

      {price.kind === "gate_fee" ? (
        <p role="note" className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900">
          {DEMO_GATE_FEE_REASON}
        </p>
      ) : (
        <>
          {price.kind === "scalar" && price.isTarget && (
            <label className="flex items-start gap-2 text-sm text-neutral-800">
              <input
                type="checkbox"
                checked={targetConfirmed}
                onChange={(event) => setTargetConfirmed(event.target.checked)}
                className="mt-0.5 size-4 shrink-0"
              />
              <span>Use this buyer&apos;s target price as my scenario price. I understand it is not an offer.</span>
            </label>
          )}

          {price.kind === "manual" && (
            <fieldset className="flex flex-col gap-3 rounded-xl p-3" style={{ border: "1px solid #F0F0F0" }}>
              <legend className="px-1 text-sm font-semibold text-neutral-900">Your scenario price (entered by you)</legend>
              <p className="text-xs text-neutral-600">{MANUAL_REASON[price.reason]}</p>
              <TextField label="Scenario price per unit" value={manualPrice} onChange={setManualPrice} inputMode="decimal" />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Currency (e.g. USD)"
                  value={manualCurrency}
                  onChange={setManualCurrency}
                  maxLength={3}
                  autoCapitalize="characters"
                />
                <TextField label="Price unit (e.g. t, gal)" value={manualUnit} onChange={setManualUnit} maxLength={40} />
              </div>
            </fieldset>
          )}

          <TextField label={`Quantity (${unitText})`} value={quantity} onChange={setQuantity} inputMode="decimal" />
          <TextField
            label={`Your current delivered cost per ${unitText}`}
            value={baselineRate}
            onChange={setBaselineRate}
            inputMode="decimal"
          />

          {outcome.kind === "blocked" ? (
            <p role="status" className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700">
              {outcome.reason}
            </p>
          ) : (
            <div role="status" className="rounded-xl bg-green-50 p-3 text-sm text-neutral-900">
              <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                <dt className="text-neutral-600">Current cost</dt>
                <dd className="text-right">{money(outcome.result.baselineCost, outcome.currencyCode)}</dd>
                <dt className="text-neutral-600">Cost buying this example</dt>
                <dd className="text-right">{money(outcome.result.purchaseCost, outcome.currencyCode)}</dd>
                <dt className="font-semibold">{outcome.result.savings < 0 ? "Estimated additional cost" : "Estimated savings"}</dt>
                <dd className="text-right font-semibold">{money(Math.abs(outcome.result.savings), outcome.currencyCode)}</dd>
              </dl>
              <p className="mt-2 text-xs text-neutral-600">
                {priceSourceText(outcome.priceSource)} Quantity {outcome.result.quantity}{" "}
                {describeUnit(outcome.unit).plural}; no unit or currency conversion.
              </p>
              <ul className="mt-2 list-disc pl-4 text-xs text-neutral-600">
                {outcome.result.exclusions.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TransportPanel({
  state,
  setState,
  mode,
  setMode,
  metricTons,
  setMetricTons,
  miles,
  setMiles,
}: {
  state: string;
  setState: (value: string) => void;
  mode: string;
  setMode: (value: string) => void;
  metricTons: string;
  setMetricTons: (value: string) => void;
  miles: string;
  setMiles: (value: string) => void;
}) {
  const stateId = useId();
  const modeId = useId();
  const knownState = knownDemoState(state);
  const modes = demoTransportModes(knownState);
  const outcome = computeDemoTransport({ state: knownState, mode: knownDemoMode(mode), metricTons, miles });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-700">
        The example does not state a physical state, shipment size or route. Enter your own shipment to estimate its
        transport footprint.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor={stateId} className="text-sm font-medium text-neutral-900">
          Physical state
        </label>
        <select
          id={stateId}
          value={knownState ?? ""}
          onChange={(event) => {
            const next = knownDemoState(event.target.value);
            setState(next ?? "");
            // A mode from another state is no longer valid.
            if (!next || !demoTransportModes(next).some((option) => option === knownDemoMode(mode))) setMode("");
          }}
          className="min-h-10 rounded-lg bg-white px-3 text-sm"
          style={{ border: "1px solid #E0E0E0" }}
        >
          <option value="">Choose…</option>
          {DEMO_FEEDSTOCK_STATES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={modeId} className="text-sm font-medium text-neutral-900">
          Transport mode
        </label>
        <select
          id={modeId}
          value={knownDemoMode(mode) ?? ""}
          disabled={modes.length === 0}
          onChange={(event) => setMode(knownDemoMode(event.target.value) ?? "")}
          className="min-h-10 rounded-lg bg-white px-3 text-sm disabled:bg-neutral-100"
          style={{ border: "1px solid #E0E0E0" }}
        >
          <option value="">{modes.length === 0 ? "Choose a physical state first" : "Choose…"}</option>
          {modes.map((option) => (
            <option key={option} value={option}>
              {TRANSPORT_LABEL[option]}
            </option>
          ))}
        </select>
      </div>

      <TextField label="Shipment weight (metric tonnes)" value={metricTons} onChange={setMetricTons} inputMode="decimal" />
      <TextField label="One-way distance (miles)" value={miles} onChange={setMiles} inputMode="decimal" />

      {outcome.kind === "blocked" ? (
        <p role="status" className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700">
          {outcome.reason}
        </p>
      ) : (
        <div role="status" className="rounded-xl bg-green-50 p-3 text-sm text-neutral-900">
          <p className="font-semibold">
            {formatDemoEmissionTons(outcome.emissionTons)} t CO₂e transport footprint
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            {outcome.metricTons} t · {outcome.miles} miles · {outcome.modeLabel}
          </p>
        </div>
      )}
      <p className="text-xs text-neutral-600">{DEMO_TRANSPORT_NOTE}</p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  inputMode,
  maxLength,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "decimal";
  maxLength?: number;
  autoCapitalize?: "characters";
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        autoComplete="off"
        className="min-h-10 w-full rounded-lg bg-white px-3 text-sm"
        style={{ border: "1px solid #E0E0E0" }}
      />
    </div>
  );
}

function money(amount: number, currencyCode: string) {
  return formatMoney(amount, currencyCode) ?? `${amount} ${currencyCode}`;
}

function priceSourceText(source: DemoPriceSource) {
  if (source.kind === "entered") return "Price: entered by you.";
  const basis = demoBasisLabel("price", source.basis) ?? "Source value";
  return source.isTarget
    ? `Price: the example's target price (${basis}), used as your scenario input — not an offer.`
    : `Price: supplied by the example (${basis}).`;
}
