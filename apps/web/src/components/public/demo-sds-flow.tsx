"use client";

import { useEffect, useState } from "react";

/** Isolated walkthrough: never writes a document, order, payment or verification. */
export function DemoSdsFlow() {
  const [enabled, setEnabled] = useState(false);
  const [role, setRole] = useState<"seller" | "buyer">("seller");
  const [reviewed, setReviewed] = useState(false);
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    setEnabled(["localhost", "127.0.0.1", "eco-globe-dev-web.vercel.app"].includes(window.location.hostname));
  }, []);
  if (!enabled) return null;
  return (
    <section aria-label="Demo SDS walkthrough" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-neutral-900">
      <h2 className="font-bold">Demo only — Seller / Buyer SDS</h2>
      <p className="mt-2">This walkthrough does not verify the material or enable real purchases. No payment, order or shipment is created.</p>
      <div className="my-3 flex gap-2">
        {(["seller", "buyer"] as const).map((view) => <button key={view} type="button" aria-pressed={role === view} onClick={() => setRole(view)} className={`rounded-full border px-3 py-1.5 capitalize ${role === view ? "bg-neutral-900 text-white" : "bg-white"}`}>{view} demo</button>)}
      </div>
      <a href="/demo/sds-demo-only.txt" download className="font-semibold underline">Download demo document — not a valid SDS</a>
      {role === "seller" ? (
        <div className="mt-3">
          <p>Use the sample document to demonstrate the seller submission and review step.</p>
          <button type="button" onClick={() => { setReviewed(true); setComplete(false); }} className="mt-3 rounded-full bg-neutral-900 px-4 py-2 font-semibold text-white">Simulate SDS submission and review</button>
        </div>
      ) : (
        <div className="mt-3">
          <p>{reviewed ? "Demo review complete. You can now demonstrate checkout." : "Complete the seller demo step first."}</p>
          <button type="button" disabled={!reviewed || complete} onClick={() => setComplete(true)} className="mt-3 rounded-full bg-neutral-900 px-4 py-2 font-semibold text-white disabled:opacity-40">Simulate purchase — no charge</button>
        </div>
      )}
      <p role="status" className="mt-3 font-semibold">{complete ? "Demo purchase complete. No real order or payment was created." : reviewed ? "Simulated review complete — live SDS status unchanged." : "Demo document is unverified. Live SDS status unchanged."}</p>
      {reviewed && <button type="button" onClick={() => { setReviewed(false); setComplete(false); setRole("seller"); }} className="mt-2 underline">Reset demo</button>}
    </section>
  );
}
