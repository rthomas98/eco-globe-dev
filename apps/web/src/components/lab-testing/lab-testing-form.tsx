"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FlaskConical, RefreshCw, Lock } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { describeBackendError, isBackendApiError } from "@/lib/backend-client";
import {
  createLabRequest,
  fetchLabConfig,
  LAB_GROUP_CODES,
  LAB_TURNAROUND_CODES,
  type LabConfig,
  type LabGroupCode,
  type LabOptionalTest,
  type LabRequest,
  type LabTurnaround,
} from "@/lib/lab-testing-api";
import {
  EMPTY_LAB_FORM,
  LAB_GROUP_FALLBACK,
  MAX_CONCERNS_LENGTH,
  SCOPE_TO_BE_CONFIRMED,
  makeIdempotencyKey,
  toLabRequestScope,
  turnaroundLabel,
  validateLabForm,
  type LabFormError,
  type LabFormValues,
} from "@/lib/lab-testing";

/** Minimal listing context the form needs; both entry points can supply it. */
export interface LabTestingListingContext {
  id: number;
  title: string;
  sellerCompanyName?: string | null;
  location?: string | null;
}

export interface LabTestingFormProps {
  listing: LabTestingListingContext;
  /** Present when the request is placed from an existing sample request. */
  sampleRequestId?: number | null;
  /** Called with the persisted request after a successful submission. */
  onSubmitted?: (request: LabRequest) => void;
  onCancel?: () => void;
  /** Wording for the secondary action under the submit button. */
  cancelLabel?: string;
  /** Heading level for the form title so it nests correctly in the host page. */
  headingId?: string;
  /** Focus the first control on mount (dialogs). */
  autoFocus?: boolean;
}

type ConfigState =
  | { status: "loading" }
  | { status: "ready"; config: LabConfig }
  | { status: "error"; message: string; retryable: boolean };

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string; retryable: boolean; signInRequired: boolean }
  | { status: "done"; request: LabRequest };

const inputBorder = { border: "1px solid #E0E0E0" } as const;
/** Emphasised outline for the always-included panel and any selected card. */
const strongBorder = { border: "1.5px solid #090909" } as const;

interface FormGroup {
  code: LabGroupCode;
  label: string;
  question: string;
  /** Optional tests the backend allows for this listing, in this group. */
  tests: LabOptionalTest[];
}

/**
 * The backend returns one flat optional-test list. For an unpublished panel it
 * is exactly the four generic concern questions (one per group); for a
 * published panel it is the panel's named add-on tests. Either way the form
 * shows four groups with a plain-English question.
 */
function groupsFromConfig(config: LabConfig | null): FormGroup[] {
  const tests = config?.optionalTests ?? [];
  return LAB_GROUP_CODES.map((code) => ({
    code,
    label: LAB_GROUP_FALLBACK[code].label,
    question: LAB_GROUP_FALLBACK[code].question,
    tests: tests.filter((t) => t.group === code),
  }));
}

/** True when the group's only option is the generic concern question itself. */
function isConcernOnly(group: FormGroup) {
  return group.tests.length === 1 && group.tests[0].id.endsWith("-concern");
}

const TURNAROUNDS = LAB_TURNAROUND_CODES.map((code) => ({ code, label: turnaroundLabel(code) }));

/**
 * Reusable laboratory testing referral form. Used on the listing page and
 * inside the sample request. Every submission carries an idempotency key
 * that survives retries so a flaky network never creates two records.
 */
export function LabTestingForm({
  listing,
  sampleRequestId = null,
  onSubmitted,
  onCancel,
  cancelLabel = "Cancel",
  headingId,
  autoFocus = false,
}: LabTestingFormProps) {
  const baseId = useId();
  const ids = useMemo(
    () => ({
      heading: headingId ?? `${baseId}-heading`,
      errors: `${baseId}-errors`,
      concerns: `${baseId}-concerns`,
      turnaround: `${baseId}-turnaround`,
      sharing: `${baseId}-sharing`,
      consent: `${baseId}-consent`,
      panel: `${baseId}-panel`,
    }),
    [baseId, headingId],
  );

  const [configState, setConfigState] = useState<ConfigState>({ status: "loading" });
  const [values, setValues] = useState<LabFormValues>(EMPTY_LAB_FORM);
  const [errors, setErrors] = useState<LabFormError[]>([]);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  const idempotencyKey = useRef<string>(makeIdempotencyKey());
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const firstControlRef = useRef<HTMLInputElement | null>(null);
  const [configVersion, setConfigVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setConfigState({ status: "loading" });
    fetchLabConfig(listing.id)
      .then((config) => {
        if (!cancelled) setConfigState({ status: "ready", config });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setConfigState({
          status: "error",
          message: describeBackendError(error, "The testing options could not be loaded."),
          retryable: !isBackendApiError(error) || error.retryable || error.kind === "not-found",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [listing.id, configVersion]);

  useEffect(() => {
    if (autoFocus && configState.status === "ready") firstControlRef.current?.focus();
  }, [autoFocus, configState.status]);

  const config = configState.status === "ready" ? configState.config : null;
  const groups = useMemo(() => groupsFromConfig(config), [config]);
  const panel = config?.panel && config.panel.status === "published" && !config.scopeToBeConfirmed ? config.panel : null;
  const categoryLabel = config?.panel?.name ?? null;

  const toggle = useCallback((id: string) => {
    setValues((prev) => {
      const set = new Set(prev.optionalTestIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, optionalTestIds: Array.from(set) };
    });
  }, []);

  const errorFor = (field: LabFormError["field"]) => errors.find((e) => e.field === field)?.message;

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (submit.status === "submitting") return;
    const validation = validateLabForm(values);
    setErrors(validation);
    if (validation.length > 0) {
      window.setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }
    const scope = toLabRequestScope(values);
    setSubmit({ status: "submitting" });
    try {
      const request = await createLabRequest({
        listingId: listing.id,
        sampleRequestId,
        idempotencyKey: idempotencyKey.current,
        panelId: panel?.id ?? null,
        panelVersion: panel?.version ?? null,
        optionalTestIds: scope.optionalTestIds,
        concerns: scope.concerns,
        turnaround: (values.turnaround ?? "standard") as LabTurnaround,
        sharing: scope.sharing,
      });
      // A fresh key for any later request; this one is consumed.
      idempotencyKey.current = makeIdempotencyKey();
      setSubmit({ status: "done", request });
      onSubmitted?.(request);
    } catch (error: unknown) {
      const backend = isBackendApiError(error) ? error : null;
      // 409 = the testing scope changed underneath the form; reload options and let the user resend.
      if (backend?.kind === "conflict") setConfigVersion((v) => v + 1);
      setSubmit({
        status: "error",
        message: describeBackendError(error, "The request could not be sent."),
        retryable: backend ? backend.retryable || backend.kind === "conflict" : true,
        signInRequired: backend?.kind === "unauthorized",
      });
      window.setTimeout(() => errorSummaryRef.current?.focus(), 0);
    }
  };

  const listingLine = [
    config?.listingTitle ?? listing.title,
    config?.sellerCompanyName ?? listing.sellerCompanyName,
    config?.locationLabel ?? listing.location,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part)
    .join(" · ");

  if (submit.status === "done") {
    return (
      <div className="flex flex-col gap-4" aria-labelledby={ids.heading}>
        <h2 id={ids.heading} className="flex items-center gap-2 text-[26px] font-bold leading-tight text-neutral-900 sm:text-[30px]">
          <FlaskConical className="size-6" aria-hidden="true" /> Request sent to EcoGlobe
        </h2>
        <p className="text-[15px] leading-6 text-neutral-700" role="status">
          Reference <span className="font-mono font-semibold">LAB-{submit.request.id}</span> for {listing.title}.
          EcoGlobe confirms the laboratory, the scope, the cost and the turnaround with you before anything is
          booked. Nothing is charged now.
        </p>
        {submit.request.panelId === null && (
          <p className="rounded-xl bg-neutral-50 px-5 py-4 text-[15px] text-neutral-700">{SCOPE_TO_BE_CONFIRMED}.</p>
        )}
        <p className="text-sm text-neutral-500">
          {submit.request.sharing === "shared"
            ? "You chose to share the report with the seller and the listing. You can withdraw that consent from your Documents page at any time."
            : "The report stays private to your company. Only your company and EcoGlobe staff can open it."}
        </p>
        {onCancel && (
          <div className="flex justify-end">
            <Button type="button" variant="primary" size="lg" onClick={onCancel}>Done</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-7" onSubmit={(e) => void handleSubmit(e)} noValidate aria-labelledby={ids.heading}>
      <div>
        <h2 id={ids.heading} className="text-[26px] font-bold leading-tight text-neutral-900 sm:text-[30px]">Request lab testing</h2>
        <p className="mt-1.5 text-base text-neutral-600">{listingLine}</p>
        {sampleRequestId ? (
          <p className="mt-1 text-sm text-neutral-500">Linked to sample request #{sampleRequestId}: the same sample can go to the laboratory.</p>
        ) : null}
      </div>

      <p className="flex items-start gap-3 rounded-xl bg-emerald-50 px-5 py-4 text-[15px] leading-6 text-emerald-950">
        <FlaskConical className="mt-1 size-4 shrink-0 text-emerald-800" aria-hidden="true" />
        <span>
          EcoGlobe arranges independent testing with a third-party laboratory. Tick what you need; we come back with the
          laboratory, the cost and the turnaround before anything is booked.
        </span>
      </p>

      {(errors.length > 0 || submit.status === "error") && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          id={ids.errors}
          className="rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 outline-none focus:ring-2 focus:ring-red-300"
        >
          {errors.length > 0 ? (
            <>
              <p className="font-semibold">Please check the following:</p>
              <ul className="mt-1 list-disc pl-5">
                {errors.map((e) => (
                  <li key={e.field}>
                    <a href={`#${ids[e.field === "consentToShare" ? "consent" : e.field]}`} className="underline">{e.message}</a>
                  </li>
                ))}
              </ul>
            </>
          ) : submit.status === "error" ? (
            <div className="flex flex-col gap-2">
              <p>{submit.message}</p>
              {submit.signInRequired ? (
                <Link href="/login" className="inline-flex items-center gap-1 font-semibold underline"><Lock className="size-3" aria-hidden="true" /> Sign in and try again</Link>
              ) : submit.retryable ? (
                <button type="button" onClick={() => void handleSubmit()} className="inline-flex w-fit items-center gap-1 font-semibold underline">
                  <RefreshCw className="size-3" aria-hidden="true" /> Retry (your entries are kept)
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {/* Category panel */}
      <section aria-labelledby={ids.panel}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 id={ids.panel} className="text-lg font-bold text-neutral-900">
            {panel ? `Standard panel — ${panel.name}` : "Standard panel"}
          </h3>
          {panel ? (
            <span className="text-[15px] font-bold text-emerald-700">Always included</span>
          ) : (
            <span className="text-sm font-semibold text-neutral-500">{SCOPE_TO_BE_CONFIRMED}</span>
          )}
        </div>
        {configState.status === "loading" && (
          <p className="rounded-xl bg-neutral-50 px-5 py-4 text-[15px] text-neutral-600" role="status">Loading testing options…</p>
        )}
        {configState.status === "error" && (
          <div className="rounded-xl bg-neutral-50 px-5 py-4 text-[15px] text-neutral-700" role="status">
            <p>{configState.message} You can still send the request; the scope is confirmed with you afterwards.</p>
            <button type="button" onClick={() => setConfigVersion((v) => v + 1)} className="mt-1 inline-flex items-center gap-1 font-semibold underline">
              <RefreshCw className="size-3" aria-hidden="true" /> Retry loading options
            </button>
          </div>
        )}
        {configState.status === "ready" && (panel ? (
          <ul className="flex flex-wrap gap-2 rounded-xl bg-neutral-50 px-5 py-4" style={strongBorder} aria-label="Tests in the standard panel">
            {panel.tests.map((test) => (
              <li key={test} className="rounded-full bg-neutral-200/70 px-4 py-1.5 text-[15px] font-medium text-neutral-800">{test}</li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-neutral-50 px-5 py-4 text-[15px] leading-6 text-neutral-700" style={inputBorder}>
            {categoryLabel
              ? `The standard panel for ${categoryLabel} is still being confirmed with a laboratory. EcoGlobe confirms the exact scope with you before booking.`
              : "This listing's category does not yet have a confirmed standard panel. EcoGlobe confirms the exact scope with you before booking."}
          </p>
        ))}
      </section>

      {/* Optional test groups */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 flex w-full flex-wrap items-baseline justify-between gap-2">
          <span className="text-lg font-bold text-neutral-900">Add anything else you need</span>
          <span className="text-[15px] text-neutral-500">Optional · quoted with the panel</span>
        </legend>
        {groups.map((group, index) => {
          const concernOnly = isConcernOnly(group);
          const concernId = concernOnly ? group.tests[0].id : null;
          const groupChecked = concernId
            ? values.optionalTestIds.includes(concernId)
            : group.tests.some((t) => values.optionalTestIds.includes(t.id));
          const groupInputId = `${baseId}-group-${group.code}`;
          return (
            <div key={group.code} className="rounded-xl bg-white px-5 py-4" style={groupChecked ? strongBorder : inputBorder}>
              <div className="flex items-start gap-3">
                {concernId ? (
                  <input
                    ref={index === 0 ? firstControlRef : undefined}
                    id={groupInputId}
                    type="checkbox"
                    className="mt-1 size-5 shrink-0 rounded accent-neutral-900"
                    checked={groupChecked}
                    onChange={() => toggle(concernId)}
                  />
                ) : (
                  <span className="mt-1 size-5 shrink-0" aria-hidden="true" />
                )}
                <label htmlFor={concernId ? groupInputId : undefined} className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                  <span className="text-lg font-bold text-neutral-900">{group.label}</span>
                  <span className="text-[15px] text-neutral-400">{group.question}</span>
                </label>
              </div>
              {!concernOnly && group.tests.length > 0 ? (
                <fieldset className="mt-3 flex flex-wrap gap-2 sm:pl-8">
                  <legend className="sr-only">Tests in {group.label}</legend>
                  {group.tests.map((test, testIndex) => {
                    const testId = `${baseId}-test-${test.id}`;
                    const on = values.optionalTestIds.includes(test.id);
                    return (
                      <label
                        key={test.id}
                        htmlFor={testId}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-[15px] font-medium ${on ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-800"} focus-within:ring-2 focus-within:ring-neutral-900/40`}
                      >
                        <input
                          ref={index === 0 && testIndex === 0 ? firstControlRef : undefined}
                          id={testId}
                          type="checkbox"
                          className="sr-only"
                          checked={on}
                          onChange={() => toggle(test.id)}
                        />
                        {test.label}
                      </label>
                    );
                  })}
                </fieldset>
              ) : concernOnly ? (
                <p className="mt-2 text-sm text-neutral-500 sm:pl-8">Specific tests are confirmed with you once a laboratory has reviewed the panel.</p>
              ) : (
                <p className="mt-2 text-sm text-neutral-500 sm:pl-8">No add-on tests are offered in this group for this listing; describe the concern below.</p>
              )}
            </div>
          );
        })}
      </fieldset>

      {/* Concerns */}
      <div>
        <label htmlFor={ids.concerns} className="mb-3 block text-lg font-bold text-neutral-900">Something not listed?</label>
        <textarea
          id={ids.concerns}
          rows={3}
          value={values.concerns}
          maxLength={MAX_CONCERNS_LENGTH + 100}
          onChange={(e) => setValues((prev) => ({ ...prev, concerns: e.target.value }))}
          placeholder="Tell EcoGlobe what you are actually worried about, in your own words."
          aria-invalid={!!errorFor("concerns")}
          aria-describedby={errorFor("concerns") ? `${ids.concerns}-error` : undefined}
          className="min-h-[96px] w-full resize-y rounded-xl bg-white px-5 py-4 text-base leading-7 text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/20"
          style={inputBorder}
        />
        {errorFor("concerns") && <p id={`${ids.concerns}-error`} className="mt-1 text-sm text-red-700">{errorFor("concerns")}</p>}
      </div>

      {/* Turnaround */}
      <fieldset id={ids.turnaround} aria-describedby={errorFor("turnaround") ? `${ids.turnaround}-error` : undefined}>
        <legend className="mb-3 text-lg font-bold text-neutral-900">How soon do you need it?</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TURNAROUNDS.map((option) => {
            const optionId = `${baseId}-turnaround-${option.code}`;
            const on = values.turnaround === option.code;
            return (
              <label
                key={option.code}
                htmlFor={optionId}
                className={`flex cursor-pointer items-center justify-center rounded-xl px-4 py-4 text-lg font-bold focus-within:ring-2 focus-within:ring-neutral-900/40 ${on ? "bg-neutral-900 text-white" : "bg-white text-neutral-700"}`}
                style={on ? undefined : inputBorder}
              >
                <input id={optionId} type="radio" name={`${baseId}-turnaround`} className="sr-only" checked={on} onChange={() => setValues((prev) => ({ ...prev, turnaround: option.code }))} />
                {option.label}
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-sm text-neutral-500">Turnaround is confirmed by the laboratory; no duration is promised here.</p>
        {errorFor("turnaround") && <p id={`${ids.turnaround}-error`} className="mt-1 text-sm text-red-700">{errorFor("turnaround")}</p>}
      </fieldset>

      {/* Sharing */}
      <fieldset id={ids.sharing}>
        <legend className="mb-3 text-lg font-bold text-neutral-900">Where should the results go?</legend>
        <div className="flex flex-col gap-3">
          {(
            [
              { code: "private", title: "My company only", body: "The report stays private to your company; colleagues in your company can open it." },
              { code: "shared", title: "Share with the seller and the listing", body: "Future buyers see the results on the listing. The seller may contribute to the cost; EcoGlobe confirms that with you before booking." },
            ] as const
          ).map((option) => {
            const optionId = `${baseId}-sharing-${option.code}`;
            const on = values.sharing === option.code;
            return (
              <label key={option.code} htmlFor={optionId} className="flex cursor-pointer items-start gap-4 rounded-xl bg-white px-5 py-4 focus-within:ring-2 focus-within:ring-neutral-900/40" style={on ? strongBorder : inputBorder}>
                <input id={optionId} type="radio" name={`${baseId}-sharing`} className="mt-1.5 size-5 shrink-0 accent-neutral-900" checked={on} onChange={() => setValues((prev) => ({ ...prev, sharing: option.code, consentToShare: option.code === "shared" ? prev.consentToShare : false }))} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-lg font-bold text-neutral-900">{option.title}</span>
                  <span className="text-[15px] leading-6 text-neutral-600">{option.body}</span>
                </span>
              </label>
            );
          })}
        </div>
        {values.sharing === "shared" && (
          <div className="mt-3 flex items-start gap-3 rounded-xl bg-neutral-50 px-5 py-4">
            <input
              id={ids.consent}
              type="checkbox"
              className="mt-1 size-5 shrink-0 accent-neutral-900"
              checked={values.consentToShare}
              onChange={(e) => setValues((prev) => ({ ...prev, consentToShare: e.target.checked }))}
              aria-invalid={!!errorFor("consentToShare")}
              aria-describedby={errorFor("consentToShare") ? `${ids.consent}-error` : undefined}
            />
            <label htmlFor={ids.consent} className="text-sm leading-6 text-neutral-700">
              I consent to the laboratory report for this batch being shared with the seller and shown on the listing as
              “Independently tested”. I can withdraw this consent later; withdrawing removes public and seller access.
            </label>
          </div>
        )}
        {errorFor("consentToShare") && <p id={`${ids.consent}-error`} className="mt-1 text-sm text-red-700">{errorFor("consentToShare")}</p>}
      </fieldset>

      <div className="flex flex-col gap-4 border-t border-neutral-200 pt-6">
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submit.status === "submitting"} aria-busy={submit.status === "submitting"}>
          {submit.status === "submitting" ? "Sending…" : "Send request to EcoGlobe"}
        </Button>
        <p className="text-center text-[15px] text-neutral-500">Nothing is charged now. EcoGlobe confirms the scope, the laboratory, the cost and the turnaround first.</p>
        {onCancel && (
          <button type="button" onClick={onCancel} className="mx-auto text-sm font-semibold text-neutral-700 underline underline-offset-2 hover:text-neutral-900">
            {cancelLabel}
          </button>
        )}
      </div>
    </form>
  );
}
