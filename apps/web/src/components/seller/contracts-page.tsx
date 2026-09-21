"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";
import { readDemoUser } from "@/lib/demo-user";
import { fetchOrders, type ApiOrder } from "@/lib/api-orders";
import {
  fetchContractDrafts,
  saveContractDraft,
} from "@/lib/api-contract-drafts";
import type { BackendContract } from "@/lib/docusign-client";

export function SellerContractsPage() {
  const [contracts, setContracts] = useState<BackendContract[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [title, setTitle] = useState("");
  const [terms, setTerms] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([fetchContractDrafts(), fetchOrders()])
      .then(([saved, allOrders]) => {
        if (!active) return;
        const companyId = readDemoUser()?.activeCompanyId;
        setContracts(
          saved.filter((item) => item.sellerCompanyId === companyId),
        );
        setOrders(
          allOrders.filter((item) => item.sellerCompanyId === companyId),
        );
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load agreements.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  const selected =
    contracts.find((item) => item.id === selectedId) ?? contracts[0];
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const order = orders.find((item) => item.id === Number(orderId));
    if (!order || !title.trim() || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await saveContractDraft({
        buyerCompanyId: order.buyerCompanyId,
        sellerCompanyId: order.sellerCompanyId,
        ...(order.listingId ? { listingId: order.listingId } : {}),
        title: title.trim(),
        ...(terms.trim() ? { renewalTerms: terms.trim() } : {}),
      });
      setSelectedId(saved.id);
      setCreating(false);
      setTitle("");
      setTerms("");
      setOrderId("");
      setNotice(
        `Agreement CT-${saved.id} saved as a draft. No signature request has been sent.`,
      );
      setRevision((n) => n + 1);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save the draft.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <SellerLayout title="Contracts">
      <div className="space-y-6 bg-neutral-50 p-6 lg:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
              Seller contracts
            </p>
            <h1 className="text-3xl font-bold">Service agreements</h1>
            <p className="mt-2 text-neutral-500">
              Saved agreements for your company.
            </p>
          </div>
          <Button
            disabled={loading}
            onClick={() => {
              setCreating(true);
              setNotice("");
            }}
          >
            Start new agreement
          </Button>
        </header>
        {error && (
          <div role="alert" className="rounded-xl bg-amber-50 p-4">
            {error}{" "}
            <button
              className="underline"
              onClick={() => setRevision((n) => n + 1)}
            >
              Retry loading
            </button>
          </div>
        )}
        {notice && (
          <p role="status" className="rounded-xl bg-emerald-50 p-4">
            {notice}
          </p>
        )}
        {creating && (
          <section className="rounded-2xl border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">New agreement draft</h2>
            <p className="mb-4 text-sm text-neutral-500">
              Choose an existing order to use its saved buyer, seller, and
              material. Saving creates a draft only.
            </p>
            {orders.length === 0 ? (
              <p>
                No eligible orders are available.{" "}
                <Link className="underline" href="/seller/sales">
                  View sales
                </Link>
              </p>
            ) : (
              <form
                onSubmit={(event) => void save(event)}
                className="space-y-4"
              >
                <label className="block">
                  Order
                  <select
                    required
                    value={orderId}
                    onChange={(event) => setOrderId(event.target.value)}
                    className="mt-1 block w-full rounded-lg border p-3"
                  >
                    <option value="">Choose an order</option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        EG-{order.id} · {order.buyerCompanyName} ·{" "}
                        {order.listingTitle ?? "Custom order"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  Agreement title
                  <input
                    required
                    maxLength={220}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-1 block w-full rounded-lg border p-3"
                  />
                </label>
                <label className="block">
                  Renewal terms (optional)
                  <textarea
                    maxLength={1000}
                    value={terms}
                    onChange={(event) => setTerms(event.target.value)}
                    className="mt-1 block w-full rounded-lg border p-3"
                  />
                </label>
                <Button
                  type="submit"
                  disabled={saving || !orderId || !title.trim()}
                >
                  {saving ? "Saving…" : "Save draft"}
                </Button>
              </form>
            )}
            <button
              type="button"
              disabled={saving}
              className="mt-4 underline"
              onClick={() => setCreating(false)}
            >
              Cancel
            </button>
          </section>
        )}
        {loading ? (
          <p role="status">Loading agreements…</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-neutral-200 bg-white p-6">
              <h2 className="mb-4 text-xl font-bold">
                Agreements ({contracts.length})
              </h2>
              {contracts.length ? (
                contracts.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`mb-2 block w-full rounded-lg border p-4 text-left ${selected?.id === item.id ? "border-neutral-900" : "border-neutral-200"}`}
                  >
                    <span className="block font-semibold">
                      CT-{item.id} · {item.title}
                    </span>
                    <span className="text-sm text-neutral-500">
                      {item.buyerCompanyName} ·{" "}
                      {item.contractStatusCode.replaceAll("_", " ")}
                    </span>
                  </button>
                ))
              ) : (
                <p>No saved agreements yet.</p>
              )}
            </section>
            {selected && (
              <section className="rounded-2xl border border-neutral-200 bg-white p-6">
                <h2 className="text-xl font-bold">{selected.title}</h2>
                <dl className="mt-4 space-y-3">
                  <div>
                    <dt className="text-neutral-500">Reference</dt>
                    <dd>CT-{selected.id}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Buyer</dt>
                    <dd>{selected.buyerCompanyName}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Seller</dt>
                    <dd>{selected.sellerCompanyName}</dd>
                  </div>
                  {selected.renewalTerms && (
                    <div>
                      <dt className="text-neutral-500">Renewal terms</dt>
                      <dd>{selected.renewalTerms}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-neutral-500">Status</dt>
                    <dd>{selected.contractStatusCode.replaceAll("_", " ")}</dd>
                  </div>
                </dl>
                <Link
                  className="mt-5 inline-block underline"
                  href="/seller/e-signatures"
                >
                  Open signature workspace
                </Link>
              </section>
            )}
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
