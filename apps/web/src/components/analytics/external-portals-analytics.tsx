"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bus,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Download,
  HeartHandshake,
  Leaf,
  PackageCheck,
  School,
  Store,
  Truck,
  Users,
} from "lucide-react";

type Role = "buyer" | "seller" | "admin";
type PortalKey = "buyer" | "school" | "pantry" | "operator" | "transport";
type RangeKey = "30 days" | "90 days" | "12 months";
type MetricKey = "throughput" | "value" | "impact" | "service";

interface MetricDefinition {
  label: string;
  helper: string;
  unit: string;
  decimals?: number;
  change: number;
  series: number[];
}

interface LocationRecord {
  name: string;
  region: string;
  focus: string;
  volume: string;
  service: string;
  status: "Healthy" | "Watch" | "Action needed";
}

interface PortalDashboard {
  label: string;
  shortLabel: string;
  description: string;
  audience: string;
  metrics: Record<MetricKey, MetricDefinition>;
  mix: Array<{ label: string; value: number; detail: string }>;
  funnel: Array<{ label: string; value: number; detail: string }>;
  locations: LocationRecord[];
  activity: Array<{ title: string; detail: string; time: string }>;
}

const rangeLabels: Record<RangeKey, string[]> = {
  "30 days": ["Jul 1", "Jul 6", "Jul 11", "Jul 16", "Jul 21", "Today"],
  "90 days": ["May 1", "May 18", "Jun 4", "Jun 21", "Jul 8", "Today"],
  "12 months": ["Aug", "Oct", "Dec", "Feb", "Apr", "Today"],
};

const rangeScale: Record<RangeKey, number> = {
  "30 days": 0.54,
  "90 days": 1,
  "12 months": 3.65,
};

const portalOrder: PortalKey[] = [
  "buyer",
  "school",
  "pantry",
  "operator",
  "transport",
];

const portalIcons = {
  buyer: Users,
  school: School,
  pantry: HeartHandshake,
  operator: Store,
  transport: Truck,
} satisfies Record<PortalKey, typeof Users>;

const metricIcons = {
  throughput: PackageCheck,
  value: CircleDollarSign,
  impact: Leaf,
  service: Activity,
} satisfies Record<MetricKey, typeof Users>;

const dashboards: Record<PortalKey, PortalDashboard> = {
  buyer: {
    label: "Buyer portal",
    shortLabel: "Buyer",
    description:
      "Purchasing visibility across verified materials, supplier performance, landed cost, and carbon impact.",
    audience: "Procurement and sustainability teams",
    metrics: {
      throughput: {
        label: "Completed orders",
        helper: "Across 18 active suppliers",
        unit: "orders",
        change: 12.4,
        series: [162, 181, 176, 214, 238, 284],
      },
      value: {
        label: "Spend managed",
        helper: "Escrow-backed trade value",
        unit: "$k",
        change: 8.7,
        series: [412, 438, 469, 521, 548, 612],
      },
      impact: {
        label: "CO2e avoided",
        helper: "Compared with default lanes",
        unit: "t",
        decimals: 1,
        change: 18.2,
        series: [8.2, 10.4, 11.8, 14.1, 16.7, 18.4],
      },
      service: {
        label: "Verified fulfillment",
        helper: "Orders meeting all controls",
        unit: "%",
        decimals: 1,
        change: 2.8,
        series: [91.2, 92.8, 92.1, 94.2, 95.1, 96.0],
      },
    },
    mix: [
      { label: "Industrial byproducts", value: 42, detail: "119 orders" },
      { label: "Biomass", value: 31, detail: "88 orders" },
      { label: "Recovered materials", value: 19, detail: "54 orders" },
      { label: "Other", value: 8, detail: "23 orders" },
    ],
    funnel: [
      { label: "Sourcing requests", value: 318, detail: "100%" },
      { label: "Verified matches", value: 296, detail: "93%" },
      { label: "Quotes accepted", value: 287, detail: "90%" },
      { label: "Orders completed", value: 284, detail: "89%" },
    ],
    locations: [
      {
        name: "Ashford Houston",
        region: "Houston, TX",
        focus: "Recovered feedstocks",
        volume: "92 orders",
        service: "97.8%",
        status: "Healthy",
      },
      {
        name: "Allen Parkway",
        region: "Houston, TX",
        focus: "Industrial byproducts",
        volume: "74 orders",
        service: "95.2%",
        status: "Healthy",
      },
      {
        name: "Baton Rouge Receiving",
        region: "Baton Rouge, LA",
        focus: "Biomass",
        volume: "63 orders",
        service: "91.4%",
        status: "Watch",
      },
    ],
    activity: [
      {
        title: "Supplier score improved",
        detail: "GreenLine moved to 97% on-time performance.",
        time: "18 min",
      },
      {
        title: "Carbon target exceeded",
        detail: "July lanes avoided 1.8 t more CO2e than forecast.",
        time: "2 hr",
      },
      {
        title: "New verified match",
        detail: "Black Gypsum is available within 180 miles.",
        time: "Today",
      },
    ],
  },
  school: {
    label: "School portal",
    shortLabel: "School",
    description:
      "Meal-program supply, delivery reliability, school participation, and community impact in one operating view.",
    audience: "District nutrition and facilities teams",
    metrics: {
      throughput: {
        label: "Meals supported",
        helper: "Across 24 participating schools",
        unit: "k",
        decimals: 1,
        change: 9.6,
        series: [31.2, 33.8, 36.1, 38.9, 40.7, 43.4],
      },
      value: {
        label: "Program savings",
        helper: "Avoided purchasing and disposal cost",
        unit: "$k",
        change: 14.1,
        series: [52, 58, 61, 70, 76, 84],
      },
      impact: {
        label: "Food rescued",
        helper: "Edible product redirected",
        unit: "t",
        decimals: 1,
        change: 21.5,
        series: [12.6, 14.8, 16.1, 18.7, 20.5, 23.2],
      },
      service: {
        label: "On-time delivery",
        helper: "Within receiving windows",
        unit: "%",
        decimals: 1,
        change: 3.2,
        series: [89.8, 91.1, 92.7, 93.6, 94.8, 96.3],
      },
    },
    mix: [
      { label: "Fresh produce", value: 36, detail: "15.6k meals" },
      { label: "Shelf stable", value: 29, detail: "12.6k meals" },
      { label: "Prepared meals", value: 24, detail: "10.4k meals" },
      { label: "Supplies", value: 11, detail: "4.8k kits" },
    ],
    funnel: [
      { label: "Schools enrolled", value: 27, detail: "100%" },
      { label: "Schools active", value: 24, detail: "89%" },
      { label: "Schedules confirmed", value: 23, detail: "85%" },
      { label: "On-time programs", value: 22, detail: "81%" },
    ],
    locations: [
      {
        name: "East Baton Rouge District",
        region: "Baton Rouge, LA",
        focus: "Prepared meals",
        volume: "14.2k meals",
        service: "98.1%",
        status: "Healthy",
      },
      {
        name: "Alief ISD",
        region: "Houston, TX",
        focus: "Fresh produce",
        volume: "11.8k meals",
        service: "96.7%",
        status: "Healthy",
      },
      {
        name: "Lake Charles Charter Network",
        region: "Lake Charles, LA",
        focus: "Shelf stable",
        volume: "7.6k meals",
        service: "89.2%",
        status: "Action needed",
      },
    ],
    activity: [
      {
        title: "Summer schedule confirmed",
        detail: "Eight sites accepted July delivery windows.",
        time: "34 min",
      },
      {
        title: "Cold-chain exception resolved",
        detail: "Replacement shipment arrived at Alief ISD.",
        time: "3 hr",
      },
      {
        title: "Participation milestone",
        detail: "The network passed 40,000 supported meals.",
        time: "Yesterday",
      },
    ],
  },
  pantry: {
    label: "Pantry portal",
    shortLabel: "Pantry",
    description:
      "Inventory coverage, household reach, donor reliability, and fulfillment pressure for community food partners.",
    audience: "Food bank and pantry coordinators",
    metrics: {
      throughput: {
        label: "Households served",
        helper: "Across 16 active pantries",
        unit: "k",
        decimals: 1,
        change: 16.8,
        series: [6.8, 7.4, 8.1, 8.6, 9.3, 10.1],
      },
      value: {
        label: "Inventory received",
        helper: "Estimated replacement value",
        unit: "$k",
        change: 11.3,
        series: [128, 136, 149, 158, 172, 188],
      },
      impact: {
        label: "Waste avoided",
        helper: "Product redirected from disposal",
        unit: "t",
        decimals: 1,
        change: 24.6,
        series: [18.1, 19.8, 23.4, 26.2, 29.7, 34.5],
      },
      service: {
        label: "Request fulfillment",
        helper: "Priority needs fully supplied",
        unit: "%",
        decimals: 1,
        change: 4.1,
        series: [82.4, 84.8, 85.2, 88.9, 90.1, 92.6],
      },
    },
    mix: [
      { label: "Produce", value: 34, detail: "11.7 t" },
      { label: "Protein", value: 27, detail: "9.3 t" },
      { label: "Shelf stable", value: 25, detail: "8.6 t" },
      { label: "Household supplies", value: 14, detail: "4.8 t" },
    ],
    funnel: [
      { label: "Requests submitted", value: 186, detail: "100%" },
      { label: "Inventory matched", value: 178, detail: "96%" },
      { label: "Pickups scheduled", value: 175, detail: "94%" },
      { label: "Requests fulfilled", value: 172, detail: "92%" },
    ],
    locations: [
      {
        name: "Greater Baton Rouge Food Bank",
        region: "Baton Rouge, LA",
        focus: "Regional distribution",
        volume: "3.8k households",
        service: "96.4%",
        status: "Healthy",
      },
      {
        name: "Second Harvest Lafayette",
        region: "Lafayette, LA",
        focus: "Produce and protein",
        volume: "2.9k households",
        service: "92.8%",
        status: "Healthy",
      },
      {
        name: "Northshore Community Pantry",
        region: "Covington, LA",
        focus: "Shelf stable",
        volume: "1.4k households",
        service: "86.2%",
        status: "Watch",
      },
    ],
    activity: [
      {
        title: "Urgent request matched",
        detail: "Two pallets of shelf-stable food were reserved.",
        time: "11 min",
      },
      {
        title: "Donor reliability updated",
        detail: "Bayou Foods completed its fifth on-time contribution.",
        time: "1 hr",
      },
      {
        title: "Coverage warning",
        detail: "Northshore protein inventory is below seven days.",
        time: "Today",
      },
    ],
  },
  operator: {
    label: "Market operator portal",
    shortLabel: "Market Operator",
    description:
      "Network-wide trading health, service levels, exceptions, and external portal adoption for operators.",
    audience: "Marketplace operations and program leadership",
    metrics: {
      throughput: {
        label: "Completed exchanges",
        helper: "Across every external portal",
        unit: "trades",
        change: 13.2,
        series: [418, 446, 481, 527, 568, 642],
      },
      value: {
        label: "Gross marketplace value",
        helper: "Escrow and sponsored programs",
        unit: "$k",
        change: 10.4,
        series: [892, 941, 1018, 1094, 1176, 1284],
      },
      impact: {
        label: "CO2e avoided",
        helper: "Marketplace-wide modeled impact",
        unit: "t",
        decimals: 1,
        change: 19.7,
        series: [34.2, 38.6, 42.1, 47.8, 52.6, 59.4],
      },
      service: {
        label: "Network service level",
        helper: "Completed without exception",
        unit: "%",
        decimals: 1,
        change: 2.1,
        series: [90.4, 91.2, 92.1, 93.8, 94.1, 95.6],
      },
    },
    mix: [
      { label: "Buyer", value: 44, detail: "284 exchanges" },
      { label: "School", value: 24, detail: "154 exchanges" },
      { label: "Pantry", value: 21, detail: "135 exchanges" },
      { label: "Direct operator", value: 11, detail: "69 exchanges" },
    ],
    funnel: [
      { label: "Portal requests", value: 714, detail: "100%" },
      { label: "Verified matches", value: 681, detail: "95%" },
      { label: "Scheduled exchanges", value: 659, detail: "92%" },
      { label: "Completed exchanges", value: 642, detail: "90%" },
    ],
    locations: [
      {
        name: "Gulf Coast Network",
        region: "TX / LA",
        focus: "Industrial and community",
        volume: "318 exchanges",
        service: "97.2%",
        status: "Healthy",
      },
      {
        name: "Lower Mississippi Network",
        region: "LA / MS",
        focus: "Food recovery",
        volume: "204 exchanges",
        service: "94.8%",
        status: "Healthy",
      },
      {
        name: "North Texas Network",
        region: "Dallas / Fort Worth",
        focus: "Recovered materials",
        volume: "120 exchanges",
        service: "88.9%",
        status: "Watch",
      },
    ],
    activity: [
      {
        title: "Exception rate improved",
        detail: "Network exceptions fell below 5% this week.",
        time: "23 min",
      },
      {
        title: "New school network active",
        detail: "Lake Charles Charter completed onboarding.",
        time: "2 hr",
      },
      {
        title: "Operator review due",
        detail: "Three partner certifications expire this month.",
        time: "Today",
      },
    ],
  },
  transport: {
    label: "Transport portal",
    shortLabel: "Transport",
    description:
      "Carrier capacity, route execution, delivery proof, emissions, and exception recovery across active lanes.",
    audience: "Dispatchers, carriers, and logistics coordinators",
    metrics: {
      throughput: {
        label: "Loads completed",
        helper: "Across 31 active lanes",
        unit: "loads",
        change: 15.1,
        series: [224, 236, 251, 274, 298, 326],
      },
      value: {
        label: "Freight managed",
        helper: "Booked carrier value",
        unit: "$k",
        change: 9.8,
        series: [286, 304, 321, 352, 376, 411],
      },
      impact: {
        label: "Route CO2e avoided",
        helper: "Versus default carrier routes",
        unit: "t",
        decimals: 1,
        change: 17.4,
        series: [11.2, 12.8, 14.1, 16.4, 18.8, 21.6],
      },
      service: {
        label: "On-time delivery",
        helper: "Proof submitted within SLA",
        unit: "%",
        decimals: 1,
        change: -1.2,
        series: [94.8, 95.1, 94.2, 93.9, 94.4, 93.6],
      },
    },
    mix: [
      { label: "Dry van", value: 37, detail: "121 loads" },
      { label: "Bulk", value: 29, detail: "95 loads" },
      { label: "Reefer", value: 21, detail: "68 loads" },
      { label: "Specialized", value: 13, detail: "42 loads" },
    ],
    funnel: [
      { label: "Loads requested", value: 354, detail: "100%" },
      { label: "Carrier accepted", value: 344, detail: "97%" },
      { label: "Picked up", value: 336, detail: "95%" },
      { label: "Delivered with POD", value: 326, detail: "92%" },
    ],
    locations: [
      {
        name: "GreenLine Logistics",
        region: "US Gulf",
        focus: "Bulk and dry van",
        volume: "138 loads",
        service: "97.4%",
        status: "Healthy",
      },
      {
        name: "EcoFreight",
        region: "Louisiana",
        focus: "Short-haul specialized",
        volume: "104 loads",
        service: "91.6%",
        status: "Watch",
      },
      {
        name: "RapidHaul",
        region: "Texas",
        focus: "Expedited freight",
        volume: "84 loads",
        service: "89.1%",
        status: "Action needed",
      },
    ],
    activity: [
      {
        title: "POD received",
        detail: "SHP-6208 delivery proof passed review.",
        time: "8 min",
      },
      {
        title: "Lane exception opened",
        detail: "Plaquemine yard access is blocking pickup.",
        time: "47 min",
      },
      {
        title: "Capacity added",
        detail: "GreenLine added two bulk slots for Friday.",
        time: "Today",
      },
    ],
  },
};

const mixColors = ["#059669", "#0f766e", "#f59e0b", "#94a3b8"];

function formatMetric(
  value: number,
  metric: MetricDefinition,
  range: RangeKey,
) {
  const scaled = metric.unit === "%" ? value : value * rangeScale[range];
  const formatted = scaled.toLocaleString("en-US", {
    minimumFractionDigits: metric.decimals ?? 0,
    maximumFractionDigits: metric.decimals ?? 0,
  });
  if (metric.unit === "$k") return `$${formatted}k`;
  if (metric.unit === "%") return `${formatted}%`;
  return `${formatted} ${metric.unit}`;
}

function buildDonut(mix: PortalDashboard["mix"]) {
  let cursor = 0;
  const stops = mix.map((item, index) => {
    const start = cursor;
    cursor += item.value;
    return `${mixColors[index]} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export function ExternalPortalsAnalytics({ role }: { role: Role }) {
  const initialPortal: PortalKey =
    role === "buyer" ? "buyer" : role === "seller" ? "operator" : "operator";
  const [portal, setPortal] = useState<PortalKey>(initialPortal);
  const [range, setRange] = useState<RangeKey>("90 days");
  const [metric, setMetric] = useState<MetricKey>("throughput");
  const [selectedPoint, setSelectedPoint] = useState(5);
  const [selectedMix, setSelectedMix] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState(0);
  const [exported, setExported] = useState(false);

  const dashboard = dashboards[portal];
  const activeMetric = dashboard.metrics[metric];
  const labels = rangeLabels[range];
  const maxValue = Math.max(...activeMetric.series) * 1.08;
  const selectedLocationRecord = dashboard.locations[selectedLocation];
  const selectedMixRecord = dashboard.mix[selectedMix];

  const donutBackground = useMemo(
    () => buildDonut(dashboard.mix),
    [dashboard.mix],
  );

  function changePortal(next: PortalKey) {
    setPortal(next);
    setMetric("throughput");
    setSelectedPoint(5);
    setSelectedMix(0);
    setSelectedLocation(0);
    setExported(false);
  }

  function changeRange(next: RangeKey) {
    setRange(next);
    setSelectedPoint(5);
    setExported(false);
  }

  function exportReport() {
    const headers = ["Portal", "Metric", "Period", ...labels];
    const rows = (Object.keys(dashboard.metrics) as MetricKey[]).map((key) => [
      dashboard.label,
      dashboard.metrics[key].label,
      range,
      ...dashboard.metrics[key].series.map((value) =>
        formatMetric(value, dashboard.metrics[key], range),
      ),
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${portal}-${range.replace(" ", "-")}-analytics.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExported(true);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              External portals
            </p>
            <h2 className="mt-1 text-xl font-bold text-neutral-950">
              Choose the network view
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">
              Move between each operating audience without leaving the analytics
              workspace.
            </p>
          </div>
          <div
            className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
            aria-label="External portal selector"
          >
            {portalOrder.map((key) => {
              const Icon = portalIcons[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={portal === key}
                  onClick={() => changePortal(key)}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    portal === key
                      ? "bg-neutral-950 text-white shadow-sm"
                      : "bg-neutral-50 text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-100"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {dashboards[key].shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-sm">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-emerald-300">
              {(() => {
                const PortalIcon = portalIcons[portal];
                return <PortalIcon className="size-5" aria-hidden="true" />;
              })()}
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                {dashboard.label}
              </span>
            </div>
            <h2 className="mt-3 max-w-3xl text-2xl font-bold sm:text-3xl">
              {dashboard.description}
            </h2>
            <p className="mt-3 text-sm text-neutral-300">
              Built for {dashboard.audience}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(rangeLabels) as RangeKey[]).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={range === item}
                onClick={() => changeRange(item)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  range === item
                    ? "bg-white text-neutral-950"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              onClick={exportReport}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-3 py-2 text-xs font-bold text-emerald-950 hover:bg-emerald-300"
            >
              <Download className="size-4" aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </div>
        {exported && (
          <div
            className="border-t border-white/10 bg-emerald-400/10 px-5 py-3 text-sm text-emerald-200"
            role="status"
          >
            {dashboard.label} report prepared for {range}.
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(dashboard.metrics) as MetricKey[]).map((key) => {
          const item = dashboard.metrics[key];
          const Icon = metricIcons[key];
          const isActive = metric === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              onClick={() => {
                setMetric(key);
                setSelectedPoint(5);
              }}
              className={`rounded-2xl p-5 text-left shadow-sm ring-1 transition ${
                isActive
                  ? "bg-emerald-50 ring-emerald-500"
                  : "bg-white ring-neutral-200 hover:-translate-y-0.5 hover:ring-neutral-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`rounded-xl p-2 ${isActive ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-600"}`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold ${item.change >= 0 ? "text-emerald-700" : "text-red-600"}`}
                >
                  {item.change >= 0 ? (
                    <ArrowUpRight className="size-3.5" />
                  ) : (
                    <ArrowDownRight className="size-3.5" />
                  )}
                  {Math.abs(item.change)}%
                </span>
              </div>
              <p className="mt-4 text-sm font-medium text-neutral-500">
                {item.label}
              </p>
              <p className="mt-1 text-3xl font-bold text-neutral-950">
                {formatMetric(item.series.at(-1) ?? 0, item, range)}
              </p>
              <p className="mt-1 text-xs text-neutral-500">{item.helper}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3
                  className="size-5 text-emerald-700"
                  aria-hidden="true"
                />
                <h2 className="text-lg font-bold text-neutral-950">
                  {activeMetric.label} trend
                </h2>
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                Select any bar to inspect that reporting point.
              </p>
            </div>
            <div className="rounded-xl bg-neutral-50 px-3 py-2 text-right">
              <p className="text-xs font-medium text-neutral-500">
                {labels[selectedPoint]}
              </p>
              <p className="text-lg font-bold text-neutral-950">
                {formatMetric(
                  activeMetric.series[selectedPoint],
                  activeMetric,
                  range,
                )}
              </p>
            </div>
          </div>

          <div
            className="mt-6 grid h-72 grid-cols-6 items-end gap-2 rounded-2xl bg-neutral-50 p-3 sm:gap-4 sm:p-5"
            role="img"
            aria-label={`${activeMetric.label} chart for ${range}`}
          >
            {activeMetric.series.map((value, index) => {
              const height = Math.max(12, (value / maxValue) * 100);
              const isActive = selectedPoint === index;
              return (
                <div
                  key={labels[index]}
                  className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
                >
                  <span
                    className={`hidden text-xs font-bold sm:block ${isActive ? "text-emerald-700" : "text-neutral-400"}`}
                  >
                    {formatMetric(value, activeMetric, range)}
                  </span>
                  <button
                    type="button"
                    aria-label={`${labels[index]}: ${formatMetric(value, activeMetric, range)}`}
                    aria-pressed={isActive}
                    onClick={() => setSelectedPoint(index)}
                    className={`w-full max-w-16 rounded-t-xl transition-all ${
                      isActive
                        ? "bg-emerald-600 ring-4 ring-emerald-100"
                        : "bg-emerald-200 hover:bg-emerald-400"
                    }`}
                    style={{ height: `${height}%` }}
                  />
                  <span
                    className={`truncate text-[10px] sm:text-xs ${isActive ? "font-bold text-neutral-900" : "text-neutral-400"}`}
                  >
                    {labels[index]}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-bold text-neutral-950">Activity mix</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Select a category to inspect its contribution.
          </p>
          <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row xl:flex-col">
            <div
              className="relative size-44 shrink-0 rounded-full"
              style={{ background: donutBackground }}
              role="img"
              aria-label={`${dashboard.label} activity mix chart`}
            >
              <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
                <span className="text-3xl font-bold text-neutral-950">
                  {selectedMixRecord.value}%
                </span>
                <span className="max-w-20 text-[11px] leading-tight text-neutral-500">
                  {selectedMixRecord.label}
                </span>
              </div>
            </div>
            <div className="w-full space-y-2">
              {dashboard.mix.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  aria-pressed={selectedMix === index}
                  onClick={() => setSelectedMix(index)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm ${
                    selectedMix === index
                      ? "bg-neutral-950 text-white"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: mixColors[index] }}
                    />
                    {item.label}
                  </span>
                  <span
                    className={
                      selectedMix === index
                        ? "text-neutral-300"
                        : "text-neutral-500"
                    }
                  >
                    {item.detail}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-neutral-950">
                Operating funnel
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Conversion from demand through completion.
              </p>
            </div>
            <Bus className="size-5 text-neutral-400" aria-hidden="true" />
          </div>
          <div className="mt-6 space-y-4">
            {dashboard.funnel.map((stage, index) => {
              const width = (stage.value / dashboard.funnel[0].value) * 100;
              return (
                <div key={stage.label}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-neutral-800">
                      {stage.label}
                    </span>
                    <span className="text-neutral-500">
                      {stage.value.toLocaleString()} · {stage.detail}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-neutral-100">
                    <div
                      className={`h-full rounded-full ${index === dashboard.funnel.length - 1 ? "bg-emerald-600" : "bg-emerald-200"}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-neutral-950">
                Live portal activity
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Recent events requiring awareness.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <span className="size-2 rounded-full bg-emerald-500" /> Live
            </span>
          </div>
          <div className="mt-5 divide-y divide-neutral-100">
            {dashboard.activity.map((item) => (
              <div
                key={item.title}
                className="flex gap-3 py-4 first:pt-0 last:pb-0"
              >
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-900">{item.title}</p>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {item.detail}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-neutral-400">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
        <div className="border-b border-neutral-100 p-5">
          <h2 className="text-lg font-bold text-neutral-950">
            Location and partner performance
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Compare the highest-volume participants and inspect service health.
          </p>
        </div>
        <div className="grid xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    Location / partner
                  </th>
                  <th className="px-5 py-3 font-semibold">Focus</th>
                  <th className="px-5 py-3 font-semibold">Volume</th>
                  <th className="px-5 py-3 font-semibold">Service</th>
                  <th className="px-5 py-3 font-semibold">Health</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">Open details</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {dashboard.locations.map((location, index) => (
                  <tr
                    key={location.name}
                    className={
                      selectedLocation === index
                        ? "bg-emerald-50/60"
                        : "hover:bg-neutral-50"
                    }
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-neutral-900">
                        {location.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {location.region}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-neutral-600">
                      {location.focus}
                    </td>
                    <td className="px-5 py-4 font-medium text-neutral-900">
                      {location.volume}
                    </td>
                    <td className="px-5 py-4 font-medium text-neutral-900">
                      {location.service}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={location.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        aria-label={`Review ${location.name}`}
                        onClick={() => setSelectedLocation(index)}
                        className="rounded-lg p-2 text-neutral-500 hover:bg-white hover:text-neutral-950 hover:shadow-sm"
                      >
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="border-t border-neutral-100 bg-neutral-950 p-5 text-white xl:border-l xl:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Selected participant
            </p>
            <h3 className="mt-2 text-xl font-bold">
              {selectedLocationRecord.name}
            </h3>
            <p className="mt-1 text-sm text-neutral-400">
              {selectedLocationRecord.region}
            </p>
            <div className="mt-6 space-y-3">
              <DetailRow
                label="Primary focus"
                value={selectedLocationRecord.focus}
              />
              <DetailRow
                label="Period volume"
                value={selectedLocationRecord.volume}
              />
              <DetailRow
                label="Service level"
                value={selectedLocationRecord.service}
              />
              <DetailRow
                label="Operating health"
                value={selectedLocationRecord.status}
              />
            </div>
            <p className="mt-6 rounded-xl bg-white/10 p-3 text-sm text-neutral-300">
              This participant contributes to the{" "}
              {dashboard.label.toLowerCase()} totals shown above.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: LocationRecord["status"] }) {
  const tone = {
    Healthy: "bg-emerald-100 text-emerald-700",
    Watch: "bg-amber-100 text-amber-800",
    "Action needed": "bg-red-100 text-red-700",
  }[status];
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}
    >
      {status}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3 text-sm">
      <span className="text-neutral-400">{label}</span>
      <span className="text-right font-semibold text-white">{value}</span>
    </div>
  );
}
