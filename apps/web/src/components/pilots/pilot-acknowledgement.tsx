"use client";

import { AlertTriangle, Mail, MailCheck } from "lucide-react";
import type { PilotRequest } from "@/lib/api-pilots";
import { describePilotAcknowledgement } from "@/lib/pilots";

const TONES = {
  neutral: { box: "bg-neutral-50 text-neutral-800", icon: "text-neutral-500", Icon: Mail },
  success: { box: "bg-green-50 text-green-900", icon: "text-green-800", Icon: MailCheck },
  warning: { box: "bg-amber-50 text-amber-900", icon: "text-amber-700", Icon: AlertTriangle },
} as const;

/**
 * The one automatic acknowledgement email queued when the request was made.
 * Kept apart from staff follow-up and call booking: it reports what the
 * backend recorded and offers no resend.
 */
export function PilotAcknowledgement({ request }: { request: Pick<PilotRequest, "acknowledgementStatus" | "acknowledgementIsTest"> }) {
  const copy = describePilotAcknowledgement(request.acknowledgementStatus, request.acknowledgementIsTest);
  const tone = TONES[copy.tone];
  return (
    <div className={`flex gap-3 rounded-2xl px-4 py-4 text-sm sm:px-5 ${tone.box}`} role="status" aria-labelledby="pilot-ack-heading">
      <tone.Icon className={`mt-0.5 size-5 shrink-0 ${tone.icon}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-70">Automatic acknowledgement</p>
        <p id="pilot-ack-heading" className="mt-1 text-base font-bold">
          {copy.title}
        </p>
        <p className="mt-1 leading-relaxed">{copy.body}</p>
      </div>
    </div>
  );
}
