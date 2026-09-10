"use client";
import { useCallback, useEffect, useState } from "react";
import { LabTestingDialog } from "@/components/lab-testing/lab-testing-dialog";
import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { SellerLayout } from "@/components/seller/seller-layout";
import Link from "next/link";
import {
  sampleApi,
  sampleMoney,
  type Shipment,
  type SampleSite,
} from "@/lib/api-sample-shipping";
type Policy = {
  id: number;
  title: string;
  enabled: boolean;
  classification: string;
  specialHandling: boolean;
  missedRequests: number;
};
type AdminData = {
  listings: Policy[];
  sites: SampleSite[];
  referrals: {
    id: number;
    listingTitle: string;
    buyerCompanyName: string;
    reason: string;
    note: string;
  }[];
};
const button =
  "rounded-full bg-neutral-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-40";
const date = (s: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(s));
function ShippingDeskContent({ role }: { role: "buyer" | "seller" | "admin" }) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [lab, setLab] = useState<Shipment | null>(null);
  const [rows, setRows] = useState<Shipment[]>([]),
    [mode, setMode] = useState(""),
    [admin, setAdmin] = useState<AdminData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  const reload = useCallback(async () => {
    const result = await sampleApi<{ requests: Shipment[]; mode: string }>(
      "/requests",
    );
    setRows(
      result.requests.filter(
        (r) => role === "admin" || (role === "buyer" ? r.isBuyer : r.isSeller),
      ),
    );
    setMode(result.mode);
    if (role === "admin") setAdmin(await sampleApi<AdminData>("/admin"));
    if (role === "seller")
      setPolicies(
        (await sampleApi<{ listings: Policy[] }>("/seller-policies")).listings,
      );
    setLoaded(true);
  }, [role]);
  useEffect(() => {
    void reload().catch((e) => setError(e.message));
  }, [reload]);
  const act = async (path: string, body: unknown = {}, method = "POST") => {
    setBusy(true);
    setError("");
    try {
      await sampleApi(path, body, method);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed. Retry.");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!loaded) return;
    const id = new URLSearchParams(window.location.search).get("sample");
    if (id && /^\d+$/.test(id))
      document
        .getElementById(`sample-${id}`)
        ?.scrollIntoView({ block: "start" });
  }, [loaded]);
  const dispatches = rows.filter(
    (r) =>
      r.dispatchedAt &&
      r.dispatchDeadline &&
      new Date(r.dispatchedAt) <= new Date(r.dispatchDeadline),
  ).length;
  const paid = rows.filter((r) => r.state !== "payment_pending").length;
  return (
    <main className="min-h-screen bg-[#f5f6f6] p-5 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm font-bold tracking-widest text-emerald-800">
            {role.toUpperCase()} VIEW
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            {role === "admin"
              ? "Sample shipping desk"
              : role === "seller"
                ? "Sample dispatch"
                : "My sample requests"}
          </h1>
        </header>
        {mode === "simulation" && (
          <p className="rounded-xl bg-amber-50 p-4 text-amber-900">
            Local simulation — no payments, valid postage, real tracking or
            financial credits. These records are for testing only.
          </p>
        )}
        {mode === "unavailable" && (
          <p className="rounded-xl bg-amber-50 p-4">
            Online shipping awaits EasyPost and Stripe test setup. Requests for
            help remain available.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
            {error}
          </p>
        )}
        <button
          className="underline"
          disabled={busy}
          onClick={() => void reload().catch((e) => setError(e.message))}
        >
          Refresh requests
        </button>
        {role === "admin" && (
          <button
            disabled={busy}
            className={button}
            onClick={() => void act("/admin/reconcile")}
          >
            Retry pending provider operations
          </button>
        )}
        {role === "admin" && (
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Paid requests", paid],
              ["Dispatched on time", dispatches],
              [
                "On-time dispatch rate",
                paid ? `${Math.round((100 * dispatches) / paid)}%` : "—",
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white p-5">
                <p className="text-neutral-500">{label}</p>
                <strong className="text-3xl">{value}</strong>
              </div>
            ))}
          </div>
        )}
        {!loaded && !error && <p role="status">Loading sample requests…</p>}
        {loaded && !rows.length && (
          <p className="rounded-2xl bg-white p-8">No sample shipments yet.</p>
        )}
        {rows.map((r) => (
          <section
            key={r.id}
            id={`sample-${r.id}`}
            className="space-y-5 rounded-3xl border border-neutral-200 bg-white p-6 md:p-8"
          >
            <header className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">
                  Sample request {r.reference}
                </h2>
                <p className="text-neutral-500">
                  {r.listingTitle} · {r.box.name} box, up to {r.box.maxWeightKg}{" "}
                  kg
                </p>
              </div>
              <span className="h-fit rounded-full bg-emerald-50 px-4 py-2 font-semibold capitalize text-emerald-900">
                {r.state.replaceAll("_", " ")}
              </span>
            </header>
            {r.dispatchDeadline && r.state === "awaiting_dispatch" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                <h3 className="text-xl font-bold">
                  Dispatch by {date(r.dispatchDeadline)}
                </h3>
                <p>
                  End of day Central Time. After 10 business days without
                  dispatch, the buyer is refunded automatically.
                </p>
              </div>
            )}
            <div>
              <h3 className="mb-2 text-lg font-bold">Send to</h3>
              <div className="rounded-xl border border-neutral-200 p-4">
                <strong>
                  {r.buyerCompanyName} — {r.destination.company}
                </strong>
                <p className="text-neutral-500">
                  {r.destination.street1}, {r.destination.city},{" "}
                  {r.destination.state} {r.destination.zip}
                </p>
              </div>
            </div>
            <p>
              Shipping — {r.carrier} {r.service}:{" "}
              <strong>{sampleMoney(r.shippingCents)}</strong> · Material free
            </p>
            {r.trackingNumber &&
              !["declined", "expired", "delivery_failed"].includes(r.state) && (
                <div>
                  <h3 className="mb-3 text-lg font-bold">
                    {r.mode === "simulation"
                      ? "Simulated label"
                      : "Prepaid label"}
                  </h3>
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-950 p-5">
                    <div>
                      <strong>
                        {r.carrier} {r.service}
                      </strong>
                      <p className="font-mono text-neutral-500">
                        {r.trackingNumber}
                      </p>
                    </div>
                    <a
                      className={button}
                      href={`/api/backend/api/sample-shipping/requests/${r.id}/label`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download label
                    </a>
                  </div>
                  <p className="mt-3 text-sm text-neutral-500">
                    Print, attach to a {r.box.name} box and drop off with{" "}
                    {r.carrier}.{" "}
                    {r.mode === "simulation"
                      ? "Test label cannot be used for shipping."
                      : "Nothing for the seller to pay."}
                  </p>
                </div>
              )}
            <div className="flex flex-wrap gap-3">
              {r.isBuyer &&
                ["awaiting_dispatch", "in_transit", "delivered"].includes(
                  r.state,
                ) && (
                  <button className="underline" onClick={() => setLab(r)}>
                    Request lab testing too
                  </button>
                )}
              {r.state === "payment_pending" && r.isBuyer && (
                <button
                  disabled={busy}
                  className={button}
                  onClick={() =>
                    void act(
                      `/requests/${r.id}/${mode === "simulation" ? "simulate-payment" : "refresh"}`,
                    )
                  }
                >
                  {mode === "simulation"
                    ? "Simulate successful payment"
                    : "Check payment confirmation"}
                </button>
              )}
              {r.state === "paid" && r.isBuyer && (
                <button
                  disabled={busy}
                  className={button}
                  onClick={() => void act(`/requests/${r.id}/refresh`)}
                >
                  Retry label preparation
                </button>
              )}
              {r.state === "awaiting_dispatch" && r.isSeller && (
                <>
                  <button
                    disabled={busy}
                    className={button}
                    onClick={() => void act(`/requests/${r.id}/dispatch`)}
                  >
                    Mark as dispatched
                  </button>
                  <button
                    disabled={busy}
                    className="rounded-full border border-neutral-300 px-5 py-3 font-bold"
                    onClick={() => void act(`/requests/${r.id}/decline`)}
                  >
                    Can&apos;t fulfil
                  </button>
                </>
              )}
              {role === "admin" &&
                r.mode === "simulation" &&
                r.state === "in_transit" && (
                  <button
                    disabled={busy}
                    className={button}
                    onClick={() =>
                      void act(`/requests/${r.id}/simulate-delivery`)
                    }
                  >
                    Simulate carrier delivery
                  </button>
                )}
              {role === "admin" &&
                r.mode === "simulation" &&
                r.state === "awaiting_dispatch" && (
                  <button
                    disabled={busy}
                    className={button}
                    onClick={() =>
                      void act(`/requests/${r.id}/simulate-expiry`)
                    }
                  >
                    Simulate deadline expiry
                  </button>
                )}
            </div>
            {r.refundState !== "none" && (
              <p className="rounded-xl bg-amber-50 p-4">
                {r.mode === "simulation" ? "Simulated refund" : "Refund"}:{" "}
                <strong>{r.refundState}</strong>. Label cancellation:{" "}
                {r.labelVoidState}.{" "}
                {r.isBuyer && <Link className="underline" href="/buyer/browse">
                  Browse alternatives
                </Link>}
              </p>
            )}
            {r.creditCents && (
              <p className="rounded-xl bg-emerald-50 p-4">
                {r.mode === "simulation"
                  ? "Simulated shipping credit"
                  : "Shipping credit"}
                : {sampleMoney(r.creditCents)}{" "}
                {r.redeemedOrderId
                  ? `applied to order #${r.redeemedOrderId}`
                  : "available for a qualifying order of this material"}
                .{" "}
                {r.isBuyer && <Link
                  className="underline"
                  href={`/buyer/browse/${r.listingId}`}
                >
                  View material
                </Link>}
              </p>
            )}
            {r.lastError && (
              <p role="status" className="text-amber-800">
                {r.lastError}
              </p>
            )}
          </section>
        ))}
        {role === "seller" && (
          <section className="rounded-2xl bg-white p-6 space-y-3">
            <h2 className="text-xl font-bold">Sample availability</h2>
            {policies.map((p) => (
              <div
                className="flex justify-between gap-4 border-b py-3"
                key={p.id}
              >
                <p>
                  #{p.id} {p.title} · {p.classification.replaceAll("_", " ")}
                </p>
                <button
                  disabled={busy}
                  className={button}
                  onClick={() =>
                    void act(
                      `/policies/${p.id}`,
                      { enabled: !p.enabled },
                      "PATCH",
                    )
                  }
                >
                  {p.enabled ? "Switch samples off" : "Enable sample requests"}
                </button>
              </div>
            ))}
          </section>
        )}
        {admin && (
          <>
            <section className="space-y-3 rounded-2xl bg-white p-6">
              <h2 className="text-xl font-bold">Material shipping review</h2>
              <p className="text-neutral-500">
                Enable only after confirming a standard solid, no restrictions
                and no special shipping instructions.
              </p>
              {admin.listings.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center gap-3 border-b py-3"
                >
                  <strong className="mr-auto">
                    #{p.id} {p.title}
                  </strong>
                  <label>
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) =>
                        setAdmin({
                          ...admin,
                          listings: admin.listings.map((l) =>
                            l.id === p.id
                              ? { ...l, enabled: e.target.checked }
                              : l,
                          ),
                        })
                      }
                    />{" "}
                    Samples enabled
                  </label>
                  <select
                    aria-label={`Classification for listing ${p.id}`}
                    value={p.classification}
                    onChange={(e) =>
                      setAdmin({
                        ...admin,
                        listings: admin.listings.map((l) =>
                          l.id === p.id
                            ? { ...l, classification: e.target.value }
                            : l,
                        ),
                      })
                    }
                  >
                    {[
                      "unreviewed",
                      "standard_solid",
                      "restricted",
                      "liquid",
                      "gas",
                    ].map((v) => (
                      <option value={v} key={v}>
                        {v.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                  <label>
                    <input
                      type="checkbox"
                      checked={p.specialHandling}
                      onChange={(e) =>
                        setAdmin({
                          ...admin,
                          listings: admin.listings.map((l) =>
                            l.id === p.id
                              ? { ...l, specialHandling: e.target.checked }
                              : l,
                          ),
                        })
                      }
                    />{" "}
                    Special handling
                  </label>
                  <span>{p.missedRequests} missed</span>
                  <button
                    disabled={busy}
                    className={button}
                    onClick={() =>
                      void act(
                        `/policies/${p.id}`,
                        {
                          enabled: p.enabled,
                          classification: p.classification,
                          specialHandling: p.specialHandling,
                        },
                        "PATCH",
                      )
                    }
                  >
                    Save #{p.id}
                  </button>
                </div>
              ))}
            </section>
            <section className="space-y-3 rounded-2xl bg-white p-6">
              <h2 className="text-xl font-bold">Receiving sites</h2>
              <p>
                Confirm that each address belongs to a business receiving site.
                Carrier address validation runs separately at quoting.
              </p>
              {admin.sites.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap justify-between gap-4 border-b py-3"
                >
                  <p>
                    {s.company} — {s.street1}, {s.city}, {s.state} {s.zip}
                  </p>
                  {s.verified ? (
                    <strong className="text-emerald-800">Site confirmed</strong>
                  ) : (
                    <button
                      disabled={busy}
                      className={button}
                      onClick={() => void act(`/sites/${s.id}/verify`)}
                    >
                      Confirm site #{s.id}
                    </button>
                  )}
                </div>
              ))}
            </section>
            <section className="space-y-3 rounded-2xl bg-white p-6">
              <h2 className="text-xl font-bold">Requests for assistance</h2>
              {admin.referrals.length ? (
                admin.referrals.map((r) => (
                  <p key={r.id}>
                    #{r.id} · {r.buyerCompanyName} · {r.listingTitle} ·{" "}
                    {r.reason.replaceAll("_", " ")}
                    <br />
                    {r.note}
                  </p>
                ))
              ) : (
                <p>No referrals yet.</p>
              )}
            </section>
          </>
        )}
        {lab && (
          <LabTestingDialog
            listing={{
              id: lab.listingId,
              title: lab.listingTitle,
              sellerCompanyName: lab.sellerCompanyName,
            }}
            sampleRequestId={lab.id}
            onClose={() => setLab(null)}
            onSubmitted={() => setLab(null)}
          />
        )}
      </div>
    </main>
  );
}

export function SampleShippingDesk({
  role,
}: {
  role: "buyer" | "seller" | "admin";
}) {
  const content = <ShippingDeskContent role={role} />;
  return role === "buyer" ? (
    <BuyerLayout>{content}</BuyerLayout>
  ) : role === "seller" ? (
    <SellerLayout title="Sample dispatch">{content}</SellerLayout>
  ) : (
    content
  );
}
