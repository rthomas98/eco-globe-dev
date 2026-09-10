"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarX2, Check } from "lucide-react";
import type { PilotRequest, PilotSlot } from "@/lib/api-pilots";
import { preferPilotEmail, schedulePilotCall } from "@/lib/api-pilots";
import { describeBackendError, isBackendApiError } from "@/lib/backend-client";
import {
  centralZoneAbbreviation,
  formatCentralDateTime,
  formatCentralTime,
  formatLoads,
  groupSlotsByCentralDay,
} from "@/lib/pilots";

const border = { border: "1px solid #E0E0E0" } as const;

/**
 * Buyer scheduling step: the request is already saved, so this only books a
 * fifteen-minute staff slot (a database reservation, not a calendar invite)
 * or records an email preference for staff follow-up. Empty availability is
 * shown honestly rather than filled with invented times.
 */
export function PilotSchedule({
  request,
  slots,
  onUpdated,
  onConflict,
}: {
  request: PilotRequest;
  slots: PilotSlot[];
  onUpdated: (request: PilotRequest) => void;
  /** A slot vanished between load and confirm; the caller reloads availability. */
  onConflict: () => void;
}) {
  const days = useMemo(() => groupSlotsByCentralDay(slots), [slots]);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<number | null>(null);
  const [busy, setBusy] = useState<"book" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (days.length === 0) {
      setDayKey(null);
      setSlotId(null);
      return;
    }
    setDayKey((current) => (current && days.some((d) => d.key === current) ? current : days[0].key));
  }, [days]);

  const day = days.find((d) => d.key === dayKey) ?? null;
  const selected = day?.slots.find((s) => s.id === slotId) ?? null;
  const booked = request.status === "call_booked" && request.callStartsAt;
  const emailPreferred = request.status === "new" && request.contactPreference === "email";

  const book = async () => {
    if (!selected || busy) return;
    setBusy("book");
    setError(null);
    try {
      onUpdated(await schedulePilotCall(request.id, selected.id));
    } catch (err) {
      setError(describeBackendError(err, "That time could not be booked."));
      if (isBackendApiError(err) && (err.kind === "conflict" || err.kind === "not-found")) onConflict();
    } finally {
      setBusy(null);
    }
  };

  const email = async () => {
    if (busy) return;
    setBusy("email");
    setError(null);
    try {
      onUpdated(await preferPilotEmail(request.id));
    } catch (err) {
      setError(describeBackendError(err, "Your preference could not be saved."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl bg-white p-5 sm:p-8" style={border} aria-labelledby="pilot-schedule-heading">
      <div className="flex gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-800" aria-hidden="true">
          <Check className="size-6" strokeWidth={3} />
        </span>
        <div>
          <h1 id="pilot-schedule-heading" className="text-3xl font-bold text-neutral-900 sm:text-4xl">
            Your pilot request is with us
          </h1>
          <p className="mt-2 text-base text-neutral-500">
            Reference {request.reference} · {request.listingTitle} · {formatLoads(request.loadCount, null)} to {request.destinationLabel}
          </p>
        </div>
      </div>

      <div className="my-7 border-t" style={{ borderColor: "#F0F0F0" }} />

      {booked && (
        <div className="mb-6 rounded-2xl bg-green-50 px-5 py-4 text-sm text-green-900" role="status">
          <p className="text-base font-bold">Booked: {formatCentralDateTime(request.callStartsAt!)} ({centralZoneAbbreviation(request.callStartsAt!)})</p>
          <p className="mt-1">
            Fifteen minutes with {request.ownerName ?? "the person handling your pilot"}. Pick another time below if that no longer
            works, or switch to email.
          </p>
        </div>
      )}
      {emailPreferred && (
        <div className="mb-6 rounded-2xl bg-neutral-100 px-5 py-4 text-sm text-neutral-800" role="status">
          <p className="text-base font-bold">We will follow up by email.</p>
          <p className="mt-1">No call is booked. You can still pick a time below if one suits.</p>
        </div>
      )}

      <h2 className="text-2xl font-bold text-neutral-900">{booked ? "Change the time" : "Pick a time to talk it through"}</h2>
      <p className="mt-2 text-base text-neutral-500">
        Fifteen minutes with the person who will handle your pilot. We will have spoken to the seller before the call.
      </p>

      {days.length === 0 ? (
        <div className="mt-6 flex gap-4 rounded-2xl bg-neutral-50 px-5 py-5" role="status">
          <CalendarX2 className="mt-0.5 size-6 shrink-0 text-neutral-500" aria-hidden="true" />
          <div className="text-sm text-neutral-700">
            <p className="text-base font-bold text-neutral-900">No call times are open right now.</p>
            <p className="mt-1">
              Our team adds availability as it opens up. Ask for email follow-up instead and we will come to you.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 flex gap-2.5 overflow-x-auto pb-1" role="tablist" aria-label="Day">
            {days.map((d) => {
              const active = d.key === dayKey;
              return (
                <button
                  key={d.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setDayKey(d.key);
                    setSlotId(null);
                  }}
                  className={`min-w-[96px] flex-1 rounded-2xl px-3 py-3 text-center transition ${active ? "bg-neutral-900 text-white" : "bg-white text-neutral-900 hover:bg-neutral-50"}`}
                  style={active ? undefined : border}
                >
                  <span className={`block text-xs font-bold uppercase tracking-[0.18em] ${active ? "text-neutral-300" : "text-neutral-500"}`}>{d.weekday}</span>
                  <span className="block text-2xl font-bold">{d.dayNumber}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5" role="radiogroup" aria-label="Time">
            {day?.slots.map((slot) => {
              const active = slot.id === slotId;
              return (
                <button
                  key={slot.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSlotId(slot.id)}
                  className={`rounded-full px-5 py-2.5 text-base transition ${active ? "bg-neutral-900 font-bold text-white" : "bg-white text-neutral-900 hover:bg-neutral-50"}`}
                  style={active ? undefined : border}
                  title={`With ${slot.ownerName}`}
                >
                  {formatCentralTime(slot.startsAt)}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-neutral-500">Times shown in Central Time ({centralZoneAbbreviation(day?.slots[0]?.startsAt)}).</p>
        </>
      )}

      <div className="my-7 border-t" style={{ borderColor: "#F0F0F0" }} />

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
      {days.length > 0 && (
        <button
          type="button"
          onClick={book}
          disabled={!selected || busy !== null}
          className="w-full rounded-full bg-neutral-900 px-6 py-4 text-lg font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "book" ? "Booking…" : selected ? `Confirm ${formatCentralDateTime(selected.startsAt)}` : "Choose a day and time"}
        </button>
      )}
      {!emailPreferred && (
        <button
          type="button"
          onClick={email}
          disabled={busy !== null}
          className="mt-4 w-full rounded-full px-6 py-3 text-lg font-bold text-neutral-700 transition hover:text-neutral-900 disabled:opacity-50"
        >
          {busy === "email" ? "Saving…" : days.length === 0 ? "Email me instead" : "None of these work — just email me instead"}
        </button>
      )}
    </section>
  );
}
