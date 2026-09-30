"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { describeBackendError } from "@/lib/backend-client";
import {
  fetchRefund,
  formatRefundDate,
  formatRefundMoney,
  refundSourceLabel,
  REFUND_EMAIL_STATE_LABEL,
  respondToRefund,
  type RefundDetail,
  type RefundEmail,
  type RefundRole,
} from "@/lib/api-refunds";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";
import { AdminRefundActions } from "./admin-refund-actions";
import {
  isValidRefundText,
  RefundPolicyNote,
  RefundStatusBadge,
  RefundTextArea,
  RequiredStep,
} from "./refund-ui";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 sm:p-6" style={{ border: "1px solid #F0F0F0" }}>
      <h2 className="mb-4 text-lg font-bold text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-neutral-900">{value}</dd>
    </div>
  );
}

/**
 * Full refund case: facts, the required step, the response form for the
 * company being asked, staff actions for administrators, the audit timeline
 * and email delivery status. Every change re-reads the case from the backend.
 */
export function RefundCaseView({ id, role }: { id: number; role: RefundRole }) {
  const detail = useBackendData(() => fetchRefund(id), [id], "This refund case could not be loaded.");
  return (
    <DataBoundary state={detail} loadingLabel="Loading refund case…" empty={{ title: "Refund case not found" }}>
      {(data) => <CaseBody data={data} role={role} reload={detail.reload} refreshing={detail.status === "loading"} />}
    </DataBoundary>
  );
}

function CaseBody({
  data,
  role,
  reload,
  refreshing,
}: {
  data: RefundDetail;
  role: RefundRole;
  reload: () => void;
  refreshing: boolean;
}) {
  const { refund, events, emails } = data;
  const money = (cents: number) => formatRefundMoney(cents, refund.currencyCode);
  const isFull = refund.amountCents === refund.paidCents;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <RefundStatusBadge status={refund.status} />
        {refund.settlementHold && (
          <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
            Seller settlement on hold
          </span>
        )}
        {refreshing && (
          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500" role="status">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Refreshing…
          </span>
        )}
      </div>

      <RefundPolicyNote role={role} compact />
      <RequiredStep refund={refund} />

      {role !== "admin" && refund.canRespond && (
        <RespondForm refundId={refund.id} actionVersion={refund.actionVersion} onDone={reload} />
      )}
      {role === "admin" && refund.canManage && <AdminRefundActions refund={refund} onDone={reload} />}

      <Card title="Case details">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Fact label="Source" value={refundSourceLabel(refund)} />
          <Fact label="Requested amount" value={`${money(refund.amountCents)} ${isFull ? "(full)" : "(partial)"}`} />
          <Fact label="Paid in Stripe" value={money(refund.paidCents)} />
          <Fact label="Buyer" value={refund.buyerCompanyName} />
          <Fact label="Seller" value={refund.sellerCompanyName} />
          <Fact label="Opened" value={formatRefundDate(refund.createdAt)} />
          <Fact label="Last updated" value={formatRefundDate(refund.updatedAt)} />
          {role === "admin" && (
            <Fact label="Stripe payment" value={<span className="font-mono text-xs">{refund.paymentIntentId}</span>} />
          )}
          <Fact
            label="Stripe refund reference"
            value={
              refund.providerRefundId ? (
                <span className="font-mono text-xs">{refund.providerRefundId}</span>
              ) : (
                "Not recorded yet"
              )
            }
          />
          {refund.providerStatus && <Fact label="Stripe refund status" value={refund.providerStatus} />}
        </dl>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Reason</p>
          <p className="mt-1 whitespace-pre-line text-sm text-neutral-900">{refund.reason}</p>
        </div>
      </Card>

      <Card title="Timeline">
        {events.length === 0 ? (
          <p className="text-sm text-neutral-500">No events recorded.</p>
        ) : (
          <ol className="flex flex-col gap-4">
            {events.map((event) => (
              <li key={event.id} className="flex gap-3">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-neutral-400" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-900">{humanizeEvent(event.eventType)}</p>
                  {event.message && (
                    <p className="mt-0.5 whitespace-pre-line break-words text-sm text-neutral-700">{event.message}</p>
                  )}
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {event.actorName ?? "System"} · {formatRefundDate(event.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card title="Email notices and reminders">
        <p className="mb-3 text-xs text-neutral-500">
          {role === "admin"
            ? "All notices for this case. “Accepted by email provider” means the provider took the message; it does not prove inbox delivery."
            : "Notices sent to your company for this case. “Accepted by email provider” does not prove inbox delivery."}
        </p>
        <EmailList emails={emails} />
      </Card>
    </div>
  );
}

function humanizeEvent(type: string) {
  const text = type.replace(/[_.]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Event";
}

function EmailList({ emails }: { emails: RefundEmail[] }) {
  if (emails.length === 0) return <p className="text-sm text-neutral-500">No emails recorded for this case.</p>;
  return (
    <ul className="flex flex-col divide-y divide-neutral-100">
      {emails.map((email) => {
        const problem = email.state === "failed" || email.state === "needs_review";
        return (
          <li key={email.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900">
                {email.kind === "reminder" ? "Reminder" : "Notice"} to {email.recipientRole}
              </p>
              <p className="text-xs text-neutral-500">
                Queued {formatRefundDate(email.createdAt)}
                {email.sentAt ? ` · Accepted ${formatRefundDate(email.sentAt)}` : ""}
                {email.attempts > 0 ? ` · ${email.attempts} attempt${email.attempts === 1 ? "" : "s"}` : ""}
              </p>
              {email.lastError && (
                <p className="mt-1 break-words text-xs text-red-700">Last error: {email.lastError}</p>
              )}
            </div>
            <span
              className={`inline-flex w-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                problem
                  ? "bg-red-50 text-red-700"
                  : email.state === "sent"
                    ? "bg-green-50 text-green-700"
                    : "bg-neutral-100 text-neutral-700"
              }`}
            >
              {REFUND_EMAIL_STATE_LABEL[email.state] ?? email.state}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function RespondForm({
  refundId,
  actionVersion,
  onDone,
}: {
  refundId: number;
  actionVersion: number;
  onDone: () => void;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fieldId = `refund-${refundId}-response-${actionVersion}`;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !isValidRefundText(message)) return;
    setBusy(true);
    setError("");
    try {
      await respondToRefund(refundId, message.trim());
      setMessage("");
    } catch (reason) {
      setError(describeBackendError(reason, "Your response was not recorded."));
    } finally {
      setBusy(false);
      onDone();
    }
  };

  return (
    <Card title="Your response is needed">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <RefundTextArea
          id={fieldId}
          label="Response to EcoGlobe staff"
          value={message}
          onChange={setMessage}
          disabled={busy}
          placeholder="Answer the question above with the details requested."
        />
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div>
          <Button type="submit" variant="primary" size="sm" disabled={busy || !isValidRefundText(message)}>
            {busy ? "Sending…" : "Send response"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
