"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, RefreshCw } from "lucide-react";
import { BuyerLayout } from "./buyer-layout";
import { PilotSchedule } from "@/components/pilots/pilot-schedule";
import { PilotStatus } from "@/components/pilots/pilot-status";
import { BeforeWeSpeak, PilotViewTag, WhyNoOnlinePrice, YourIdentity } from "@/components/pilots/pilot-copy";
import { fetchPilotRequest, type PilotRequest, type PilotSlot } from "@/lib/api-pilots";
import { describeBackendError } from "@/lib/backend-client";
import { canBuyerSchedule } from "@/lib/pilots";

type State =
  | { status: "loading" }
  | { status: "ready"; request: PilotRequest; slots: PilotSlot[] }
  | { status: "error"; message: string };

/** `/buyer/pilots/[id]` — schedule the call, then follow the pilot. */
export function BuyerPilotDetailPage() {
  const params = useParams<{ id?: string }>();
  const id = Number(params.id);
  const [state, setState] = useState<State>({ status: "loading" });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) {
      setState({ status: "error", message: "There is no pilot request with that reference." });
      return;
    }
    let cancelled = false;
    setState((current) => (current.status === "ready" ? current : { status: "loading" }));
    fetchPilotRequest(id)
      .then(({ request, slots }) => {
        if (!cancelled) setState({ status: "ready", request, slots });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", message: describeBackendError(error, "This pilot request could not be loaded.") });
      });
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  // Booking or releasing a call changes which slots are open, so refresh
  // availability quietly (the ready view stays mounted) after every update.
  const setRequest = useCallback(
    (request: PilotRequest) => {
      setState((current) => (current.status === "ready" ? { ...current, request } : current));
      reload();
    },
    [reload],
  );

  const scheduling = state.status === "ready" && canBuyerSchedule(state.request.status);

  return (
    <BuyerLayout>
      <div className="flex-1 overflow-y-auto bg-neutral-50">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            <Link href="/buyer/pilots" className="hover:text-neutral-900">Pilots</Link>
            <ChevronRight className="size-3.5" />
            <span className="text-neutral-900">{state.status === "ready" ? state.request.reference : "Pilot request"}</span>
          </div>
          <PilotViewTag tone="buyer" label="Buyer view" detail={scheduling ? "pick a time — the request is already with us" : "pilot progress — managed by EcoGlobe"} />

          {state.status === "loading" && <p className="py-16 text-center text-sm text-neutral-600" role="status">Loading your pilot request…</p>}
          {state.status === "error" && (
            <div className="mx-auto max-w-[520px] rounded-2xl bg-red-50 p-6 text-sm text-red-700" role="alert">
              <p>{state.message}</p>
              <button type="button" onClick={reload} className="mt-2 inline-flex items-center gap-1 font-semibold underline">
                <RefreshCw className="size-3" /> Retry
              </button>
            </div>
          )}
          {state.status === "ready" && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
              {scheduling ? (
                <PilotSchedule request={state.request} slots={state.slots} onUpdated={setRequest} onConflict={reload} />
              ) : (
                <PilotStatus request={state.request} onUpdated={setRequest} />
              )}
              <aside className="flex flex-col gap-6">
                {scheduling && <BeforeWeSpeak />}
                <WhyNoOnlinePrice />
                <YourIdentity released={!!state.request.buyerConsentedAt} variant="schedule" />
              </aside>
            </div>
          )}
        </div>
      </div>
    </BuyerLayout>
  );
}
