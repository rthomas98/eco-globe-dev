"use client";

import type { ReactNode } from "react";
import { NOT_A_REPLACEMENT, RESULTS_DESCRIBE_A_BATCH } from "@/lib/lab-testing";

const cardBorder = { border: "1px solid #E0E0E0" } as const;

/**
 * The three steps after a request is sent. Deliberately free of promises:
 * no laboratory is named, no price or duration is given, and sampling is
 * only confirmed by EcoGlobe before anything ships.
 */
const NEXT_STEPS: readonly string[] = [
  "We confirm the scope with you and quote it",
  "EcoGlobe confirms the sample with the seller before anything ships to a laboratory, not to you",
  "Results come to you, and to the listing if you chose to share",
];

/**
 * Right-hand column of the lab testing workspace: what happens next and the
 * three plain-English caveats. Pure presentation; shared by both hosts so the
 * wording lives in one place.
 */
export function LabTestingGuidance() {
  return (
    <aside className="flex flex-col gap-4" aria-label="About lab testing requests">
      <section className="rounded-2xl bg-white p-6" style={cardBorder}>
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">What happens next</h3>
        <ol className="mt-4 flex flex-col gap-4">
          {NEXT_STEPS.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span className="text-[15px] leading-6 text-neutral-900">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl p-6" style={cardBorder}>
        <h3 className="text-base font-bold text-neutral-900">Every tick teaches us something</h3>
        <p className="mt-2 text-[15px] leading-6 text-neutral-700">
          These groups are our best guess at what matters. What people actually select is the evidence we take to a
          laboratory when we negotiate rates.
        </p>
      </section>

      <section className="rounded-2xl p-6" style={cardBorder}>
        <h3 className="text-base font-bold text-neutral-900">{NOT_A_REPLACEMENT}</h3>
        <p className="mt-2 text-[15px] leading-6 text-neutral-700">
          Many buyers still run their own checks before contracting. An independent panel up front tells you whether
          that is worth doing at all.
        </p>
      </section>

      <section className="rounded-2xl bg-orange-50 p-6" style={{ border: "1px solid #F5D0A9" }}>
        <h3 className="text-base font-bold text-red-900">{RESULTS_DESCRIBE_A_BATCH}</h3>
        <p className="mt-2 text-[15px] leading-6 text-neutral-800">
          Waste streams vary. Every report is stamped with the batch and the date the sample was drawn.
        </p>
      </section>
    </aside>
  );
}

export interface LabTestingWorkspaceProps {
  /** The form card contents. */
  children: ReactNode;
  /** Rendered at the right end of the eyebrow row (a close button, for hosts). */
  actions?: ReactNode;
}

/**
 * Full-width lab testing workspace: grey ground, eyebrow, and a two-column
 * grid with the white form card on the left and the guidance stack on the
 * right. Stacks to one column below the large breakpoint with no overflow.
 */
export function LabTestingWorkspace({ children, actions }: LabTestingWorkspaceProps) {
  return (
    <div className="min-h-full w-full bg-[#F4F5F6] px-4 py-4 sm:px-6 sm:py-5">
      <div className="mx-auto w-full max-w-[1340px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Lab testing request</span>
            <span className="text-sm text-neutral-500">everything here comes to EcoGlobe first; nothing is booked yet</span>
          </p>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2.3fr_1fr]">
          <div className="min-w-0 rounded-2xl bg-white p-5 sm:p-8" style={cardBorder}>
            {children}
          </div>
          <LabTestingGuidance />
        </div>
      </div>
    </div>
  );
}
