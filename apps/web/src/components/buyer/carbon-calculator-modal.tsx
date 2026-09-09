"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Truck,
  Train,
  Ship,
  Cable,
  CheckCircle2,
  Plus,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@eco-globe/ui";
import { useDemoUser, type Facility } from "@/lib/demo-user";
import { locationsToFacilities, useCompanyLocations } from "@/lib/use-company-locations";
import { describeUnit } from "@/lib/listing-format";
import { hasCoordinates, type Listing } from "@/components/public/browse-listings";
import { useListing, useListings } from "@/lib/use-listings";
import { CarbonGauge } from "./carbon-gauge";
import { ListingMap, type MapListing } from "@/components/public/listing-map";
import { generateCarbonReport, type ReportScenario } from "./carbon-report";
import {
  computeEmissionTons,
  distanceMiles,
  toMetricTons,
  TRANSPORT_BY_STATE,
  TRANSPORT_LABEL,
  RECURRENCE_OPTIONS,
  recurrenceMultiplier,
  type FeedstockState,
  type Recurrence,
  type TransportMode,
  type WeightUnit,
  WEIGHT_UNIT_LABEL,
} from "@/lib/carbon-emissions";
import {
  StepValueRecovery,
  ValueRecoverySummary,
  emptyValueRecoveryInputs,
  resolveValueRecovery,
  type CalculatorPortal,
  type ValueRecoveryInputs,
} from "./value-recovery-step";

export type { CalculatorPortal };
export type CalculatorStart = "distance" | "value-recovery";

interface Scenario {
  id: string;
  name: string;
  listingId: string;
  distanceSource: "profile" | "facility" | "manual";
  facilityId?: string;
  manualAddress: string;
  /** User-entered distance when routing from a saved facility is unavailable. */
  manualDistanceValue: number | "";
  manualDistanceUnit: "mi" | "km";
  miles: number;
  weightUnit: WeightUnit;
  weightValue: number;
  metricTons: number;
  state: FeedstockState;
  mode: TransportMode | null;
  emissionTons: number;
  valueRecovery: ValueRecoveryInputs;
}

const STEPS = [
  "Distance",
  "Weight",
  "Transport",
  "Value recovery",
  "Result",
  "Business as usual",
  "Compare",
  "Recommendation",
] as const;
const VALUE_STEP = 3;
const RESULT_STEP = 4;

function roundUpToRadius(miles: number): number {
  const buckets = [25, 50, 100, 200, 300, 500, 1000];
  for (const b of buckets) if (miles <= b) return b;
  return 1000;
}

function MODE_ICON(mode: TransportMode) {
  if (mode.includes("truck") || mode.includes("tanker") || mode.includes("wheeler")) return Truck;
  if (mode === "rail") return Train;
  if (mode.includes("barge")) return Ship;
  return Cable;
}

/** Carbon-calculator weight unit matching a listing's pricing unit, when one exists. */
function weightUnitForListing(quantityUnit: string): WeightUnit | null {
  switch (describeUnit(quantityUnit).code) {
    case "ton":
    case "tonne":
      return "metric-tons";
    case "kg":
      return "kilograms";
    case "lb":
      return "pounds";
    default:
      return null;
  }
}

/**
 * Seed the shipment weight explicitly from the listing's own unit: the buyer's
 * selected quantity when supplied, otherwise the seller's recorded quantity.
 * Unit-priced listings cannot seed a weight and start blank.
 */
function seedWeight(listing: Listing, initialQuantity?: number): { weightUnit: WeightUnit; weightValue: number } {
  const unit = weightUnitForListing(listing.quantityUnit);
  if (!unit) return { weightUnit: "metric-tons", weightValue: 0 };
  const quantity =
    initialQuantity !== undefined && Number.isFinite(initialQuantity) && initialQuantity > 0
      ? initialQuantity
      : listing.qtyNum ?? 0;
  return { weightUnit: unit, weightValue: quantity };
}

function newScenario(listing: Listing, defaultFacility?: Facility, initialQuantity?: number): Scenario {
  const seed = seedWeight(listing, initialQuantity);
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    name: `${listing.title} via —`,
    listingId: listing.id,
    distanceSource: defaultFacility ? "facility" : "manual",
    facilityId: defaultFacility?.id,
    manualAddress: "",
    manualDistanceValue: "",
    manualDistanceUnit: "mi",
    miles: 0,
    weightUnit: seed.weightUnit,
    weightValue: seed.weightValue,
    metricTons: Math.round(toMetricTons(seed.weightValue, seed.weightUnit) * 1000) / 1000,
    state: listing.state,
    mode: null,
    emissionTons: 0,
    valueRecovery: emptyValueRecoveryInputs(initialQuantity),
  };
}

function updateScenario(s: Scenario, listing: Listing, facilities: Facility[]): Scenario {
  let chosen: Facility | null = null;
  if (s.distanceSource === "facility" && s.facilityId) {
    chosen = facilities.find((f) => f.id === s.facilityId) ?? null;
  } else if (s.distanceSource === "profile") {
    chosen = facilities[0] ?? null;
  }

  let miles = 0;
  if (s.distanceSource !== "manual" && chosen?.lat && chosen?.lng && hasCoordinates(listing)) {
    miles = distanceMiles({ lat: listing.lat, lng: listing.lng }, { lat: chosen.lat, lng: chosen.lng });
  } else if (s.distanceSource === "manual" && typeof s.manualDistanceValue === "number" && s.manualDistanceValue > 0) {
    // Explicit user-entered distance; km → mi is a unit identity, not an estimate.
    miles = s.manualDistanceUnit === "km" ? s.manualDistanceValue * 0.621371 : s.manualDistanceValue;
  }
  miles = Math.round(miles * 10) / 10;

  const tons = toMetricTons(s.weightValue, s.weightUnit);
  const emissions = s.mode != null ? Math.round(computeEmissionTons(s.mode, tons, miles) * 1000) / 1000 : 0;

  return {
    ...s,
    miles,
    metricTons: Math.round(tons * 1000) / 1000,
    emissionTons: emissions,
    name:
      s.mode == null
        ? `${listing.title} via —`
        : s.name.endsWith(" via —")
          ? `${listing.title} via ${TRANSPORT_LABEL[s.mode]}`
          : s.name,
  };
}

interface Props {
  open: boolean;
  /** Persisted listing to seed the first scenario. */
  listing?: Listing;
  /** Loaded from the backend when `listing` is absent. */
  initialListingId?: string;
  /** Explicit portal context; defaults to the active session role. */
  portal?: CalculatorPortal;
  /** Buyer-selected quantity in the listing's pricing unit. */
  initialQuantity?: number;
  startAt?: CalculatorStart;
  onClose: () => void;
}

export function CarbonCalculatorModal({ open, listing, initialListingId, portal, initialQuantity, startAt, onClose }: Props) {
  const user = useDemoUser();
  const activePortal: CalculatorPortal = portal ?? (user?.role === "seller" ? "seller" : "buyer");
  // Facilities come from persisted company locations, never from browser-only
  // session fallbacks. Without a signed-in company the user enters a distance.
  const companyLocations = useCompanyLocations(user?.activeCompanyId, { enabled: open && !!user });
  const facilities = useMemo(() => locationsToFacilities(companyLocations.locations), [companyLocations.locations]);

  // Listing catalogue for scenarios: the seeded listing plus persisted
  // listings from the backend (owned for sellers, published for buyers).
  const catalogue = useListings(activePortal === "seller" && !!user ? "owned" : "public", { enabled: open });
  const seeded = useListing(initialListingId, activePortal === "seller" && !!user ? "owned" : "public", {
    enabled: open && !listing && !!initialListingId,
  });
  const listingsById = useMemo(() => {
    const map = new Map<string, Listing>();
    for (const l of catalogue.listings) map.set(l.id, l);
    if (seeded.listing) map.set(seeded.listing.id, seeded.listing);
    if (listing) map.set(listing.id, listing);
    return map;
  }, [catalogue.listings, seeded.listing, listing]);
  const initial = listing ?? seeded.listing ?? null;

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [bauTons, setBauTons] = useState<number | "">("");
  const [targetTons, setTargetTons] = useState<number | "">(2.5);
  const [recurrence, setRecurrence] = useState<Recurrence>("one-time");
  const [pickerListingId, setPickerListingId] = useState<string>("");

  // Reset when opened with a listing.
  useEffect(() => {
    if (!open || !initial) return;
    const first = updateScenario(newScenario(initial, facilities[0], initialQuantity), initial, facilities);
    setScenarios([first]);
    setActiveIdx(0);
    setStep(startAt === "value-recovery" ? VALUE_STEP : 0);
    setBauTons("");
    setTargetTons(2.5);
    setRecurrence("one-time");
    if (startAt === "value-recovery") {
      setScenarios([{ ...first, valueRecovery: { ...first.valueRecovery, enabled: true } }]);
    }
  }, [open, initial?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) setScenarios([]);
  }, [open]);

  // Backfill facility + miles once useDemoUser hydrates after mount.
  useEffect(() => {
    if (!open || facilities.length === 0) return;
    setScenarios((prev) =>
      prev.map((s) => {
        // Only backfill scenarios that never had a facility and have no user-entered distance.
        if (s.miles > 0 || s.facilityId || s.manualDistanceValue !== "") return s;
        const l = listingsById.get(s.listingId);
        if (!l) return s;
        return updateScenario({ ...s, distanceSource: "facility", facilityId: facilities[0].id }, l, facilities);
      }),
    );
  }, [open, facilities, listingsById]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const closeButton = (
    <button type="button" onClick={onClose} aria-label="Close calculator" className="flex size-10 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100">
      <X className="size-5" />
    </button>
  );

  // No seeded listing yet: loading, not found, or a picker over persisted listings.
  if (scenarios.length === 0 || !initial) {
    const loading = (initialListingId && seeded.status === "loading") || catalogue.status === "loading";
    return (
      <div className="fixed inset-0 z-[80] flex flex-col bg-neutral-50">
        <header className="flex items-center justify-between bg-white px-8 py-4" style={{ borderBottom: "1px solid #F0F0F0" }}>
          <div className="flex items-center gap-3"><TrendingDown className="size-6 text-neutral-900" /><h1 className="text-lg font-bold text-neutral-900">Carbon Calculator</h1></div>
          {closeButton}
        </header>
        <main className="mx-auto w-full max-w-[720px] px-8 py-10">
          {loading ? (
            <p className="text-sm text-neutral-600" role="status">Loading listings…</p>
          ) : initialListingId && seeded.status === "not-found" ? (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">That listing is not available. Choose another feedstock below.</p>
          ) : null}
          {!loading && (
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-sm font-medium text-neutral-900">Choose a feedstock to analyse</p>
              {catalogue.status === "error" && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{catalogue.error} <button type="button" className="font-semibold underline" onClick={catalogue.reload}>Retry</button></p>
              )}
              {catalogue.status === "ready" && catalogue.listings.length === 0 && (
                <p className="text-sm text-neutral-600">No {activePortal === "seller" ? "listings for your company" : "published listings"} are available yet.</p>
              )}
              {catalogue.listings.length > 0 && (
                <>
                  <select aria-label="Feedstock" value={pickerListingId} onChange={(e) => setPickerListingId(e.target.value)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none">
                    <option value="">Select a listing…</option>
                    {catalogue.listings.map((l) => <option key={l.id} value={l.id}>{l.title}{l.location ? ` — ${l.location}` : ""}</option>)}
                  </select>
                  <Button
                    variant="primary"
                    size="md"
                    disabled={!pickerListingId}
                    onClick={() => {
                      const chosen = listingsById.get(pickerListingId);
                      if (!chosen) return;
                      setScenarios([updateScenario(newScenario(chosen, facilities[0], initialQuantity), chosen, facilities)]);
                      setActiveIdx(0);
                      setStep(startAt === "value-recovery" ? VALUE_STEP : 0);
                    }}
                  >
                    Start
                  </Button>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  const active = scenarios[activeIdx];
  const activeListing = listingsById.get(active.listingId) ?? initial;

  const setActive = (patch: Partial<Scenario>) => {
    setScenarios((prev) => prev.map((s, i) => (i === activeIdx ? updateScenario({ ...s, ...patch }, activeListing, facilities) : s)));
  };
  const setActiveValue = (patch: Partial<ValueRecoveryInputs>) => {
    setScenarios((prev) => prev.map((s, i) => (i === activeIdx ? { ...s, valueRecovery: { ...s.valueRecovery, ...patch } } : s)));
  };

  const addScenario = (l: Listing = activeListing) => {
    if (scenarios.length >= 4) return;
    const next = updateScenario(newScenario(l, facilities[0]), l, facilities);
    setScenarios((prev) => [...prev, next]);
    setActiveIdx(scenarios.length);
    setStep(0);
  };

  const renameScenario = (name: string) => {
    setScenarios((prev) => prev.map((s, i) => (i === activeIdx ? { ...s, name } : s)));
  };

  const valueResolution = resolveValueRecovery(active.valueRecovery, activeListing, activePortal, active.metricTons);
  const capUnit = describeUnit(activeListing.quantityUnit);
  const weightCap =
    activeListing.qtyNum !== null && capUnit.isMass && capUnit.tonnesPerUnit !== null
      ? Math.round(activeListing.qtyNum * capUnit.tonnesPerUnit * 1000) / 1000
      : null;

  const canGoNext = (() => {
    switch (step) {
      case 0:
        return active.miles > 0;
      case 1:
        return active.metricTons > 0 && (weightCap === null || active.metricTons <= weightCap);
      case 2:
        return active.mode !== null;
      case VALUE_STEP:
        return valueResolution.kind !== "blocked";
      case RESULT_STEP:
      case 5:
        return true;
      case 6:
        return scenarios.length >= 1;
      default:
        return false;
    }
  })();

  const sortedScenarios = [...scenarios].sort((a, b) => a.emissionTons - b.emissionTons);
  const recurrenceMul = recurrenceMultiplier(recurrence);

  const buildReportScenarios = (): ReportScenario[] =>
    scenarios.map((s) => {
      const l = listingsById.get(s.listingId) ?? activeListing;
      const facility = s.facilityId ? facilities.find((f) => f.id === s.facilityId) : s.distanceSource === "profile" ? facilities[0] : undefined;
      const vr = resolveValueRecovery(s.valueRecovery, l, activePortal, s.metricTons);
      return {
        name: s.name,
        listing: l,
        miles: s.miles,
        metricTons: s.metricTons,
        weightValue: s.weightValue,
        weightUnit: s.weightUnit,
        state: s.state,
        mode: s.mode,
        emissionTons: s.emissionTons,
        facilityLabel: facility?.label ? `${facility.label} — ${facility.address}` : undefined,
        manualAddress:
          s.distanceSource === "manual"
            ? `${s.manualAddress ? `${s.manualAddress} — ` : ""}entered distance ${s.manualDistanceValue || 0} ${s.manualDistanceUnit}`
            : undefined,
        valueRecovery: vr.kind === "ready" ? vr.report : null,
      };
    });

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-neutral-50">
      <header className="flex items-center justify-between bg-white px-4 py-4 sm:px-8" style={{ borderBottom: "1px solid #F0F0F0" }}>
        <div className="flex items-center gap-3">
          <TrendingDown className="size-6 text-neutral-900" />
          <div>
            <h1 className="text-lg font-bold text-neutral-900">Carbon Calculator</h1>
            <p className="text-xs text-neutral-500">{activePortal === "seller" ? "Seller view: transport footprint and value recovery" : "Buyer view: transport footprint and savings"}</p>
          </div>
        </div>
        {closeButton}
      </header>

      <div className="border-b border-neutral-100 bg-white px-4 py-3 sm:px-8">
        <ol className="flex items-center gap-2 overflow-x-auto text-xs">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2 whitespace-nowrap">
              <button type="button" onClick={() => i <= step && setStep(i)} className={`flex items-center gap-2 rounded-full px-3 py-1 ${i === step ? "bg-neutral-900 text-white" : i < step ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                <span className="font-bold">{i + 1}</span>
                {label === "Value recovery" && activePortal === "buyer" ? "Savings" : label}
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="size-3 text-neutral-300" />}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-[260px] shrink-0 overflow-y-auto border-r border-neutral-100 bg-white p-4 md:block">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Scenarios</p>
          <div className="flex flex-col gap-2">
            {scenarios.map((s, i) => (
              <button key={s.id} type="button" onClick={() => setActiveIdx(i)} className={`flex flex-col gap-1 rounded-lg px-3 py-2 text-left text-sm transition-colors ${i === activeIdx ? "bg-neutral-900 text-white" : "bg-neutral-50 text-neutral-900 hover:bg-neutral-100"}`}>
                <span className="text-xs uppercase tracking-wide opacity-70">Scenario {i + 1}</span>
                <span className="line-clamp-2 text-sm font-medium">{s.name}</span>
                {s.emissionTons > 0 && <span className="text-xs opacity-80">{s.emissionTons.toFixed(2)} t CO₂eq</span>}
              </button>
            ))}
            {scenarios.length < 4 && (
              <div className="flex flex-col gap-2 rounded-lg border border-dashed border-neutral-300 p-3">
                <button type="button" onClick={() => addScenario()} className="flex items-center gap-2 text-sm text-neutral-700 hover:underline"><Plus className="size-4" />Add scenario (same feedstock)</button>
                {catalogue.listings.length > 0 && (
                  <select aria-label="Add scenario for another feedstock" className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs outline-none" value="" onChange={(e) => { const l = listingsById.get(e.target.value); if (l) addScenario(l); }}>
                    <option value="">Other feedstock…</option>
                    {catalogue.listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                  </select>
                )}
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-[720px]">
            {step === 0 && <StepDistance active={active} listing={activeListing} facilities={facilities} onChange={setActive} />}
            {step === 1 && <StepWeight active={active} listing={activeListing} cap={weightCap} onChange={setActive} />}
            {step === 2 && <StepTransport active={active} onChange={setActive} />}
            {step === VALUE_STEP && <StepValueRecovery inputs={active.valueRecovery} listing={activeListing} portal={activePortal} metricTons={active.metricTons} onChange={setActiveValue} />}
            {step === RESULT_STEP && <StepResult active={active} targetTons={targetTons} setTargetTons={setTargetTons} onRename={renameScenario} valueReport={valueResolution.kind === "ready" ? valueResolution.report : null} />}
            {step === 5 && <StepBau bauTons={bauTons} setBauTons={setBauTons} active={active} />}
            {step === 6 && <StepCompare scenarios={sortedScenarios} bauTons={bauTons} />}
            {step === 7 && (
              <StepRecommend
                scenarios={sortedScenarios}
                bauTons={bauTons}
                recurrence={recurrence}
                setRecurrence={setRecurrence}
                recurrenceMul={recurrenceMul}
                targetTons={targetTons}
                facilities={facilities}
                user={user}
                onCreateReport={() =>
                  generateCarbonReport({
                    scenarios: buildReportScenarios(),
                    bauTons: typeof bauTons === "number" ? bauTons : null,
                    targetTons: typeof targetTons === "number" ? targetTons : null,
                    recurrence,
                    recurrenceMul,
                    buyerName: user?.name,
                    buyerEmail: user?.email,
                    facilities,
                  })
                }
              />
            )}
          </div>
        </main>
      </div>

      <footer className="flex items-center justify-between bg-white px-4 py-4 sm:px-8" style={{ borderTop: "1px solid #F0F0F0" }}>
        <Button variant="secondary" size="md" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} style={step === 0 ? { opacity: 0.4, cursor: "not-allowed" } : undefined}>
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <p className="text-xs text-neutral-500">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        {step < STEPS.length - 1 ? (
          <Button variant="primary" size="md" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canGoNext} style={!canGoNext ? { opacity: 0.4, cursor: "not-allowed" } : undefined}>
            Next
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button variant="primary" size="md" onClick={onClose}>
            Done
            <CheckCircle2 className="size-4" />
          </Button>
        )}
      </footer>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-neutral-900">{label}</label>
      {children}
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

function StepDistance({ active, listing, facilities, onChange }: { active: Scenario; listing: Listing; facilities: Facility[]; onChange: (patch: Partial<Scenario>) => void }) {
  const mapListing: MapListing | null = hasCoordinates(listing)
    ? { id: listing.id, title: listing.title, location: listing.location, price: listing.price, unit: listing.unit, moq: listing.moq, co2: listing.co2, lng: listing.lng, lat: listing.lat, image: listing.image ?? undefined }
    : null;
  const originFacility =
    active.distanceSource === "facility" && active.facilityId
      ? facilities.find((f) => f.id === active.facilityId)
      : active.distanceSource === "profile"
        ? facilities[0]
        : undefined;
  const defaultRadius = active.miles > 0 ? roundUpToRadius(active.miles) : 250;
  const [radiusMiles, setRadiusMiles] = useState<number>(defaultRadius);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Step 1 — Calculate Distance</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Feedstock: <span className="font-medium text-neutral-900">{listing.title}</span>{" "}
          <span className="text-neutral-400">({listing.location || "location not provided"})</span>. Confirm the destination address below.
        </p>
        {!mapListing && (
          <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"><AlertTriangle className="mt-0.5 size-3 shrink-0" />This listing&apos;s facility has no saved coordinates, so distance from your sites cannot be computed. Enter an address manually to continue.</p>
        )}
      </div>

      <div className="relative h-[260px] overflow-hidden rounded-xl">
        {originFacility?.lat && originFacility?.lng && (
          <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs shadow" style={{ border: "1px solid #E0E0E0" }}>
            <span className="font-semibold text-neutral-700">Search radius</span>
            <select value={radiusMiles} onChange={(e) => setRadiusMiles(parseInt(e.target.value, 10))} className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs outline-none">
              <option value={0}>Off</option>
              {[25, 50, 100, 200, 300, 500, 1000].map((r) => <option key={r} value={r}>{r.toLocaleString()} mi</option>)}
            </select>
          </div>
        )}
        <ListingMap listings={mapListing ? [mapListing] : []} activeId={listing.id} origin={originFacility?.lat && originFacility?.lng ? { lng: originFacility.lng, lat: originFacility.lat, label: originFacility.label } : undefined} radiusMiles={radiusMiles > 0 ? radiusMiles : undefined} />
      </div>

      <div className="flex flex-col gap-3">
        {facilities.length > 0 && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4">
            <input type="radio" name="distance-source" checked={active.distanceSource === "profile"} onChange={() => onChange({ distanceSource: "profile" })} className="mt-1 size-4 accent-neutral-900" />
            <div className="flex-1"><p className="text-sm font-bold text-neutral-900">My profile address</p><p className="text-xs text-neutral-500">{facilities[0]?.address}</p></div>
          </label>
        )}
        {facilities.length > 1 && (
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="radio" name="distance-source" checked={active.distanceSource === "facility"} onChange={() => onChange({ distanceSource: "facility" })} className="mt-1 size-4 accent-neutral-900" />
              <div className="flex-1"><p className="text-sm font-bold text-neutral-900">Pick a facility</p><p className="text-xs text-neutral-500">Useful when your company has multiple sites.</p></div>
            </label>
            {active.distanceSource === "facility" && (
              <div className="mt-3 flex flex-col gap-2 pl-7">
                {facilities.map((f) => (
                  <label key={f.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="radio" name="facility" checked={active.facilityId === f.id} onChange={() => onChange({ facilityId: f.id })} className="size-4 accent-neutral-900" />
                    <span>{f.label} <span className="text-neutral-500">— {f.address}</span></span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        {facilities.length === 0 && (
          <p className="rounded-lg bg-neutral-100 px-4 py-3 text-xs text-neutral-600">
            No saved facilities are available for your company, so enter the shipping distance yourself.
          </p>
        )}
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="radio" name="distance-source" checked={active.distanceSource === "manual"} onChange={() => onChange({ distanceSource: "manual" })} className="mt-1 size-4 accent-neutral-900" />
            <div className="flex-1"><p className="text-sm font-bold text-neutral-900">Enter the distance manually</p><p className="text-xs text-neutral-500">Use this when the route from a saved facility is unavailable. No distance is assumed for you.</p></div>
          </label>
          {active.distanceSource === "manual" && (
            <div className="mt-3 ml-7 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_1fr]">
              <div className="flex flex-col gap-1">
                <label htmlFor="manual-distance" className="text-xs font-medium text-neutral-700">Distance</label>
                <input id="manual-distance" type="number" min={0} step="any" value={active.manualDistanceValue === "" ? "" : active.manualDistanceValue} onChange={(e) => onChange({ manualDistanceValue: e.target.value === "" ? "" : parseFloat(e.target.value) })} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20" />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="manual-distance-unit" className="text-xs font-medium text-neutral-700">Unit</label>
                <select id="manual-distance-unit" value={active.manualDistanceUnit} onChange={(e) => onChange({ manualDistanceUnit: e.target.value as "mi" | "km" })} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none">
                  <option value="mi">miles</option>
                  <option value="km">kilometres</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="manual-address" className="text-xs font-medium text-neutral-700">Destination label (optional)</label>
                <input id="manual-address" type="text" placeholder="Street, city, state" value={active.manualAddress} onChange={(e) => onChange({ manualAddress: e.target.value })} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-neutral-100 px-4 py-3 text-sm">
        <MapPin className="size-4 text-neutral-700" />
        <span className="text-neutral-700">Distance to feedstock: <span className="font-bold text-neutral-900">{active.miles > 0 ? `${active.miles.toFixed(1)} mi` : "—"}</span></span>
      </div>
    </div>
  );
}

function StepWeight({ active, listing, cap, onChange }: { active: Scenario; listing: Listing; cap: number | null; onChange: (patch: Partial<Scenario>) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Step 2 — Confirm weight</h2>
        <p className="mt-1 text-sm text-neutral-600">
          {cap !== null
            ? `Volume defaults to your selected quantity or the seller's total offer, in the listing's own unit (${describeUnit(listing.quantityUnit).plural}). Cap is ${cap} metric tonnes.`
            : listing.quantityUnit === "unit"
              ? "This listing is priced per unit; enter the shipment weight for the transport estimate."
              : "The seller has not recorded an available quantity; enter the shipment weight."}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Amount">
          <input type="number" min={0} value={active.weightValue} onChange={(e) => onChange({ weightValue: parseFloat(e.target.value) || 0 })} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20" />
        </Field>
        <Field label="Unit">
          <select value={active.weightUnit} onChange={(e) => onChange({ weightUnit: e.target.value as WeightUnit })} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20">
            {Object.entries(WEIGHT_UNIT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
      <div className="rounded-lg bg-neutral-100 px-4 py-3 text-sm">
        Resolved as <span className="font-bold text-neutral-900">{active.metricTons.toFixed(2)} metric tons</span>
        {cap !== null && active.metricTons > cap && <span className="ml-2 font-semibold text-red-600">(exceeds seller&apos;s {cap}-ton offer)</span>}
      </div>
    </div>
  );
}

function StepTransport({ active, onChange }: { active: Scenario; onChange: (patch: Partial<Scenario>) => void }) {
  const modes = TRANSPORT_BY_STATE[active.state];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Step 3 — Transportation</h2>
        <p className="mt-1 text-sm text-neutral-600">Pick the feedstock state and a transport mode. Available modes filter by state.</p>
      </div>
      <Field label="Feedstock state">
        <select value={active.state} onChange={(e) => onChange({ state: e.target.value as FeedstockState, mode: null })} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20">
          <option value="Solid">Solid</option>
          <option value="Liquid">Liquid</option>
          <option value="Gas">Gas</option>
        </select>
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {modes.map((mode) => {
          const Icon = MODE_ICON(mode);
          const selected = active.mode === mode;
          return (
            <button key={mode} type="button" onClick={() => onChange({ mode })} className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${selected ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50"}`}>
              <Icon className="size-5 shrink-0" />
              <span className="text-sm font-medium">{TRANSPORT_LABEL[mode]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepResult({ active, targetTons, setTargetTons, onRename, valueReport }: { active: Scenario; targetTons: number | ""; setTargetTons: (n: number | "") => void; onRename: (name: string) => void; valueReport: ReportScenario["valueRecovery"] }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Step 5 — Result</h2>
        <p className="mt-1 text-sm text-neutral-600">Estimated transportation footprint for this scenario{valueReport ? " and the value estimate you entered" : ""}.</p>
      </div>
      <div className="rounded-2xl bg-white p-8 text-center" style={{ border: "1px solid #F0F0F0" }}>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Estimated CO₂eq</p>
        <p className="mt-3 text-5xl font-bold text-neutral-900">{active.emissionTons.toFixed(2)}<span className="ml-2 text-lg text-neutral-500">tons</span></p>
        <div className="mt-6 grid grid-cols-3 gap-4 text-left">
          <div><p className="text-xs text-neutral-500">Distance</p><p className="text-sm font-bold text-neutral-900">{active.miles.toFixed(1)} mi</p></div>
          <div><p className="text-xs text-neutral-500">Volume</p><p className="text-sm font-bold text-neutral-900">{active.metricTons.toFixed(2)} t</p></div>
          <div><p className="text-xs text-neutral-500">Mode</p><p className="text-sm font-bold text-neutral-900">{active.mode ? TRANSPORT_LABEL[active.mode] : "—"}</p></div>
        </div>
      </div>
      {valueReport && <ValueRecoverySummary report={valueReport} />}
      <Field label="Name this scenario">
        <input type="text" value={active.name} onChange={(e) => onRename(e.target.value)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20" />
      </Field>
      <Field label="Maximum carbon footprint target" hint="Used to compare the selected feedstock against your internal budget.">
        <input type="number" min={0} placeholder="e.g. 2.5" value={targetTons === "" ? "" : targetTons} onChange={(e) => setTargetTons(e.target.value === "" ? "" : parseFloat(e.target.value))} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20" />
      </Field>
      {active.emissionTons > 0 && (
        <CarbonGauge markers={[{ label: active.name || "Feedstock 1", value: active.emissionTons, color: "#1F5F3A" }, ...(typeof targetTons === "number" && targetTons > 0 ? [{ label: "User target", value: targetTons, color: "#D97706", dashed: true }] : [])]} />
      )}
    </div>
  );
}

function StepBau({ bauTons, setBauTons, active }: { bauTons: number | ""; setBauTons: (n: number | "") => void; active: Scenario }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Step 6 — Business as usual</h2>
        <p className="mt-1 text-sm text-neutral-600">Optional. Enter your current annual transportation footprint so we can compare.</p>
      </div>
      <Field label="Current annual CO₂eq" hint="Leave blank to skip the comparison.">
        <input type="number" min={0} placeholder="e.g. 3.6" value={bauTons === "" ? "" : bauTons} onChange={(e) => setBauTons(e.target.value === "" ? "" : parseFloat(e.target.value))} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20" />
      </Field>
      {typeof bauTons === "number" && bauTons > 0 && (
        <CarbonGauge markers={[{ label: active.name || "Feedstock 1", value: active.emissionTons, color: "#1F5F3A" }, { label: "Business as Usual", value: bauTons, color: "#525252" }]} />
      )}
    </div>
  );
}

function StepCompare({ scenarios, bauTons }: { scenarios: Scenario[]; bauTons: number | "" }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Step 7 — Compare scenarios</h2>
        <p className="mt-1 text-sm text-neutral-600">Sorted by smallest footprint. Add up to 4 scenarios from the left rail.</p>
      </div>
      <CarbonGauge markers={[...(typeof bauTons === "number" && bauTons > 0 ? [{ label: "Business as Usual", value: bauTons, color: "#525252" }] : []), ...scenarios.map((s, i) => ({ label: s.name || `Feedstock ${i + 1}`, value: s.emissionTons, color: i === 0 ? "#1F5F3A" : i === 1 ? "#378853" : "#84CC16" }))]} />
    </div>
  );
}

function StepRecommend({ scenarios, bauTons, recurrence, setRecurrence, recurrenceMul, targetTons, onCreateReport }: { scenarios: Scenario[]; bauTons: number | ""; recurrence: Recurrence; setRecurrence: (r: Recurrence) => void; recurrenceMul: number; targetTons: number | ""; facilities: Facility[]; user: ReturnType<typeof useDemoUser>; onCreateReport: () => void }) {
  const best = scenarios[0];
  const second = scenarios[1];
  const baseline = typeof bauTons === "number" ? bauTons : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Step 8 — Recommendation</h2>
        <p className="mt-1 text-sm text-neutral-600">Lowest-footprint scenario wins. Add a recurrence below to see annualized impact.</p>
      </div>
      <div className="rounded-2xl bg-green-50 p-6" style={{ border: "1px solid #BBF7D0" }}>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-6 text-green-700" />
          <div><p className="text-xs font-semibold uppercase tracking-wide text-green-700">Recommended</p><p className="text-lg font-bold text-neutral-900">{best.name}</p></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-6 text-sm sm:grid-cols-3">
          <div><p className="text-xs text-neutral-500">Per shipment</p><p className="font-bold text-neutral-900">{best.emissionTons.toFixed(2)} t CO₂eq</p></div>
          <div><p className="text-xs text-neutral-500">Annualized ({recurrence})</p><p className="font-bold text-neutral-900">{(best.emissionTons * recurrenceMul).toFixed(2)} t CO₂eq</p></div>
          {baseline != null && <div><p className="text-xs text-neutral-500">Annual savings vs BAU</p><p className="font-bold text-green-700">{Math.max(0, baseline * recurrenceMul - best.emissionTons * recurrenceMul).toFixed(2)} t CO₂eq</p></div>}
        </div>
      </div>
      <Field label="Recurrence">
        <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20">
          {RECURRENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} (×{o.multiplier})</option>)}
        </select>
      </Field>
      <CarbonGauge title="Estimated Transportation Carbon footprint (per shipment)" markers={[...(baseline != null ? [{ label: "Business as Usual", value: baseline, color: "#525252" }] : []), ...(typeof targetTons === "number" && targetTons > 0 ? [{ label: "User target", value: targetTons, color: "#D97706", dashed: true }] : []), ...scenarios.map((s, i) => ({ label: s.name || `Feedstock ${i + 1}`, value: s.emissionTons, color: i === 0 ? "#1F5F3A" : i === 1 ? "#378853" : "#84CC16" }))]} />
      <CumulativeImpactChart bestTons={best.emissionTons} baselineTons={baseline} recurrenceMul={recurrenceMul} />
      {second && (
        <div className="rounded-xl bg-white p-4" style={{ border: "1px solid #F0F0F0" }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Second-best</p>
          <p className="mt-1 text-sm font-bold text-neutral-900">{second.name}</p>
          <p className="mt-1 text-xs text-neutral-500">{second.emissionTons.toFixed(2)} t CO₂eq per shipment</p>
        </div>
      )}
      <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-4">
        <div>
          <p className="text-sm font-bold text-neutral-900">Create report</p>
          <p className="text-xs text-neutral-500">Includes assumptions, inputs, calculations, value estimates, results, comparison, and recommendations.{typeof targetTons === "number" ? ` Target: ${targetTons.toFixed(2)} t CO2eq.` : ""}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onCreateReport}>Create report</Button>
      </div>
    </div>
  );
}

function CumulativeImpactChart({ bestTons, baselineTons, recurrenceMul }: { bestTons: number; baselineTons: number | null; recurrenceMul: number }) {
  const months = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"];
  const annualShipments = Math.max(1, recurrenceMul);
  const monthlyShipments = annualShipments / 12;
  const monthlyAvoided = baselineTons != null ? Math.max(0, baselineTons - bestTons) * monthlyShipments : Math.max(0.1, bestTons * 0.35) * monthlyShipments;
  const monthlyWaste = Math.max(1, monthlyShipments * 22.5);
  const carbonValues = months.map((_, i) => monthlyAvoided * (i + 1));
  const wasteValues = months.map((_, i) => monthlyWaste * (i + 1));
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <MiniCumulativeChart title="Cumulative CO2 reduction" unit="t CO2e abated" values={carbonValues} max={Math.max(...carbonValues, 1)} />
      <MiniCumulativeChart title="Cumulative avoided waste" unit="tons diverted" values={wasteValues} max={Math.max(...wasteValues, 1)} />
    </div>
  );
}

function MiniCumulativeChart({ title, unit, values, max }: { title: string; unit: string; values: number[]; max: number }) {
  return (
    <div className="rounded-xl bg-white p-4" style={{ border: "1px solid #F0F0F0" }}>
      <p className="text-sm font-bold text-neutral-900">{title}</p>
      <p className="mb-3 text-xs text-neutral-500">{unit} over the next 12 months</p>
      <div className="flex h-32 items-end gap-1">
        {values.map((value, i) => (
          <div key={i} className="flex h-full flex-1 items-end overflow-hidden rounded-t" title={`M${i + 1}: ${value.toFixed(2)} ${unit}`}>
            <div className="w-full rounded-t bg-green-700" style={{ height: `${Math.max(4, (value / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-[10px] text-neutral-400">{values.map((_, i) => <div key={i} className="flex-1 text-center">{i % 3 === 0 ? `M${i + 1}` : ""}</div>)}</div>
      <p className="mt-2 text-xs font-semibold text-neutral-700">Total: {values[values.length - 1]?.toFixed(1)} {unit}</p>
    </div>
  );
}
