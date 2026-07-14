"use client";

import { useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, FileText, ShieldCheck, Upload } from "lucide-react";

type Role = "buyer" | "seller";

interface VerificationStep {
  id: string;
  label: string;
  detail: string;
  status: "Complete" | "In review" | "Needed";
}

const baseSteps: VerificationStep[] = [
  {
    id: "business",
    label: "Business verification",
    detail: "Company registration, tax ID, and authorized representative.",
    status: "Complete",
  },
  {
    id: "sustainability",
    label: "Sustainability documents",
    detail: "Certifications, COAs, SDS sheets, or ESG evidence tied to feedstocks.",
    status: "In review",
  },
  {
    id: "financial",
    label: "Financial verification",
    detail: "Payment method, bank details, escrow eligibility, and payout readiness.",
    status: "Needed",
  },
  {
    id: "compliance",
    label: "Ongoing compliance",
    detail: "Expiration monitoring, renewal reminders, and admin spot checks.",
    status: "Needed",
  },
];

export function VerificationCenter({ role }: { role: Role }) {
  const [steps, setSteps] = useState(baseSteps);
  const [submitted, setSubmitted] = useState(false);
  const title = role === "buyer" ? "Buyer verification" : "Seller verification";
  const body =
    role === "buyer"
      ? "Complete buyer verification so orders, escrow funding, and delivery addresses can be approved."
      : "Complete seller verification so listings can be published and buyers can trust your documents.";

  const submitStep = (id: string) => {
    setSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, status: "In review" } : step)),
    );
    setSubmitted(true);
  };

  const completeCount = steps.filter((step) => step.status === "Complete").length;

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <div className="px-8 py-8">
        <div className="mb-6 rounded-3xl bg-neutral-950 p-8 text-white">
          <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-emerald-300">VERIFICATION</p>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-300">{body}</p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(completeCount / steps.length) * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-neutral-300">{completeCount} of {steps.length} sections complete</p>
        </div>

        {submitted && (
          <div className="mb-5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800 ring-1 ring-blue-100">
            Sample document submitted for admin review.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {steps.map((step) => (
            <section key={step.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-neutral-100">
                    {step.id === "business" ? (
                      <Building2 className="size-5 text-neutral-700" />
                    ) : step.id === "financial" ? (
                      <ShieldCheck className="size-5 text-neutral-700" />
                    ) : (
                      <FileText className="size-5 text-neutral-700" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-neutral-950">{step.label}</h2>
                    <p className="mt-1 text-sm text-neutral-600">{step.detail}</p>
                  </div>
                </div>
                <VerificationBadge status={step.status} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => submitStep(step.id)}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
                >
                  <Upload className="size-4" />
                  Submit document
                </button>
                <button className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-800">
                  View requirements
                </button>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function VerificationBadge({ status }: { status: VerificationStep["status"] }) {
  const tone = {
    Complete: "bg-emerald-100 text-emerald-700",
    "In review": "bg-blue-100 text-blue-700",
    Needed: "bg-amber-100 text-amber-800",
  }[status];
  const Icon = status === "Complete" ? CheckCircle2 : AlertTriangle;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
      <Icon className="size-3" />
      {status}
    </span>
  );
}
