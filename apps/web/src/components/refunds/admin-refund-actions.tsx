"use client";

import { useState } from "react";
import { Button } from "@eco-globe/ui";
import { describeBackendError } from "@/lib/backend-client";
import {
  decideRefund,
  formatRefundMoney,
  isStripeRefundReference,
  reconcileRefund,
  requestRefundInformation,
  type RefundCase,
  type RefundStatus,
} from "@/lib/api-refunds";
import { isValidRefundText, RefundTextArea } from "./refund-ui";

type Action = "approve" | "decline" | "request-information" | "reconcile";

const ACTIONS_BY_STATUS: Record<RefundStatus, Action[]> = {
  requested: ["approve", "decline", "request-information"],
  awaiting_buyer: ["decline", "request-information"],
  awaiting_seller: ["decline", "request-information"],
  approved: ["reconcile", "decline"],
  provider_pending: ["reconcile"],
  provider_failed: ["reconcile", "decline"],
  refunded: [],
  declined: [],
};

const ACTION_LABEL: Record<Action, string> = {
  approve: "Approve",
  decline: "Decline",
  "request-information": "Ask for information",
  reconcile: "Verify Stripe refund",
};

/**
 * Staff decisions for one case. Only the transitions the contract allows for
 * the current status are offered; the backend remains the authority and the
 * case is re-read after every attempt, successful or not.
 */
export function AdminRefundActions({ refund, onDone }: { refund: RefundCase; onDone: () => void }) {
  const actions = ACTIONS_BY_STATUS[refund.status] ?? [];
  const [selected, setSelected] = useState<Action | null>(null);
  const action = selected && actions.includes(selected) ? selected : (actions[0] ?? null);
  const [text, setText] = useState("");
  const [target, setTarget] = useState<"buyer" | "seller">("buyer");
  const [reference, setReference] = useState(refund.providerRefundId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (!action) {
    return (
      <section className="rounded-2xl bg-white p-5 sm:p-6" style={{ border: "1px solid #F0F0F0" }}>
        <h2 className="text-lg font-bold text-neutral-900">Staff actions</h2>
        <p className="mt-2 text-sm text-neutral-600">This case is closed. No further staff actions are available.</p>
      </section>
    );
  }

  const boundReference = refund.providerRefundId;
  // A failed/canceled bound refund may be replaced by a new Stripe refund; the
  // server re-checks the old one in Stripe and keeps every reference on record.
  const canReplace = refund.status === "provider_failed" && Boolean(boundReference);
  const referenceValue = boundReference && !canReplace ? boundReference : reference.trim();
  const replacing = canReplace && referenceValue !== boundReference;
  const valid =
    action === "reconcile" ? isStripeRefundReference(referenceValue) : isValidRefundText(text);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !valid) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (action === "approve" || action === "decline") {
        await decideRefund(refund.id, action, text.trim());
        setNotice(action === "approve" ? "Approved. Issue the refund in Stripe, then verify it here." : "Declined.");
      } else if (action === "request-information") {
        await requestRefundInformation(refund.id, target, text.trim());
        setNotice(`Information requested from the ${target}. The notice email is queued.`);
      } else {
        const result = await reconcileRefund(refund.id, referenceValue);
        setNotice(
          result.refund.status === "refunded"
            ? "Stripe reports the refund succeeded. The case is complete."
            : `Stripe has not reported success yet (status: ${result.refund.providerStatus ?? "unknown"}). The case stays open.`,
        );
      }
      setText("");
    } catch (reason) {
      setError(describeBackendError(reason, "The action was not recorded."));
    } finally {
      setBusy(false);
      onDone();
    }
  };

  return (
    <section className="rounded-2xl bg-white p-5 sm:p-6" style={{ border: "1px solid #F0F0F0" }}>
      <h2 className="text-lg font-bold text-neutral-900">Staff actions</h2>
      {refund.status === "provider_pending" && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          The Stripe refund is still pending. Investigate it in the Stripe Dashboard and re-verify it here; this case
          cannot be closed to release settlement until Stripe reports an outcome.
        </p>
      )}
      {refund.status === "provider_failed" && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          The Stripe refund failed or was canceled. Investigate it in the Stripe Dashboard, then either record a new
          Stripe refund you issued, or decline the case with a note. EcoGlobe accepts either only after Stripe confirms
          the earlier refund failed or was canceled and shows no pending or unrecorded refund on this payment.
        </p>
      )}
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-neutral-900">Action</legend>
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <label
                key={a}
                className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium ${
                  a === action ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700"
                }`}
              >
                <input
                  type="radio"
                  name={`refund-${refund.id}-action`}
                  value={a}
                  checked={a === action}
                  onChange={() => {
                    setSelected(a);
                    setError("");
                    setNotice("");
                  }}
                  className="sr-only"
                />
                {ACTION_LABEL[a]}
              </label>
            ))}
          </div>
        </fieldset>

        {action === "approve" && (
          <p className="text-sm text-neutral-600">
            Approving records the decision only. Refund {formatRefundMoney(refund.amountCents, refund.currencyCode)} for
            payment <span className="font-mono text-xs">{refund.paymentIntentId}</span> in the Stripe Dashboard, then
            verify the Stripe refund reference.
          </p>
        )}

        {action === "decline" && (refund.status === "approved" || refund.status === "provider_failed") && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Declining releases the settlement hold. EcoGlobe checks Stripe first and refuses the decline if a refund on
            this payment is pending or not recorded in EcoGlobe.
          </p>
        )}

        {action === "request-information" && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-neutral-900">Ask</legend>
            <div className="flex gap-4 text-sm">
              {(["buyer", "seller"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`refund-${refund.id}-target`}
                    value={t}
                    checked={target === t}
                    onChange={() => setTarget(t)}
                  />
                  {t === "buyer" ? `Buyer (${refund.buyerCompanyName})` : `Seller (${refund.sellerCompanyName})`}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Only the chosen company and staff see this question. The company gets an email notice and a due date
              (48 hours by default), with a reminder every 24 hours until they respond. Any earlier request&apos;s
              reminders are cancelled.
            </p>
          </fieldset>
        )}

        {action === "reconcile" ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`refund-${refund.id}-reference`} className="text-sm font-medium text-neutral-900">
              Stripe refund reference
            </label>
            <input
              id={`refund-${refund.id}-reference`}
              value={referenceValue}
              onChange={(e) => setReference(e.target.value)}
              readOnly={Boolean(boundReference) && !canReplace}
              disabled={busy}
              placeholder="re_…"
              autoComplete="off"
              spellCheck={false}
              aria-describedby={`refund-${refund.id}-reference-hint`}
              className="w-full rounded-lg bg-white px-3 py-2 font-mono text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900 read-only:bg-neutral-50"
              style={{ border: "1px solid #E0E0E0" }}
            />
            <p id={`refund-${refund.id}-reference-hint`} className="text-xs text-neutral-500">
              {canReplace
                ? replacing
                  ? `Replaces ${boundReference}. Accepted only if Stripe shows that refund failed or was canceled; both references stay on record.`
                  : "Re-verify the current refund, or enter the ID of a new refund you issued in Stripe to replace it."
                : boundReference
                  ? "This case is bound to this Stripe refund. Re-verifying reads its current status from Stripe."
                  : "Copy the refund ID from Stripe. EcoGlobe checks the payment, amount and currency against this case; only a succeeded refund completes it."}
            </p>
          </div>
        ) : (
          <>
            <RefundTextArea
              id={`refund-${refund.id}-${action}-text`}
              label={action === "request-information" ? "Question" : "Staff note"}
              value={text}
              onChange={setText}
              disabled={busy}
            />
            {action !== "request-information" && (
              <p className="-mt-2 text-xs text-neutral-500">
                The note is shown to the buyer and seller on this case and included in their email notices.
              </p>
            )}
          </>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-green-700">
            {notice}
          </p>
        )}
        <div>
          <Button type="submit" variant="primary" size="sm" disabled={busy || !valid}>
            {busy ? "Saving…" : replacing && action === "reconcile" ? "Verify replacement refund" : ACTION_LABEL[action]}
          </Button>
        </div>
      </form>
    </section>
  );
}
