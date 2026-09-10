"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Check, RefreshCw, Search } from "lucide-react";
import {
  addAdminPilotNote,
  fetchAdminPilotRequest,
  fetchAdminPilotRequests,
  handoffAdminPilot,
  setAdminPilotStep,
  updateAdminPilotRequest,
  type PilotCounts,
  type PilotNote,
  type PilotRequest,
  type PilotStaff,
  type PilotStep,
} from "@/lib/api-pilots";
import { describeBackendError } from "@/lib/backend-client";
import {
  ADMIN_STATUS_ACTION_LABELS,
  PILOT_BUCKETS,
  PILOT_STEP_KEYS,
  PILOT_STEP_LABELS,
  adminNextStatuses,
  bucketForStatus,
  centralZoneAbbreviation,
  formatCentralDateTime,
  formatCentralShortDate,
  formatLoads,
  laneLabel,
  pilotStatusLabel,
  type PilotBucket,
  type PilotStatus,
} from "@/lib/pilots";
import { PilotViewTag } from "@/components/pilots/pilot-copy";

const border = { border: "1px solid #E0E0E0" } as const;
const fieldClass =
  "w-full rounded-xl bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-neutral-900/20";

const BUCKET_TONE: Record<PilotBucket, string> = {
  new: "text-neutral-500",
  call_due: "text-amber-700",
  working_lane: "text-neutral-500",
  offer_sent: "text-neutral-500",
  moving: "text-green-800",
};

/** Internal pilot desk: `/admin/pilots` worklist and `/admin/pilots/[id]` lane view. */
export function AdminPilotDeskPage({ id }: { id?: string }) {
  const numericId = Number(id);
  if (id && Number.isInteger(numericId) && numericId > 0) return <PilotLaneView id={numericId} />;
  return <PilotWorklist />;
}

/* ── Worklist ── */

type ListState =
  | { status: "loading" }
  | { status: "ready"; requests: PilotRequest[]; counts: PilotCounts; staff: PilotStaff[] }
  | { status: "error"; message: string };

function PilotWorklist() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [bucket, setBucket] = useState<PilotBucket | "all" | "closed">("all");
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [version, setVersion] = useState(0);
  const searchId = useId();

  useEffect(() => {
    let cancelled = false;
    setState((current) => (current.status === "ready" ? current : { status: "loading" }));
    fetchAdminPilotRequests({ q: submitted })
      .then((result) => {
        if (!cancelled) setState({ status: "ready", ...result });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", message: describeBackendError(error, "The pilot desk could not be loaded.") });
      });
    return () => {
      cancelled = true;
    };
  }, [submitted, version]);

  const visible = useMemo(() => {
    if (state.status !== "ready") return [];
    return state.requests.filter((r) => {
      if (bucket === "all") return true;
      if (bucket === "closed") return r.status === "lost";
      return bucketForStatus(r.status) === bucket;
    });
  }, [state, bucket]);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <PilotViewTag tone="internal" label="EcoGlobe internal" detail="pilot desk — a worklist, not a pricing engine" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Pilot desk</h1>
          <p className="mt-1 text-sm text-neutral-500">Every pilot request, who owns it and what happens next.</p>
        </div>
        <Link href="/admin/pilots/availability" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50" style={border}>
          <CalendarClock className="size-4" /> Call availability
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PILOT_BUCKETS.map((b) => {
          const active = bucket === b.key;
          const count = state.status === "ready" ? state.counts[b.key] : null;
          return (
            <button
              key={b.key}
              type="button"
              aria-pressed={active}
              onClick={() => setBucket(active ? "all" : b.key)}
              className={`rounded-2xl bg-white p-4 text-left transition hover:bg-neutral-50 ${active ? "ring-2 ring-neutral-900" : ""}`}
              style={{ ...border, borderLeft: b.key === "call_due" ? "4px solid #B45309" : border.border }}
            >
              <span className={`block text-xs font-bold uppercase tracking-[0.18em] ${BUCKET_TONE[b.key]}`}>{b.label}</span>
              <span className="mt-1 block text-3xl font-bold text-neutral-900">{count === null ? "—" : count}</span>
            </button>
          );
        })}
      </div>

      <form
        className="mt-5 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query.trim());
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reference, material, lane, objective or lane notes…"
            aria-label="Search pilot requests"
            className={`${fieldClass} pl-9`}
            style={border}
          />
        </div>
        <button type="submit" className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-800">
          Search
        </button>
        <button
          type="button"
          onClick={() => setBucket(bucket === "closed" ? "all" : "closed")}
          aria-pressed={bucket === "closed"}
          className={`rounded-full px-4 py-2.5 text-sm font-semibold ${bucket === "closed" ? "bg-neutral-900 text-white" : "bg-white text-neutral-700 hover:bg-neutral-50"}`}
          style={bucket === "closed" ? undefined : border}
        >
          Closed
        </button>
      </form>

      {state.status === "loading" && <p className="py-16 text-center text-sm text-neutral-600" role="status">Loading the pilot desk…</p>}
      {state.status === "error" && (
        <div className="mt-6 rounded-2xl bg-red-50 p-6 text-sm text-red-700" role="alert">
          <p>{state.message}</p>
          <button type="button" onClick={() => setVersion((v) => v + 1)} className="mt-2 inline-flex items-center gap-1 font-semibold underline">
            <RefreshCw className="size-3" /> Retry
          </button>
        </div>
      )}
      {state.status === "ready" && (
        <>
          <p className="mt-5 text-xs text-neutral-500">
            {visible.length} of {state.requests.length} {submitted ? `matching “${submitted}”` : "requests"}
          </p>
          {visible.length === 0 ? (
            <div className="mt-3 rounded-2xl bg-white p-8 text-center text-sm text-neutral-600" style={border}>
              Nothing in this view.
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {visible.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/pilots/${r.id}`}
                    className="grid gap-3 rounded-2xl bg-white p-5 transition hover:bg-neutral-50 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_180px]"
                    style={border}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold text-neutral-900">{r.reference}</span>
                        <StatusPill status={r.status} />
                      </div>
                      <p className="mt-1 truncate text-sm text-neutral-600">
                        {r.listingTitle} · {formatLoads(r.loadCount, r.approximateTonnage)} · {laneLabel(r.originLabel, r.destinationLabel)}
                      </p>
                      <p className="mt-1 truncate text-sm text-neutral-500">
                        {r.buyerCompanyName} → {r.sellerCompanyName}
                      </p>
                    </div>
                    <div className="min-w-0 text-sm text-neutral-700">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">Next action</p>
                      <p className="mt-1 line-clamp-2">{r.nextAction || "—"}</p>
                    </div>
                    <div className="text-sm text-neutral-700 lg:text-right">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">Owner</p>
                      <p className="mt-1 font-bold text-neutral-900">{r.ownerName ?? "Unassigned"}</p>
                      {r.callStartsAt && r.status === "call_booked" && (
                        <p className="mt-1 text-xs text-amber-700">Call {formatCentralDateTime(r.callStartsAt)}</p>
                      )}
                      {r.status === "new" && r.contactPreference === "email" && <p className="mt-1 text-xs text-amber-700">Wants email follow-up</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "won" ? "bg-green-100 text-green-800" : status === "lost" ? "bg-neutral-100 text-neutral-600" : status === "call_booked" ? "bg-amber-50 text-amber-800" : "bg-orange-50 text-orange-800";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.12em] ${tone}`}>{pilotStatusLabel(status)}</span>;
}

/* ── Lane view ── */

type LaneState =
  | { status: "loading" }
  | { status: "ready"; request: PilotRequest; notes: PilotNote[]; steps: PilotStep[]; staff: PilotStaff[] }
  | { status: "error"; message: string };

function PilotLaneView({ id }: { id: number }) {
  const [state, setState] = useState<LaneState>({ status: "loading" });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [nextAction, setNextAction] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [confirmLost, setConfirmLost] = useState(false);
  const baseId = useId();

  useEffect(() => {
    let cancelled = false;
    setState((current) => (current.status === "ready" ? current : { status: "loading" }));
    Promise.all([fetchAdminPilotRequest(id), fetchAdminPilotRequests().then((r) => r.staff).catch(() => [] as PilotStaff[])])
      .then(([detail, staff]) => {
        if (cancelled) return;
        setState({ status: "ready", ...detail, staff });
        setNextAction(detail.request.nextAction ?? "");
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", message: describeBackendError(err, "This pilot request could not be loaded.") });
      });
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  const apply = (patch: Partial<Extract<LaneState, { status: "ready" }>>) =>
    setState((current) => (current.status === "ready" ? { ...current, ...patch } : current));

  const run = async (key: string, work: () => Promise<string | void>) => {
    if (busy) return;
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const message = await work();
      if (message) setNotice(message);
    } catch (err) {
      setError(describeBackendError(err, "That change could not be saved."));
    } finally {
      setBusy(null);
    }
  };

  if (state.status === "loading")
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 py-16 text-center text-sm text-neutral-600" role="status">
        Loading pilot request…
      </div>
    );
  if (state.status === "error")
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-10">
        <BackLink />
        <div className="mt-4 rounded-2xl bg-red-50 p-6 text-sm text-red-700" role="alert">
          <p>{state.message}</p>
          <button type="button" onClick={reload} className="mt-2 inline-flex items-center gap-1 font-semibold underline">
            <RefreshCw className="size-3" /> Retry
          </button>
        </div>
      </div>
    );

  const { request, notes, steps, staff } = state;
  const stepByKey = new Map(steps.map((s) => [s.key, s]));
  const nextStatuses = adminNextStatuses(request.status);
  const forward = nextStatuses.filter((s) => s !== "lost");
  const canLose = nextStatuses.includes("lost");
  const nextActionDirty = nextAction !== (request.nextAction ?? "");
  const identityReleased = !!request.buyerConsentedAt;

  const refreshNotes = async () => {
    const detail = await fetchAdminPilotRequest(id);
    apply({ request: detail.request, notes: detail.notes, steps: detail.steps });
  };

  const setStatus = (status: PilotStatus) =>
    run(`status:${status}`, async () => {
      const updated = await updateAdminPilotRequest(id, { status });
      apply({ request: updated });
      setConfirmLost(false);
      await refreshNotes();
      return `Stage set to ${pilotStatusLabel(status)}.`;
    });

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <PilotViewTag tone="internal" label="EcoGlobe internal" detail="pilot desk — a worklist, not a pricing engine" />
      <BackLink />

      {(notice || error) && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`} role={error ? "alert" : "status"}>
          {error ?? notice}
        </div>
      )}

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="flex flex-col gap-6">
          {/* Header card */}
          <section className="rounded-2xl bg-white p-6" style={border} aria-labelledby={`${baseId}-ref`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 id={`${baseId}-ref`} className="text-3xl font-bold text-neutral-900">
                    {request.reference}
                  </h1>
                  <StatusPill status={request.status} />
                </div>
                <p className="mt-1 text-base text-neutral-600">
                  {request.listingTitle} · {formatLoads(request.loadCount, request.approximateTonnage)} · {laneLabel(request.originLabel, request.destinationLabel)}
                </p>
              </div>
              <div className="text-right">
                <label htmlFor={`${baseId}-owner`} className="block text-sm text-neutral-500">
                  Owner
                </label>
                <select
                  id={`${baseId}-owner`}
                  value={request.ownerUserId ?? ""}
                  disabled={busy !== null || request.status === "lost"}
                  onChange={(e) =>
                    run("owner", async () => {
                      const ownerUserId = e.target.value ? Number(e.target.value) : null;
                      apply({ request: await updateAdminPilotRequest(id, { ownerUserId }) });
                      return ownerUserId ? "Owner updated." : "Owner cleared.";
                    })
                  }
                  className="mt-1 rounded-lg bg-white px-3 py-1.5 text-base font-bold text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20"
                  style={border}
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.userId} value={s.userId}>
                      {s.name}
                    </option>
                  ))}
                  {request.ownerUserId && !staff.some((s) => s.userId === request.ownerUserId) && (
                    <option value={request.ownerUserId}>{request.ownerName ?? `User ${request.ownerUserId}`}</option>
                  )}
                </select>
              </div>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="sm:border-r sm:pr-6" style={{ borderColor: "#F0F0F0" }}>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">Buyer</p>
                <p className="mt-1 text-xl font-bold text-neutral-900">{request.buyerCompanyName}</p>
                <p className="mt-1 text-sm text-neutral-600">{request.objective || "No objective given."}</p>
                <span className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-bold ${identityReleased ? "bg-green-100 text-green-800" : "bg-amber-50 text-amber-800"}`}>
                  {identityReleased ? "Name shared with seller" : "Name hidden from seller"}
                </span>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-neutral-600">
                  <dt className="text-neutral-400">Deliver to</dt>
                  <dd>{request.destinationLabel}</dd>
                  <dt className="text-neutral-400">Needed by</dt>
                  <dd>{request.neededBy || "—"}</dd>
                  <dt className="text-neutral-400">Constraints</dt>
                  <dd>{request.constraints.length ? request.constraints.join(" · ") : "—"}</dd>
                  <dt className="text-neutral-400">Contact</dt>
                  <dd>
                    {request.callStartsAt
                      ? `Call ${formatCentralDateTime(request.callStartsAt)} (${centralZoneAbbreviation(request.callStartsAt)})`
                      : request.contactPreference === "email"
                        ? "Email follow-up requested"
                        : "No call booked yet"}
                  </dd>
                </dl>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">Seller</p>
                <p className="mt-1 text-xl font-bold text-neutral-900">{request.sellerCompanyName}</p>
                <p className="mt-1 text-sm text-neutral-600">Ships from {request.originLabel}</p>
                <span className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-bold ${stepByKey.get("seller_availability")?.completed ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-600"}`}>
                  {stepByKey.get("seller_availability")?.completed ? "Availability confirmed" : "Availability not yet confirmed"}
                </span>
                <p className="mt-3 text-sm text-neutral-500">
                  <Link href={`/admin/listings/${request.listingId}`} className="font-semibold underline">
                    Open listing
                  </Link>
                </p>
              </div>
            </div>
          </section>

          {/* Steps */}
          <section className="rounded-2xl bg-white p-6" style={border} aria-labelledby={`${baseId}-steps`}>
            <h2 id={`${baseId}-steps`} className="text-xl font-bold text-neutral-900">
              Where we are
            </h2>
            <ul className="mt-4 flex flex-col">
              {PILOT_STEP_KEYS.map((key, i) => {
                const step = stepByKey.get(key);
                const done = !!step?.completed;
                const previousDone = i === 0 || !!stepByKey.get(PILOT_STEP_KEYS[i - 1])?.completed;
                const inProgress = !done && previousDone && request.status !== "lost";
                const inputId = `${baseId}-step-${key}`;
                return (
                  <li key={key} className="flex items-center gap-4 py-3" style={{ borderTop: i === 0 ? undefined : "1px solid #F5F5F5" }}>
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={done}
                      disabled={busy !== null || request.status === "lost"}
                      onChange={(e) =>
                        run(`step:${key}`, async () => {
                          apply({ steps: await setAdminPilotStep(id, key, e.target.checked) });
                        })
                      }
                      className="size-5 shrink-0 accent-green-700"
                    />
                    <label htmlFor={inputId} className={`flex-1 text-base ${done ? "text-neutral-900" : inProgress ? "font-bold text-amber-800" : "text-neutral-400"}`}>
                      {PILOT_STEP_LABELS[key]}
                    </label>
                    <span className={`text-sm ${inProgress ? "text-amber-700" : "text-neutral-400"}`}>
                      {done && step?.completedAt
                        ? `${step.completedByName ?? "Staff"} · ${formatCentralShortDate(step.completedAt)}`
                        : inProgress
                          ? "in progress"
                          : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Notes */}
          <section className="rounded-2xl bg-white p-6" style={border} aria-labelledby={`${baseId}-notes`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`${baseId}-notes`} className="text-xl font-bold text-neutral-900">
                Notes
              </h2>
              <span className="text-sm text-neutral-500">Everything we learn about this lane</span>
            </div>
            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                const text = noteBody.trim();
                if (!text) return;
                run("note", async () => {
                  await addAdminPilotNote(id, text);
                  setNoteBody("");
                  await refreshNotes();
                  return "Note logged.";
                });
              }}
            >
              <label htmlFor={`${baseId}-note`} className="sr-only">
                Log a call or note
              </label>
              <textarea
                id={`${baseId}-note`}
                rows={3}
                maxLength={4000}
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Who we spoke to, what they can do, what it depends on…"
                className={`${fieldClass} resize-y`}
                style={border}
              />
              <div className="mt-2 flex justify-end">
                <button type="submit" disabled={busy !== null || !noteBody.trim()} className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-40">
                  {busy === "note" ? "Saving…" : "Log a call or note"}
                </button>
              </div>
            </form>
            {notes.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500">No notes yet.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-4">
                {notes.map((note) => (
                  <li key={note.id} className="border-l-2 pl-4" style={{ borderColor: "#E0E0E0" }}>
                    <p className="whitespace-pre-wrap text-base text-neutral-800">{note.body}</p>
                    <p className="mt-1 text-sm text-neutral-400">
                      {note.createdByName} · {formatCentralShortDate(note.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="rounded-2xl bg-neutral-900 p-6 text-white" aria-labelledby={`${baseId}-next`}>
            <h2 id={`${baseId}-next`} className="text-2xl font-bold">
              Next action
            </h2>
            <label htmlFor={`${baseId}-next-input`} className="sr-only">
              Next action
            </label>
            <textarea
              id={`${baseId}-next-input`}
              rows={3}
              maxLength={2000}
              value={nextAction}
              disabled={request.status === "lost"}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="What happens next, and who is waiting on it."
              className="mt-3 w-full resize-y rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-base text-white placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-white/30"
            />
            {nextActionDirty && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() =>
                  run("next", async () => {
                    apply({ request: await updateAdminPilotRequest(id, { nextAction: nextAction.trim() }) });
                    return "Next action saved.";
                  })
                }
                className="mt-3 w-full rounded-full bg-white px-5 py-3 text-base font-bold text-neutral-900 hover:bg-neutral-100 disabled:opacity-40"
              >
                {busy === "next" ? "Saving…" : "Save next action"}
              </button>
            )}
            <div className="mt-5 flex flex-col gap-3">
              {forward.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => setStatus(status)}
                  className="w-full rounded-full border border-white/40 px-5 py-3 text-base font-bold text-white hover:bg-white/10 disabled:opacity-40"
                >
                  {busy === `status:${status}` ? "Saving…" : ADMIN_STATUS_ACTION_LABELS[status]}
                </button>
              ))}
              {request.status === "offer_sent" && (
                <p className="text-sm text-neutral-400">Waiting for the buyer to proceed. Only the buyer can agree; the desk cannot consent for them.</p>
              )}
              {request.status === "won" && !request.shipmentId && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    run("handoff", async () => {
                      const result = await handoffAdminPilot(id);
                      apply({ request: result.request });
                      await refreshNotes();
                      return result.shipmentId ? `Shipment SHP-${result.shipmentId} created in fulfilment.` : "Handed to fulfilment.";
                    })
                  }
                  className="w-full rounded-full bg-white px-5 py-3 text-base font-bold text-neutral-900 hover:bg-neutral-100 disabled:opacity-40"
                >
                  {busy === "handoff" ? "Handing off…" : "Hand to fulfilment"}
                </button>
              )}
              {request.status === "won" && request.shipmentId && (
                <Link href="/admin/logistics" className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-base font-bold text-neutral-900 hover:bg-neutral-100">
                  <Check className="size-4" /> Shipment SHP-{request.shipmentId} · awaiting coordination
                </Link>
              )}
              {request.status === "won" && (
                <p className="text-sm text-neutral-400">
                  Buyer agreed {request.buyerConsentedAt ? formatCentralDateTime(request.buyerConsentedAt) : ""}. Identity released to the seller.
                </p>
              )}
              {canLose && !confirmLost && (
                <button type="button" disabled={busy !== null} onClick={() => setConfirmLost(true)} className="text-sm font-semibold text-neutral-400 hover:text-white">
                  Close as lost
                </button>
              )}
              {canLose && confirmLost && (
                <div className="rounded-xl bg-white/10 p-3 text-sm">
                  <p>Close {request.reference} as lost? Any booked call is released.</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={busy !== null} onClick={() => setStatus("lost")} className="rounded-full bg-white px-4 py-1.5 font-bold text-neutral-900 disabled:opacity-40">
                      {busy === "status:lost" ? "Closing…" : "Yes, close"}
                    </button>
                    <button type="button" onClick={() => setConfirmLost(false)} className="rounded-full px-4 py-1.5 font-semibold text-white">
                      Keep open
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6" style={border}>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">Deliberately not here</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-600">
              <li>No rate calculation. We do not have the carrier relationships yet.</li>
              <li>No margin field. Pricing is decided off-platform until we know what the market bears.</li>
              <li>No numbers shown to the buyer anywhere in the product.</li>
            </ul>
          </section>

          <section className="rounded-2xl bg-white p-6" style={border}>
            <h2 className="text-base font-bold text-neutral-900">What the notes are for</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              After ten pilots these notes are our lane book — who runs which route, what it cost, who was reliable. That is the
              asset that eventually makes pricing possible.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/admin/pilots" className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-neutral-900">
      <ArrowLeft className="size-4" /> Pilot desk
    </Link>
  );
}
