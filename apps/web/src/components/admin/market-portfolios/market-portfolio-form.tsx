"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { BackendApiError, describeBackendError } from "@/lib/backend-client";
import {
  createMarketPortfolio,
  updateMarketPortfolio,
  type MarketPortfolio,
} from "@/lib/api-market-portfolios";
import {
  PORTFOLIO_LIMITS,
  toPortfolioWrite,
  validatePortfolioDraft,
  type PortfolioDraft,
  type PortfolioDraftErrors,
} from "@/lib/market-portfolio-format";
import {
  IdPicker,
  border,
  inputClass,
  searchRecordOptions,
  usePortfolioLookups,
  usePortfolioRecordLabels,
} from "./market-portfolio-shared";

function describeSaveError(error: unknown) {
  if (error instanceof BackendApiError && error.status === 409)
    return "This portfolio changed since you opened it. Reload the page to see the latest version, then reapply your changes.";
  return describeBackendError(error, "The portfolio could not be saved.");
}

/**
 * Create a portfolio or replace an existing one's name, description and full
 * membership. Every save needs a reason for the audit history.
 */
export function MarketPortfolioForm({
  portfolio,
  onSaved,
  onCancel,
}: {
  portfolio: MarketPortfolio | null;
  onSaved: (portfolio: MarketPortfolio) => void;
  onCancel: () => void;
}) {
  const nameId = useId();
  const descriptionId = useId();
  const reasonId = useId();
  const lookups = usePortfolioLookups();
  const recordLabels = usePortfolioRecordLabels(portfolio?.id ?? null, portfolio?.version);
  const [draft, setDraft] = useState<PortfolioDraft>(() => ({
    name: portfolio?.name ?? "",
    description: portfolio?.description ?? "",
    recordIds: portfolio?.recordIds ?? [],
    listingIds: portfolio?.listingIds ?? [],
    companyIds: portfolio?.companyIds ?? [],
    reason: "",
  }));
  const [errors, setErrors] = useState<PortfolioDraftErrors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = <K extends keyof PortfolioDraft>(key: K, value: PortfolioDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    const nextErrors = validatePortfolioDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || saving) return;
    setSaving(true);
    setServerError(null);
    try {
      const body = toPortfolioWrite(draft);
      const saved = portfolio
        ? await updateMarketPortfolio(portfolio.id, portfolio.version, body)
        : await createMarketPortfolio(body);
      onSaved(saved);
    } catch (error) {
      setServerError(describeSaveError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-4 rounded-xl bg-white p-4 sm:grid-cols-2" style={border}>
        <div className="sm:col-span-2">
          <label htmlFor={nameId} className="mb-1 block text-sm font-medium text-neutral-900">
            Name (required)
          </label>
          <input
            id={nameId}
            value={draft.name}
            onChange={(event) => set("name", event.target.value)}
            maxLength={PORTFOLIO_LIMITS.nameMax}
            placeholder="e.g. Gulf Coast biochar demo"
            aria-invalid={!!errors.name}
            className={inputClass}
            style={border}
          />
          {errors.name && <p className="mt-1 text-sm text-red-700">{errors.name}</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={descriptionId} className="mb-1 block text-sm font-medium text-neutral-900">
            Internal description (optional)
          </label>
          <textarea
            id={descriptionId}
            value={draft.description}
            onChange={(event) => set("description", event.target.value)}
            maxLength={PORTFOLIO_LIMITS.descriptionMax}
            rows={3}
            placeholder="Who this demo is for and what it shows. Admins only."
            aria-invalid={!!errors.description}
            className={inputClass}
            style={border}
          />
          {errors.description && <p className="mt-1 text-sm text-red-700">{errors.description}</p>}
        </div>
      </div>

      <section aria-labelledby={`${nameId}-demo`} className="flex flex-col gap-3">
        <div>
          <h2 id={`${nameId}-demo`} className="text-lg font-bold text-neutral-900">
            Demo listing selection
          </h2>
          <p className="text-sm text-neutral-500">
            What assigned companies can choose in Browse. Only published listings they can already see appear.
          </p>
        </div>
        <IdPicker
          label="Published listing IDs"
          help="Existing published listings to include in the demo selection."
          ids={draft.listingIds}
          onChange={(ids) => set("listingIds", ids)}
          lookup={lookups.listings}
          error={errors.listingIds}
          disabled={saving}
        />
        <IdPicker
          label="Assigned company IDs"
          help="Companies whose signed-in members may choose this portfolio. Assignment does not grant access to anything else."
          ids={draft.companyIds}
          onChange={(ids) => set("companyIds", ids)}
          lookup={lookups.companies}
          error={errors.companyIds}
          disabled={saving}
        />
      </section>

      <section aria-labelledby={`${nameId}-research`} className="flex flex-col gap-3">
        <div>
          <h2 id={`${nameId}-research`} className="text-lg font-bold text-neutral-900">
            Internal research records (admin only)
          </h2>
          <p className="text-sm text-neutral-500">
            Existing market records for admin context. These are never shown to buyers or sellers and are not listings.
          </p>
        </div>
        <IdPicker
          label="Record IDs"
          help="Existing active market records. Search by company, facility or feedstock."
          ids={draft.recordIds}
          onChange={(ids) => set("recordIds", ids)}
          lookup={recordLabels}
          search={searchRecordOptions}
          error={errors.recordIds}
          disabled={saving}
        />
      </section>

      <div className="rounded-xl bg-white p-4" style={border}>
        <label htmlFor={reasonId} className="mb-1 block text-sm font-medium text-neutral-900">
          Reason for this change (required)
        </label>
        <textarea
          id={reasonId}
          value={draft.reason}
          onChange={(event) => set("reason", event.target.value)}
          maxLength={PORTFOLIO_LIMITS.reasonMax}
          rows={2}
          aria-invalid={!!errors.reason}
          className={inputClass}
          style={border}
          disabled={saving}
        />
        {errors.reason && <p className="mt-1 text-sm text-red-700">{errors.reason}</p>}
      </div>

      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {serverError}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" style={border} onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving} aria-busy={saving}>
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {saving ? "Saving…" : portfolio ? "Save changes" : "Create portfolio"}
        </Button>
      </div>
    </form>
  );
}
