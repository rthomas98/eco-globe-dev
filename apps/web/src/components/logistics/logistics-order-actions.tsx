"use client";

import { useId, useState } from "react";
import { CheckCircle2, Download, FileText, Truck, Upload } from "lucide-react";
import { Button, buttonVariants, Input } from "@eco-globe/ui";
import {
  acceptLogisticsQuote,
  confirmLogisticsReceipt,
  dispatchLogisticsShipment,
  logisticsBolDownloadUrl,
  MAX_BOL_BYTES,
  uploadLogisticsBol,
  type LogisticsCarrier,
  type LogisticsOrder,
} from "@/lib/api-logistics";
import { describeBackendError } from "@/lib/backend-client";
import { readFileAsBase64 } from "@/lib/listings-api";
import { LogisticsQuoteForm } from "./logistics-quote-form";
import { ReceiptConfirmationForm } from "./receipt-confirmation-form";
import {
  formatDateTime,
  formatMoney,
  isClosedOrder,
  isPickupOrder,
  logisticsStage,
  type LogisticsPortal,
} from "./logistics-stage";

const card = { border: "1px solid #F0F0F0" } as const;

function ActionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white p-4" style={card} aria-label={title}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900">
        <Icon className="size-4 text-neutral-500" aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function InlineError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
      {message}
    </p>
  );
}

/**
 * State-appropriate actions for one persisted logistics order. Every action
 * posts to the backend and then calls `onChanged` so the caller reloads the
 * workspace; nothing is kept as local-only progress.
 */
export function LogisticsOrderActions({
  order,
  carriers,
  portal,
  onChanged,
}: {
  order: LogisticsOrder;
  carriers: LogisticsCarrier[];
  portal: LogisticsPortal;
  onChanged: (notice: string) => Promise<void>;
}) {
  const stage = logisticsStage(order).kind;
  const staffSide = portal === "seller" || portal === "admin";
  const buyer = portal === "buyer";
  const shipment = order.shipment;
  const quote = order.quote;

  const actions: React.ReactNode[] = [];

  // A dispute-locked order keeps read access (BOL download) but no mutations.
  if (order.fulfilmentLocked && !isClosedOrder(order)) {
    return (
      <div className="space-y-3">
        <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Fulfilment is locked while a dispute on this order is open. Quote, BOL, dispatch and receipt
          actions are paused until EcoGlobe resolves it.
        </p>
        {shipment?.bolUploadedAt && <BolDownload order={order} />}
      </div>
    );
  }

  if (staffSide && (stage === "needs_quote" || stage === "quote_offered")) {
    // Keyed by the current offer so a replaced quote reinitialises the form.
    actions.push(
      <QuoteAction key={`quote-${quote?.id ?? "new"}`} order={order} carriers={carriers} onChanged={onChanged} />,
    );
  }
  if (stage === "quote_offered" && quote) {
    actions.push(
      buyer ? (
        <AcceptQuoteAction key="accept" order={order} quoteId={quote.id} onChanged={onChanged} />
      ) : portal === "admin" ? (
        <p key="accept-note" className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">
          Quote acceptance is recorded by the buyer company. Admins do not accept on the buyer&apos;s behalf.
        </p>
      ) : null,
    );
  }
  if (staffSide && (stage === "bol_needed" || stage === "ready_to_dispatch")) {
    actions.push(<BolUploadAction key="bol" order={order} replacing={stage === "ready_to_dispatch"} onChanged={onChanged} />);
  }
  if (staffSide && stage === "ready_to_dispatch") {
    actions.push(<DispatchAction key="dispatch" order={order} onChanged={onChanged} />);
  }
  if (stage === "in_transit" || stage === "pickup_ready") {
    const pickup = isPickupOrder(order);
    actions.push(
      buyer ? (
        <ActionCard key="receipt" icon={CheckCircle2} title={pickup ? "Record pickup receipt" : "Record delivery receipt"}>
          <ReceiptConfirmationForm
            kind={pickup ? "pickup" : "delivery"}
            onSubmit={async (details) => {
              await confirmLogisticsReceipt({ orderId: order.id, ...details });
              await onChanged(
                pickup
                  ? `Pickup receipt recorded for EG-${order.id}. The order is complete.`
                  : `Delivery receipt recorded for EG-${order.id}. The order is complete.`,
              );
            }}
          />
        </ActionCard>
      ) : (
        <p key="receipt-note" className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">
          Receipt is recorded by the buyer company{portal === "admin" ? "; admins do not confirm receipt on the buyer's behalf" : ""}.
        </p>
      ),
    );
  }
  if (shipment?.bolUploadedAt) {
    actions.push(<BolDownload key="bol-download" order={order} />);
  }

  const visible = actions.filter(Boolean);
  if (visible.length === 0) {
    return (
      <p className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">
        No logistics action is needed from you on this order right now.
      </p>
    );
  }
  return <div className="space-y-3">{visible}</div>;
}

function QuoteAction({
  order,
  carriers,
  onChanged,
}: {
  order: LogisticsOrder;
  carriers: LogisticsCarrier[];
  onChanged: (notice: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const replacing = order.quote?.status === "offered";
  return (
    <ActionCard icon={Truck} title={replacing ? "Replace shipping quote" : "Record shipping quote"}>
      {open ? (
        <LogisticsQuoteForm
          order={order}
          carriers={carriers}
          onCancel={() => setOpen(false)}
          onSaved={async () => {
            setOpen(false);
            await onChanged(`Shipping quote recorded for EG-${order.id}. Awaiting buyer acceptance.`);
          }}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-600">
            {replacing
              ? "The buyer has not accepted yet. You can replace the offer."
              : "Enter the carrier, cost and pickup time you arranged."}
          </p>
          <Button type="button" variant={replacing ? "secondary" : "primary"} size="sm" onClick={() => setOpen(true)}>
            {replacing ? "Replace quote" : "Record quote"}
          </Button>
        </div>
      )}
    </ActionCard>
  );
}

function AcceptQuoteAction({
  order,
  quoteId,
  onChanged,
}: {
  order: LogisticsOrder;
  quoteId: number;
  onChanged: (notice: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const quote = order.quote;
  const pickupPassed = quote ? new Date(quote.pickupScheduledAt).getTime() < Date.now() : false;

  async function accept() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await acceptLogisticsQuote({ orderId: order.id, quoteId });
      await onChanged(`Quote accepted for EG-${order.id}. EcoGlobe staff will coordinate the pickup.`);
    } catch (caught) {
      setError(describeBackendError(caught, "The quote could not be accepted."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionCard icon={CheckCircle2} title="Accept shipping quote">
      <p className="text-sm text-neutral-600">
        {quote
          ? `${formatMoney(quote.amount, quote.currencyCode)} with ${quote.carrierName ?? "the listed carrier"}, pickup ${formatDateTime(quote.pickupScheduledAt) ?? "as quoted"}.`
          : null}{" "}
        Accepting approves EcoGlobe staff to coordinate this shipment. No card is charged and no funds move.
      </p>
      {pickupPassed ? (
        <p role="status" className="mt-3 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          The quoted pickup time has passed. Ask the seller for an updated quote.
        </p>
      ) : (
        <div className="mt-3 flex justify-end">
          <Button type="button" variant="primary" size="sm" onClick={() => void accept()} disabled={busy}>
            {busy ? "Accepting…" : "Accept quote"}
          </Button>
        </div>
      )}
      <InlineError message={error} />
    </ActionCard>
  );
}

function BolUploadAction({
  order,
  replacing,
  onChanged,
}: {
  order: LogisticsOrder;
  replacing: boolean;
  onChanged: (notice: string) => Promise<void>;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File | undefined) {
    if (!file || busy) return;
    const isPdf = file.type === "application/pdf" && file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf || file.size > MAX_BOL_BYTES) {
      setError("Choose a PDF Bill of Lading up to 5 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await uploadLogisticsBol({ orderId: order.id, fileName: file.name, dataBase64: await readFileAsBase64(file) });
      await onChanged(`Bill of Lading attached to EG-${order.id}. Record dispatch when the carrier collects the load.`);
    } catch (caught) {
      setError(describeBackendError(caught, "The Bill of Lading could not be uploaded."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionCard icon={Upload} title={replacing ? "Replace Bill of Lading" : "Attach Bill of Lading"}>
      <label htmlFor={inputId} className="block text-sm text-neutral-600">
        PDF only, up to 5 MB. Stored privately and shared with the order participants. Uploading does not dispatch the shipment.
      </label>
      <input
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        disabled={busy}
        onChange={(event) => {
          void upload(event.target.files?.[0]);
          event.target.value = "";
        }}
        className="mt-3 block w-full text-sm file:mr-3 file:rounded-full file:border file:border-neutral-900 file:bg-white file:px-4 file:py-1.5 file:text-sm file:font-semibold"
      />
      {busy && (
        <p role="status" className="mt-2 text-sm text-neutral-600">
          Uploading…
        </p>
      )}
      <InlineError message={error} />
    </ActionCard>
  );
}

function DispatchAction({
  order,
  onChanged,
}: {
  order: LogisticsOrder;
  onChanged: (notice: string) => Promise<void>;
}) {
  const baseId = useId();
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function dispatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await dispatchLogisticsShipment({ orderId: order.id, trackingNumber: tracking });
      await onChanged(`EG-${order.id} recorded as dispatched. The buyer records receipt on arrival.`);
    } catch (caught) {
      setError(describeBackendError(caught, "Dispatch could not be recorded."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionCard icon={Truck} title="Record dispatch">
      <form onSubmit={dispatch} className="space-y-3" noValidate>
        <Input
          id={`${baseId}-tracking`}
          label="Carrier reference (optional)"
          value={tracking}
          onChange={(event) => setTracking(event.target.value)}
          maxLength={160}
          placeholder="Only if the carrier provided one"
        />
        <p className="text-sm text-neutral-600">
          Record this when the carrier has collected the load. EcoGlobe does not track the vehicle.
        </p>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="sm" disabled={busy}>
            {busy ? "Recording…" : "Mark dispatched"}
          </Button>
        </div>
      </form>
      <InlineError message={error} />
    </ActionCard>
  );
}

function BolDownload({ order }: { order: LogisticsOrder }) {
  const shipment = order.shipment;
  const fileName = shipment?.bolFileName ?? `order-${order.id}-bol.pdf`;

  return (
    <ActionCard icon={FileText} title="Bill of Lading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">
          {shipment?.bolFileName ?? "BOL.pdf"}
          {shipment?.bolUploadedAt ? ` · uploaded ${formatDateTime(shipment.bolUploadedAt) ?? ""}` : ""}
        </p>
        {/* Ordinary navigation (not a blob auto-click) so the browser owns the
            download; the session proxy authorizes it server-side. */}
        <a
          href={logisticsBolDownloadUrl(order.id)}
          download={fileName}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
          style={{ padding: "8px 20px", border: "1px solid #090909" }}
        >
          <Download className="size-4" aria-hidden="true" />
          Download PDF
        </a>
      </div>
    </ActionCard>
  );
}
