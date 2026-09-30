"use client";

import { useState } from "react";
import { Clock, Info } from "lucide-react";
import {
  formatRefundDate,
  REFUND_STATUS_LABEL,
  REFUND_TEXT_MAX,
  REFUND_TEXT_MIN,
  type RefundCase,
  type RefundRole,
  type RefundStatus,
} from "@/lib/api-refunds";

const STATUS_TONE: Record<RefundStatus, string> = {
  requested: "bg-amber-50 text-amber-800",
  awaiting_buyer: "bg-orange-50 text-orange-800",
  awaiting_seller: "bg-orange-50 text-orange-800",
  approved: "bg-blue-50 text-blue-800",
  provider_pending: "bg-blue-50 text-blue-800",
  provider_failed: "bg-red-50 text-red-700",
  refunded: "bg-green-50 text-green-700",
  declined: "bg-neutral-100 text-neutral-700",
};

export function RefundStatusBadge({ status }: { status: RefundStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[status] ?? "bg-neutral-100 text-neutral-700"}`}
    >
      {REFUND_STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** How refunds work today; shown wherever a refund can be requested or managed. */
export function RefundPolicyNote({ role, compact = false }: { role: RefundRole; compact?: boolean }) {
  const text =
    role === "admin"
      ? "Refunds are executed manually by staff in the Stripe Dashboard. After refunding in Stripe, record the Stripe refund reference (re_…) here; EcoGlobe retrieves it from Stripe and completes the case only when Stripe reports it succeeded. Open cases hold seller settlement. Refunds here do not reverse transfers or payouts."
      : "EcoGlobe staff review each refund request and issue approved refunds manually through Stripe. A case shows as refunded only after staff verify the refund with Stripe. We email you when your company needs to act; replies are recorded here.";
  return (
    <div className={`flex gap-3 rounded-xl bg-blue-50 px-4 py-3 text-blue-900 ${compact ? "text-xs" : "text-sm"}`}>
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}

function waitingOn(refund: RefundCase): string {
  switch (refund.status) {
    case "awaiting_buyer":
      return "Buyer";
    case "awaiting_seller":
      return "Seller";
    case "requested":
      return "EcoGlobe staff review";
    case "approved":
      return "EcoGlobe staff (refund in Stripe, then verify)";
    case "provider_pending":
      return "Stripe (staff re-verify the refund)";
    case "provider_failed":
      return "EcoGlobe staff (investigate in Stripe)";
    default:
      return "No action required";
  }
}

/** The one step the case is waiting on, with its due date when a company owes it. */
export function RequiredStep({ refund }: { refund: RefundCase }) {
  const [now] = useState(() => Date.now());
  const due = refund.actionDueAt ? new Date(refund.actionDueAt).getTime() : null;
  const overdue = due !== null && !Number.isNaN(due) && due < now;
  const closed = refund.status === "refunded" || refund.status === "declined";
  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm ${closed ? "bg-neutral-50 text-neutral-700" : "bg-amber-50 text-amber-900"}`}
    >
      <p className="font-semibold">
        {closed ? "Case closed" : "Required step"} · Waiting on {waitingOn(refund)}
      </p>
      {refund.requiredAction && <p className="mt-1 whitespace-pre-line">{refund.requiredAction}</p>}
      {refund.actionDueAt && !closed && (
        <p className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${overdue ? "text-red-700" : ""}`}>
          <Clock className="size-3.5" aria-hidden="true" />
          {overdue ? "Overdue since " : "Due by "}
          {formatRefundDate(refund.actionDueAt)}
        </p>
      )}
    </div>
  );
}

/** Textarea with the contract's 10–2000 character bounds and a live counter. */
export function RefundTextArea({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const length = value.trim().length;
  const invalid = length > 0 && (length < REFUND_TEXT_MIN || length > REFUND_TEXT_MAX);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={4}
        maxLength={REFUND_TEXT_MAX}
        placeholder={placeholder}
        aria-invalid={invalid}
        aria-describedby={`${id}-hint`}
        className="w-full rounded-lg bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900 disabled:bg-neutral-50"
        style={{ border: "1px solid #E0E0E0" }}
      />
      <p id={`${id}-hint`} className={`text-xs ${invalid ? "text-red-700" : "text-neutral-500"}`}>
        {REFUND_TEXT_MIN}–{REFUND_TEXT_MAX} characters · {length} entered
      </p>
    </div>
  );
}

export function isValidRefundText(value: string) {
  const length = value.trim().length;
  return length >= REFUND_TEXT_MIN && length <= REFUND_TEXT_MAX;
}

export function refundBasePath(role: RefundRole) {
  if (role === "admin") return "/admin/refunds";
  return `/${role}/accounting/refunds`;
}
