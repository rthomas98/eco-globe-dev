"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  sampleApi,
  sampleMoney,
  type SampleConfig,
  type SampleRate,
} from "@/lib/api-sample-shipping";
const control =
  "rounded-2xl border border-neutral-200 p-5 text-left transition-colors";
export function SampleShippingCheckout({ listingId }: { listingId: number }) {
  const router = useRouter();
  const [config, setConfig] = useState<SampleConfig | null>(null),
    [location, setLocation] = useState(""),
    [box, setBox] = useState("medium"),
    [quote, setQuote] = useState<{ id: string; rates: SampleRate[] } | null>(
      null,
    ),
    [rate, setRate] = useState(""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [referral, setReferral] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    setQuote(null);
    setRate("");
    sampleApi<SampleConfig>(
      `/config?listingId=${listingId}${location ? `&locationId=${location}` : ""}`,
    )
      .then((c) => {
        if (active) setConfig(c);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [listingId, location]);
  const selected = quote?.rates.find((r) => r.id === rate);
  const site =
    config?.locations.find((s) => String(s.id) === location) ??
    config?.locations[0];
  const act = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Request failed. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (!config)
    return (
      <p role={error ? "alert" : "status"} className="p-8">
        {error || "Loading sample shipping…"}
      </p>
    );
  return (
    <main className="mx-auto max-w-4xl bg-[#f5f6f6] p-5 md:p-8">
      <p className="mb-6 text-sm tracking-widest text-emerald-800 font-bold">
        SAMPLE CHECKOUT{" "}
        <span className="font-normal tracking-normal text-neutral-500">
          domestic US · standard material
        </span>
      </p>
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-10 space-y-7">
        <header>
          <h1 className="text-3xl font-bold">Request a sample</h1>
          <p className="mt-2 text-neutral-500">{config.listing.title}</p>
        </header>
        {config.mode === "simulation" && (
          <p
            role="status"
            className="rounded-xl bg-amber-50 p-4 text-amber-900"
          >
            Local simulation — rates, payment, labels and refunds are test data.
            No money is charged and no postage is purchased.
          </p>
        )}
        <fieldset disabled={busy}>
          <legend className="mb-3 text-lg font-bold">Sample size</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {config.boxes.map((b) => (
              <button
                type="button"
                aria-pressed={box === b.code}
                className={`${control} ${box === b.code ? "bg-neutral-950 text-white" : "bg-white text-neutral-600"}`}
                key={b.code}
                onClick={() => {
                  setBox(b.code);
                  setQuote(null);
                  setRate("");
                }}
              >
                <strong className="block text-xl">{b.name}</strong>
                <span className="block">up to {b.maxWeightKg} kg</span>
                <span>
                  {b.lengthCm} × {b.widthCm} × {b.heightCm} cm
                </span>
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="sample-site" className="mb-3 block text-lg font-bold">
            Deliver to
          </label>
          <select
            id="sample-site"
            value={location || String(site?.id ?? "")}
            disabled={busy}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 p-4"
          >
            {config.locations.map((s) => (
              <option value={s.id} key={s.id}>
                {s.company} — {s.street1}, {s.city}, {s.state} {s.zip}
              </option>
            ))}
          </select>
          {site && (
            <p className="mt-3 text-sm text-neutral-500">
              {site.verified
                ? "Receiving site confirmed by EcoGlobe. Carrier deliverability is checked with rates."
                : "Receiving site awaiting EcoGlobe verification."}
            </p>
          )}
        </div>
        {!config.eligibility.eligible || config.mode === "unavailable" ? (
          <div className="rounded-xl bg-amber-50 p-5">
            <p>
              {!config.eligibility.eligible
                ? config.eligibility.reason
                : "Online shipping is not connected yet. EcoGlobe can help arrange your sample."}
            </p>
            {referral ? (
              <p role="status" className="mt-3 font-bold">
                Request #{referral} is with EcoGlobe. No payment was taken.
              </p>
            ) : (
              <button
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const r = await sampleApi<{ referral: { id: number } }>(
                      "/referrals",
                      { listingId, note: "Please help arrange a sample." },
                    );
                    setReferral(r.referral.id);
                  })
                }
                className="mt-4 rounded-full bg-neutral-950 px-6 py-3 font-semibold text-white"
              >
                Request help from EcoGlobe
              </button>
            )}
          </div>
        ) : (
          <>
            <section>
              <h2 className="mb-3 text-lg font-bold">Shipping</h2>
              {!quote ? (
                <button
                  disabled={busy || !site}
                  className="rounded-full bg-neutral-950 px-6 py-3 text-white"
                  onClick={() =>
                    void act(async () => {
                      const r = await sampleApi<{
                        quote: { id: string; rates: SampleRate[] };
                      }>("/quotes", {
                        listingId,
                        locationId: site?.id,
                        boxCode: box,
                      });
                      setQuote(r.quote);
                      setRate(r.quote.rates[0]?.id ?? "");
                    })
                  }
                >
                  {busy
                    ? "Getting rates…"
                    : config.mode === "simulation"
                      ? "Get simulated shipping rates"
                      : "Get shipping rates"}
                </button>
              ) : (
                <div className="space-y-3">
                  {quote.rates.map((r) => (
                    <button
                      key={r.id}
                      disabled={busy}
                      aria-pressed={rate === r.id}
                      onClick={() => setRate(r.id)}
                      className={`${control} flex w-full items-center justify-between ${r.id === rate ? "border-neutral-950" : "text-neutral-500"}`}
                    >
                      <span>
                        <strong className="block text-xl">
                          {r.carrier} {r.service}
                        </strong>
                        <span>
                          {r.deliveryDays
                            ? `Estimated ${r.deliveryDays} days · tracked`
                            : "Tracked shipping"}
                        </span>
                      </span>
                      <strong className="text-xl">
                        {sampleMoney(r.cents)}
                      </strong>
                    </button>
                  ))}
                </div>
              )}
            </section>
            {selected && (
              <>
                <div className="space-y-3 rounded-2xl bg-neutral-50 p-5">
                  <p className="flex justify-between">
                    Sample material{" "}
                    <strong className="text-emerald-800">Free</strong>
                  </p>
                  <p className="flex justify-between">
                    Shipping — {selected.carrier}{" "}
                    <span>{sampleMoney(selected.cents)}</span>
                  </p>
                  <p className="flex justify-between border-t pt-3 text-xl font-bold">
                    Total <span>{sampleMoney(selected.cents)}</span>
                  </p>
                </div>
                <p className="rounded-2xl bg-emerald-50 p-5 text-emerald-900">
                  Shipping is credited against your first qualifying order of
                  this material. If the seller has not dispatched within 10
                  business days, your shipping payment is refunded.
                </p>
                <label className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={consent}
                    disabled={busy}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    I agree to share my company name and receiving address with
                    the seller to fulfil this sample.
                  </span>
                </label>
                <button
                  disabled={busy || !consent}
                  className="w-full rounded-full bg-neutral-950 p-5 text-lg font-bold text-white disabled:opacity-40"
                  onClick={() =>
                    void act(async () => {
                      const r = await sampleApi<{
                        id: number;
                        url: string;
                        mode: string;
                      }>("/checkout", {
                        quoteId: quote!.id,
                        rateId: rate,
                        consent,
                      });
                      if (r.url) window.location.assign(r.url);
                      else router.push(`/buyer/samples?sample=${r.id}`);
                    })
                  }
                >
                  {busy
                    ? "Preparing checkout…"
                    : config.mode === "simulation"
                      ? `Create simulated sample — ${sampleMoney(selected.cents)}`
                      : `Pay ${sampleMoney(selected.cents)} and request sample`}
                </button>
              </>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
            {error}
          </p>
        )}
        <Link href="/buyer/samples" className="block text-center underline">
          View my sample requests
        </Link>
      </section>
    </main>
  );
}
