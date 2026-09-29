"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, X } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { cancelCheckout, reconcileCheckout } from "@/lib/api-orders";
import { takePendingCheckoutByOrder } from "@/lib/checkout-pending";
import { describeBackendError } from "@/lib/backend-client";

export interface PaymentMethodOrderInfo {
  orderId: string;
  shipping: string;
  seller: string;
  total: string;
}

interface Props {
  order: PaymentMethodOrderInfo;
  onBack: () => void;
  onCloseAll: () => void;
  /** Called after the backend confirms a change, so the order list reloads. */
  onChanged?: () => void;
}

/**
 * Payment for marketplace orders happens only in Stripe Checkout. This screen
 * never collects bank details or marks escrow funded; it can only ask the
 * backend to confirm the order's payment status with Stripe.
 */
export function BuyerPaymentMethodScreen({ order, onBack, onCloseAll, onChanged }: Props) {
  const numericId = Number(/(\d+)$/.exec(order.orderId)?.[1]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "success" | "error"; text: string } | null>(null);

  const cancel = async () => {
    if (!Number.isInteger(numericId)) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await cancelCheckout(numericId);
      if (result.status === "expired") takePendingCheckoutByOrder(numericId);
      onChanged?.();
      setMessage(
        result.status === "expired"
          ? { tone: "success", text: "The order reservation was cancelled and the checkout session was closed." }
          : result.status === "paid"
            ? { tone: "error", text: "Stripe already confirmed payment, so this order cannot be cancelled here." }
            : { tone: "info", text: "Payment is still processing. Check the status again shortly." },
      );
    } catch (err) {
      setMessage({ tone: "error", text: describeBackendError(err, "The order could not be cancelled.") });
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    if (!Number.isInteger(numericId)) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await reconcileCheckout(numericId);
      setMessage(
        result.status === "paid"
          ? { tone: "success", text: "Stripe confirmed payment for this order." }
          : result.status === "expired"
            ? { tone: "error", text: "The checkout for this order has expired. Check your payment records if you are unsure whether a payment went through." }
            : { tone: "info", text: "Stripe has not confirmed payment for this order yet." },
      );
    } catch (err) {
      setMessage({ tone: "error", text: describeBackendError(err, "Payment status could not be checked.") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-white">
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <ArrowLeft className="size-4" /> Back to order
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={onCloseAll}
          className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
        >
          <X className="size-5" />
        </button>
      </header>
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5 px-6 pb-10">
        <h1 className="text-2xl font-bold text-neutral-900">Payment for order {order.orderId}</h1>
        <div className="rounded-2xl p-5" style={{ border: "1px solid #F0F0F0" }}>
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-neutral-700" />
            <div className="text-sm text-neutral-600">
              <p className="font-semibold text-neutral-900">Payment handled through Stripe Checkout</p>
              <p className="mt-1">
                EcoGlobe records a payment only after Stripe confirms it. Check payment status
                before retrying, and cancel an unpaid reservation before starting another
                checkout.
              </p>
              <p className="mt-2">
                Order total: <span className="font-semibold text-neutral-900">{order.total}</span> · Seller:{" "}
                {order.seller}
              </p>
            </div>
          </div>
        </div>
        {message && (
          <p
            role={message.tone === "error" ? "alert" : "status"}
            className={`rounded-lg px-4 py-3 text-sm ${
              message.tone === "success" ? "bg-emerald-50 text-emerald-800" : message.tone === "error" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-800"
            }`}
          >
            {message.text}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="md" disabled={busy || !Number.isInteger(numericId)} onClick={() => void check()}>
            {busy ? "Checking with Stripe…" : "Check payment status"}
          </Button>
          <Button variant="secondary" size="md" disabled={busy || !Number.isInteger(numericId)} onClick={() => void cancel()}>
            Cancel unpaid order
          </Button>
          <Link href="/buyer/accounting/payments" className="self-center text-sm font-semibold text-neutral-900 underline">
            View payments
          </Link>
        </div>
      </div>
    </div>
  );
}
