"use client";
import { useCallback, useEffect, useState } from "react";
type Partner = {
  id: number;
  name: string;
  orderCount: number;
  approved: boolean;
  updatedAt: string | null;
};
async function api(init?: RequestInit) {
  const response = await fetch("/api/backend/api/company-partners", {
    ...init,
    cache: "no-store",
    headers: { "content-type": "application/json" },
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || "Could not load trading partners.");
  return body as { partners: Partner[] };
}
export function SavedPartnerNetwork() {
  const [partners, setPartners] = useState<Partner[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [filter, setFilter] = useState("all");
  const load = useCallback(async () => {
    setBusy(true);
    try {
      setPartners((await api()).partners);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load partners.");
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function approve(partner: Partner) {
    setBusy(true);
    setError("");
    try {
      await api({
        method: "PUT",
        body: JSON.stringify({
          partnerCompanyId: partner.id,
          approved: !partner.approved,
        }),
      });
      setNotice(
        `Relationship with ${partner.name} ${partner.approved ? "returned to review" : "approved"} and saved.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save approval.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-bold">Partner network</h1>
      <p className="text-neutral-600">
        Companies you have traded with on EcoGlobe. Relationship approvals
        belong to your company and do not change a partner’s platform
        verification.
      </p>
      <div className="flex gap-3">
        <label>
          Status{" "}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border bg-white p-2"
          >
            <option value="all">All partners</option>
            <option value="approved">Approved relationships</option>
            <option value="pending">Pending review</option>
          </select>
        </label>
        <button
          disabled={busy}
          onClick={() => void load()}
          className="rounded-full border px-5 py-2"
        >
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4">
          {notice}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {partners
          .filter(
            (p) => filter === "all" || p.approved === (filter === "approved"),
          )
          .map((p) => (
            <article
              key={p.id}
              className="space-y-3 rounded-2xl border bg-white p-6"
            >
              <h2 className="text-xl font-bold">{p.name}</h2>
              <p>{p.orderCount} saved orders</p>
              <p>
                {p.approved
                  ? "Approved relationship"
                  : "Pending relationship review"}
              </p>
              {p.updatedAt && (
                <p className="text-sm text-neutral-500">
                  Updated {new Date(p.updatedAt).toLocaleString()}
                </p>
              )}
              <button
                disabled={busy}
                onClick={() => void approve(p)}
                className="rounded-full bg-black px-5 py-2 text-white disabled:opacity-50"
              >
                {p.approved ? "Return to review" : "Approve relationship"}
              </button>
            </article>
          ))}
      </div>
      {!busy && !partners.length && (
        <p>
          No trading partners yet. Counterparties appear when an order is
          recorded.
        </p>
      )}
    </section>
  );
}
