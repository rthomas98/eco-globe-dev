"use client";

import { useState } from "react";
import Link from "next/link";
import { Archive, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { BackendApiError, describeBackendError } from "@/lib/backend-client";
import {
  archiveMarketPortfolio,
  fetchMarketPortfolio,
  fetchMarketPortfolioAudit,
  restoreMarketPortfolio,
  type MarketPortfolio,
} from "@/lib/api-market-portfolios";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";
import { MarketRecordShell } from "../market-records/market-record-shell";
import { MarketRecordReasonDialog } from "../market-records/market-record-reason-dialog";
import { MarketPortfolioForm } from "./market-portfolio-form";
import {
  PortfolioNotice,
  PortfolioStatusBadge,
  border,
  usePortfolioLookups,
  usePortfolioRecordLabels,
  type Lookup,
} from "./market-portfolio-shared";

const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Edited",
  archive: "Archived",
  restore: "Restored",
};

function MemberList({
  title,
  ids,
  lookup,
  hrefFor,
  empty,
}: {
  title: string;
  ids: number[];
  lookup: Lookup;
  hrefFor?: (id: number) => string;
  empty: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4" style={border}>
      <h3 className="mb-2 text-sm font-semibold text-neutral-900">
        {title} <span className="font-normal text-neutral-500">({ids.length})</span>
      </h3>
      {lookup.status === "error" && <p className="mb-2 text-xs text-amber-800">{lookup.error}</p>}
      {ids.length === 0 ? (
        <p className="text-sm text-neutral-500">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {ids.map((id) => {
            const option = lookup.byId.get(id);
            const text = option ? option.label : lookup.status === "loading" ? "Loading label…" : "Unavailable or not eligible";
            return (
              <li key={id} className="min-w-0 break-words rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                <span className="font-mono text-xs text-neutral-500">#{id}</span>{" "}
                {hrefFor && option ? (
                  <Link href={hrefFor(id)} className="text-neutral-900 underline-offset-2 hover:underline">
                    {text}
                  </Link>
                ) : (
                  <span className={option ? "text-neutral-900" : "text-neutral-500"}>{text}</span>
                )}
                {option?.detail && <span className="block text-xs text-neutral-500">{option.detail}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PortfolioHistory({ portfolio }: { portfolio: MarketPortfolio }) {
  const state = useBackendData(
    () => fetchMarketPortfolioAudit(portfolio.id),
    [portfolio.id, portfolio.version],
    "Portfolio history could not be loaded.",
  );
  return (
    <section aria-labelledby="mp-history" className="mt-8">
      <h2 id="mp-history" className="mb-3 text-lg font-bold text-neutral-900">
        History
      </h2>
      <DataBoundary
        state={state}
        isEmpty={(events) => events.length === 0}
        empty={{ title: "No history yet", description: "Changes to this portfolio will be listed here." }}
        loadingLabel="Loading history…"
      >
        {(events) => (
          <ol className="flex flex-col gap-2">
            {events.map((event) => (
              <li key={event.id} className="rounded-xl bg-white px-4 py-3" style={border}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-neutral-900">
                    {ACTION_LABELS[event.action] ?? event.action.replace(/_/g, " ")}
                    <span className="font-normal text-neutral-600">
                      {" "}
                      by {event.actorUserName ?? `user #${event.actorUserId}`}
                    </span>
                  </p>
                  <time dateTime={event.createdAt} className="text-xs text-neutral-500">
                    {new Date(event.createdAt).toLocaleString("en-US")}
                  </time>
                </div>
                {event.reason && <p className="mt-1 break-words text-sm text-neutral-700">Reason: {event.reason}</p>}
              </li>
            ))}
          </ol>
        )}
      </DataBoundary>
    </section>
  );
}

function PortfolioView({ initial }: { initial: MarketPortfolio }) {
  const [portfolio, setPortfolio] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<"archive" | "restore" | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const lookups = usePortfolioLookups();
  const recordLabels = usePortfolioRecordLabels(portfolio.id, portfolio.version);
  const archived = portfolio.status === "archived";

  const transition = async (reason: string) => {
    if (!dialog) return;
    setBusy(true);
    setDialogError(null);
    try {
      const next =
        dialog === "archive"
          ? await archiveMarketPortfolio(portfolio.id, portfolio.version, reason)
          : await restoreMarketPortfolio(portfolio.id, portfolio.version, reason);
      setPortfolio(next);
      setSaved(dialog === "archive" ? "Portfolio archived." : "Portfolio restored.");
      setDialog(null);
    } catch (error) {
      setDialogError(
        error instanceof BackendApiError && error.status === 409
          ? "This portfolio changed since you opened it. Reload the page and try again."
          : dialog === "restore" && error instanceof BackendApiError && error.status === 400
            ? `${describeBackendError(error, "Some members are no longer eligible.")} Close this dialog and use “Edit to repair” to remove them, then restore.`
            : describeBackendError(error, "The portfolio could not be updated."),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <MarketRecordShell
      title={portfolio.name}
      description={portfolio.description ?? undefined}
      backHref="/admin/market-portfolios"
      backLabel="Portfolios"
      notice={<PortfolioNotice />}
      actions={
        editing ? undefined : (
          <>
            {/* Editing stays available while archived so stale membership can be
                repaired before Restore (which revalidates every member). */}
            <Button type="button" size="sm" variant="secondary" style={border} onClick={() => { setSaved(null); setEditing(true); }}>
              <Pencil className="size-4" aria-hidden="true" />
              {archived ? "Edit to repair" : "Edit"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              style={border}
              onClick={() => {
                setDialogError(null);
                setDialog(archived ? "restore" : "archive");
              }}
            >
              {archived ? <RotateCcw className="size-4" aria-hidden="true" /> : <Archive className="size-4" aria-hidden="true" />}
              {archived ? "Restore" : "Archive"}
            </Button>
          </>
        )
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
        <PortfolioStatusBadge status={portfolio.status} />
        <span>
          Updated <time dateTime={portfolio.updatedAt}>{new Date(portfolio.updatedAt).toLocaleString("en-US")}</time>
        </span>
        {archived && <span>Archived portfolios are hidden from Browse and cannot be selected by buyers.</span>}
      </div>
      {saved && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {saved}
        </p>
      )}

      {editing && archived && (
        <p role="note" className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This portfolio is archived. Saving repairs its membership only; it stays archived and hidden from Browse until you restore it.
        </p>
      )}
      {editing ? (
        <MarketPortfolioForm
          portfolio={portfolio}
          onSaved={(next) => {
            setPortfolio(next);
            setEditing(false);
            setSaved("Portfolio saved.");
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <section aria-labelledby="mp-demo" className="mb-6">
            <h2 id="mp-demo" className="mb-1 text-lg font-bold text-neutral-900">
              Demo listing selection
            </h2>
            <p className="mb-3 text-sm text-neutral-500">
              Assigned companies can pick this portfolio in Browse; they still see only listings already visible to them.
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              <MemberList
                title="Published listings"
                ids={portfolio.listingIds}
                lookup={lookups.listings}
                hrefFor={(id) => `/admin/listings/LS-${id}`}
                empty="No listings selected."
              />
              <MemberList
                title="Assigned companies"
                ids={portfolio.companyIds}
                lookup={lookups.companies}
                empty="No companies assigned — nobody can select this portfolio in Browse."
              />
            </div>
          </section>
          <section aria-labelledby="mp-research">
            <h2 id="mp-research" className="mb-1 text-lg font-bold text-neutral-900">
              Internal research records (admin only)
            </h2>
            <p className="mb-3 text-sm text-neutral-500">
              Research context for admins. Never shown to buyers or sellers and never used as listings.{" "}
              <Link href={`/admin/market-records?portfolioId=${portfolio.id}&status=all`} className="font-medium text-neutral-900 underline">
                Open in Market records
              </Link>
            </p>
            <MemberList
              title="Research records"
              ids={portfolio.recordIds}
              lookup={recordLabels}
              hrefFor={(id) => `/admin/market-records/${id}`}
              empty="No research records."
            />
          </section>
        </>
      )}

      <PortfolioHistory portfolio={portfolio} />

      {dialog && (
        <MarketRecordReasonDialog
          title={dialog === "archive" ? "Archive portfolio" : "Restore portfolio"}
          description={
            dialog === "archive"
              ? "Archived portfolios disappear from Browse for assigned companies. Listings, companies and records are not changed, and you can restore it later."
              : "Restoring makes this portfolio selectable again for its assigned companies."
          }
          confirmLabel={dialog === "archive" ? "Archive" : "Restore"}
          reasonRequired
          busy={busy}
          error={dialogError}
          onConfirm={(reason) => void transition(reason)}
          onClose={() => setDialog(null)}
        />
      )}
    </MarketRecordShell>
  );
}

export function MarketPortfolioDetailPage({ id }: { id: string }) {
  const numericId = /^\d+$/.test(id) ? Number(id) : null;
  const state = useBackendData(
    () =>
      numericId
        ? fetchMarketPortfolio(numericId)
        : Promise.reject(new BackendApiError("This portfolio link is not valid.", 404)),
    [numericId],
    "The portfolio could not be loaded.",
  );
  return (
    <DataBoundary
      state={state}
      empty={{ title: "Portfolio not found" }}
      loadingLabel="Loading portfolio…"
    >
      {(portfolio) => <PortfolioView key={`${portfolio.id}:${portfolio.version}`} initial={portfolio} />}
    </DataBoundary>
  );
}
