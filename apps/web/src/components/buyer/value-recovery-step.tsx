"use client";

import { AlertTriangle, Coins } from "lucide-react";
import type { Listing } from "@/components/public/browse-listings";
import { describeUnit, formatMoney, formatNumber } from "@/lib/listing-format";
import {
  computeBuyerSavings,
  computeSellerRecovery,
  quantityFromMetricTons,
  AVOIDED_DISPOSAL_LABEL,
} from "@/lib/value-recovery";
import type { ReportValueRecovery } from "./carbon-report";

export type CalculatorPortal = "buyer" | "seller";

export interface ValueRecoveryInputs {
  /** Whether the seller/buyer chose to include this estimate. */
  enabled: boolean;
  /** Quantity in the listing's pricing unit; blank = derive from scenario tonnage. */
  quantity: number | "";
  /** Explicit tonnes-per-unit basis for unit-priced listings. */
  tonnesPerUnit: number | "";
  disposalRate: number | "";
  transportToDisposalRate: number | "";
  baselineDeliveredRate: number | "";
}

export function emptyValueRecoveryInputs(initialQuantity?: number): ValueRecoveryInputs {
  return {
    enabled: false,
    quantity: initialQuantity !== undefined && Number.isFinite(initialQuantity) ? initialQuantity : "",
    tonnesPerUnit: "",
    disposalRate: "",
    transportToDisposalRate: "",
    baselineDeliveredRate: "",
  };
}

export type ValueRecoveryResolution =
  | { kind: "disabled" }
  | { kind: "blocked"; reason: string }
  | { kind: "ready"; report: ReportValueRecovery };

/**
 * Resolve the estimate for one scenario. Pure: the same function feeds the
 * on-screen result and the exported CO₂ report so the two always agree.
 */
export function resolveValueRecovery(
  inputs: ValueRecoveryInputs,
  listing: Listing,
  portal: CalculatorPortal,
  metricTons: number,
): ValueRecoveryResolution {
  if (!inputs.enabled) return { kind: "disabled" };
  if (listing.priceNum === null) {
    return { kind: "blocked", reason: "This listing has no recorded price, so a value estimate cannot be calculated." };
  }
  const unit = describeUnit(listing.quantityUnit);
  let quantity: number | null = typeof inputs.quantity === "number" ? inputs.quantity : null;
  let tonnesPerUnit: number | null = unit.tonnesPerUnit;
  if (quantity === null) {
    if (!unit.isMass) {
      tonnesPerUnit = typeof inputs.tonnesPerUnit === "number" ? inputs.tonnesPerUnit : null;
      if (tonnesPerUnit === null || tonnesPerUnit <= 0) {
        return {
          kind: "blocked",
          reason: `This listing is priced per ${unit.singular}. Enter the quantity in ${unit.plural} or the weight of one ${unit.singular} in tonnes.`,
        };
      }
    }
    quantity = quantityFromMetricTons(metricTons, tonnesPerUnit);
    if (quantity === null || quantity <= 0) {
      return { kind: "blocked", reason: "Enter a quantity greater than zero (or set the shipment weight in the Weight step)." };
    }
  } else if (!unit.isMass && typeof inputs.tonnesPerUnit === "number" && inputs.tonnesPerUnit > 0) {
    tonnesPerUnit = inputs.tonnesPerUnit;
  }
  if (quantity <= 0) return { kind: "blocked", reason: "Quantity must be greater than zero." };

  try {
    if (portal === "seller") {
      const disposal = typeof inputs.disposalRate === "number" ? inputs.disposalRate : null;
      const transport = typeof inputs.transportToDisposalRate === "number" ? inputs.transportToDisposalRate : 0;
      if (disposal === null) return { kind: "blocked", reason: "Enter the combined disposal and transport-to-disposal cost per unit you would otherwise pay." };
      const result = computeSellerRecovery({
        quantity,
        disposalRatePerUnit: disposal,
        transportToDisposalRatePerUnit: transport,
        listingPricePerUnit: listing.priceNum,
      });
      return {
        kind: "ready",
        report: {
          role: "seller",
          currencyCode: listing.currencyCode,
          quantityUnit: listing.quantityUnit,
          quantity,
          tonnesPerUnit,
          listingPricePerUnit: listing.priceNum,
          inputs: { disposalRatePerUnit: disposal, transportToDisposalRatePerUnit: transport },
          result,
        },
      };
    }
    const baseline = typeof inputs.baselineDeliveredRate === "number" ? inputs.baselineDeliveredRate : null;
    if (baseline === null) return { kind: "blocked", reason: "Enter your current combined production and delivered cost per unit." };
    const result = computeBuyerSavings({
      quantity,
      baselineDeliveredRatePerUnit: baseline,
      listingPricePerUnit: listing.priceNum,
    });
    return {
      kind: "ready",
      report: {
        role: "buyer",
        currencyCode: listing.currencyCode,
        quantityUnit: listing.quantityUnit,
        quantity,
        tonnesPerUnit,
        listingPricePerUnit: listing.priceNum,
        inputs: { baselineDeliveredRatePerUnit: baseline },
        result,
      },
    };
  } catch (error) {
    return { kind: "blocked", reason: error instanceof Error ? error.message : "Invalid inputs." };
  }
}

function NumberField({
  label,
  hint,
  value,
  onChange,
  suffix,
  id,
}: {
  label: string;
  hint?: string;
  value: number | "";
  onChange: (v: number | "") => void;
  suffix?: string;
  id: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">{label}</label>
      <div className="flex">
        <input
          id={id}
          type="number"
          min={0}
          step="any"
          value={value === "" ? "" : value}
          onChange={(e) => onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
          className={`flex-1 border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20 ${suffix ? "rounded-l-lg border-r-0" : "rounded-lg"}`}
        />
        {suffix && <span className="rounded-r-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

export function ValueRecoverySummary({ report }: { report: ReportValueRecovery }) {
  const unit = describeUnit(report.quantityUnit);
  const money = (n: number) => formatMoney(n, report.currencyCode) ?? "—";
  if (report.result.role === "seller") {
    const r = report.result;
    return (
      <div className="rounded-2xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Estimated value recovered · {report.currencyCode}</p>
        <p className="mt-2 text-4xl font-bold text-neutral-900">{money(r.totalRecovery)}</p>
        <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div><p className="text-xs text-neutral-500">{AVOIDED_DISPOSAL_LABEL}</p><p className="font-bold text-neutral-900">{money(r.avoidedDisposalCost)}</p><p className="text-xs text-neutral-500">{money(r.avoidedDisposalRatePerUnit)} (disposal incl. transport) × {formatNumber(r.quantity, 3)} {unit.plural}</p></div>
          <div><p className="text-xs text-neutral-500">Sale proceeds</p><p className="font-bold text-neutral-900">{money(r.saleProceeds)}</p><p className="text-xs text-neutral-500">{money(report.listingPricePerUnit)} × {formatNumber(r.quantity, 3)} {unit.plural}</p></div>
          <div><p className="text-xs text-neutral-500">Total recovery</p><p className="font-bold text-green-700">{money(r.totalRecovery)}</p><p className="text-xs text-neutral-500">Avoided costs + proceeds</p></div>
        </div>
        <ul className="mt-4 flex flex-col gap-1 text-xs text-neutral-500">{r.exclusions.map((line) => <li key={line}>• {line}</li>)}</ul>
      </div>
    );
  }
  const r = report.result;
  const negative = r.savings < 0;
  return (
    <div className="rounded-2xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{negative ? "Estimated additional cost" : "Estimated savings"} · {report.currencyCode}</p>
      <p className={`mt-2 text-4xl font-bold ${negative ? "text-red-700" : "text-neutral-900"}`}>{money(r.savings)}</p>
      {negative && <p className="mt-1 text-xs text-red-700">The alternative purchase costs more than your baseline before shipping.</p>}
      <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
        <div><p className="text-xs text-neutral-500">Baseline delivered cost</p><p className="font-bold text-neutral-900">{money(r.baselineCost)}</p><p className="text-xs text-neutral-500">{money(report.inputs.baselineDeliveredRatePerUnit ?? 0)} × {formatNumber(r.quantity, 3)} {unit.plural}</p></div>
        <div><p className="text-xs text-neutral-500">Alternative purchase cost</p><p className="font-bold text-neutral-900">{money(r.purchaseCost)}</p><p className="text-xs text-neutral-500">{money(report.listingPricePerUnit)} × {formatNumber(r.quantity, 3)} {unit.plural}</p></div>
        <div><p className="text-xs text-neutral-500">Difference</p><p className={`font-bold ${negative ? "text-red-700" : "text-green-700"}`}>{money(r.savings)}</p><p className="text-xs text-neutral-500">Baseline − purchase</p></div>
      </div>
      <ul className="mt-4 flex flex-col gap-1 text-xs text-neutral-500">{r.exclusions.map((line) => <li key={line}>• {line}</li>)}</ul>
    </div>
  );
}

export function StepValueRecovery({
  inputs,
  listing,
  portal,
  metricTons,
  onChange,
}: {
  inputs: ValueRecoveryInputs;
  listing: Listing;
  portal: CalculatorPortal;
  metricTons: number;
  onChange: (patch: Partial<ValueRecoveryInputs>) => void;
}) {
  const unit = describeUnit(listing.quantityUnit);
  const resolution = resolveValueRecovery(inputs, listing, portal, metricTons);
  const priceLabel = listing.priceNum !== null ? `${formatMoney(listing.priceNum, listing.currencyCode)} per ${unit.singular}` : "Price unavailable";
  const derivedQuantity =
    typeof inputs.quantity === "number"
      ? null
      : unit.isMass
        ? quantityFromMetricTons(metricTons, unit.tonnesPerUnit)
        : typeof inputs.tonnesPerUnit === "number" && inputs.tonnesPerUnit > 0
          ? quantityFromMetricTons(metricTons, inputs.tonnesPerUnit)
          : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-neutral-900"><Coins className="size-6" />Step 4 — {portal === "seller" ? "Value recovery" : "Savings estimate"}</h2>
        <p className="mt-1 text-sm text-neutral-600">
          {portal === "seller"
            ? "Estimate what you recover by selling this feedstock instead of paying to dispose of it."
            : "Estimate what you save by buying this feedstock instead of your current baseline supply."}{" "}
          Optional — you can skip it and still get the carbon result.
        </p>
      </div>

      <div className="rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
        <p><span className="font-semibold text-neutral-900">{listing.title}</span> · listing price {priceLabel} · currency {listing.currencyCode}</p>
        <p className="mt-1 text-xs text-neutral-500">Calculations use the listing&apos;s recorded currency and pricing unit. No currency or unit conversion is applied.</p>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <input type="checkbox" checked={inputs.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} className="size-4 accent-neutral-900" />
        <span className="text-sm font-medium text-neutral-900">Include {portal === "seller" ? "a value-recovery" : "a savings"} estimate in this scenario</span>
      </label>

      {inputs.enabled && (
        <>
          {listing.priceNum === null ? (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800"><AlertTriangle className="mt-0.5 size-4 shrink-0" />This listing has no recorded price, so no monetary estimate can be produced.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumberField
                id="vr-quantity"
                label={`Quantity (${unit.plural})`}
                hint={
                  derivedQuantity !== null
                    ? `Blank uses the shipment weight from step 2: ${formatNumber(derivedQuantity, 3)} ${unit.plural}.`
                    : unit.isMass
                      ? "Blank uses the shipment weight from step 2."
                      : `Enter the quantity in ${unit.plural}, or set the weight per ${unit.singular} below.`
                }
                value={inputs.quantity}
                onChange={(v) => onChange({ quantity: v })}
                suffix={unit.short}
              />
              {!unit.isMass && (
                <NumberField
                  id="vr-basis"
                  label={`Weight of one ${unit.singular}`}
                  hint="Explicit basis so the tonnage from step 2 can be expressed in units."
                  value={inputs.tonnesPerUnit}
                  onChange={(v) => onChange({ tonnesPerUnit: v })}
                  suffix="t"
                />
              )}
              {portal === "seller" ? (
                <NumberField
                  id="vr-disposal"
                  label={`Disposal cost per ${unit.singular}, including transport to disposal`}
                  hint="The combined amount you would pay to dispose of this material: disposal fees plus transport to the disposal site."
                  value={inputs.disposalRate}
                  onChange={(v) => onChange({ disposalRate: v })}
                  suffix={listing.currencyCode}
                />
              ) : (
                <NumberField id="vr-baseline" label={`Baseline production + delivered cost per ${unit.singular}`} hint="Your current combined cost to produce or source and deliver this feedstock." value={inputs.baselineDeliveredRate} onChange={(v) => onChange({ baselineDeliveredRate: v })} suffix={listing.currencyCode} />
              )}
            </div>
          )}

          {resolution.kind === "blocked" && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{resolution.reason}</p>
          )}
          {resolution.kind === "ready" && <ValueRecoverySummary report={resolution.report} />}
        </>
      )}
    </div>
  );
}
