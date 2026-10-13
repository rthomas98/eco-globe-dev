"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@eco-globe/ui";
import type { MarketRecord, MarketRecordInput, MarketRecordRole } from "@/lib/api-market-records";
import {
  ADDRESS_PURPOSE_LABELS,
  SOURCE_RECORD_TYPE_LABELS,
  type AddressPurpose,
} from "@/lib/market-record-format";
import {
  CURRENCY_SUGGESTIONS,
  LABELS,
  TYPES_BY_ROLE,
  UNIT_OPTIONS,
  mapServerFieldErrors,
  optionalText,
  toDraft,
  validateDraft,
  type Draft,
  type FieldErrors,
  type FieldKey,
} from "./market-record-draft";

/*
 * Direct entry form for an internal market record. Review status, reviewer
 * and date are not part of this form: they are set through the separate
 * field review action and stamped by the server.
 */

const inputClass =
  "w-full rounded-lg bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-500/40";
const border = { border: "1px solid #E0E0E0" };

export function MarketRecordForm({
  record,
  defaultRole = "seller",
  mode,
  busy,
  error,
  serverFieldErrors,
  onSubmit,
  onCancel,
}: {
  record: MarketRecord | null;
  defaultRole?: MarketRecordRole;
  mode: "create" | "edit";
  busy: boolean;
  error: React.ReactNode;
  serverFieldErrors?: Record<string, string>;
  /** `reason` is required (non-null) in edit mode. */
  onSubmit: (input: MarketRecordInput, reason: string | null) => void;
  onCancel: () => void;
}) {
  const formId = useId();
  const [draft, setDraft] = useState(() => toDraft(record, defaultRole));
  const [errors, setErrors] = useState<FieldErrors>({});
  const summaryRef = useRef<HTMLDivElement>(null);
  const fieldId = (key: FieldKey) => `${formId}-${key}`;

  // Server validation arrives after submit; show it and move focus to the summary.
  useEffect(() => {
    if (!serverFieldErrors) return;
    const mapped = mapServerFieldErrors(serverFieldErrors);
    if (!Object.keys(mapped).length) return;
    setErrors(mapped);
    summaryRef.current?.focus();
  }, [serverFieldErrors]);

  const set = <K extends FieldKey>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const fieldProps = (key: FieldKey) => ({
    id: fieldId(key),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${fieldId(key)}-error` : undefined,
  });

  const fieldError = (name: FieldKey) =>
    errors[name] ? (
      <p id={`${fieldId(name)}-error`} className="mt-1 text-sm text-red-700">
        {errors[name]}
      </p>
    ) : null;

  const label = (key: FieldKey, suffix = "") => (
    <label htmlFor={fieldId(key)} className="mb-1 block text-sm font-medium text-neutral-900">
      {LABELS[key]}
      {suffix}
    </label>
  );

  const textField = (
    key: FieldKey,
    options: { hint?: string; required?: boolean; attrs?: React.InputHTMLAttributes<HTMLInputElement> } = {},
  ) => (
    <div>
      {label(key, options.required ? " (required)" : "")}
      <input
        type="text"
        {...fieldProps(key)}
        {...options.attrs}
        required={options.required}
        value={draft[key] as string}
        onChange={(event) => set(key, event.target.value as never)}
        className={inputClass}
        style={border}
      />
      {options.hint && <p className="mt-1 text-xs text-neutral-500">{options.hint}</p>}
      {fieldError(key)}
    </div>
  );

  const selectField = (
    key: FieldKey,
    options: { value: string; label: string }[],
    extra: { hint?: string; required?: boolean } = {},
  ) => (
    <div>
      {label(key, extra.required ? " (required)" : "")}
      <select
        {...fieldProps(key)}
        required={extra.required}
        value={draft[key] as string}
        onChange={(event) => set(key, event.target.value as never)}
        className={inputClass}
        style={border}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {extra.hint && <p className="mt-1 text-xs text-neutral-500">{extra.hint}</p>}
      {fieldError(key)}
    </div>
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const result = validateDraft(draft, mode === "edit");
    if (!result.ok) {
      setErrors(result.errors);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setErrors({});
    onSubmit(result.input, optionalText(draft.reason));
  };

  const resetWarning = (status: string | undefined) =>
    mode === "edit" && (status === "confirmed" || status === "estimated") ? (
      <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
        This value is currently marked {status === "confirmed" ? "Confirmed" : "Estimate"}. Changing the value or its
        citation resets its review to Not confirmed; review it again afterwards.
      </p>
    ) : null;

  const errorEntries = Object.entries(errors) as [FieldKey, string][];
  const fieldset = "min-w-0 rounded-2xl bg-white p-4 sm:p-6";
  const legend = "px-1 text-base font-bold text-neutral-900";
  const grid = "mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5" aria-busy={busy}>
      {errorEntries.length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900"
          style={{ border: "1px solid #FECACA" }}
        >
          <p className="font-semibold">Fix {errorEntries.length === 1 ? "this field" : "these fields"} before saving:</p>
          <ul className="mt-1 list-disc pl-5">
            {errorEntries.map(([key, message]) => (
              <li key={key}>
                <a href={`#${fieldId(key)}`} className="underline">
                  {LABELS[key]}: {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <fieldset className={fieldset} style={border} disabled={busy}>
        <legend className={legend}>Company and source</legend>
        <div className={grid}>
          <div>
            <span id={`${formId}-role`} className="mb-1 block text-sm font-medium text-neutral-900">
              Side
            </span>
            <div role="radiogroup" aria-labelledby={`${formId}-role`} className="flex gap-4 pt-1.5">
              {(["seller", "buyer"] as const).map((role) => (
                <label key={role} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`${formId}-role`}
                    value={role}
                    checked={draft.role === role}
                    onChange={() => set("role", role)}
                  />
                  {role === "seller" ? "Seller source" : "Buyer source"}
                </label>
              ))}
            </div>
          </div>
          {textField("companyName", { required: true, attrs: { autoComplete: "off", maxLength: 240 } })}
          {textField("facilityName", { hint: "Leave blank if unknown.", attrs: { maxLength: 160 } })}
          {selectField(
            "sourceRecordType",
            TYPES_BY_ROLE[draft.role].map((code) => ({ value: code, label: SOURCE_RECORD_TYPE_LABELS[code] })),
            { required: true },
          )}
          {selectField(
            "sourceChecked",
            [
              { value: "unknown", label: "Source check unknown" },
              { value: "yes", label: "Source marked checked" },
              { value: "no", label: "Source not marked checked" },
            ],
            {
              hint: "What the original source claims. It does not confirm the price, volume or address, and it is not KYC.",
            },
          )}
          {textField("sourceCheckedBy", {
            hint: "Only if the original source names who checked it. Not an EcoGlobe reviewer.",
            attrs: { maxLength: 240, autoComplete: "off" },
          })}
          {textField("sourceCheckedAt", {
            hint: "Date stated by the original source, if any.",
            attrs: { type: "date" },
          })}
          {textField("sourceCitation", {
            hint: "Publication, URL or note describing where this record came from.",
            attrs: { maxLength: 2000 },
          })}
        </div>
      </fieldset>

      <fieldset className={fieldset} style={border} disabled={busy}>
        <legend className={legend}>Feedstock</legend>
        <div className={grid}>
          {textField("feedstock", { required: true, attrs: { maxLength: 500 } })}
          {textField("feedstockGroup", { attrs: { maxLength: 160 } })}
          {draft.role === "buyer" &&
            textField("buyerNeed", { hint: "What the buyer is looking for, in their words.", attrs: { maxLength: 4000 } })}
        </div>
      </fieldset>

      <fieldset className={fieldset} style={border} disabled={busy}>
        <legend className={legend}>Address</legend>
        <p className="mt-1 text-sm text-neutral-500">
          A headquarters or office address is never a pickup site. Use Pickup site only when that was confirmed.
        </p>
        {resetWarning(record?.addressReview.status)}
        <div className={grid}>
          {textField("street", { attrs: { maxLength: 240 } })}
          {textField("city", { attrs: { maxLength: 120 } })}
          {textField("stateProvince", { attrs: { maxLength: 120 } })}
          {textField("postalCode", { attrs: { maxLength: 40, autoComplete: "off" } })}
          {textField("countryCode", {
            hint: "Two letters, for example US.",
            attrs: { maxLength: 2, autoCapitalize: "characters" },
          })}
          {selectField(
            "addressPurpose",
            (Object.keys(ADDRESS_PURPOSE_LABELS) as AddressPurpose[]).map((purpose) => ({
              value: purpose,
              label: ADDRESS_PURPOSE_LABELS[purpose],
            })),
          )}
          {textField("addressSource", { attrs: { maxLength: 2000 } })}
        </div>
      </fieldset>

      <fieldset className={fieldset} style={border} disabled={busy}>
        <legend className={legend}>Annual volume</legend>
        <p className="mt-1 text-sm text-neutral-500">
          Annual capacity or estimate, not available stock. Leave blank if unknown; 0 means a known zero.
        </p>
        {resetWarning(record?.volume.status)}
        <div className={grid}>
          {textField("volumeValue", { attrs: { inputMode: "decimal", autoComplete: "off" } })}
          {selectField("volumeUnit", [{ value: "", label: "Not recorded" }, ...UNIT_OPTIONS])}
          {selectField("volumePeriod", [
            { value: "annual", label: "Per year (annual)" },
            { value: "unspecified", label: "Period not stated" },
          ])}
          {textField("volumeCitation", { attrs: { maxLength: 2000 } })}
        </div>
      </fieldset>

      <fieldset className={fieldset} style={border} disabled={busy}>
        <legend className={legend}>Research price</legend>
        <p className="mt-1 text-sm text-neutral-500">
          Research context, never an offer or checkout price. Leave blank if unknown.
        </p>
        {resetWarning(record?.price.status)}
        <div className={grid}>
          {textField("priceAmount", {
            hint: "Enter the amount without a sign.",
            attrs: { inputMode: "decimal", autoComplete: "off" },
          })}
          <div>
            <span id={`${formId}-price-dir`} className="mb-1 block text-sm font-medium text-neutral-900">
              Price direction
            </span>
            <div role="radiogroup" aria-labelledby={`${formId}-price-dir`} className="flex flex-col gap-1.5 pt-1">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`${formId}-price-dir`}
                  checked={!draft.priceIsGateFee}
                  onChange={() => set("priceIsGateFee", false)}
                />
                Seller receives this price
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`${formId}-price-dir`}
                  checked={draft.priceIsGateFee}
                  onChange={() => set("priceIsGateFee", true)}
                />
                Gate fee (the seller pays)
              </label>
            </div>
          </div>
          {textField("priceCurrency", {
            hint: "Three letters, for example USD or EUR.",
            attrs: { maxLength: 3, autoCapitalize: "characters", autoComplete: "off", list: `${formId}-currencies` },
          })}
          <datalist id={`${formId}-currencies`}>
            {CURRENCY_SUGGESTIONS.map((code) => (
              <option key={code} value={code} />
            ))}
          </datalist>
          {selectField("pricePerUnit", [{ value: "", label: "Not recorded" }, ...UNIT_OPTIONS])}
          {textField("priceCitation", { attrs: { maxLength: 2000 } })}
        </div>
      </fieldset>

      {mode === "edit" && (
        <div className={fieldset} style={border}>
          <label htmlFor={fieldId("reason")} className="mb-1 block text-sm font-medium text-neutral-900">
            Reason for this change (required)
          </label>
          <textarea
            {...fieldProps("reason")}
            required
            disabled={busy}
            value={draft.reason}
            onChange={(event) => set("reason", event.target.value)}
            rows={2}
            maxLength={1000}
            className={inputClass}
            style={border}
          />
          <p className="mt-1 text-xs text-neutral-500">Saved in the record history.</p>
          {fieldError("reason")}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900" style={{ border: "1px solid #FECACA" }}>
          {error}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={busy} style={border}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={busy} aria-busy={busy}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {busy ? "Saving…" : mode === "create" ? "Create record" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
