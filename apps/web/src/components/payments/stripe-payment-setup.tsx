"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { startBackendStripeOnboarding, syncBackendStripeSetup } from "@/lib/backend-auth";
import { describeBackendError } from "@/lib/backend-client";
import { useDemoUser } from "@/lib/demo-user";
import { ErrorState, LoadingState, useBackendData } from "@/components/shared/data-state";

/**
 * Bank and card details are entered only in Stripe's hosted setup; EcoGlobe
 * never stores account numbers. This shows the setup status Stripe reports.
 */
export function StripePaymentSetup({ role }: { role: "buyer" | "seller" }) {
  // Status belongs to the active company; switching company reloads it.
  const companyId = useDemoUser()?.activeCompanyId;
  const status = useBackendData(
    () => syncBackendStripeSetup(role),
    [role, companyId],
    "Payment setup status could not be checked.",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const returnUrl = `${window.location.origin}/${role}/accounting/payments`;
      const result = await startBackendStripeOnboarding({ role, returnUrl, refreshUrl: returnUrl });
      if (result.mode === "stripe") {
        window.location.assign(result.redirectUrl);
        return;
      }
      setError("Stripe setup is not available in this environment. No account was connected.");
    } catch (err) {
      setError(describeBackendError(err, "Payment setup could not start."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-4 py-6 sm:px-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          {role === "seller" ? "Payout account" : "Payment method"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {role === "seller"
            ? "Connect the bank account Stripe verifies for your company. Seller payouts and settlement are not automated yet; EcoGlobe staff arrange them."
            : "Your payment method is managed in Stripe."}{" "}
          EcoGlobe never stores bank or card numbers.
        </p>
      </div>
      <div className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
        {status.status === "loading" && <LoadingState label="Checking with Stripe…" />}
        {status.status === "error" && <ErrorState message={status.error ?? ""} onRetry={status.reload} />}
        {status.data && (
          <div className="flex items-start gap-3">
            <ShieldCheck className={`mt-0.5 size-5 ${status.data.ready ? "text-emerald-600" : "text-neutral-400"}`} />
            <div className="flex-1">
              <p className="font-semibold text-neutral-900">
                {status.data.ready ? "Connected through Stripe" : "Not connected yet"}
                {status.data.mode === "test" && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Test mode</span>}
              </p>
              <p className="mt-1 text-sm text-neutral-600">{status.data.message}</p>
            </div>
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <button
          type="button"
          disabled={busy || status.status === "loading"}
          onClick={() => void start()}
          className="mt-4 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Opening Stripe…" : status.data?.ready ? "Manage in Stripe" : "Set up with Stripe"}
        </button>
      </div>
    </div>
  );
}
