"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, RefreshCw } from "lucide-react";
import { BuyerLayout } from "./buyer-layout";
import { PilotRequestForm } from "@/components/pilots/pilot-request-form";
import { PilotViewTag, WhatHappensNext, YourIdentity } from "@/components/pilots/pilot-copy";
import { fetchPilotConfig, type PilotConfig } from "@/lib/api-pilots";
import { describeBackendError } from "@/lib/backend-client";
import { useDemoUser } from "@/lib/demo-user";

type State =
  | { status: "loading" }
  | { status: "ready"; config: PilotConfig }
  | { status: "error"; message: string }
  | { status: "no-listing" };

/** `/buyer/pilots/new?listing=ID` — request a pilot from a published listing. */
export function BuyerPilotRequestPage() {
  const router = useRouter();
  const params = useSearchParams();
  const user = useDemoUser();
  const listingId = Number(params.get("listing"));
  const [state, setState] = useState<State>({ status: "loading" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!Number.isInteger(listingId) || listingId <= 0) {
      setState({ status: "no-listing" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    fetchPilotConfig(listingId)
      .then((config) => {
        if (!cancelled) setState({ status: "ready", config });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", message: describeBackendError(error, "This listing is not available for a pilot.") });
      });
    return () => {
      cancelled = true;
    };
  }, [listingId, version]);

  return (
    <BuyerLayout>
      <div className="flex-1 overflow-y-auto bg-neutral-50">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            <Link href="/buyer/browse" className="hover:text-neutral-900">Browse</Link>
            <ChevronRight className="size-3.5" />
            {state.status === "ready" && (
              <>
                <Link href={`/buyer/browse/${state.config.listing.id}`} className="hover:text-neutral-900">{state.config.listing.title}</Link>
                <ChevronRight className="size-3.5" />
              </>
            )}
            <span className="text-neutral-900">Request a pilot</span>
          </div>
          <PilotViewTag tone="buyer" label="Buyer view" detail="pilot request — managed by EcoGlobe" />

          {state.status === "loading" && <p className="py-16 text-center text-sm text-neutral-600" role="status">Loading listing…</p>}
          {state.status === "no-listing" && (
            <div className="mx-auto max-w-[520px] rounded-2xl bg-white p-6 text-sm text-neutral-700" style={{ border: "1px solid #E0E0E0" }}>
              <p className="font-bold text-neutral-900">Choose a listing first.</p>
              <p className="mt-1">Pilot requests start from a published listing.</p>
              <Link href="/buyer/browse" className="mt-3 inline-block font-semibold underline">Browse listings</Link>
            </div>
          )}
          {state.status === "error" && (
            <div className="mx-auto max-w-[520px] rounded-2xl bg-red-50 p-6 text-sm text-red-700" role="alert">
              <p>{state.message}</p>
              <button type="button" onClick={() => setVersion((v) => v + 1)} className="mt-2 inline-flex items-center gap-1 font-semibold underline">
                <RefreshCw className="size-3" /> Retry
              </button>
              {!user?.activeCompanyId && (
                <p className="mt-3">
                  Pilots need an active company. <Link href="/buyer/onboarding" className="font-semibold underline">Finish onboarding</Link>.
                </p>
              )}
            </div>
          )}
          {state.status === "ready" && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
              <PilotRequestForm config={state.config} onCreated={(id) => router.push(`/buyer/pilots/${id}`)} />
              <aside className="flex flex-col gap-6">
                <WhatHappensNext />
                <YourIdentity />
              </aside>
            </div>
          )}
        </div>
      </div>
    </BuyerLayout>
  );
}
