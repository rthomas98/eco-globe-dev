"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download, FileDown, Printer } from "lucide-react";
import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { SellerLayout } from "@/components/seller/seller-layout";
import { apiFetch, describeBackendError, isBackendApiError } from "@/lib/backend-client";
import { readDemoUser, useDemoUser } from "@/lib/demo-user";
import { portalDate, portalMoney } from "@/lib/api-portal";
import {
  paymentDocumentFrom,
  paymentReceiptHtml,
  receiptTitle,
  type PaymentDocument,
  type ReceiptOrderFields,
  type SavedPaymentRow,
} from "@/lib/payment-documents";

type Role = "buyer" | "seller" | "admin";
type State =
  | { status: "loading" }
  | { status: "ready"; doc: PaymentDocument; orderMissing: boolean }
  | { status: "error"; message: string };

const button =
  "inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold disabled:opacity-50";

/**
 * Printable receipt for one saved payment, read from GET /api/payments/:id and
 * its order. The page itself is the reviewable receipt; printing uses the same
 * content in an isolated frame, so nothing depends on a browser download.
 */
function ReceiptContent({ role, paymentId }: { role: Role; paymentId?: string }) {
  const params = useParams<{ id?: string }>();
  const id = Number(paymentId ?? params.id);
  // Results belong to one signed-in user and company; a switch drops them.
  const user = useDemoUser();
  const identity = user ? `${user.id ?? ""}:${user.activeCompanyId ?? ""}` : null;
  const [loadedState, setLoadedState] = useState<{ identity: string | null; paymentId: number | null; value: State }>({ identity: null, paymentId: null, value: { status: "loading" } });
  const state: State = loadedState.identity === identity && Object.is(loadedState.paymentId, id) ? loadedState.value : { status: "loading" };
  const [notice, setNotice] = useState("");
  const [frameReady, setFrameReady] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;
    const setState = (value: State) => setLoadedState({ identity, paymentId: id, value });
    setNotice("");
    setFrameReady(false);
    setState({ status: "loading" });
    if (identity === null) {
      // Not read yet, or no session at all: only the latter is an error.
      if (!readDemoUser()) setState({ status: "error", message: "Sign in to view this payment." });
      return;
    }
    if (!Number.isSafeInteger(id) || id <= 0) {
      setState({ status: "error", message: "This payment reference is not valid." });
      return;
    }
    setState({ status: "loading" });
    (async () => {
      try {
        const { payment } = await apiFetch<{ ok: true; payment: SavedPaymentRow }>(`/api/payments/${id}`);
        let order: ReceiptOrderFields | null = null;
        try {
          const body = await apiFetch<{ ok: true; order?: ReceiptOrderFields }>(`/api/orders/${payment.orderId}`);
          order = body.order ?? null;
        } catch {
          // The payment is still shown; order fields print as "Not recorded".
        }
        if (!cancelled) setState({ status: "ready", doc: paymentDocumentFrom(payment, order), orderMissing: !order });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            isBackendApiError(error) && error.status === 404
              ? `Payment TX-${id} was not found.`
              : isBackendApiError(error) && error.status === 403
                ? `Your company does not have access to payment TX-${id}.`
                : describeBackendError(error, `Payment TX-${id} could not be loaded.`),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, identity]);

  const print = () => {
    const win = frameRef.current?.contentWindow;
    if (!frameReady || !win || state.status !== "ready") {
      setNotice("Printing is not available yet. Use Download PDF, or your browser's print command on this page.");
      return;
    }
    try {
      win.focus();
      win.print();
      // Whether a dialog appears is up to the browser; it cannot be confirmed here.
      setNotice("Your browser was asked to print this receipt. If no print dialog appears, use Download PDF.");
    } catch {
      setNotice("This browser blocked printing from the page. Use Download PDF, or your browser's print command.");
    }
  };

  const saveCopy = () => {
    if (state.status !== "ready") return;
    const anchor = document.createElement("a");
    anchor.href = `data:text/html;charset=utf-8,${encodeURIComponent(paymentReceiptHtml(state.doc))}`;
    anchor.download = `ecoglobe-payment-${state.doc.id}.html`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    // The browser decides whether and where a file is saved; this cannot be confirmed.
    setNotice("Your browser was asked to save an HTML copy. Check your downloads; if nothing appears, use Print instead.");
  };

  const back = `/${role}/accounting/payments`;
  if (state.status === "loading") return <p role="status" className="p-8">Loading payment receipt…</p>;
  if (state.status === "error")
    return (
      <div className="p-8">
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {state.message}
        </p>
        <Link href={back} className="mt-4 inline-block font-semibold underline">
          Back to payments
        </Link>
      </div>
    );

  const { doc } = state;
  const captured = doc.status === "captured";
  const rows: [string, string][] = [
    ["Payment", `TX-${doc.id}`],
    ["Order", `EG-${doc.orderId}`],
    ["Material", doc.title],
    ["Payer", doc.payer],
    ["Seller", doc.payee],
    ["Amount", portalMoney(doc.amount, doc.currency)],
    ["Status", doc.status.replaceAll("_", " ")],
    ["Payment type", doc.type.replaceAll("_", " ")],
    ["Recorded", portalDate(doc.createdAt)],
    ["Provider reference", doc.reference ?? "Not recorded"],
    ["Escrow", doc.escrowId ? `ESC-${doc.escrowId}` : "None recorded"],
  ];
  return (
    <main className="mx-auto max-w-3xl p-5 md:p-8">
      <Link href={back} className="text-sm font-semibold underline">
        ← Back to payments
      </Link>
      <h1 className="mt-4 text-3xl font-bold">EcoGlobe · {receiptTitle(doc)}</h1>
      {!captured && (
        <p role="status" className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          This payment is not recorded as captured, so this is a payment record, not a paid receipt.
        </p>
      )}
      {state.orderMissing && (
        <p className="mt-3 text-sm text-neutral-600">The order details could not be loaded; those fields show as not recorded.</p>
      )}
      <dl className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-6 border-b border-neutral-100 px-5 py-3 text-sm last:border-b-0">
            <dt className="text-neutral-600">{label}</dt>
            <dd className="break-all text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-neutral-600">
        This reflects the recorded EcoGlobe payment. A captured payment is not a seller payout; payouts and any refunds
        are handled by EcoGlobe staff. Simulated transactions do not represent money moved.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {/* Served by the backend from the saved payment, with the same order access
            check. The response names the file (attachment); no download attribute,
            so an error response is shown instead of being saved as a fake PDF. */}
        <a href={`/api/backend/api/payments/${doc.id}/receipt`} className={`${button} bg-black text-white`}>
          <FileDown className="size-4" /> Download PDF {captured ? "receipt" : "record"}
        </a>
        <button type="button" onClick={print} disabled={!frameReady} className={button}>
          <Printer className="size-4" /> Print {captured ? "receipt" : "record"}
        </button>
        <button type="button" onClick={saveCopy} className={button}>
          <Download className="size-4" /> Save HTML copy
        </button>
      </div>
      {notice && (
        <p role="status" className="mt-4 rounded-lg bg-neutral-100 p-3 text-sm">
          {notice}
        </p>
      )}
      <iframe
        ref={frameRef}
        title={`Printable ${receiptTitle(doc)}`}
        srcDoc={paymentReceiptHtml(doc)}
        sandbox="allow-modals allow-same-origin"
        onLoad={() => setFrameReady(true)}
        className="pointer-events-none fixed -left-[10000px] top-0 h-px w-px opacity-0"
        aria-hidden="true"
        tabIndex={-1}
      />
    </main>
  );
}

export function PaymentReceiptPage({ role, paymentId }: { role: Role; paymentId?: string }) {
  const content = <ReceiptContent role={role} paymentId={paymentId} />;
  if (role === "buyer") return <BuyerLayout>{content}</BuyerLayout>;
  if (role === "seller") return <SellerLayout title="Payment receipt">{content}</SellerLayout>;
  return content;
}
