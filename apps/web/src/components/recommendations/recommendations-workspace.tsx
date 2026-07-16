"use client";

import { useMemo, useState } from "react";
import {
  AlarmClock,
  ArrowRight,
  BadgeDollarSign,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileCheck2,
  Leaf,
  Lightbulb,
  PackageSearch,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  ThumbsDown,
  TrendingUp,
  X,
} from "lucide-react";

type Role = "buyer" | "seller" | "admin";
type Category =
  | "All"
  | "Product match"
  | "Operations"
  | "Risk"
  | "Sustainability";
type Priority = "High" | "Medium" | "Low";
type Decision = "accepted" | "snoozed" | "dismissed";
type SortKey = "impact" | "confidence" | "urgency";

interface Recommendation {
  id: string;
  title: string;
  summary: string;
  category: Exclude<Category, "All">;
  priority: Priority;
  confidence: number;
  impactScore: number;
  roles: Array<Role | "all">;
  owner: string;
  due: string;
  primaryImpact: string;
  savings: string;
  carbon: string;
  time: string;
  why: string[];
  evidence: string[];
  steps: string[];
  source: string;
}

const recommendations: Recommendation[] = [
  {
    id: "REC-2101",
    title: "Prioritize Black Gypsum near Baton Rouge",
    summary:
      "Shift the next purchase to the closest verified supply with an active low-emission lane.",
    category: "Product match",
    priority: "High",
    confidence: 92,
    impactScore: 96,
    roles: ["buyer"],
    owner: "Joanna Bell",
    due: "Today",
    primaryImpact: "12% lower landed cost",
    savings: "$14,800",
    carbon: "1.1 t CO2e",
    time: "2 days faster",
    why: [
      "The supplier has current COA and SDS evidence.",
      "Available volume covers 118% of the open requirement.",
      "The Baton Rouge lane has a 96% on-time history.",
    ],
    evidence: [
      "3 verified supplier records",
      "11 comparable completed trades",
      "Current GreenLine capacity",
    ],
    steps: [
      "Review the matched lot",
      "Confirm receiving specification",
      "Request final carrier quote",
    ],
    source: "Marketplace, verification, and logistics signals",
  },
  {
    id: "REC-2104",
    title: "Use the balanced Houston–Baton Rouge route",
    summary:
      "Select the carrier option that preserves the carbon target while avoiding the premium low-CO2 rate.",
    category: "Sustainability",
    priority: "High",
    confidence: 88,
    impactScore: 89,
    roles: ["all"],
    owner: "Logistics team",
    due: "Before booking",
    primaryImpact: "$320 saved per load",
    savings: "$3,840 / quarter",
    carbon: "190 kg CO2e",
    time: "Same-day booking",
    why: [
      "The balanced quote is within 4% of the lowest-cost carrier.",
      "Modeled emissions remain 19% below the default route.",
      "GreenLine has capacity on the requested pickup date.",
    ],
    evidence: [
      "3 live carrier quotes",
      "Route carbon model",
      "90-day lane performance",
    ],
    steps: [
      "Open the carrier comparison",
      "Confirm pickup window",
      "Book the balanced quote",
    ],
    source: "Carrier quotes and Mapbox route intelligence",
  },
  {
    id: "REC-2110",
    title: "Consolidate the next three polymer orders",
    summary:
      "Combine compatible loads into one procurement window to improve rate leverage and reduce partial-load emissions.",
    category: "Operations",
    priority: "Medium",
    confidence: 84,
    impactScore: 82,
    roles: ["buyer"],
    owner: "Procurement",
    due: "Jul 22",
    primaryImpact: "9% lower freight cost",
    savings: "$6,200",
    carbon: "680 kg CO2e",
    time: "4 hours saved",
    why: [
      "Three open orders share a compatible delivery region.",
      "Requested delivery windows overlap by four business days.",
      "A bulk carrier can cover the combined quantity.",
    ],
    evidence: [
      "3 open purchase orders",
      "Receiving-window overlap",
      "Bulk capacity forecast",
    ],
    steps: [
      "Confirm material compatibility",
      "Align delivery windows",
      "Issue consolidated RFQ",
    ],
    source: "Order pipeline and carrier capacity",
  },
  {
    id: "REC-2112",
    title: "Renew buyer verification before the next escrow release",
    summary:
      "Complete the expiring financial review to prevent a hold on the next high-value order.",
    category: "Risk",
    priority: "High",
    confidence: 97,
    impactScore: 94,
    roles: ["buyer"],
    owner: "Finance team",
    due: "In 3 days",
    primaryImpact: "Protect $86k in orders",
    savings: "$0 direct",
    carbon: "No change",
    time: "Avoid 2–3 day hold",
    why: [
      "Financial verification expires before the next release date.",
      "Two orders depend on the current escrow approval.",
      "All required documents except the bank letter are present.",
    ],
    evidence: [
      "Verification expiration",
      "2 dependent orders",
      "Document readiness check",
    ],
    steps: [
      "Upload the current bank letter",
      "Confirm authorized signer",
      "Submit for expedited review",
    ],
    source: "Verification and escrow readiness",
  },
  {
    id: "REC-2102",
    title: "Bundle SDS renewal with the listing refresh",
    summary:
      "Update the safety document and commercial details together to recover buyer confidence on the off-spec listing.",
    category: "Risk",
    priority: "High",
    confidence: 87,
    impactScore: 90,
    roles: ["seller"],
    owner: "Listing manager",
    due: "This week",
    primaryImpact: "Restore listing readiness",
    savings: "$8,400 opportunity",
    carbon: "No change",
    time: "1 review cycle saved",
    why: [
      "The SDS expires before the current listing window closes.",
      "Four buyers viewed the listing but did not request terms.",
      "The listing copy still references the previous batch limits.",
    ],
    evidence: [
      "Expiring SDS",
      "Buyer engagement history",
      "Batch specification comparison",
    ],
    steps: [
      "Upload renewed SDS",
      "Refresh batch specifications",
      "Republish to matched buyers",
    ],
    source: "Listing engagement and document readiness",
  },
  {
    id: "REC-2114",
    title: "Raise the Corn Stover floor price by 4%",
    summary:
      "Current demand and verified low-carbon evidence support a modest price adjustment without reducing conversion.",
    category: "Product match",
    priority: "Medium",
    confidence: 79,
    impactScore: 76,
    roles: ["seller"],
    owner: "Commercial team",
    due: "Next listing cycle",
    primaryImpact: "$5,600 margin upside",
    savings: "+4% unit margin",
    carbon: "Evidence retained",
    time: "No added lead time",
    why: [
      "Comparable verified lots cleared above the current floor.",
      "Buyer searches for low-CO2 biomass increased this month.",
      "The listing has sufficient inquiry volume to test pricing.",
    ],
    evidence: [
      "8 comparable trades",
      "Search demand trend",
      "Listing inquiry volume",
    ],
    steps: [
      "Review comparable pricing",
      "Approve the new floor",
      "Monitor conversion for 14 days",
    ],
    source: "Marketplace pricing and search demand",
  },
  {
    id: "REC-2103",
    title: "Resolve the Plaquemine yard-access exception",
    summary:
      "Escalate the recurring access issue before it affects two additional short-haul deliveries.",
    category: "Operations",
    priority: "High",
    confidence: 91,
    impactScore: 93,
    roles: ["admin"],
    owner: "Network operations",
    due: "Today",
    primaryImpact: "Recover 2 at-risk loads",
    savings: "$2,100 exposure",
    carbon: "140 kg CO2e",
    time: "6 hours recovered",
    why: [
      "The same gate restriction caused two recent delays.",
      "A replacement entry window is available this afternoon.",
      "The carrier and facility contacts are already linked.",
    ],
    evidence: [
      "2 access exceptions",
      "Facility availability",
      "Carrier dispatch notes",
    ],
    steps: [
      "Contact facility coordinator",
      "Confirm alternate gate",
      "Release updated driver instructions",
    ],
    source: "Delivery exceptions and facility access records",
  },
  {
    id: "REC-2116",
    title: "Review partner certifications expiring this month",
    summary:
      "Prioritize three renewals that support 28 active marketplace trades.",
    category: "Risk",
    priority: "Medium",
    confidence: 95,
    impactScore: 86,
    roles: ["admin"],
    owner: "Compliance team",
    due: "Jul 25",
    primaryImpact: "Protect 28 active trades",
    savings: "$142k trade value",
    carbon: "Impact reporting protected",
    time: "Avoid manual review",
    why: [
      "Three certificates expire within the next 14 days.",
      "The affected partners have active orders and contracts.",
      "Renewal reminders have not yet been acknowledged.",
    ],
    evidence: [
      "3 expiring certificates",
      "28 linked trades",
      "Reminder delivery log",
    ],
    steps: [
      "Open renewal queue",
      "Assign compliance owners",
      "Escalate unacknowledged requests",
    ],
    source: "Partner verification and trade dependencies",
  },
];

const categories: Category[] = [
  "All",
  "Product match",
  "Operations",
  "Risk",
  "Sustainability",
];

const categoryIcons = {
  "Product match": PackageSearch,
  Operations: Route,
  Risk: ShieldAlert,
  Sustainability: Leaf,
} satisfies Record<Exclude<Category, "All">, typeof PackageSearch>;

const priorityRank: Record<Priority, number> = { High: 3, Medium: 2, Low: 1 };

export function RecommendationsWorkspace({ role }: { role: Role }) {
  const roleRecommendations = useMemo(
    () =>
      recommendations.filter(
        (item) => item.roles.includes("all") || item.roles.includes(role),
      ),
    [role],
  );
  const [category, setCategory] = useState<Category>("All");
  const [priority, setPriority] = useState<Priority | "All">("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("impact");
  const [selectedId, setSelectedId] = useState(
    roleRecommendations[0]?.id ?? "",
  );
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [completedSteps, setCompletedSteps] = useState<
    Record<string, number[]>
  >({});
  const [notice, setNotice] = useState("");
  const [refreshed, setRefreshed] = useState(false);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return roleRecommendations
      .filter((item) => decisions[item.id] !== "dismissed")
      .filter((item) => category === "All" || item.category === category)
      .filter((item) => priority === "All" || item.priority === priority)
      .filter(
        (item) =>
          !normalized ||
          `${item.title} ${item.summary} ${item.category}`
            .toLowerCase()
            .includes(normalized),
      )
      .sort((a, b) => {
        if (sort === "confidence") return b.confidence - a.confidence;
        if (sort === "urgency")
          return (
            priorityRank[b.priority] - priorityRank[a.priority] ||
            b.impactScore - a.impactScore
          );
        return b.impactScore - a.impactScore;
      });
  }, [category, decisions, priority, query, roleRecommendations, sort]);

  const selected =
    roleRecommendations.find((item) => item.id === selectedId) ??
    filtered[0] ??
    roleRecommendations[0];
  const acceptedCount = Object.values(decisions).filter(
    (decision) => decision === "accepted",
  ).length;
  const snoozedCount = Object.values(decisions).filter(
    (decision) => decision === "snoozed",
  ).length;
  const visibleImpact = filtered.reduce(
    (sum, item) => sum + item.impactScore,
    0,
  );
  const averageConfidence = filtered.length
    ? Math.round(
        filtered.reduce((sum, item) => sum + item.confidence, 0) /
          filtered.length,
      )
    : 0;

  function applyDecision(id: string, decision: Decision) {
    setDecisions((current) => ({ ...current, [id]: decision }));
    const item = roleRecommendations.find(
      (recommendation) => recommendation.id === id,
    );
    const verb =
      decision === "accepted"
        ? "Action plan created"
        : decision === "snoozed"
          ? "Recommendation snoozed"
          : "Recommendation dismissed";
    setNotice(`${verb}${item ? ` for ${item.title}.` : "."}`);
    if (decision === "dismissed") {
      const next = filtered.find((recommendation) => recommendation.id !== id);
      if (next) setSelectedId(next.id);
    }
  }

  function undoDismissals() {
    setDecisions((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([, decision]) => decision !== "dismissed",
        ),
      ),
    );
    setNotice("Dismissed recommendations restored.");
  }

  function refreshRecommendations() {
    setRefreshed(true);
    setNotice(
      "Recommendations refreshed using the latest marketplace, logistics, and verification signals.",
    );
  }

  function toggleStep(id: string, stepIndex: number) {
    setCompletedSteps((current) => {
      const steps = current[id] ?? [];
      return {
        ...current,
        [id]: steps.includes(stepIndex)
          ? steps.filter((index) => index !== stepIndex)
          : [...steps, stepIndex],
      };
    });
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-sm">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-amber-300">
              <Sparkles className="size-5" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                Decision intelligence
              </span>
            </div>
            <h2 className="mt-3 max-w-3xl text-2xl font-bold sm:text-3xl">
              Turn marketplace signals into clear, explainable next steps.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-neutral-300">
              Recommendations combine product, logistics, verification, cost,
              and sustainability signals for the current portal.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshRecommendations}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-sm font-bold text-amber-950 hover:bg-amber-200"
          >
            <RefreshCw
              className={`size-4 ${refreshed ? "rotate-180" : ""} transition-transform`}
              aria-hidden="true"
            />
            Refresh recommendations
          </button>
        </div>
        {notice && (
          <div
            className="flex items-start justify-between gap-3 border-t border-white/10 bg-white/5 px-5 py-3 text-sm text-neutral-200"
            role="status"
          >
            <span>{notice}</span>
            <button
              type="button"
              aria-label="Dismiss notice"
              onClick={() => setNotice("")}
              className="rounded p-1 hover:bg-white/10"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Target}
          label="Open recommendations"
          value={String(filtered.length)}
          detail={`${acceptedCount} accepted this session`}
          tone="emerald"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Combined impact score"
          value={String(visibleImpact)}
          detail="Across the visible queue"
          tone="blue"
        />
        <SummaryCard
          icon={Sparkles}
          label="Average confidence"
          value={`${averageConfidence}%`}
          detail="Explainable signal strength"
          tone="amber"
        />
        <SummaryCard
          icon={AlarmClock}
          label="Snoozed items"
          value={String(snoozedCount)}
          detail="Still available for review"
          tone="violet"
        />
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(240px,1fr)_auto_auto] xl:items-end">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Search recommendations
            </span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products, risks, or actions"
                className="min-h-11 w-full rounded-xl border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Priority
            </span>
            <select
              aria-label="Filter by priority"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as Priority | "All")
              }
              className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 outline-none focus:border-emerald-500"
            >
              <option>All</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Sort by
            </span>
            <select
              aria-label="Sort recommendations"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 outline-none focus:border-emerald-500"
            >
              <option value="impact">Highest impact</option>
              <option value="confidence">Highest confidence</option>
              <option value="urgency">Most urgent</option>
            </select>
          </label>
        </div>
        <div
          className="mt-4 flex flex-wrap gap-2"
          aria-label="Recommendation categories"
        >
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                category === item
                  ? "bg-neutral-950 text-white"
                  : "bg-neutral-50 text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-100"
              }`}
            >
              {item}
            </button>
          ))}
          {Object.values(decisions).includes("dismissed") && (
            <button
              type="button"
              onClick={undoDismissals}
              className="ml-auto rounded-full px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
            >
              Restore dismissed
            </button>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
        <section className="rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 p-5">
            <div>
              <h2 className="text-lg font-bold text-neutral-950">
                Priority queue
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                {filtered.length} recommendations match the current view.
              </p>
            </div>
            <Lightbulb className="size-5 text-amber-500" aria-hidden="true" />
          </div>
          <div className="max-h-[780px] space-y-3 overflow-y-auto p-4">
            {filtered.map((item) => {
              const Icon = categoryIcons[item.category];
              const isSelected = selected?.id === item.id;
              const decision = decisions[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-2xl p-4 text-left ring-1 transition ${
                    isSelected
                      ? "bg-neutral-950 text-white ring-neutral-950"
                      : "bg-white text-neutral-950 ring-neutral-200 hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`rounded-xl p-2 ${isSelected ? "bg-white/10 text-amber-300" : "bg-amber-50 text-amber-700"}`}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      <PriorityBadge
                        priority={item.priority}
                        inverted={isSelected}
                      />
                      {decision && (
                        <DecisionBadge
                          decision={decision}
                          inverted={isSelected}
                        />
                      )}
                    </div>
                  </div>
                  <h3 className="mt-3 font-bold">{item.title}</h3>
                  <p
                    className={`mt-1 text-sm ${isSelected ? "text-neutral-300" : "text-neutral-500"}`}
                  >
                    {item.summary}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span
                      className={`text-xs font-semibold ${isSelected ? "text-emerald-300" : "text-emerald-700"}`}
                    >
                      {item.primaryImpact}
                    </span>
                    <span
                      className={`text-xs ${isSelected ? "text-neutral-400" : "text-neutral-500"}`}
                    >
                      {item.confidence}% confidence
                    </span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="rounded-2xl bg-neutral-50 p-8 text-center">
                <Search
                  className="mx-auto size-6 text-neutral-400"
                  aria-hidden="true"
                />
                <p className="mt-3 font-semibold text-neutral-900">
                  No recommendations match these filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCategory("All");
                    setPriority("All");
                    setQuery("");
                  }}
                  className="mt-3 text-sm font-bold text-emerald-700"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </section>

        {selected && (
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
            <div className="border-b border-neutral-100 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={selected.priority} />
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-600">
                      {selected.category}
                    </span>
                    <span className="font-mono text-xs text-neutral-400">
                      {selected.id}
                    </span>
                  </div>
                  <h2 className="mt-4 max-w-2xl text-2xl font-bold text-neutral-950">
                    {selected.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                    {selected.summary}
                  </p>
                </div>
                <div className="min-w-36 rounded-2xl bg-emerald-50 p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-800">
                    {selected.confidence}%
                  </p>
                  <p className="text-xs font-semibold text-emerald-700">
                    AI confidence
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <ImpactCard
                  label="Financial"
                  value={selected.savings}
                  icon={BadgeDollarSign}
                />
                <ImpactCard
                  label="Carbon"
                  value={selected.carbon}
                  icon={Leaf}
                />
                <ImpactCard label="Time" value={selected.time} icon={Clock3} />
              </div>
            </div>

            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
              <div>
                <h3 className="flex items-center gap-2 font-bold text-neutral-950">
                  <Sparkles className="size-4 text-amber-500" /> Why this is
                  recommended
                </h3>
                <div className="mt-3 space-y-2">
                  {selected.why.map((reason) => (
                    <div
                      key={reason}
                      className="flex gap-3 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700"
                    >
                      <CheckCircle2
                        className="mt-0.5 size-4 shrink-0 text-emerald-600"
                        aria-hidden="true"
                      />
                      {reason}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-bold text-neutral-950">
                  <FileCheck2 className="size-4 text-blue-600" /> Evidence used
                </h3>
                <div className="mt-3 space-y-2">
                  {selected.evidence.map((evidence) => (
                    <div
                      key={evidence}
                      className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3 text-sm"
                    >
                      <span className="text-neutral-700">{evidence}</span>
                      <Check
                        className="size-4 shrink-0 text-blue-600"
                        aria-hidden="true"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-100 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-neutral-950">
                    Recommended action plan
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Owner: {selected.owner} · Due {selected.due}
                  </p>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                  Source: {selected.source}
                </span>
              </div>
              <div className="mt-4 grid gap-2">
                {selected.steps.map((step, index) => {
                  const isComplete = (
                    completedSteps[selected.id] ?? []
                  ).includes(index);
                  return (
                    <button
                      key={step}
                      type="button"
                      aria-pressed={isComplete}
                      onClick={() => toggleStep(selected.id, index)}
                      className={`flex items-center gap-3 rounded-xl p-3 text-left text-sm ring-1 transition ${
                        isComplete
                          ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                          : "bg-white text-neutral-700 ring-neutral-200 hover:bg-neutral-50"
                      }`}
                    >
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isComplete ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-500"}`}
                      >
                        {isComplete ? (
                          <Check className="size-3.5" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span
                        className={isComplete ? "line-through opacity-70" : ""}
                      >
                        {step}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-2 border-t border-neutral-100 bg-neutral-50 p-4 sm:grid-cols-3 sm:p-5">
              <button
                type="button"
                onClick={() => applyDecision(selected.id, "accepted")}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-bold text-white hover:bg-neutral-800"
              >
                <ArrowRight className="size-4" aria-hidden="true" />
                {decisions[selected.id] === "accepted"
                  ? "Action plan created"
                  : "Create action plan"}
              </button>
              <button
                type="button"
                onClick={() => applyDecision(selected.id, "snoozed")}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-bold text-neutral-800 hover:bg-neutral-100"
              >
                <Clock3 className="size-4" aria-hidden="true" />
                Snooze
              </button>
              <button
                type="button"
                onClick={() => applyDecision(selected.id, "dismissed")}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
              >
                <ThumbsDown className="size-4" aria-hidden="true" />
                Dismiss
              </button>
            </div>
          </section>
        )}
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-950">
              Impact opportunity
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Select a bar to open the recommendation with the strongest modeled
              opportunity.
            </p>
          </div>
          <span className="text-xs font-semibold text-neutral-500">
            Impact score · 0–100
          </span>
        </div>
        <div
          className="mt-6 space-y-3"
          role="img"
          aria-label="Recommendation impact score chart"
        >
          {filtered.slice(0, 5).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className="grid w-full gap-2 text-left sm:grid-cols-[minmax(180px,0.45fr)_1fr_auto] sm:items-center sm:gap-4"
            >
              <span className="truncate text-sm font-semibold text-neutral-700">
                {item.title}
              </span>
              <span className="h-3 overflow-hidden rounded-full bg-neutral-100">
                <span
                  className={`block h-full rounded-full transition-all ${selected?.id === item.id ? "bg-emerald-600" : "bg-emerald-200"}`}
                  style={{ width: `${item.impactScore}%` }}
                />
              </span>
              <span className="text-sm font-bold text-neutral-900">
                {item.impactScore}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:grid-cols-[auto_1fr] sm:items-start">
        <CircleAlert className="size-5 text-amber-700" aria-hidden="true" />
        <div>
          <h2 className="font-bold text-amber-950">
            How recommendations are formed
          </h2>
          <p className="mt-1 text-sm text-amber-900/80">
            This interactive concept explains every recommendation with its
            supporting signals. Live recommendations can later be generated from
            marketplace activity, verification, routing, pricing, and user
            feedback while keeping a human approval step.
          </p>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  detail: string;
  tone: "emerald" | "blue" | "amber" | "violet";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
      <Icon
        className={`size-9 rounded-xl p-2 ${tones[tone]}`}
        aria-hidden="true"
      />
      <p className="mt-4 text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-neutral-950">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </section>
  );
}

function ImpactCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Leaf;
}) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <Icon className="size-4 text-emerald-700" aria-hidden="true" />
      <p className="mt-2 text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-neutral-950">{value}</p>
    </div>
  );
}

function PriorityBadge({
  priority,
  inverted = false,
}: {
  priority: Priority;
  inverted?: boolean;
}) {
  if (inverted)
    return (
      <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white">
        {priority}
      </span>
    );
  const tone = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-amber-100 text-amber-800",
    Low: "bg-blue-100 text-blue-700",
  }[priority];
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>
      {priority}
    </span>
  );
}

function DecisionBadge({
  decision,
  inverted = false,
}: {
  decision: Decision;
  inverted?: boolean;
}) {
  const label = {
    accepted: "Accepted",
    snoozed: "Snoozed",
    dismissed: "Dismissed",
  }[decision];
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${inverted ? "bg-white/10 text-white" : "bg-emerald-100 text-emerald-700"}`}
    >
      {label}
    </span>
  );
}
