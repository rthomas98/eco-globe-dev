"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import {
  fetchFedexSandbox,
  fetchFedexShipment,
  isFedexSandboxUnavailable,
  type FedexShipment,
} from "@/lib/api-fedex-sandbox";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";
import { FedexSandboxQuoteForm } from "./fedex-sandbox-quote-form";
import { FedexSandboxShipmentDetail } from "./fedex-sandbox-shipment-detail";
import { quoteAmount, stateBadge, when } from "./fedex-sandbox-format";

const SELECTED_PARAM = "shipment";

/** Keeps the open shipment in the URL so a reload returns to the same record. */
function useSelectedShipment() {
  const [selected, setSelectedState] = useState<string | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get(
      SELECTED_PARAM,
    );
    if (value && /^[0-9a-f-]{36}$/i.test(value)) setSelectedState(value);
  }, []);
  const setSelected = (id: string | null) => {
    setSelectedState(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set(SELECTED_PARAM, id);
    else url.searchParams.delete(SELECTED_PARAM);
    window.history.replaceState(window.history.state, "", url);
  };
  return [selected, setSelected] as const;
}

/**
 * Admin-only FedEx sandbox desk: request a persisted sandbox quote, then book
 * it explicitly to receive a FedEx test label. Separate from the manual
 * logistics workflow, which remains the way marketplace orders are shipped.
 */
export function AdminFedexSandboxPage() {
  const data = useBackendData(
    fetchFedexSandbox,
    [],
    "FedEx sandbox shipments could not be loaded.",
  );
  const [selected, setSelected] = useSelectedShipment();
  // Shipments updated by an action in this session, applied over the last list read.
  const [updates, setUpdates] = useState<Record<string, FedexShipment>>({});
  const [showForm, setShowForm] = useState(false);
  const unavailable =
    data.status === "error" && isFedexSandboxUnavailable(data.rawError);
  const [missing, setMissing] = useState<string | null>(null);
  const listed = data.data?.shipments;

  // A shipment opened from the URL that is older than the list window is read directly.
  useEffect(() => {
    if (
      !selected ||
      !listed ||
      listed.some((s) => s.id === selected) ||
      updates[selected]
    )
      return;
    let cancelled = false;
    setMissing(null);
    fetchFedexShipment(selected)
      .then((shipment) => {
        if (!cancelled)
          setUpdates((prev) => ({ ...prev, [shipment.id]: shipment }));
      })
      .catch(() => {
        if (!cancelled) setMissing(selected);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, listed, updates]);

  const applyUpdate = (shipment: FedexShipment) =>
    setUpdates((prev) => ({ ...prev, [shipment.id]: shipment }));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold text-neutral-900">
                FedEx sandbox
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                <FlaskConical className="size-3.5" /> Sandbox · test labels only
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-sm text-neutral-500">
              Admin-only test desk for the FedEx sandbox integration. Quotes,
              labels and tracking come from FedEx test systems and are not
              production shipping.
            </p>
          </div>
        </div>

        <div className="mb-5 space-y-1 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">
            This integration is a sandbox test and is not production-ready.
          </p>
          <ul className="list-disc space-y-0.5 pl-5">
            <li>
              Labels are FedEx sandbox test labels. Never attach one to a real
              package.
            </li>
            <li>Sandbox rates are not billable, and no pickup is scheduled.</li>
            <li>
              Tracking comes from the FedEx sandbox and may be virtualized test
              data. There is no live GPS or vehicle visibility.
            </li>
            <li>
              Marketplace orders continue to use the{" "}
              <Link href="/admin/logistics" className="font-medium underline">
                manual logistics workflow
              </Link>
              .
            </li>
          </ul>
        </div>

        {unavailable ? (
          <p
            className="rounded-xl bg-white px-6 py-12 text-center text-sm text-neutral-600"
            style={{ border: "1px solid #F0F0F0" }}
          >
            The FedEx sandbox integration is not enabled in this environment.
          </p>
        ) : (
          <DataBoundary
            state={data}
            loadingLabel="Loading FedEx sandbox shipments…"
            empty={{ title: "" }}
          >
            {({ capabilities, shipments: loaded }) => {
              const shipments = [
                ...Object.values(updates)
                  .filter((u) => !loaded.some((s) => s.id === u.id))
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
                ...loaded.map((s) => updates[s.id] ?? s),
              ];
              const current = shipments.find((s) => s.id === selected) ?? null;
              const services = capabilities?.services ?? [];
              const labelFor = (code: string) =>
                services.find((s) => s.code === code)?.label ?? code;
              return (
                <div className="space-y-6">
                  {capabilities?.configured === false && (
                    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                      FedEx sandbox credentials are not configured on the
                      EcoGlobe backend, so quotes cannot be requested.
                    </p>
                  )}
                  {capabilities &&
                    (capabilities.notes.length > 0 ||
                      services.some((s) => !s.available)) && (
                      <section
                        className="rounded-xl bg-white p-4 text-sm"
                        style={{ border: "1px solid #F0F0F0" }}
                      >
                        <h2 className="mb-2 font-semibold text-neutral-900">
                          Current sandbox limits
                        </h2>
                        <ul className="list-disc space-y-1 pl-5 text-neutral-700">
                          {services
                            .filter((s) => !s.available)
                            .map((s) => (
                              <li key={s.code}>
                                {s.label}: unavailable
                                {s.reason ? ` — ${s.reason}` : ""}
                              </li>
                            ))}
                          {capabilities.notes.map((note) => (
                            <li key={note}>{note}</li>
                          ))}
                        </ul>
                      </section>
                    )}

                  <section
                    className="rounded-xl bg-white p-4 sm:p-6"
                    style={{ border: "1px solid #F0F0F0" }}
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-neutral-900">
                        Request a sandbox quote
                      </h2>
                      <button
                        type="button"
                        onClick={() => setShowForm((v) => !v)}
                        aria-expanded={showForm}
                        className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
                        style={{ border: "1px solid #E0E0E0" }}
                      >
                        {showForm ? "Hide form" : "New sandbox quote"}
                      </button>
                    </div>
                    {showForm && (
                      <FedexSandboxQuoteForm
                        services={services}
                        onQuoted={(shipment) => {
                          applyUpdate(shipment);
                          setSelected(shipment.id);
                          setShowForm(false);
                        }}
                      />
                    )}
                  </section>

                  <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <section
                      className="overflow-hidden rounded-xl bg-white"
                      style={{ border: "1px solid #F0F0F0" }}
                    >
                      <div
                        className="flex items-center justify-between px-4 py-3"
                        style={{ borderBottom: "1px solid #F0F0F0" }}
                      >
                        <h2 className="text-sm font-semibold text-neutral-900">
                          Sandbox shipments
                        </h2>
                        <button
                          type="button"
                          onClick={() => {
                            setUpdates({});
                            data.reload();
                          }}
                          className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
                        >
                          Reload
                        </button>
                      </div>
                      {shipments.length === 0 ? (
                        <p className="px-4 py-10 text-center text-sm text-neutral-500">
                          No sandbox quotes yet.
                        </p>
                      ) : (
                        <ul>
                          {shipments.map((s) => {
                            const badge = stateBadge(s.state);
                            return (
                              <li
                                key={s.id}
                                style={{ borderBottom: "1px solid #F8F8F8" }}
                              >
                                <button
                                  type="button"
                                  onClick={() => setSelected(s.id)}
                                  aria-current={
                                    s.id === selected ? "true" : undefined
                                  }
                                  className={`flex w-full flex-col gap-1 px-4 py-3 text-left text-sm hover:bg-neutral-50 ${s.id === selected ? "bg-neutral-50" : ""}`}
                                >
                                  <span className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-mono text-xs text-neutral-900">
                                      {s.reference}
                                    </span>
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.tone}`}
                                    >
                                      {badge.label}
                                    </span>
                                  </span>
                                  <span className="text-neutral-700">
                                    {labelFor(s.service)} · {s.recipient.city},{" "}
                                    {s.recipient.countryCode}
                                  </span>
                                  <span className="text-xs text-neutral-500">
                                    {quoteAmount(s) ??
                                      "No sandbox rate returned"}{" "}
                                    · {when(s.createdAt) ?? ""}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>

                    <section
                      className="rounded-xl bg-white p-4 sm:p-6"
                      style={{ border: "1px solid #F0F0F0" }}
                    >
                      {current ? (
                        <FedexSandboxShipmentDetail
                          key={current.id}
                          shipment={current}
                          trackingMayBeVirtualized={
                            capabilities?.trackingMayBeVirtualized ?? true
                          }
                          serviceLabel={labelFor(current.service)}
                          onChange={applyUpdate}
                        />
                      ) : (
                        <p className="py-10 text-center text-sm text-neutral-500">
                          {selected && missing === selected
                            ? "That sandbox shipment could not be loaded."
                            : selected
                              ? "Loading sandbox shipment…"
                              : "Select a sandbox shipment to see its quote, label and tracking."}
                        </p>
                      )}
                    </section>
                  </div>
                </div>
              );
            }}
          </DataBoundary>
        )}
      </div>
    </div>
  );
}
