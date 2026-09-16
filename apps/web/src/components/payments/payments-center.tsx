"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Download, Receipt, ShieldCheck, X } from "lucide-react";
import { fetchPayments, portalDate, portalMoney } from "@/lib/api-portal";
import { fetchOrders } from "@/lib/api-orders";
import { useDemoUser } from "@/lib/demo-user";
import { startBackendStripeOnboarding } from "@/lib/backend-auth";
import {
  paymentReceiptHtml,
  paymentsCsv,
  type PaymentDocument,
} from "@/lib/payment-documents";

type Role = "buyer" | "seller" | "admin";
type Panel = "setup" | "receipt" | "review" | null;
const button =
  "rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold disabled:opacity-50";

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PaymentDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClose={onClose}
      aria-labelledby="payment-dialog-title"
      className="m-auto max-h-[90vh] w-[min(92vw,640px)] overflow-y-auto rounded-2xl bg-white p-6 text-neutral-950 shadow-xl backdrop:bg-black/40"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <h2 id="payment-dialog-title" className="text-xl font-bold">
          {title}
        </h2>
        <button type="button" onClick={onClose} aria-label="Close dialog">
          <X className="size-5" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function PaymentsCenter({ role }: { role: Role }) {
  const user = useDemoUser();
  const companyId = user?.activeCompanyId;
  const userId = user?.id;
  const [rows, setRows] = useState<PaymentDocument[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupMessage, setSetupMessage] = useState("");
  const [setupError, setSetupError] = useState("");
  const [notice, setNotice] = useState("");
  const selected = rows.find((row) => row.id === selectedId);

  useEffect(() => {
    let cancelled = false;
    setRows([]);
    setSelectedId(null);
    setPanel(null);
    setError("");
    setLoading(true);
    if (!userId || (!companyId && role !== "admin")) {
      setLoading(false);
      setError("Sign in with an active company to view payments.");
      return;
    }
    Promise.all([fetchPayments(), fetchOrders()])
      .then(([payments, orders]) => {
        if (cancelled) return;
        const orderById = new Map(orders.map((order) => [order.id, order]));
        const records = payments.flatMap((payment) => {
          const order = orderById.get(payment.orderId);
          if (
            role !== "admin" &&
            (!order ||
              (role === "seller"
                ? order.sellerCompanyId !== companyId
                : order.buyerCompanyId !== companyId))
          )
            return [];
          return [
            {
              id: payment.id,
              orderId: payment.orderId,
              title: order?.listingTitle ?? "Marketplace payment",
              payer: payment.payerCompanyName,
              payee: order?.sellerCompanyName ?? "Not recorded",
              amount: Number(payment.amount),
              currency: payment.currencyCode,
              status: payment.paymentStatusCode,
              type: payment.paymentTypeCode,
              reference: payment.providerPaymentId,
              createdAt: payment.createdAt,
              escrowId: payment.escrowId,
            },
          ];
        });
        setRows(records);
        setSelectedId(records[0]?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Unable to load payments.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, userId, role, reload]);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("stripe");
    if (result === "success")
      setNotice(
        "Provider setup returned. Verification and payout readiness depend on the provider; returning here does not confirm approval.",
      );
    if (result === "cancelled")
      setNotice("Payment setup was cancelled. You can try again.");
  }, []);

  async function startSetup() {
    if (role === "admin") return;
    setSetupBusy(true);
    setSetupError("");
    setSetupMessage("");
    try {
      const returnUrl = `${window.location.origin}/${role}/accounting/payments`;
      const result = await startBackendStripeOnboarding({
        role,
        returnUrl,
        refreshUrl: returnUrl,
      });
      if (result.mode === "stripe") {
        window.location.assign(result.redirectUrl);
        return;
      }
      setSetupMessage(
        "Demo setup recorded by the backend. No bank account or card was connected, and no money can be transferred through this demo setup.",
      );
    } catch (err) {
      setSetupError(
        err instanceof Error
          ? err.message
          : "Unable to start payment setup. Please try again.",
      );
    } finally {
      setSetupBusy(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-neutral-50 p-5 md:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.25em] text-emerald-700">
            {role === "seller" ? "PAYOUT CENTER" : "PAYMENT CENTER"}
          </p>
          <h1 className="text-3xl font-bold">
            {role === "seller"
              ? "Track incoming payments and escrow funding."
              : "Payment records and receipts"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Recorded transactions for your account. Escrow funding and seller
            payouts are separate stages.
          </p>
        </div>
        {role !== "admin" && (
          <button
            type="button"
            className={`${button} bg-neutral-950 text-white`}
            onClick={() => {
              setSetupMessage("");
              setSetupError("");
              setPanel("setup");
            }}
          >
            Add payment method
          </button>
        )}
      </div>
      {notice && (
        <p role="status" className="mb-4 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <div role="alert" className="mb-4 rounded-xl bg-amber-50 p-4">
          {error}{" "}
          <button
            className="underline"
            onClick={() => setReload((value) => value + 1)}
          >
            Retry
          </button>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Payment history</h2>
            <button
              type="button"
              className={button}
              disabled={!rows.length || loading}
              onClick={() => {
                download(
                  "ecoglobe-payments.csv",
                  paymentsCsv(rows),
                  "text/csv;charset=utf-8",
                );
                setNotice("Payment history exported as CSV.");
              }}
            >
              <Download className="mr-2 inline size-4" />
              Export
            </button>
          </div>
          {loading ? (
            <p role="status">Loading payments…</p>
          ) : !rows.length && !error ? (
            <p className="py-8 text-neutral-600">No payment records yet.</p>
          ) : (
            rows.map((row) => (
              <button
                type="button"
                key={row.id}
                onClick={() => setSelectedId(row.id)}
                aria-pressed={row.id === selectedId}
                className={`grid w-full gap-3 border-b border-neutral-100 p-4 text-left md:grid-cols-[75px_1fr_auto] ${row.id === selectedId ? "bg-neutral-950 text-white" : "hover:bg-neutral-50"}`}
              >
                <span>TX-{row.id}</span>
                <span>
                  <strong className="block">{row.title}</strong>
                  <span className="text-xs">
                    {role === "seller"
                      ? `from ${row.payer}`
                      : `to ${row.payee}`}
                  </span>
                </span>
                <span>
                  {portalMoney(row.amount, row.currency)}
                  <span className="block text-xs">
                    {row.status.replaceAll("_", " ")}
                  </span>
                </span>
              </button>
            ))
          )}
        </section>
        <aside className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-bold">Payment detail</h2>
          {selected ? (
            <>
              <PaymentFields payment={selected} />
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={button}
                  onClick={() => setPanel("receipt")}
                >
                  <Receipt className="mr-2 inline size-4" />
                  Receipt
                </button>
                <button
                  type="button"
                  className={`${button} bg-neutral-950 text-white`}
                  onClick={() => setPanel("review")}
                >
                  <ShieldCheck className="mr-2 inline size-4" />
                  Review
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-600">
              Select a payment to see its details.
            </p>
          )}
        </aside>
      </div>
      {panel === "setup" && (
        <PaymentDialog
          title={
            role === "seller"
              ? "Set up your payout method"
              : "Set up your payment method"
          }
          onClose={() => {
            if (!setupBusy) setPanel(null);
          }}
        >
          <p className="mb-4 text-sm leading-6">
            Continue to secure provider setup to add{" "}
            {role === "seller" ? "a payout account" : "a payment method"}. Bank
            and card details are entered with the provider. If this environment
            uses demo mode, only a demo setup is recorded.
          </p>
          {setupError && (
            <p role="alert" className="mb-4 text-red-700">
              {setupError}
            </p>
          )}
          {setupMessage ? (
            <p role="status" className="mb-4 rounded-lg bg-neutral-100 p-4">
              {setupMessage}
            </p>
          ) : (
            <button
              className={`${button} bg-black text-white`}
              disabled={setupBusy}
              onClick={() => void startSetup()}
            >
              {setupBusy ? "Starting setup…" : "Continue to payment setup"}
            </button>
          )}
        </PaymentDialog>
      )}
      {selected && panel === "receipt" && (
        <PaymentDialog
          title={
            selected.status === "captured"
              ? `Receipt · TX-${selected.id}`
              : `Payment record · TX-${selected.id}`
          }
          onClose={() => setPanel(null)}
        >
          <PaymentFields payment={selected} />
          <p className="my-4 text-sm text-neutral-600">
            {selected.status !== "captured"
              ? "This payment is not recorded as captured. The download is a payment record, not a paid receipt. "
              : ""}
            Escrow funding does not confirm seller payout. Simulated
            transactions do not represent money moved.
          </p>
          <button
            className={`${button} bg-black text-white`}
            onClick={() => {
              download(
                `ecoglobe-payment-${selected.id}.html`,
                paymentReceiptHtml(selected),
                "text/html;charset=utf-8",
              );
              setNotice(
                `TX-${selected.id} downloaded. Open the document to print or save as PDF.`,
              );
            }}
          >
            Download printable{" "}
            {selected.status === "captured" ? "receipt" : "record"}
          </button>
        </PaymentDialog>
      )}
      {selected && panel === "review" && (
        <PaymentDialog
          title={`Review payment · TX-${selected.id}`}
          onClose={() => setPanel(null)}
        >
          <PaymentFields payment={selected} />
          <dl className="mt-4 space-y-3 text-sm">
            <Detail label="Payer" value={selected.payer} />
            <Detail label="Seller" value={selected.payee} />
            <Detail
              label="Provider reference"
              value={selected.reference ?? "Not recorded"}
            />
            <Detail label="Recorded at" value={selected.createdAt} />
          </dl>
          <p className="my-4 text-sm text-neutral-600">
            This is a review of the recorded transaction. Viewing it does not
            release escrow or change its payment status.
          </p>
          <button className={button} onClick={() => setPanel(null)}>
            Done
          </button>
        </PaymentDialog>
      )}
    </div>
  );
}

function PaymentFields({ payment }: { payment: PaymentDocument }) {
  return (
    <dl className="space-y-3 text-sm">
      <Detail label="Payment" value={`TX-${payment.id}`} />
      <Detail label="Order" value={`EG-${payment.orderId}`} />
      <Detail label="Material" value={payment.title} />
      <Detail
        label="Amount"
        value={portalMoney(payment.amount, payment.currency)}
      />
      <Detail label="Status" value={payment.status.replaceAll("_", " ")} />
      <Detail label="Type" value={payment.type.replaceAll("_", " ")} />
      <Detail label="Date" value={portalDate(payment.createdAt)} />
      <Detail
        label="Escrow"
        value={payment.escrowId ? `ESC-${payment.escrowId}` : "None recorded"}
      />
    </dl>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-neutral-100 pb-2">
      <dt className="text-neutral-600">{label}</dt>
      <dd className="break-words text-right font-medium">{value}</dd>
    </div>
  );
}
