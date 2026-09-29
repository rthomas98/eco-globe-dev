"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Download, RefreshCw } from "lucide-react";
import { Button } from "@eco-globe/ui";
import {
  bookFedexShipment,
  cancelFedexShipment,
  downloadFedexLabel,
  fetchFedexShipment,
  isOutcomeUnknown,
  newIdempotencyKey,
  refreshFedexTracking,
  type FedexShipment,
} from "@/lib/api-fedex-sandbox";
import { BackendApiError, describeBackendError } from "@/lib/backend-client";
import {
  addressLines,
  isPendingState,
  isQuoteExpired,
  NOT_PROVIDED,
  quoteAmount,
  stateBadge,
  when,
} from "./fedex-sandbox-format";

type Action = "book" | "cancel";

const OUTLINE = { border: "1px solid #E0E0E0" };

/**
 * Request keys for booking/cancellation survive a reload, so a click after an
 * interrupted request reuses the same key and the backend can deduplicate it.
 * The "unsure" flag hides the action until the admin has re-read the status.
 */
type StoredIntent = { key: string; unsure: boolean };

function storageKey(action: Action, id: string) {
  return `ecoglobe.fedex-sandbox.${action}.${id}`;
}

function readIntent(action: Action, id: string): StoredIntent | null {
  try {
    const raw = window.localStorage.getItem(storageKey(action, id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredIntent>;
    return typeof parsed.key === "string"
      ? { key: parsed.key, unsure: Boolean(parsed.unsure) }
      : null;
  } catch {
    return null;
  }
}

function writeIntent(action: Action, id: string, intent: StoredIntent | null) {
  try {
    if (intent)
      window.localStorage.setItem(
        storageKey(action, id),
        JSON.stringify(intent),
      );
    else window.localStorage.removeItem(storageKey(action, id));
  } catch {
    // Storage may be unavailable (private mode); the backend state still guards duplicates.
  }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="min-w-0 break-words text-neutral-900">{value}</dd>
    </div>
  );
}

function Missing() {
  return <span className="text-neutral-500">{NOT_PROVIDED}</span>;
}

export function FedexSandboxShipmentDetail({
  shipment,
  trackingMayBeVirtualized,
  serviceLabel,
  onChange,
}: {
  shipment: FedexShipment;
  serviceLabel: string;
  trackingMayBeVirtualized: boolean;
  onChange: (shipment: FedexShipment) => void;
}) {
  const [busy, setBusy] = useState<
    null | "book" | "cancel" | "status" | "tracking" | "label"
  >(null);
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [intents, setIntents] = useState<Record<Action, StoredIntent | null>>({
    book: null,
    cancel: null,
  });

  useEffect(() => {
    setIntents({
      book: readIntent("book", shipment.id),
      cancel: readIntent("cancel", shipment.id),
    });
    setConfirm(null);
    setError("");
    setNotice("");
  }, [shipment.id]);

  // Once the backend reports a settled outcome, the stored key is no longer needed.
  useEffect(() => {
    if (
      ["booked", "booking_failed", "cancelled", "quote_expired"].includes(
        shipment.state,
      )
    ) {
      writeIntent("book", shipment.id, null);
      if (shipment.state !== "booked") writeIntent("cancel", shipment.id, null);
      setIntents((prev) => ({
        book: null,
        cancel: shipment.state === "booked" ? prev.cancel : null,
      }));
    }
  }, [shipment.id, shipment.state]);

  const setIntent = (action: Action, intent: StoredIntent | null) => {
    writeIntent(action, shipment.id, intent);
    setIntents((prev) => ({ ...prev, [action]: intent }));
  };

  async function checkStatus() {
    setBusy("status");
    setError("");
    try {
      const latest = await fetchFedexShipment(shipment.id);
      onChange(latest);
      // The admin has now seen the recorded state; allow an explicit retry
      // (which reuses the same key) only if the backend still shows it unbooked.
      for (const action of ["book", "cancel"] as const) {
        const intent = intents[action];
        if (intent?.unsure) setIntent(action, { ...intent, unsure: false });
      }
      setNotice(
        `Status re-read from EcoGlobe at ${new Date().toLocaleTimeString("en-US")}.`,
      );
    } catch (err) {
      setError(
        describeBackendError(err, "The shipment status could not be loaded."),
      );
    } finally {
      setBusy(null);
    }
  }

  async function runAction(action: Action) {
    if (busy) return;
    const quoteId = shipment.quote?.id;
    if (action === "book" && !quoteId) return;
    const key = intents[action]?.key ?? newIdempotencyKey();
    setIntent(action, { key, unsure: true });
    setBusy(action);
    setConfirm(null);
    setError("");
    setNotice("");
    try {
      const updated =
        action === "book"
          ? await bookFedexShipment(shipment.id, quoteId as string, key)
          : await cancelFedexShipment(shipment.id, key);
      setIntent(action, { key, unsure: false });
      onChange(updated);
    } catch (err) {
      const unknown =
        isOutcomeUnknown(err) ||
        (err instanceof BackendApiError && err.kind === "server");
      // The backend records definite rejections (booking_failed / cancel_failed)
      // before answering 502, so re-read once before calling the outcome unknown.
      const recorded = unknown
        ? await fetchFedexShipment(shipment.id).catch(() => null)
        : null;
      const settled =
        recorded &&
        ["booked", "booking_failed", "cancelled", "cancel_failed"].includes(
          recorded.state,
        );
      if (recorded && settled) {
        setIntent(action, { key, unsure: false });
        onChange(recorded);
        if (
          recorded.state === "booking_failed" ||
          recorded.state === "cancel_failed"
        )
          setError(
            describeBackendError(
              err,
              `The ${action === "book" ? "booking" : "cancellation"} was not completed.`,
            ),
          );
        else
          setNotice(
            "The response was interrupted, but EcoGlobe recorded the result shown above.",
          );
      } else if (unknown) {
        if (recorded) onChange(recorded);
        setError(
          `The ${action === "book" ? "booking" : "cancellation"} request may or may not have reached FedEx. ` +
            "Do not retry yet: use “Check status” to read what EcoGlobe recorded.",
        );
      } else {
        setIntent(action, { key, unsure: false });
        setError(
          describeBackendError(
            err,
            `The ${action === "book" ? "booking" : "cancellation"} was not accepted.`,
          ),
        );
      }
    } finally {
      setBusy(null);
    }
  }

  async function refreshTracking() {
    setBusy("tracking");
    setError("");
    setNotice("");
    try {
      onChange(await refreshFedexTracking(shipment.id));
    } catch (err) {
      setError(
        describeBackendError(
          err,
          "Tracking could not be refreshed from the FedEx sandbox.",
        ),
      );
    } finally {
      setBusy(null);
    }
  }

  async function downloadLabel() {
    setBusy("label");
    setError("");
    try {
      const { blob, fileName } = await downloadFedexLabel(shipment.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        fileName ?? `fedex-sandbox-test-label-${shipment.reference}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setError(
        describeBackendError(
          err,
          "The sandbox test label could not be downloaded.",
        ),
      );
    } finally {
      setBusy(null);
    }
  }

  const badge = stateBadge(shipment.state);
  const amount = quoteAmount(shipment);
  const expired = isQuoteExpired(shipment);
  const pending = isPendingState(shipment.state);
  const bookUnsure = Boolean(intents.book?.unsure);
  const cancelUnsure = Boolean(intents.cancel?.unsure);
  const canBook =
    shipment.state === "quoted" &&
    !expired &&
    Boolean(shipment.quote?.id) &&
    !bookUnsure;
  const canCancel =
    (shipment.state === "booked" || shipment.state === "cancel_failed") &&
    !cancelUnsure;
  const tracking = shipment.tracking;
  const virtualized = tracking?.virtualized ?? null;

  return (
    <section
      className="space-y-5"
      aria-label={`Sandbox shipment ${shipment.reference}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-neutral-500">
            {shipment.reference}
          </p>
          <h2 className="text-lg font-semibold text-neutral-900">
            {serviceLabel}
          </h2>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.tone}`}
        >
          {badge.label}
        </span>
      </div>

      {(pending || bookUnsure || cancelUnsure) && (
        <div
          className="flex gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-2">
            <p>
              {busy === "book"
                ? "Submitting the sandbox booking. Please wait for the result."
                : busy === "cancel"
                  ? "Submitting the sandbox cancellation. Please wait for the result."
                  : shipment.state === "booking_unknown"
                    ? "EcoGlobe could not confirm whether FedEx created this sandbox shipment. Booking is blocked until the backend reconciles the outcome."
                    : shipment.state === "booking"
                      ? "A booking request is in progress. Do not submit another; check status shortly."
                      : shipment.state === "cancelling"
                        ? "A cancellation request is in progress. Check status shortly."
                        : "An earlier request from this browser did not return a result. Check the recorded status before doing anything else."}
            </p>
            <Button
              type="button"
              size="sm"
              variant="white"
              style={OUTLINE}
              onClick={checkStatus}
              disabled={busy !== null}
            >
              <RefreshCw
                className={`size-3.5 ${busy === "status" ? "animate-spin" : ""}`}
              />
              {busy === "status" ? "Checking…" : "Check status"}
            </Button>
          </div>
        </div>
      )}

      <dl className="rounded-xl p-4" style={{ border: "1px solid #F0F0F0" }}>
        <Row label="Sandbox rate" value={amount ?? <Missing />} />
        <Row
          label="Rate type"
          value={shipment.quote?.rateType ?? <Missing />}
        />
        <Row
          label="Quoted"
          value={when(shipment.quote?.quotedAt) ?? <Missing />}
        />
        <Row
          label="Bookable until"
          value={
            shipment.quote?.expiresAt ? (
              <>
                {when(shipment.quote.expiresAt)}
                {expired && (
                  <span className="ml-2 text-red-700">
                    (expired — request a new quote)
                  </span>
                )}
              </>
            ) : (
              <Missing />
            )
          }
        />
        <Row
          label="Package"
          value={`${shipment.package.weightLb} lb · ${shipment.package.lengthIn} × ${shipment.package.widthIn} × ${shipment.package.heightIn} in`}
        />
        <Row
          label="Sender"
          value={addressLines(shipment.shipper).map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        />
        <Row
          label="Recipient"
          value={addressLines(shipment.recipient).map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        />
        {shipment.bookedAt && (
          <Row label="Booked" value={when(shipment.bookedAt)} />
        )}
        {shipment.cancelledAt && (
          <Row label="Cancelled" value={when(shipment.cancelledAt)} />
        )}
      </dl>
      <p className="text-xs text-neutral-500">
        Sandbox rates are FedEx test responses. They are not billable and are
        not a price commitment.
      </p>

      {shipment.lastError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Last provider error: {shipment.lastError}
        </p>
      )}
      {(shipment.state === "booking_failed" ||
        (shipment.state === "quoted" && expired)) && (
        <p className="text-sm text-neutral-600">
          This quote can no longer be booked. Request a new sandbox quote to try
          again.
        </p>
      )}

      {canBook && (
        <div className="rounded-xl p-4" style={{ border: "1px solid #F0F0F0" }}>
          {confirm === "book" ? (
            <div className="space-y-3">
              <p className="text-sm text-neutral-800">
                Book this quote in the FedEx <strong>sandbox</strong>? FedEx
                returns a test label that must not be used to ship. No pickup is
                scheduled and nothing is charged.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => runAction("book")}
                  disabled={busy !== null}
                >
                  Confirm sandbox booking
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="white"
                  style={OUTLINE}
                  onClick={() => setConfirm(null)}
                  disabled={busy !== null}
                >
                  Keep as quote
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="sm"
                onClick={() => setConfirm("book")}
                disabled={busy !== null}
              >
                {busy === "book"
                  ? "Booking in sandbox…"
                  : "Book sandbox shipment"}
              </Button>
              <p className="text-xs text-neutral-500">
                {intents.book
                  ? "An earlier attempt did not book. Retrying reuses the same request key."
                  : "Booking happens only when you confirm."}
              </p>
            </div>
          )}
        </div>
      )}

      {(shipment.trackingNumber ||
        shipment.state === "booked" ||
        shipment.state === "cancelled") && (
        <div
          className="space-y-3 rounded-xl p-4"
          style={{ border: "1px solid #F0F0F0" }}
        >
          <h3 className="text-sm font-semibold text-neutral-900">
            Sandbox label and tracking
          </h3>
          <dl>
            <Row
              label="Tracking number"
              value={
                shipment.trackingNumber ? (
                  <span className="font-mono">{shipment.trackingNumber}</span>
                ) : (
                  <Missing />
                )
              }
            />
            <Row
              label="Status"
              value={tracking?.description ?? tracking?.status ?? <Missing />}
            />
            <Row
              label="Last event"
              value={when(tracking?.lastEventAt) ?? <Missing />}
            />
            <Row
              label="Last refreshed"
              value={when(tracking?.refreshedAt) ?? "Not refreshed yet"}
            />
          </dl>
          {(virtualized === true ||
            (virtualized === null && trackingMayBeVirtualized)) && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {virtualized
                ? "This is FedEx sandbox tracking data and may be virtualized. It does not describe a real package."
                : "FedEx sandbox tracking may return virtualized test data that does not describe a real package."}
            </p>
          )}
          {tracking?.events && tracking.events.length > 0 && (
            <ol className="space-y-1 text-sm">
              {tracking.events.map((event, index) => (
                <li key={`${event.at}-${index}`} className="text-neutral-700">
                  <span className="text-neutral-500">
                    {when(event.at) ?? "Time not provided"}
                  </span>{" "}
                  — {event.description ?? "No description provided"}
                  {event.location ? ` (${event.location})` : ""}
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap gap-2">
            {shipment.labelAvailable && (
              <Button
                type="button"
                size="sm"
                variant="white"
                style={OUTLINE}
                onClick={downloadLabel}
                disabled={busy !== null}
              >
                <Download className="size-3.5" />
                {busy === "label"
                  ? "Downloading…"
                  : "Download test label (PDF)"}
              </Button>
            )}
            {shipment.trackingNumber && shipment.state !== "cancelled" && (
              <Button
                type="button"
                size="sm"
                variant="white"
                style={OUTLINE}
                onClick={refreshTracking}
                disabled={busy !== null}
              >
                <RefreshCw
                  className={`size-3.5 ${busy === "tracking" ? "animate-spin" : ""}`}
                />
                {busy === "tracking" ? "Refreshing…" : "Refresh tracking"}
              </Button>
            )}
          </div>
          {shipment.labelAvailable && (
            <p className="text-xs text-neutral-500">
              Sandbox test label — not valid for shipping.
            </p>
          )}
        </div>
      )}

      {canCancel && (
        <div className="rounded-xl p-4" style={{ border: "1px solid #F0F0F0" }}>
          {confirm === "cancel" ? (
            <div className="space-y-3">
              <p className="text-sm text-neutral-800">
                Cancel this FedEx sandbox shipment?
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => runAction("cancel")}
                  disabled={busy !== null}
                >
                  Confirm cancellation
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="white"
                  style={OUTLINE}
                  onClick={() => setConfirm(null)}
                  disabled={busy !== null}
                >
                  Keep shipment
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="white"
              style={OUTLINE}
              onClick={() => setConfirm("cancel")}
              disabled={busy !== null}
            >
              {busy === "cancel" ? "Cancelling…" : "Cancel sandbox shipment"}
            </Button>
          )}
        </div>
      )}

      {notice && (
        <p className="text-xs text-neutral-500" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </section>
  );
}
