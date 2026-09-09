"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FlaskConical, RefreshCw } from "lucide-react";
import { describeBackendError } from "@/lib/backend-client";
import { fetchNotifications, isLabReferralNotification, markNotificationRead, type ApiNotification } from "@/lib/api-notifications";
import { useDemoUser } from "@/lib/demo-user";
import { formatLabDate } from "@/lib/lab-testing";

type State =
  | { status: "loading" }
  | { status: "ready"; items: ApiNotification[] }
  | { status: "error"; message: string };

/**
 * Actual persisted staff notifications for lab testing referrals, read from
 * `GET /api/notifications` for the signed-in internal user. Distinct from the
 * demo notification groups on the same page. In-app only: no email delivery
 * is implied or fabricated.
 */
export function LabNotificationsSection() {
  const user = useDemoUser();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchNotifications({ userId: user?.id, categoryCode: "orders" })
      .then((rows) => {
        if (!cancelled) setState({ status: "ready", items: rows.filter(isLabReferralNotification) });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", message: describeBackendError(error, "Lab referral notifications could not be loaded.") });
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, version]);

  const markRead = async (item: ApiNotification) => {
    if (busyId) return;
    setBusyId(item.id);
    try {
      const updated = await markNotificationRead(item.id);
      setState((prev) => (prev.status === "ready" ? { status: "ready", items: prev.items.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)) } : prev));
    } catch (error: unknown) {
      setState({ status: "error", message: describeBackendError(error, "The notification could not be marked as read.") });
    }
    setBusyId(null);
  };

  return (
    <section className="mb-8 rounded-2xl bg-white p-5" style={{ border: "1px solid #E0E0E0" }} aria-labelledby="lab-notifications-heading">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <FlaskConical className="mt-0.5 size-5 text-emerald-700" aria-hidden="true" />
          <div>
            <h2 id="lab-notifications-heading" className="text-lg font-bold text-neutral-900">Lab testing referrals</h2>
            <p className="text-xs text-neutral-500">Actual in-app notifications persisted for your staff account when a buyer submits a referral. No email is sent.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/lab-testing" className="text-sm font-semibold text-neutral-900 underline">Open lab testing queue</Link>
          <button type="button" onClick={reload} className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900" aria-label="Refresh lab referral notifications"><RefreshCw className="size-4" aria-hidden="true" /></button>
        </div>
      </div>
      {state.status === "loading" && <p className="text-sm text-neutral-500" role="status">Loading referral notifications…</p>}
      {state.status === "error" && (
        <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
          <p>{state.message}</p>
          <button type="button" onClick={reload} className="mt-1 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" aria-hidden="true" /> Retry</button>
        </div>
      )}
      {state.status === "ready" && state.items.length === 0 && <p className="text-sm text-neutral-500">No lab testing referrals have been received for your account.</p>}
      {state.status === "ready" && state.items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {state.items.map((item) => {
            const unread = !item.readAt && item.notificationStatusCode !== "read";
            const referralMatch = /Referral (\d+)/.exec(item.body ?? "");
            return (
              <li key={item.id} className={`flex flex-col gap-2 rounded-xl px-4 py-3 sm:flex-row sm:items-start sm:justify-between ${unread ? "bg-emerald-50/60" : "bg-neutral-50"}`}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900">{item.subject}{unread && <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">New</span>}</p>
                  <p className="text-xs text-neutral-700">{item.body}</p>
                  <p className="text-[11px] text-neutral-500">
                    {formatLabDate(item.createdAt.slice(0, 10))}
                    {item.relatedRecordTypeCode === "listing" && item.relatedRecordId ? ` · listing #${item.relatedRecordId}` : ""}
                    {referralMatch ? ` · LAB-${referralMatch[1]}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs">
                  <Link href="/admin/lab-testing" className="font-semibold text-neutral-900 underline">Open queue</Link>
                  {unread && <button type="button" disabled={busyId === item.id} onClick={() => void markRead(item)} className="font-semibold text-neutral-700 underline disabled:opacity-50">{busyId === item.id ? "Saving…" : "Mark read"}</button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
