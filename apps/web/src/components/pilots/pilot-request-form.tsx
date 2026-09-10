"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { Truck } from "lucide-react";
import type { PilotConfig } from "@/lib/api-pilots";
import { createPilotRequest } from "@/lib/api-pilots";
import { describeBackendError, isBackendApiError } from "@/lib/backend-client";
import {
  EMPTY_PILOT_FORM,
  MAX_LOAD_COUNT,
  makeClientRequestId,
  tidyLabel,
  toPilotRequestWrite,
  validatePilotForm,
  type PilotFormError,
  type PilotFormValues,
  type PilotLoadChoice,
} from "@/lib/pilots";

const border = { border: "1px solid #E0E0E0" } as const;
const fieldClass =
  "w-full rounded-xl bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-neutral-900/20";

/** Rough guide only; truck sizes vary, so the tonnage field stays editable. */
const LOAD_OPTIONS: { value: PilotLoadChoice; title: string; hint: string }[] = [
  { value: "one", title: "One load", hint: "roughly 20–25 tons" },
  { value: "two", title: "Two loads", hint: "roughly 40–50 tons" },
  { value: "other", title: "Other", hint: "tell us below" },
];

function locationLabel(location: PilotConfig["locations"][number]) {
  const address = [location.addressLine1, location.city, location.stateProvince, location.postalCode].filter(Boolean).join(", ");
  return address ? `${location.name} · ${address}` : location.name;
}

/**
 * Buyer pilot request. Shows the seller's listing context, collects the trial
 * shape and delivers to a saved company site. No pricing is shown or
 * collected; the request is saved before any call is booked.
 */
export function PilotRequestForm({
  config,
  onCreated,
}: {
  config: PilotConfig;
  onCreated: (requestId: number) => void;
}) {
  const baseId = useId();
  const [values, setValues] = useState<PilotFormValues>(() => ({
    ...EMPTY_PILOT_FORM,
    deliveryLocationId: config.locations.length === 1 ? String(config.locations[0].id) : "",
  }));
  const [errors, setErrors] = useState<PilotFormError[]>([]);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; retryable: boolean } | null>(null);
  /** Reused across retries so an uncertain network result never creates two requests. */
  const clientRequestId = useRef(makeClientRequestId());

  const errorFor = (field: keyof PilotFormValues) => errors.find((e) => e.field === field)?.message;
  const update = <K extends keyof PilotFormValues>(field: K, value: PilotFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => current.filter((e) => e.field !== field));
  };
  const toggleConstraint = (constraint: string) =>
    update(
      "constraints",
      values.constraints.includes(constraint)
        ? values.constraints.filter((c) => c !== constraint)
        : [...values.constraints, constraint],
    );

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const found = validatePilotForm(values);
    setErrors(found);
    if (found.length > 0) {
      // The load choice is a radio group; focus its first option rather than the wrapper.
      const target = found[0].field === "loadChoice" ? `${baseId}-loadChoice-${LOAD_OPTIONS[0].value}` : `${baseId}-${found[0].field}`;
      document.getElementById(target)?.focus();
      return;
    }
    const body = toPilotRequestWrite(values, config.listing.id, clientRequestId.current);
    if (!body) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const created = await createPilotRequest(body);
      onCreated(created.id);
    } catch (error) {
      setSubmitError({
        message: describeBackendError(error, "Your pilot request could not be saved."),
        retryable: isBackendApiError(error) ? error.retryable : true,
      });
      setBusy(false);
    }
  };

  const noLocations = config.locations.length === 0;

  return (
    <form onSubmit={submit} noValidate className="rounded-2xl bg-white p-5 sm:p-8" style={border} aria-describedby={`${baseId}-intro`}>
      <h1 className="text-3xl font-bold text-neutral-900 sm:text-4xl">Request a pilot</h1>
      <p className="mt-2 text-base text-neutral-500">
        {[config.listing.title, tidyLabel(config.listing.locationLabel)].filter(Boolean).join(" · ")}
      </p>

      <div id={`${baseId}-intro`} className="mt-6 flex gap-4 rounded-2xl bg-neutral-900 px-5 py-5 text-base leading-relaxed text-neutral-200">
        <Truck className="mt-1 size-6 shrink-0 text-green-400" aria-hidden="true" />
        <p>
          A pilot is a trial run at plant scale. <strong className="font-bold text-white">EcoGlobe arranges it with you</strong> — we
          confirm availability with the seller, work out how the material can move, and talk you through the options before
          anything is committed.
        </p>
      </div>

      <fieldset className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <legend id={`${baseId}-loadChoice-label`} className="text-lg font-bold text-neutral-900">
            Roughly how much do you want to trial? <span className="text-red-600" aria-hidden="true">*</span>
          </legend>
          <span className="text-sm text-neutral-500">Most pilots are 1–3 loads</span>
        </div>
        <div
          className="mt-3 grid gap-3 sm:grid-cols-3"
          role="radiogroup"
          aria-labelledby={`${baseId}-loadChoice-label`}
          aria-describedby={errorFor("loadChoice") ? `${baseId}-loadChoice-error` : undefined}
          aria-invalid={!!errorFor("loadChoice")}
        >
          {LOAD_OPTIONS.map((option) => {
            const active = values.loadChoice === option.value;
            return (
              <button
                key={option.value}
                id={`${baseId}-loadChoice-${option.value}`}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update("loadChoice", option.value)}
                className={`rounded-2xl px-5 py-4 text-left transition ${active ? "bg-neutral-900 text-white" : "bg-white text-neutral-900 hover:bg-neutral-50"}`}
                style={active ? undefined : border}
              >
                <span className="block text-lg font-bold">{option.title}</span>
                <span className={`block text-sm ${active ? "text-neutral-300" : "text-neutral-500"}`}>{option.hint}</span>
              </button>
            );
          })}
        </div>
        {errorFor("loadChoice") && (
          <p id={`${baseId}-loadChoice-error`} className="mt-2 text-sm text-red-700" role="alert">
            {errorFor("loadChoice")}
          </p>
        )}
      </fieldset>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {values.loadChoice === "other" && (
          <div>
            <label htmlFor={`${baseId}-loadCount`} className="text-lg font-bold text-neutral-900">
              How many loads? <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id={`${baseId}-loadCount`}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_LOAD_COUNT}
              step={1}
              value={values.loadCount}
              onChange={(e) => update("loadCount", e.target.value)}
              className={`${fieldClass} mt-2`}
              style={border}
              aria-invalid={!!errorFor("loadCount")}
            />
            {errorFor("loadCount") && <p className="mt-1 text-sm text-red-700" role="alert">{errorFor("loadCount")}</p>}
          </div>
        )}
        <div>
          <label htmlFor={`${baseId}-approximateTonnage`} className="text-lg font-bold text-neutral-900">
            Approximate tonnage <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <div className="relative mt-2">
            <input
              id={`${baseId}-approximateTonnage`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder="e.g. 45"
              value={values.approximateTonnage}
              onChange={(e) => update("approximateTonnage", e.target.value)}
              className={`${fieldClass} pr-16`}
              style={border}
              aria-invalid={!!errorFor("approximateTonnage")}
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-neutral-500">tons</span>
          </div>
          {errorFor("approximateTonnage") ? (
            <p className="mt-1 text-sm text-red-700" role="alert">{errorFor("approximateTonnage")}</p>
          ) : (
            <p className="mt-1 text-sm text-neutral-500">A rough total across all loads is enough.</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${baseId}-deliveryLocationId`} className="text-lg font-bold text-neutral-900">
            Deliver to <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          {noLocations ? (
            <div className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
              Your company has no saved US delivery site yet.{" "}
              <Link href="/buyer/company" className="font-semibold underline">
                Add a site in Company settings
              </Link>{" "}
              and come back to this request.
            </div>
          ) : (
            <select
              id={`${baseId}-deliveryLocationId`}
              value={values.deliveryLocationId}
              onChange={(e) => update("deliveryLocationId", e.target.value)}
              className={`${fieldClass} mt-2 appearance-none`}
              style={border}
              aria-invalid={!!errorFor("deliveryLocationId")}
            >
              <option value="">Choose a saved site…</option>
              {config.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {locationLabel(location)}
                </option>
              ))}
            </select>
          )}
          {errorFor("deliveryLocationId") ? (
            <p className="mt-1 text-sm text-red-700" role="alert">{errorFor("deliveryLocationId")}</p>
          ) : (
            !noLocations && <p className="mt-1 text-sm text-neutral-500">Saved company sites. Domestic US deliveries only for now.</p>
          )}
        </div>
        <div>
          <label htmlFor={`${baseId}-neededBy`} className="text-lg font-bold text-neutral-900">
            Needed by
          </label>
          <input
            id={`${baseId}-neededBy`}
            type="text"
            placeholder="e.g. Mid October 2026"
            maxLength={240}
            value={values.neededBy}
            onChange={(e) => update("neededBy", e.target.value)}
            className={`${fieldClass} mt-2`}
            style={border}
          />
          {errorFor("neededBy") && <p className="mt-1 text-sm text-red-700" role="alert">{errorFor("neededBy")}</p>}
        </div>
      </div>

      <fieldset className="mt-6">
        <legend className="text-lg font-bold text-neutral-900">Receiving constraints</legend>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {config.constraints.map((constraint) => {
            const active = values.constraints.includes(constraint);
            return (
              <button
                key={constraint}
                type="button"
                aria-pressed={active}
                onClick={() => toggleConstraint(constraint)}
                className={`rounded-full px-5 py-2.5 text-base font-medium transition ${active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200"}`}
              >
                {constraint}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6">
        <label htmlFor={`${baseId}-objective`} className="text-lg font-bold text-neutral-900">
          What are you trying to establish?
        </label>
        <textarea
          id={`${baseId}-objective`}
          rows={4}
          maxLength={4000}
          value={values.objective}
          onChange={(e) => update("objective", e.target.value)}
          className={`${fieldClass} mt-2 resize-y`}
          style={border}
        />
        <p className="mt-1 text-sm text-neutral-500">Helps us brief the seller properly and set the right specification checks.</p>
      </div>

      <div className="mt-8 border-t pt-8" style={{ borderColor: "#F0F0F0" }}>
        {submitError && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {submitError.message}
            {submitError.retryable && " Retry keeps the same request key, so nothing is duplicated."}
          </div>
        )}
        <button
          type="submit"
          disabled={busy || noLocations}
          className="w-full rounded-full bg-neutral-900 px-6 py-4 text-lg font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving your request…" : "Request a call with EcoGlobe"}
        </button>
        <p className="mt-3 text-center text-sm text-neutral-500">No pricing is shown online. We work every pilot out with you directly.</p>
      </div>
    </form>
  );
}
