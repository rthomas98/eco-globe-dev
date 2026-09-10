"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import { createAdminPilotSlot, deleteAdminPilotSlot, fetchAdminPilotSlots, type PilotSlot, type PilotStaff } from "@/lib/api-pilots";
import { describeBackendError } from "@/lib/backend-client";
import { centralDayKey, centralWallClockToUtcIso, centralZoneAbbreviation, formatCentralDateTime, formatCentralTime, quarterHourOptions } from "@/lib/pilots";
import { PilotViewTag } from "@/components/pilots/pilot-copy";

const border = { border: "1px solid #E0E0E0" } as const;
const fieldClass = "w-full rounded-xl bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20";

type State = { status: "loading" } | { status: "ready"; slots: PilotSlot[]; staff: PilotStaff[] } | { status: "error"; message: string };

/** `/admin/pilots/availability` — staff-managed fifteen-minute call slots in Central Time. */
export function AdminPilotAvailabilityPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [version, setVersion] = useState(0);
  const [owner, setOwner] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const baseId = useId();
  const times = useMemo(quarterHourOptions, []);

  useEffect(() => {
    let cancelled = false;
    setState((current) => (current.status === "ready" ? current : { status: "loading" }));
    fetchAdminPilotSlots()
      .then((result) => {
        if (cancelled) return;
        setState({ status: "ready", ...result });
        setOwner((current) => current || (result.staff[0] ? String(result.staff[0].userId) : ""));
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", message: describeBackendError(err, "Call availability could not be loaded.") });
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const reload = () => setVersion((v) => v + 1);

  const add = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);
    const startsAt = centralWallClockToUtcIso(date, time);
    if (!owner) return setError("Choose the staff member who will take the call.");
    if (!startsAt) return setError("Choose a valid date and time.");
    if (new Date(startsAt).getTime() <= Date.now()) return setError("Choose a time in the future.");
    setBusy("add");
    try {
      await createAdminPilotSlot({ ownerUserId: Number(owner), startsAt });
      setNotice(`Added ${formatCentralDateTime(startsAt)} (${centralZoneAbbreviation(startsAt)}).`);
      reload();
    } catch (err) {
      setError(describeBackendError(err, "That slot could not be added."));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (slot: PilotSlot) => {
    if (busy) return;
    setError(null);
    setNotice(null);
    setBusy(`delete:${slot.id}`);
    try {
      await deleteAdminPilotSlot(slot.id);
      setNotice("Slot removed.");
      reload();
    } catch (err) {
      setError(describeBackendError(err, "That slot could not be removed."));
    } finally {
      setBusy(null);
    }
  };

  const grouped = useMemo(() => {
    if (state.status !== "ready") return [];
    const now = Date.now();
    const days = new Map<string, PilotSlot[]>();
    for (const slot of [...state.slots].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())) {
      if (new Date(slot.endsAt).getTime() < now) continue;
      const key = centralDayKey(slot.startsAt);
      days.set(key, [...(days.get(key) ?? []), slot]);
    }
    return [...days.entries()];
  }, [state]);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8">
      <PilotViewTag tone="internal" label="EcoGlobe internal" detail="call availability — real fifteen-minute slots" />
      <Link href="/admin/pilots" className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-neutral-900">
        <ArrowLeft className="size-4" /> Pilot desk
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">Call availability</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Buyers only see slots added here. Times are Central ({centralZoneAbbreviation()}); booked slots cannot be removed.
      </p>

      {(notice || error) && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`} role={error ? "alert" : "status"}>
          {error ?? notice}
        </div>
      )}

      <form onSubmit={add} className="mt-5 grid gap-3 rounded-2xl bg-white p-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end" style={border}>
        <div>
          <label htmlFor={`${baseId}-owner`} className="text-sm font-semibold text-neutral-800">
            Staff member
          </label>
          <select id={`${baseId}-owner`} value={owner} onChange={(e) => setOwner(e.target.value)} className={`${fieldClass} mt-1 appearance-none`} style={border}>
            <option value="">Choose…</option>
            {state.status === "ready" && state.staff.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${baseId}-date`} className="text-sm font-semibold text-neutral-800">
            Date
          </label>
          <input id={`${baseId}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${fieldClass} mt-1`} style={border} required />
        </div>
        <div>
          <label htmlFor={`${baseId}-time`} className="text-sm font-semibold text-neutral-800">
            Start (Central)
          </label>
          <select id={`${baseId}-time`} value={time} onChange={(e) => setTime(e.target.value)} className={`${fieldClass} mt-1 appearance-none`} style={border}>
            {times.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={busy !== null || state.status !== "ready"} className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-40">
          {busy === "add" ? "Adding…" : "Add 15-minute slot"}
        </button>
      </form>

      {state.status === "loading" && <p className="py-16 text-center text-sm text-neutral-600" role="status">Loading availability…</p>}
      {state.status === "error" && (
        <div className="mt-6 rounded-2xl bg-red-50 p-6 text-sm text-red-700" role="alert">
          <p>{state.message}</p>
          <button type="button" onClick={reload} className="mt-2 inline-flex items-center gap-1 font-semibold underline">
            <RefreshCw className="size-3" /> Retry
          </button>
        </div>
      )}
      {state.status === "ready" && state.staff.length === 0 && (
        <p className="mt-6 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-800">No active internal staff can take calls. Add staff before opening availability.</p>
      )}
      {state.status === "ready" && grouped.length === 0 && (
        <div className="mt-6 rounded-2xl bg-white p-8 text-center text-sm text-neutral-600" style={border}>
          No upcoming slots. Buyers currently see an honest “no call times are open” message.
        </div>
      )}
      {grouped.map(([day, slots]) => (
        <section key={day} className="mt-6" aria-label={formatCentralDateTime(slots[0].startsAt).split(",")[0]}>
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-neutral-500">{formatCentralDateTime(slots[0].startsAt).split(",")[0]}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {slots.map((slot) => {
              const booked = slot.requestId != null;
              return (
                <li key={slot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3" style={border}>
                  <div className="text-sm">
                    <span className="font-bold text-neutral-900">
                      {formatCentralTime(slot.startsAt)} – {formatCentralTime(slot.endsAt)}
                    </span>
                    <span className="ml-2 text-neutral-600">{slot.ownerName}</span>
                  </div>
                  {booked ? (
                    <Link href={`/admin/pilots/${slot.requestId}`} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-amber-800">
                      Booked · PR-{slot.requestId}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => remove(slot)}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-red-700 disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" /> {busy === `delete:${slot.id}` ? "Removing…" : "Remove"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
