"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Check, Download, FileText } from "lucide-react";
import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { SellerLayout } from "@/components/seller/seller-layout";
import {
  getTracker,
  buyerStages,
  sellerStages,
  stageEvidence,
  type TrackerData,
  type TrackerListing,
} from "@/lib/api-tracker";
import { LabTestingDialog } from "@/components/lab-testing/lab-testing-dialog";
import { sampleApi } from "@/lib/api-sample-shipping";
const nice = (s: string) => s.replaceAll("_", " ");
const date = (s: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "America/Chicago",
  }).format(new Date(s));
const button =
  "inline-flex items-center justify-center rounded-full bg-neutral-950 px-6 py-3 text-sm font-bold text-white disabled:opacity-50";
export function MaterialTracker({ role }: { role: "buyer" | "seller" }) {
  const [data, setData] = useState<TrackerData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [open, setOpen] = useState<number | null>(null);
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const next = await getTracker(role);
      setData(next);
      setError("");
      setOpen((id) => id ?? next.listings[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tracker");
    } finally {
      setBusy(false);
    }
  }, [role]);
  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("tracker-refresh", refresh);
    return () => window.removeEventListener("tracker-refresh", refresh);
  }, [load]);
  async function action(id: number, name: string) {
    setBusy(true);
    try {
      await sampleApi(`/requests/${id}/${name}`, {});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
      setBusy(false);
    }
  }
  const Layout = role === "buyer" ? BuyerLayout : SellerLayout;
  return (
    <Layout {...(role === "seller" ? { title: "Tracker" } : {})}>
      <main className="min-h-screen bg-[#f5f6f6] p-5 md:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">
              {role} tracker
            </p>
            <h1 className="mt-2 text-3xl font-bold">Where everything stands</h1>
          </div>
          <p className="text-sm text-neutral-500">
            {data?.account.name} · {data?.listings.length ?? 0} materials{" "}
            <button
              className="ml-3 underline"
              onClick={() => void load()}
              disabled={busy}
            >
              Refresh
            </button>
          </p>
        </div>
        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-4">
            {error}
          </p>
        )}
        {!data && (
          <p>
            {busy
              ? "Loading your tracker…"
              : "Tracker unavailable. Use Refresh to retry."}
          </p>
        )}
        {data && (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-5 rounded-2xl border border-neutral-200 bg-white p-6 text-sm">
              <strong className="text-xs tracking-widest text-neutral-400">
                YOUR ACCOUNT
              </strong>
              <span>Company — {nice(data.account.verification)}</span>
              {role === "buyer" ? (
                <>
                  <span>
                    Receiving sites —{" "}
                    {data.sites.length
                      ? data.sites
                          .map((s) =>
                            [s.city, s.region].filter(Boolean).join(", "),
                          )
                          .join(" · ")
                      : "not recorded"}
                  </span>
                  <span>
                    Purchase authority —{" "}
                    {data.account.canExecute
                      ? data.account.approvalLimit != null
                        ? `up to ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(data.account.approvalLimit)}`
                        : "enabled; limit not recorded"
                      : "not enabled"}
                  </span>
                  <strong className="ml-auto text-neutral-500">
                    Free — buyers never pay a licence
                  </strong>
                </>
              ) : (
                <>
                  <span>
                    Licence — {data.account.licence ?? "not recorded"}
                  </span>
                  <span className="text-amber-800">
                    Payout status —{" "}
                    {nice(data.account.payout ?? "not recorded")}
                  </span>
                  <Link
                    href="/seller/verification"
                    className="ml-auto font-bold text-emerald-700"
                  >
                    Review account setup
                  </Link>
                </>
              )}
            </div>
            {!data.listings.length && (
              <div className="rounded-2xl border bg-white p-10">
                <h2 className="text-xl font-bold">No materials to track yet</h2>
                <p className="my-3 text-neutral-500">
                  {role === "buyer"
                    ? "Save a material or start a request to see its progress here."
                    : "Create a listing to follow its progress here."}
                </p>
                <Link
                  className={button}
                  href={role === "buyer" ? "/buyer/browse" : "/seller/listings"}
                >
                  {role === "buyer" ? "Browse materials" : "Manage listings"}
                </Link>
              </div>
            )}
            <div className="space-y-5">
              {data.listings.map((l) => (
                <MaterialCard
                  key={l.id}
                  role={role}
                  listing={l}
                  data={data}
                  expanded={open === l.id}
                  toggle={() => setOpen(open === l.id ? null : l.id)}
                  busy={busy}
                  action={action}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}
function MaterialCard({
  role,
  listing: l,
  data,
  expanded,
  toggle,
  busy,
  action,
}: {
  role: "buyer" | "seller";
  listing: TrackerListing;
  data: TrackerData;
  expanded: boolean;
  toggle: () => void;
  busy: boolean;
  action: (id: number, name: string) => Promise<void>;
}) {
  const [labOpen, setLabOpen] = useState(false);
  const [history, setHistory] = useState(false);
  const stages = role === "buyer" ? buyerStages : sellerStages;
  const evidence = stageEvidence(role, l, data);
  const records = {
    samples: data.samples.filter((r) => r.listingId === l.id),
    labs: data.labs.filter((r) => r.listingId === l.id),
    pilots: data.pilots.filter((r) => r.listingId === l.id),
    orders: data.orders.filter((r) => r.listingId === l.id),
  };
  const attention = records.samples.find((r) =>
    ["awaiting_dispatch", "payment_pending", "paid", "in_transit"].includes(
      r.status,
    ),
  );
  const current = attention
    ? stages.indexOf("Sample")
    : Math.max(0, evidence.lastIndexOf(true));
  const [selected, setSelected] = useState<string | null>(null),
    [allFiles, setAllFiles] = useState(false);
  const stage = selected ?? stages[current];
  const statusLabel = (index: number) => {
    const name = stages[index];
    if (!evidence[index]) return `${name} — No activity`;
    const source = name === "Sample" ? records.samples
      : name === "Testing" ? records.labs
      : name === "Pilot" ? records.pilots
      : ["Order", "Shipping", "In transit", "Delivered", "Paid"].includes(name ?? "") ? records.orders : [];
    const statuses = [...new Set(source.map((record) => nice(
      ["Shipping", "In transit", "Delivered"].includes(name ?? "")
        ? record.shippingStatus ?? record.status : record.status
    )))];
    return `${name} — ${statuses.join(", ") || "Recorded"}${index === current ? " (current stage)" : ""}`;
  };
  const files = [
    ...records.samples.map((s) => ({
      id: s.id,
      key: `summary-${s.id}`,
      listingId: l.id,
      name: `Sample request SR-${s.id}`,
      stage: "Sample",
      url: `/api/backend/api/tracker/samples/${s.id}/document`,
    })),
    ...data.files
      .filter((f) => f.listingId === l.id)
      .map((f) => ({
        ...f,
        key: `listing-${f.id}`,
        stage: role === "buyer" ? "Interested" : "Listed",
        url: `/api/backend/api/listing-documents/${f.id}/download`,
      })),
    ...data.reports
      .filter((f) => f.listingId === l.id)
      .map((f) => ({
        ...f,
        key: `report-${f.id}`,
        stage: "Testing",
        url: `/api/backend/api/lab/reports/${f.id}/file`,
      })),
    ...records.samples
      .filter(
        (s) =>
          (s.label ||
            (s.mode === "simulation" &&
              ["awaiting_dispatch", "in_transit", "delivered"].includes(
                s.status,
              ))) &&
          !["declined", "expired", "delivery_failed"].includes(s.status),
      )
      .map((s) => ({
        id: s.id,
        key: `label-${s.id}`,
        listingId: l.id,
        name: `${s.mode === "simulation" ? "Simulated" : "Prepaid"} shipping label SR-${s.id}`,
        stage: "Sample",
        url: `/api/backend/api/sample-shipping/requests/${s.id}/label`,
      })),
  ];
  const visibleFiles = allFiles
    ? files
    : files.filter((f) => f.stage === stage);
  const activeRecords =
    stage === "Sample"
      ? records.samples
      : stage === "Testing"
        ? records.labs
        : stage === "Pilot"
          ? records.pilots
          : ["Order", "Shipping", "In transit", "Delivered", "Paid"].includes(
                stage ?? "",
              )
            ? records.orders
            : [];
  const headline = attention
    ? `Sample — ${nice(attention.status)}`
    : records.orders[0]
      ? `Order — ${nice(records.orders[0].shippingStatus ?? records.orders[0].status)}`
      : records.pilots[0]
        ? `Pilot — ${nice(records.pilots[0].status)}`
        : records.labs[0]
          ? `Testing — ${nice(records.labs[0].status)}`
          : nice(l.status);
  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white ${expanded ? "border-neutral-800" : "border-neutral-200"}`}
    >
      <button
        className="flex w-full flex-wrap items-center justify-between gap-4 p-6 text-left"
        aria-expanded={expanded}
        onClick={toggle}
      >
        <div>
          <h2 className="text-xl font-bold">
            {l.title}{" "}
            <span className="ml-2 text-xs font-normal text-neutral-400">
              {role === "seller" ? `EG-${l.id}` : l.seller}
            </span>
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {l.city}, {l.region} ·{" "}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: l.currency,
            }).format(l.price)}
            /{l.unit}
          </p>
        </div>
        {!expanded && (
          <span
            className="hidden min-w-[180px] flex-1 items-center px-4 xl:flex"
          >
            {evidence.map((recorded, i) => (
              <span key={stages[i]} className="flex flex-1 items-center">
                <span className="group relative flex size-6 shrink-0 items-center justify-center" title={statusLabel(i)} aria-label={statusLabel(i)}>
                  <span className={`size-3 rounded-full border-2 ${i === current ? "border-emerald-700 bg-emerald-700" : recorded ? "border-neutral-950 bg-neutral-950" : "border-neutral-200 bg-white"}`} />
                  <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-20 hidden w-max max-w-64 -translate-x-1/2 rounded-md bg-neutral-950 px-3 py-2 text-xs font-medium text-white shadow-lg group-hover:block">{statusLabel(i)}</span>
                </span>
                {i < evidence.length - 1 && (
                  <span className="h-0.5 flex-1 bg-neutral-200" />
                )}
              </span>
            ))}
          </span>
        )}
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-emerald-800">
            {headline}
          </span>
          <span className="text-xs text-neutral-500">{files.length} files</span>
          <ChevronDown className={`size-4 ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>
      {expanded && (
        <>
          <div className="overflow-x-auto px-6 pb-6">
            <div className="flex min-w-[650px]">
              {stages.map((name, i) => (
                <button
                  key={name}
                  onClick={() => {
                    setSelected(name);
                    setAllFiles(false);
                  }}
                  aria-pressed={stage === name}
                  title={statusLabel(i)}
                  aria-label={statusLabel(i)}
                  className="group relative flex flex-1 flex-col items-center gap-2 py-3 text-xs"
                >
                  <span
                    className={`z-10 flex size-8 items-center justify-center rounded-full border-[3px] ${stage === name ? "border-emerald-200 bg-emerald-700 text-white" : evidence[i] ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 bg-white text-neutral-400"}`}
                  >
                    {evidence[i] ? <Check className="size-4" /> : ""}
                  </span>
                  {i < stages.length - 1 && (
                    <span className="absolute left-1/2 right-[-50%] top-7 h-0.5 bg-neutral-200" />
                  )}
                  <span role="tooltip" className="pointer-events-none absolute left-1/2 top-12 z-20 hidden w-max max-w-64 -translate-x-1/2 rounded-md bg-neutral-950 px-3 py-2 text-xs font-medium text-white shadow-lg group-hover:block group-focus-visible:block">{statusLabel(i)}</span>
                  <strong
                    className={
                      stage === name ? "text-emerald-700" : "text-neutral-600"
                    }
                  >
                    {name}
                  </strong>
                  <span className="text-[10px] text-neutral-400">
                    {evidence[i] ? "Recorded" : "No activity"}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-6 border-t border-neutral-200 bg-[#f5f6f6] p-6 lg:grid-cols-[1.2fr_1fr]">
            <section>
              <h3 className="mb-3 text-xl font-bold">{stage}</h3>
              {!activeRecords.length && (
                <p className="text-sm leading-6 text-neutral-500">
                  {stage === "Interest"
                    ? `${l.interestCount} saved interests. Buyer identities remain private.`
                    : stage === "Approved"
                      ? `Listing status: ${nice(l.status)}.`
                      : stage === "Listed"
                        ? `Listed ${date(l.createdAt)} · ${l.quantity} ${l.unit}.`
                        : stage === "Interested"
                          ? "This material is in your tracker. Optional samples, testing and pilots can be requested when needed."
                          : "No activity recorded at this step yet. Earlier optional steps are not assumed complete."}
                </p>
              )}
              <div className="space-y-4">
                {(history ? activeRecords : activeRecords.slice(0, 1)).map(
                  (r, i) => (
                    <div
                      key={`${r.id}-${i}`}
                      className="rounded-xl border border-neutral-200 bg-white p-4"
                    >
                      <p className="font-semibold">
                        {stage === "Sample"
                          ? "SR"
                          : stage === "Pilot"
                            ? "PR"
                            : stage === "Testing"
                              ? "LAB"
                              : "Order"}
                        -{r.id} · {nice(r.shippingStatus ?? r.status)}
                      </p>
                      {r.mode === "simulation" && (
                        <p className="mt-1 text-xs text-amber-700">
                          Local simulation — no real payment or postage
                        </p>
                      )}
                      {r.deadline && (
                        <p className="mt-2 text-sm">
                          Dispatch deadline: {date(r.deadline)} · end of day
                          Central Time
                        </p>
                      )}
                      {r.tracking && (
                        <p className="mt-2 break-all text-sm">
                          {r.carrier} {r.service} · {r.tracking}
                        </p>
                      )}
                      {r.callAt && (
                        <p className="mt-2 text-sm">
                          Call booked:{" "}
                          {new Date(r.callAt).toLocaleString("en-US", {
                            timeZone: "America/Chicago",
                          })}{" "}
                          Central
                        </p>
                      )}
                      {r.refund && r.refund !== "none" && (
                        <p className="mt-2 text-sm">Refund: {nice(r.refund)}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {stage === "Sample" &&
                          role === "seller" &&
                          r.status === "awaiting_dispatch" && (
                            <>
                              <button
                                disabled={busy}
                                onClick={() => void action(r.id, "dispatch")}
                                className={button}
                              >
                                Mark as dispatched
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => void action(r.id, "decline")}
                                className="rounded-full border px-5 py-3 text-sm font-bold"
                              >
                                Can&apos;t fulfil
                              </button>
                            </>
                          )}
                        <Link
                          className="text-sm font-semibold underline"
                          href={
                            stage === "Sample"
                              ? `/${role}/samples?sample=${r.id}`
                              : stage === "Pilot"
                                ? role === "buyer"
                                  ? `/buyer/pilots/${r.id}`
                                  : "/seller/pilots"
                                : stage === "Testing"
                                  ? role === "buyer"
                                    ? `/buyer/browse/${l.id}`
                                    : "/seller/listings"
                                  : role === "buyer"
                                    ? `/buyer/orders/${r.id}`
                                    : "/seller/sales"
                          }
                        >
                          View{" "}
                          {stage === "Sample"
                            ? "sample tracking"
                            : stage === "Pilot"
                              ? "pilot"
                              : stage === "Testing"
                                ? "testing details"
                                : "order"}
                        </Link>
                      </div>
                    </div>
                  ),
                )}
              </div>
              {activeRecords.length > 1 && (
                <button
                  className="mt-3 text-sm font-semibold underline"
                  onClick={() => setHistory((v) => !v)}
                >
                  {history
                    ? "Hide earlier activity"
                    : `Show all ${activeRecords.length} records at this step`}
                </button>
              )}
              {role === "buyer" && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button className={button} onClick={() => setLabOpen(true)}>
                    Request lab testing
                  </button>
                  <Link
                    className="rounded-full border px-5 py-3 text-sm font-bold"
                    href={`/buyer/browse/${l.id}`}
                  >
                    View material
                  </Link>
                  <Link
                    className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold"
                    href={`/buyer/pilots/new?listing=${l.id}`}
                  >
                    Request a pilot
                  </Link>
                </div>
              )}
            </section>
            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="mb-4 flex justify-between gap-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                  Documents at this step
                </h3>
                <button
                  className="text-sm font-bold text-emerald-700"
                  onClick={() => setAllFiles((v) => !v)}
                >
                  {allFiles ? "Step files" : `All files (${files.length})`}
                </button>
              </div>
              <div className="space-y-2">
                {visibleFiles.map((f) => (
                  <a
                    key={f.key}
                    href={f.url}
                    className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4"
                  >
                    <FileText className="size-5 shrink-0 text-neutral-400" />
                    <span className="min-w-0 flex-1 break-words text-sm font-bold">
                      {f.name}
                    </span>
                    <Download className="size-4 shrink-0" />
                  </a>
                ))}
              </div>
              {!visibleFiles.length && (
                <p className="text-sm text-neutral-500">
                  No accessible documents at this step.
                </p>
              )}
              <p className="mt-5 border-t pt-4 text-xs leading-5 text-neutral-400">
                Only available files are shown. Lab reports and shipping
                documents appear when recorded and shared with your company.
              </p>
            </section>
          </div>
        </>
      )}
      {labOpen && (
        <LabTestingDialog
          listing={{
            id: l.id,
            title: l.title,
            sellerCompanyName: l.seller,
            location: `${l.city}, ${l.region}`,
          }}
          onClose={() => setLabOpen(false)}
          onSubmitted={() => {
            setLabOpen(false);
            window.dispatchEvent(new Event("tracker-refresh"));
          }}
        />
      )}
    </article>
  );
}
