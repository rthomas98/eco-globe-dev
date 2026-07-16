"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  FileCheck2,
  Filter,
  HandCoins,
  Landmark,
  Leaf,
  LockKeyhole,
  PackageSearch,
  RefreshCcw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  escrowRecords,
  formatEscrowMoney,
  getEscrowRecord,
  type EscrowLifecycleStatus,
} from "@/components/escrow/escrow-demo-data";

type ReportKind = "sales" | "products" | "escrow" | "carbon";
type Period = "30d" | "90d" | "12m";

interface ReportPoint {
  label: string;
  value: number;
  secondary: number;
}

interface ReportRow {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  value: number;
  secondary: string;
  status: string;
  href: string;
}

interface ReportDefinition {
  eyebrow: string;
  title: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  metricDetail: string;
  comparisonLabel: string;
  comparisonValue: string;
  comparisonDetail: string;
  impactLabel: string;
  impactValue: string;
  impactDetail: string;
  healthLabel: string;
  healthValue: string;
  healthDetail: string;
  chartTitle: string;
  chartDescription: string;
  valuePrefix?: string;
  valueSuffix?: string;
  categories: string[];
  points: Record<Period, ReportPoint[]>;
  rows: ReportRow[];
  insights: Array<{
    title: string;
    detail: string;
    tone: "good" | "warn" | "info";
  }>;
}

const SALES_ROWS: ReportRow[] = [
  {
    id: "TX-50021",
    title: "Pyrolysis Pitch",
    subtitle: "AgriCorp Solutions · EcoPack Co.",
    category: "Industrial feedstock",
    value: 13440,
    secondary: "200 tons",
    status: "In escrow",
    href: "/admin/accounting/transactions/TX-50021",
  },
  {
    id: "TX-50018",
    title: "Black Gypsum",
    subtitle: "GreenHarvest Co. · GreenLine Logistics",
    category: "Mineral byproduct",
    value: 8210,
    secondary: "160 tons",
    status: "Release ready",
    href: "/admin/accounting/transactions/TX-50018",
  },
  {
    id: "TX-50012",
    title: "Harvested Corn Stover",
    subtitle: "NutriFeed Industries · EcoPack Co.",
    category: "Biomass",
    value: 4990,
    secondary: "118 tons",
    status: "Completed",
    href: "/admin/accounting/transactions/TX-50012",
  },
  {
    id: "TX-50009",
    title: "Scrap Polymer Blend",
    subtitle: "BioGreen Innovations · Trinity Feedstocks",
    category: "Recovered polymer",
    value: 2180,
    secondary: "42 tons",
    status: "Flagged",
    href: "/admin/accounting/transactions/TX-50009",
  },
  {
    id: "TX-49988",
    title: "Used Dry Transformer",
    subtitle: "Circular Assurance · Metal Reclaim LLC",
    category: "Equipment recovery",
    value: 16800,
    secondary: "21 units",
    status: "Completed",
    href: "/admin/accounting/transactions/TX-49988",
  },
];

const PRODUCT_ROWS: ReportRow[] = [
  {
    id: "LIST-11048",
    title: "Black Gypsum",
    subtitle: "EcoPack Co. · Port Allen, LA",
    category: "Mineral byproduct",
    value: 18800,
    secondary: "18 active trades",
    status: "High demand",
    href: "/admin/listings/LIST-11048",
  },
  {
    id: "LIST-11052",
    title: "Scrap Polymer Blend",
    subtitle: "TerraGenesis Biofuels · Plaquemine, LA",
    category: "Recovered polymer",
    value: 14200,
    secondary: "12 active trades",
    status: "Watch quality",
    href: "/admin/listings/LIST-11052",
  },
  {
    id: "LIST-11057",
    title: "Pyrolysis Pitch",
    subtitle: "Trinity Feedstocks · Houston, TX",
    category: "Industrial feedstock",
    value: 12100,
    secondary: "9 active trades",
    status: "Growing",
    href: "/admin/listings/LIST-11057",
  },
  {
    id: "LIST-11061",
    title: "Harvested Corn Stover",
    subtitle: "Louisiana BioMass Partners · Baton Rouge, LA",
    category: "Biomass",
    value: 9800,
    secondary: "7 active trades",
    status: "Stable",
    href: "/admin/listings/LIST-11061",
  },
  {
    id: "LIST-11069",
    title: "Used Dry Transformer",
    subtitle: "Metal Reclaim LLC · Dallas, TX",
    category: "Equipment recovery",
    value: 7600,
    secondary: "5 active trades",
    status: "Limited supply",
    href: "/admin/listings/LIST-11069",
  },
];

const ESCROW_ROWS: ReportRow[] = escrowRecords.map((record) => ({
  id: record.id,
  title: record.product,
  subtitle: `${record.buyer} · ${record.seller}`,
  category: record.provider,
  value: record.amount,
  secondary: record.inspectionWindow,
  status: record.status,
  href: `/admin/accounting/escrow/${record.id}`,
}));

const CARBON_ROWS: ReportRow[] = [
  {
    id: "CAR-2401",
    title: "Black Gypsum recovery",
    subtitle: "TX-50018 · Gulf Coast corridor",
    category: "Avoided virgin material",
    value: 420,
    secondary: "94% verified",
    status: "Verified",
    href: "/admin/accounting/transactions/TX-50018",
  },
  {
    id: "CAR-2402",
    title: "Polymer blend diversion",
    subtitle: "TX-50009 · Louisiana corridor",
    category: "Landfill diversion",
    value: 286,
    secondary: "Evidence review",
    status: "Review",
    href: "/admin/asset-verification/AST-24022",
  },
  {
    id: "CAR-2403",
    title: "Corn stover substitution",
    subtitle: "TX-50012 · Southeast corridor",
    category: "Biogenic feedstock",
    value: 198,
    secondary: "96% verified",
    status: "Verified",
    href: "/admin/accounting/transactions/TX-50012",
  },
  {
    id: "CAR-2404",
    title: "Transformer recovery",
    subtitle: "TX-49988 · Texas corridor",
    category: "Equipment reuse",
    value: 164,
    secondary: "91% verified",
    status: "Verified",
    href: "/admin/asset-verification/AST-24031",
  },
  {
    id: "CAR-2405",
    title: "Route optimization",
    subtitle: "SHP-6203 · Plaquemine to Port Allen",
    category: "Logistics efficiency",
    value: 82,
    secondary: "Live telemetry",
    status: "Tracking",
    href: "/admin/delivery-tracking/SHP-6203",
  },
];

const REPORTS: Record<ReportKind, ReportDefinition> = {
  sales: {
    eyebrow: "Revenue intelligence",
    title: "Sales performance and marketplace liquidity",
    description:
      "Measure qualified trade value, conversion, completion, and corridor performance across EcoGlobe.",
    metricLabel: "Gross marketplace value",
    metricValue: "$184.6K",
    metricDetail: "+18.4% against prior period",
    comparisonLabel: "Completed trades",
    comparisonValue: "42",
    comparisonDetail: "87.5% completion rate",
    impactLabel: "Average order value",
    impactValue: "$4,395",
    impactDetail: "+$610 over prior period",
    healthLabel: "Qualified pipeline",
    healthValue: "$426K",
    healthDetail: "64 opportunities",
    chartTitle: "Marketplace value trend",
    chartDescription: "Completed and qualified transaction value by period.",
    valuePrefix: "$",
    valueSuffix: "K",
    categories: [
      "All",
      "Industrial feedstock",
      "Mineral byproduct",
      "Biomass",
      "Recovered polymer",
      "Equipment recovery",
    ],
    points: {
      "30d": [
        { label: "W1", value: 31, secondary: 18 },
        { label: "W2", value: 44, secondary: 27 },
        { label: "W3", value: 38, secondary: 25 },
        { label: "W4", value: 56, secondary: 34 },
      ],
      "90d": [
        { label: "May", value: 118, secondary: 76 },
        { label: "Jun", value: 146, secondary: 94 },
        { label: "Jul", value: 185, secondary: 121 },
      ],
      "12m": [
        { label: "Aug", value: 82, secondary: 55 },
        { label: "Sep", value: 96, secondary: 61 },
        { label: "Oct", value: 105, secondary: 70 },
        { label: "Nov", value: 112, secondary: 76 },
        { label: "Dec", value: 98, secondary: 63 },
        { label: "Jan", value: 121, secondary: 82 },
        { label: "Feb", value: 134, secondary: 91 },
        { label: "Mar", value: 142, secondary: 99 },
        { label: "Apr", value: 138, secondary: 95 },
        { label: "May", value: 151, secondary: 104 },
        { label: "Jun", value: 167, secondary: 113 },
        { label: "Jul", value: 185, secondary: 121 },
      ],
    },
    rows: SALES_ROWS,
    insights: [
      {
        title: "Gulf Coast conversion is accelerating",
        detail:
          "Verified mineral feedstocks convert 22% faster than the network average.",
        tone: "good",
      },
      {
        title: "Two transactions need intervention",
        detail:
          "$10.4K in value is waiting on evidence or a risk-control decision.",
        tone: "warn",
      },
      {
        title: "Equipment recovery is under-supplied",
        detail: "Buyer demand is 1.8× available verified inventory.",
        tone: "info",
      },
    ],
  },
  products: {
    eyebrow: "Product intelligence",
    title: "Product demand, supply, and conversion health",
    description:
      "Inspect marketplace depth, inventory velocity, category demand, and listing quality across the catalog.",
    metricLabel: "Active products",
    metricValue: "186",
    metricDetail: "142 verified for trade",
    comparisonLabel: "Available volume",
    comparisonValue: "24.8K t",
    comparisonDetail: "+9.2% this quarter",
    impactLabel: "Demand coverage",
    impactValue: "78%",
    impactDetail: "22% unfilled buyer demand",
    healthLabel: "Listing conversion",
    healthValue: "31.4%",
    healthDetail: "+4.6 points this period",
    chartTitle: "Qualified demand by category",
    chartDescription: "Buyer demand compared with verified available supply.",
    valueSuffix: "K t",
    categories: [
      "All",
      "Mineral byproduct",
      "Recovered polymer",
      "Industrial feedstock",
      "Biomass",
      "Equipment recovery",
    ],
    points: {
      "30d": [
        { label: "Mineral", value: 8.4, secondary: 6.8 },
        { label: "Polymer", value: 7.1, secondary: 4.9 },
        { label: "Industrial", value: 6.3, secondary: 5.2 },
        { label: "Biomass", value: 5.1, secondary: 4.6 },
        { label: "Equipment", value: 3.2, secondary: 1.8 },
      ],
      "90d": [
        { label: "Mineral", value: 22.8, secondary: 18.1 },
        { label: "Polymer", value: 19.4, secondary: 13.2 },
        { label: "Industrial", value: 17.6, secondary: 14.9 },
        { label: "Biomass", value: 14.2, secondary: 12.1 },
        { label: "Equipment", value: 9.1, secondary: 5.2 },
      ],
      "12m": [
        { label: "Mineral", value: 78, secondary: 61 },
        { label: "Polymer", value: 66, secondary: 49 },
        { label: "Industrial", value: 59, secondary: 51 },
        { label: "Biomass", value: 48, secondary: 42 },
        { label: "Equipment", value: 32, secondary: 18 },
      ],
    },
    rows: PRODUCT_ROWS,
    insights: [
      {
        title: "Black Gypsum leads verified demand",
        detail:
          "18 active trades and 94% supply readiness make it the strongest near-term category.",
        tone: "good",
      },
      {
        title: "Polymer evidence is constraining supply",
        detail:
          "3,100 tons are excluded from qualified availability until SDS reviews close.",
        tone: "warn",
      },
      {
        title: "Equipment recovery can support expansion",
        detail:
          "Midwest buyers added five high-value recovery requests this month.",
        tone: "info",
      },
    ],
  },
  escrow: {
    eyebrow: "Settlement intelligence",
    title: "Escrow funding, release, and exception performance",
    description:
      "Monitor protected marketplace value, release velocity, provider health, and disputes across every transaction.",
    metricLabel: "Protected value",
    metricValue: "$28.8K",
    metricDetail: "Across active escrow records",
    comparisonLabel: "Ready to release",
    comparisonValue: "$2.18K",
    comparisonDetail: "One release window open",
    impactLabel: "Median release time",
    impactValue: "2.4 days",
    impactDetail: "0.6 days faster",
    healthLabel: "Disputed value",
    healthValue: "$8.21K",
    healthDetail: "One active case",
    chartTitle: "Escrow lifecycle velocity",
    chartDescription: "Funded value compared with released value by period.",
    valuePrefix: "$",
    valueSuffix: "K",
    categories: [
      "All",
      "Held in escrow",
      "Ready to release",
      "Released",
      "Disputed",
    ],
    points: {
      "30d": [
        { label: "W1", value: 12.4, secondary: 8.1 },
        { label: "W2", value: 18.2, secondary: 14.4 },
        { label: "W3", value: 15.8, secondary: 12.6 },
        { label: "W4", value: 28.8, secondary: 19.7 },
      ],
      "90d": [
        { label: "May", value: 48, secondary: 36 },
        { label: "Jun", value: 61, secondary: 49 },
        { label: "Jul", value: 72, secondary: 58 },
      ],
      "12m": [
        { label: "Aug", value: 32, secondary: 26 },
        { label: "Sep", value: 36, secondary: 30 },
        { label: "Oct", value: 41, secondary: 34 },
        { label: "Nov", value: 45, secondary: 37 },
        { label: "Dec", value: 38, secondary: 32 },
        { label: "Jan", value: 48, secondary: 39 },
        { label: "Feb", value: 51, secondary: 42 },
        { label: "Mar", value: 56, secondary: 47 },
        { label: "Apr", value: 52, secondary: 43 },
        { label: "May", value: 61, secondary: 51 },
        { label: "Jun", value: 66, secondary: 54 },
        { label: "Jul", value: 72, secondary: 58 },
      ],
    },
    rows: ESCROW_ROWS,
    insights: [
      {
        title: "Release velocity improved",
        detail:
          "Delivery-confirmed transactions are releasing 20% faster than last quarter.",
        tone: "good",
      },
      {
        title: "One dispute holds 28% of active value",
        detail:
          "ESC-50018 needs a quality-evidence decision before funds can move.",
        tone: "warn",
      },
      {
        title: "Provider reconciliation is healthy",
        detail:
          "All four provider references match the EcoGlobe transaction ledger.",
        tone: "info",
      },
    ],
  },
  carbon: {
    eyebrow: "Impact intelligence",
    title: "Carbon avoidance, evidence, and target performance",
    description:
      "Measure verified avoided emissions across materials, logistics, and circular marketplace transactions.",
    metricLabel: "CO₂e avoided",
    metricValue: "1,150 kg",
    metricDetail: "+24% against prior period",
    comparisonLabel: "Verified impact",
    comparisonValue: "86%",
    comparisonDetail: "989 kg evidence-backed",
    impactLabel: "Diversion volume",
    impactValue: "1,420 t",
    impactDetail: "Across five impact programs",
    healthLabel: "Annual target",
    healthValue: "72%",
    healthDetail: "On pace for 18.4K kg",
    chartTitle: "Avoided emissions by program",
    chartDescription: "Verified carbon benefit compared with reported impact.",
    valueSuffix: " kg",
    categories: [
      "All",
      "Avoided virgin material",
      "Landfill diversion",
      "Biogenic feedstock",
      "Equipment reuse",
      "Logistics efficiency",
    ],
    points: {
      "30d": [
        { label: "Mineral", value: 420, secondary: 395 },
        { label: "Polymer", value: 286, secondary: 220 },
        { label: "Biomass", value: 198, secondary: 190 },
        { label: "Reuse", value: 164, secondary: 151 },
        { label: "Logistics", value: 82, secondary: 33 },
      ],
      "90d": [
        { label: "May", value: 780, secondary: 625 },
        { label: "Jun", value: 940, secondary: 772 },
        { label: "Jul", value: 1150, secondary: 989 },
      ],
      "12m": [
        { label: "Aug", value: 510, secondary: 410 },
        { label: "Sep", value: 580, secondary: 468 },
        { label: "Oct", value: 640, secondary: 519 },
        { label: "Nov", value: 710, secondary: 585 },
        { label: "Dec", value: 690, secondary: 571 },
        { label: "Jan", value: 760, secondary: 624 },
        { label: "Feb", value: 820, secondary: 681 },
        { label: "Mar", value: 890, secondary: 740 },
        { label: "Apr", value: 920, secondary: 774 },
        { label: "May", value: 1010, secondary: 854 },
        { label: "Jun", value: 1080, secondary: 918 },
        { label: "Jul", value: 1150, secondary: 989 },
      ],
    },
    rows: CARBON_ROWS,
    insights: [
      {
        title: "Mineral recovery produces the largest benefit",
        detail:
          "Black Gypsum substitution accounts for 36.5% of reported avoided emissions.",
        tone: "good",
      },
      {
        title: "Polymer evidence needs attention",
        detail:
          "66 kg CO₂e remains unverified while asset documents are under review.",
        tone: "warn",
      },
      {
        title: "Route telemetry can close the gap",
        detail:
          "Connecting two carrier feeds would raise verified impact coverage above 90%.",
        tone: "info",
      },
    ],
  },
};

const PERIOD_LABELS: Record<Period, string> = {
  "30d": "30 days",
  "90d": "90 days",
  "12m": "12 months",
};

function downloadCsv(filename: string, rows: ReportRow[]) {
  const header = [
    "ID",
    "Name",
    "Context",
    "Category",
    "Value",
    "Secondary",
    "Status",
  ];
  const body = rows.map((row) => [
    row.id,
    row.title,
    row.subtitle,
    row.category,
    row.value,
    row.secondary,
    row.status,
  ]);
  const csv = [header, ...body]
    .map((line) =>
      line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function StatusPill({ status }: { status: string }) {
  const positive = [
    "Completed",
    "Released",
    "Verified",
    "High demand",
    "Growing",
    "Stable",
    "Ready to release",
    "Release ready",
  ].includes(status);
  const warning = [
    "Disputed",
    "Flagged",
    "Review",
    "Watch quality",
    "Limited supply",
  ].includes(status);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${positive ? "bg-emerald-50 text-emerald-700" : warning ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}
    >
      {status}
    </span>
  );
}

function ReportIcon({ kind }: { kind: ReportKind }) {
  const Icon =
    kind === "sales"
      ? TrendingUp
      : kind === "products"
        ? PackageSearch
        : kind === "escrow"
          ? LockKeyhole
          : Leaf;
  return <Icon className="size-5" />;
}

export function AdminReportCenter({ kind }: { kind: ReportKind }) {
  const report = REPORTS[kind];
  const [period, setPeriod] = useState<Period>("90d");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [selectedPoint, setSelectedPoint] = useState(
    report.points["90d"].at(-1)?.label ?? "",
  );
  const [notice, setNotice] = useState("");

  const visibleRows = useMemo(
    () =>
      report.rows.filter((row) => {
        const matchesCategory =
          category === "All" ||
          row.category === category ||
          row.status === category;
        const haystack =
          `${row.id} ${row.title} ${row.subtitle} ${row.category} ${row.status}`.toLowerCase();
        return matchesCategory && haystack.includes(query.toLowerCase());
      }),
    [category, query, report.rows],
  );

  const points = report.points[period];
  const activePoint =
    points.find((point) => point.label === selectedPoint) ??
    points.at(-1) ??
    points[0];

  const choosePeriod = (next: Period) => {
    setPeriod(next);
    setSelectedPoint(report.points[next].at(-1)?.label ?? "");
    setNotice(`Report updated to ${PERIOD_LABELS[next]}.`);
  };

  return (
    <div className="min-h-full bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1560px] space-y-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
              <ReportIcon kind={kind} />
              {report.eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-950">
              {report.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
              {report.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setNotice(
                  "Report data refreshed from the current admin demo model.",
                );
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 hover:border-neutral-300"
            >
              <RefreshCcw className="size-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                downloadCsv(`ecoglobe-${kind}-${period}.csv`, visibleRows);
                setNotice(
                  `${visibleRows.length} filtered records exported successfully.`,
                );
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              <Download className="size-4" />
              Export report
            </button>
          </div>
        </header>

        {notice && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={CircleDollarSign}
            label={report.metricLabel}
            value={report.metricValue}
            detail={report.metricDetail}
          />
          <MetricCard
            icon={CheckCircle2}
            label={report.comparisonLabel}
            value={report.comparisonValue}
            detail={report.comparisonDetail}
          />
          <MetricCard
            icon={kind === "carbon" ? Leaf : BarChart3}
            label={report.impactLabel}
            value={report.impactValue}
            detail={report.impactDetail}
          />
          <MetricCard
            icon={Activity}
            label={report.healthLabel}
            value={report.healthValue}
            detail={report.healthDetail}
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-neutral-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-950">
                {report.chartTitle}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                {report.chartDescription}
              </p>
            </div>
            <div
              className="flex rounded-xl bg-neutral-100 p-1"
              aria-label="Report period"
            >
              {(Object.keys(PERIOD_LABELS) as Period[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => choosePeriod(option)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${period === option ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-900"}`}
                >
                  {PERIOD_LABELS[option]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <InteractiveBars
              points={points}
              prefix={report.valuePrefix}
              suffix={report.valueSuffix}
              selected={activePoint?.label ?? ""}
              onSelect={setSelectedPoint}
            />
            <div className="rounded-2xl bg-neutral-950 p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                Selected period
              </p>
              <p className="mt-2 text-2xl font-bold">{activePoint?.label}</p>
              <div className="mt-6 space-y-4">
                <ChartStat
                  label="Reported"
                  value={`${report.valuePrefix ?? ""}${activePoint?.value ?? 0}${report.valueSuffix ?? ""}`}
                />
                <ChartStat
                  label={
                    kind === "carbon"
                      ? "Verified"
                      : kind === "products"
                        ? "Available"
                        : kind === "escrow"
                          ? "Released"
                          : "Completed"
                  }
                  value={`${report.valuePrefix ?? ""}${activePoint?.secondary ?? 0}${report.valueSuffix ?? ""}`}
                />
                <ChartStat
                  label="Coverage"
                  value={`${Math.round(((activePoint?.secondary ?? 0) / Math.max(activePoint?.value ?? 1, 1)) * 100)}%`}
                />
              </div>
              <p className="mt-6 text-xs leading-5 text-neutral-400">
                Choose any chart bar to inspect its exact performance.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-neutral-100 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-950">
                  {kind === "products"
                    ? "Product portfolio"
                    : kind === "carbon"
                      ? "Impact evidence"
                      : kind === "escrow"
                        ? "Escrow portfolio"
                        : "Transaction performance"}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {visibleRows.length} records in the current view
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="flex h-10 min-w-56 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm">
                  <Search className="size-4 text-neutral-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search records"
                    className="min-w-0 flex-1 bg-transparent outline-none"
                  />
                </label>
                <label className="flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm">
                  <Filter className="size-4 text-neutral-400" />
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="bg-transparent font-medium outline-none"
                  >
                    {report.categories.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="divide-y divide-neutral-100">
              {visibleRows.map((row) => (
                <Link
                  key={row.id}
                  href={row.href}
                  className="grid gap-3 p-5 transition hover:bg-neutral-50 md:grid-cols-[minmax(0,1fr)_160px_130px_24px] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700">
                        {row.id}
                      </span>
                      <StatusPill status={row.status} />
                    </div>
                    <h3 className="mt-2 truncate text-sm font-bold text-neutral-950">
                      {row.title}
                    </h3>
                    <p className="mt-1 truncate text-xs text-neutral-500">
                      {row.subtitle}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                      Category
                    </p>
                    <p className="mt-1 text-xs font-medium text-neutral-700">
                      {row.category}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                      {kind === "carbon" ? "CO₂e avoided" : "Value"}
                    </p>
                    <p className="mt-1 text-sm font-bold text-neutral-950">
                      {kind === "carbon"
                        ? `${row.value} kg`
                        : `$${row.value.toLocaleString()}`}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {row.secondary}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-neutral-300" />
                </Link>
              ))}
              {visibleRows.length === 0 && (
                <div className="p-10 text-center">
                  <Search className="mx-auto size-7 text-neutral-300" />
                  <p className="mt-3 text-sm font-semibold text-neutral-700">
                    No records match this view.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setCategory("All");
                    }}
                    className="mt-2 text-sm font-semibold text-emerald-700"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
          <aside className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-neutral-950">
                Operational insights
              </h2>
            </div>
            <div className="mt-5 space-y-3">
              {report.insights.map((insight) => (
                <InsightCard key={insight.title} {...insight} />
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setNotice(
                  "Insight briefing prepared for the current report filters.",
                )
              }
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              <FileCheck2 className="size-4" />
              Prepare briefing
            </button>
          </aside>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-neutral-500">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-neutral-950">
        {value}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}

function InteractiveBars({
  points,
  prefix,
  suffix,
  selected,
  onSelect,
}: {
  points: ReportPoint[];
  prefix?: string;
  suffix?: string;
  selected: string;
  onSelect: (label: string) => void;
}) {
  const max = Math.max(...points.map((point) => point.value), 1);
  return (
    <div className="overflow-x-auto">
      <div className="flex h-72 min-w-[560px] items-end gap-3 border-b border-neutral-200 px-2 pt-8">
        {points.map((point) => {
          const active = selected === point.label;
          return (
            <button
              key={point.label}
              type="button"
              onClick={() => onSelect(point.label)}
              aria-label={`${point.label}: ${prefix ?? ""}${point.value}${suffix ?? ""}`}
              className="group flex h-full min-w-10 flex-1 flex-col items-center justify-end gap-2"
            >
              <span
                className={`text-[10px] font-bold transition ${active ? "text-neutral-950" : "text-neutral-400 opacity-0 group-hover:opacity-100"}`}
              >
                {prefix}
                {point.value}
                {suffix}
              </span>
              <span
                className="relative flex w-full max-w-12 items-end overflow-hidden rounded-t-lg bg-neutral-100"
                style={{
                  height: `${Math.max((point.value / max) * 210, 18)}px`,
                }}
              >
                <span
                  className={`w-full rounded-t-lg transition-all ${active ? "bg-emerald-500" : "bg-neutral-300 group-hover:bg-emerald-300"}`}
                  style={{
                    height: `${Math.max((point.secondary / point.value) * 100, 4)}%`,
                  }}
                />
              </span>
              <span
                className={`pb-3 text-[11px] font-semibold ${active ? "text-neutral-950" : "text-neutral-500"}`}
              >
                {point.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-neutral-200" />
          Reported / qualified
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-emerald-500" />
          Verified / completed
        </span>
      </div>
    </div>
  );
}

function ChartStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-3">
      <span className="text-xs text-neutral-400">{label}</span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}

function InsightCard({
  title,
  detail,
  tone,
}: {
  title: string;
  detail: string;
  tone: "good" | "warn" | "info";
}) {
  const Icon =
    tone === "good" ? TrendingUp : tone === "warn" ? AlertTriangle : Sparkles;
  return (
    <div
      className={`rounded-xl border p-4 ${tone === "good" ? "border-emerald-100 bg-emerald-50" : tone === "warn" ? "border-amber-100 bg-amber-50" : "border-blue-100 bg-blue-50"}`}
    >
      <div className="flex gap-3">
        <Icon
          className={`mt-0.5 size-4 shrink-0 ${tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-blue-700"}`}
        />
        <div>
          <p className="text-sm font-bold text-neutral-900">{title}</p>
          <p className="mt-1 text-xs leading-5 text-neutral-600">{detail}</p>
        </div>
      </div>
    </div>
  );
}

const ESCROW_STATUS_OPTIONS: Array<"All" | EscrowLifecycleStatus> = [
  "All",
  "Awaiting funding",
  "Held in escrow",
  "Ready to release",
  "Released",
  "Disputed",
];

export function AdminEscrowOperationsCenter({
  escrowId,
}: {
  escrowId?: string;
}) {
  return escrowId ? <EscrowDetail escrowId={escrowId} /> : <EscrowPortfolio />;
}

function EscrowPortfolio() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] =
    useState<(typeof ESCROW_STATUS_OPTIONS)[number]>("All");
  const [notice, setNotice] = useState("");
  const visible = escrowRecords.filter((record) => {
    const matches = status === "All" || record.status === status;
    return (
      matches &&
      `${record.id} ${record.orderId} ${record.buyer} ${record.seller} ${record.product}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  });
  const held = escrowRecords.reduce(
    (sum, record) => sum + record.amountHeld,
    0,
  );
  const releaseReady = escrowRecords
    .filter((record) => record.status === "Ready to release")
    .reduce((sum, record) => sum + record.amountHeld, 0);
  const disputed = escrowRecords
    .filter((record) => record.status === "Disputed")
    .reduce((sum, record) => sum + record.amountHeld, 0);

  return (
    <div className="min-h-full bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1560px] space-y-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
              <Landmark className="size-4" />
              Escrow operations
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-950">
              Protect marketplace funds and control every release
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Reconcile provider balances, monitor inspection windows, resolve
              disputes, and release protected value with a complete audit trail.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/reports/escrow"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700"
            >
              <BarChart3 className="size-4" />
              View escrow report
            </Link>
            <button
              type="button"
              onClick={() =>
                setNotice(
                  "Provider balances reconciled with the current transaction ledger.",
                )
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white"
            >
              <RefreshCcw className="size-4" />
              Reconcile providers
            </button>
          </div>
        </header>
        {notice && (
          <div
            role="status"
            className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {notice}
          </div>
        )}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={LockKeyhole}
            label="Funds held"
            value={formatEscrowMoney(held)}
            detail="Protected across active records"
          />
          <MetricCard
            icon={HandCoins}
            label="Release ready"
            value={formatEscrowMoney(releaseReady)}
            detail="Delivery and evidence confirmed"
          />
          <MetricCard
            icon={ShieldAlert}
            label="Disputed funds"
            value={formatEscrowMoney(disputed)}
            detail="One quality case in review"
          />
          <MetricCard
            icon={Clock3}
            label="Median release time"
            value="2.4 days"
            detail="20% faster this quarter"
          />
        </section>
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-neutral-100 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-950">
                  Protected funds queue
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {visible.length} escrow records in the current view
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="flex h-10 min-w-56 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm">
                  <Search className="size-4 text-neutral-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search escrow"
                    className="min-w-0 flex-1 bg-transparent outline-none"
                  />
                </label>
                <select
                  aria-label="Escrow status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as typeof status)
                  }
                  className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium outline-none"
                >
                  {ESCROW_STATUS_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="divide-y divide-neutral-100">
              {visible.map((record) => (
                <button
                  type="button"
                  key={record.id}
                  onClick={() =>
                    router.push(`/admin/accounting/escrow/${record.id}`)
                  }
                  className="grid w-full gap-3 p-5 text-left transition hover:bg-neutral-50 md:grid-cols-[minmax(0,1fr)_170px_150px_24px] md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700">
                        {record.id}
                      </span>
                      <StatusPill status={record.status} />
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-neutral-950">
                      {record.product}
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500">
                      {record.buyer} → {record.seller}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                      Provider
                    </p>
                    <p className="mt-1 text-xs font-medium text-neutral-700">
                      {record.provider}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {record.providerReference}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                      Held / total
                    </p>
                    <p className="mt-1 text-sm font-bold text-neutral-950">
                      {formatEscrowMoney(record.amountHeld)}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      of {formatEscrowMoney(record.amount)}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-neutral-300" />
                </button>
              ))}
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl bg-neutral-950 p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                Release control
              </p>
              <h2 className="mt-2 text-xl font-bold">
                One release window is open
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                ESC-50009 can release after the inspection timer closes if no
                exception is filed.
              </p>
              <button
                type="button"
                onClick={() =>
                  router.push("/admin/accounting/escrow/ESC-50009")
                }
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-neutral-950"
              >
                Review release <ArrowUpRight className="size-4" />
              </button>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-700" />
                <h2 className="font-bold text-neutral-950">
                  Dispute attention
                </h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                ESC-50018 holds {formatEscrowMoney(disputed)} pending a quality
                evidence decision.
              </p>
              <button
                type="button"
                onClick={() =>
                  router.push("/admin/accounting/escrow/ESC-50018")
                }
                className="mt-4 text-sm font-bold text-amber-800"
              >
                Open dispute review
              </button>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

function EscrowDetail({ escrowId }: { escrowId: string }) {
  const router = useRouter();
  const escrow = getEscrowRecord(escrowId);
  const [tab, setTab] = useState<
    "Overview" | "Release controls" | "Documents" | "Activity"
  >("Overview");
  const [localStatus, setLocalStatus] = useState(escrow.status);
  const [notice, setNotice] = useState("");
  const act = (message: string, nextStatus?: EscrowLifecycleStatus) => {
    setNotice(message);
    if (nextStatus) setLocalStatus(nextStatus);
  };

  return (
    <div className="min-h-full bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px] space-y-6">
        <button
          type="button"
          onClick={() => router.push("/admin/accounting/escrow")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-950"
        >
          <ArrowLeft className="size-4" />
          Back to escrow operations
        </button>
        <section className="overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-sm">
          <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-emerald-400">
                  {escrow.id}
                </span>
                <StatusPill status={localStatus} />
              </div>
              <h1 className="mt-3 text-3xl font-bold">{escrow.product}</h1>
              <p className="mt-2 text-sm text-neutral-400">
                {escrow.buyer} → {escrow.seller} · {escrow.orderId}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  act("Escrow placed on an admin review hold.", "Disputed")
                }
                className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
              >
                Hold for review
              </button>
              <button
                type="button"
                onClick={() =>
                  act("Refund workflow opened for buyer confirmation.")
                }
                className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
              >
                Prepare refund
              </button>
              <button
                type="button"
                onClick={() =>
                  act(
                    "Release recorded and seller payout scheduled.",
                    "Released",
                  )
                }
                disabled={localStatus === "Released"}
                className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {localStatus === "Released"
                  ? "Funds released"
                  : "Release funds"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 border-t border-white/10 sm:grid-cols-4">
            <HeroStat
              label="Total protected"
              value={formatEscrowMoney(escrow.amount)}
            />
            <HeroStat
              label="Currently held"
              value={formatEscrowMoney(
                localStatus === "Released" ? 0 : escrow.amountHeld,
              )}
            />
            <HeroStat
              label="Seller payout"
              value={formatEscrowMoney(escrow.sellerPayout)}
            />
            <HeroStat
              label="Platform fee"
              value={formatEscrowMoney(escrow.platformFee)}
            />
          </div>
        </section>
        {notice && (
          <div
            role="status"
            className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800"
          >
            {notice}
          </div>
        )}
        <div className="flex overflow-x-auto border-b border-neutral-200">
          {(
            ["Overview", "Release controls", "Documents", "Activity"] as const
          ).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${tab === item ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500"}`}
            >
              {item}
            </button>
          ))}
        </div>
        {tab === "Overview" && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-neutral-950">
                Escrow overview
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Detail label="Provider" value={escrow.provider} />
                <Detail
                  label="Provider reference"
                  value={escrow.providerReference}
                />
                <Detail label="Funded" value={escrow.fundedDate} />
                <Detail
                  label="Estimated delivery"
                  value={escrow.estimatedDelivery}
                />
                <Detail
                  label="Inspection window"
                  value={escrow.inspectionWindow}
                />
                <Detail label="Release date" value={escrow.releaseDate} />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <LinkedRecord
                  label="Transaction"
                  value={escrow.transactionId}
                  href={`/admin/accounting/transactions/${escrow.transactionId}`}
                />
                <LinkedRecord
                  label="Order"
                  value={escrow.orderId}
                  href={`/admin/sales/${escrow.orderId}`}
                />
                <LinkedRecord
                  label="Payment"
                  value="View settlement"
                  href="/admin/accounting/payments"
                />
              </div>
            </section>
            <aside className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-neutral-950">
                Admin next step
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                {escrow.adminNextStep}
              </p>
              {escrow.disputeReason && (
                <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                  <strong>Dispute:</strong> {escrow.disputeReason}
                </div>
              )}
              <button
                type="button"
                onClick={() => setTab("Release controls")}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-bold text-white"
              >
                Open release controls <ChevronRight className="size-4" />
              </button>
            </aside>
          </div>
        )}
        {tab === "Release controls" && (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h2 className="text-lg font-bold text-neutral-950">
                Release policy
              </h2>
              <div className="mt-5 space-y-4">
                <Detail label="Release trigger" value={escrow.releaseTrigger} />
                <Detail label="Automation" value={escrow.automatedTrigger} />
                <Detail
                  label="Inspection window"
                  value={escrow.inspectionWindow}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h2 className="text-lg font-bold text-neutral-950">
                Control actions
              </h2>
              <div className="mt-5 space-y-3">
                <ActionButton
                  icon={HandCoins}
                  title="Release to seller"
                  detail="Record the release and schedule the seller payout."
                  onClick={() =>
                    act(
                      "Release recorded and seller payout scheduled.",
                      "Released",
                    )
                  }
                />
                <ActionButton
                  icon={ShieldAlert}
                  title="Hold pending review"
                  detail="Pause automation and create an admin exception."
                  onClick={() =>
                    act("Escrow placed on an admin review hold.", "Disputed")
                  }
                />
                <ActionButton
                  icon={Banknote}
                  title="Prepare buyer refund"
                  detail="Open a controlled refund workflow without moving funds yet."
                  onClick={() =>
                    act("Buyer refund workflow prepared for approval.")
                  }
                />
              </div>
            </div>
          </section>
        )}
        {tab === "Documents" && (
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-950">
                  Settlement evidence
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Documents attached to the protected transaction.
                </p>
              </div>
              <button
                type="button"
                onClick={() => act("Evidence upload workspace opened.")}
                className="rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
              >
                Add evidence
              </button>
            </div>
            <div className="mt-5 divide-y divide-neutral-100">
              {escrow.documents.map((document) => (
                <div
                  key={document}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-neutral-100">
                      <FileCheck2 className="size-4 text-neutral-600" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-neutral-900">
                        {document}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Attached evidence · Available to reviewers
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => act(`${document} prepared for download.`)}
                    aria-label={`Download ${document}`}
                    className="flex size-9 items-center justify-center rounded-lg border border-neutral-200"
                  >
                    <Download className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
        {tab === "Activity" && (
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-lg font-bold text-neutral-950">
              Escrow audit trail
            </h2>
            <div className="mt-6 space-y-0">
              {escrow.activity.map((event, index) => (
                <div key={`${event.label}-${index}`} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex size-7 items-center justify-center rounded-full ${event.complete ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-400"}`}
                    >
                      {event.complete ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <Clock3 className="size-4" />
                      )}
                    </span>
                    {index < escrow.activity.length - 1 && (
                      <span className="h-12 w-px bg-neutral-200" />
                    )}
                  </div>
                  <div className="pb-7">
                    <p className="text-sm font-bold text-neutral-900">
                      {event.label}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {event.date || "Pending workflow milestone"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-white/10 p-5 sm:border-r last:border-r-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-5 text-neutral-900">
        {value}
      </p>
    </div>
  );
}
function LinkedRecord({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 hover:bg-neutral-50"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-neutral-900">{value}</span>
        <ArrowUpRight className="size-4 text-neutral-400" />
      </div>
    </Link>
  );
}
function ActionButton({
  icon: Icon,
  title,
  detail,
  onClick,
}: {
  icon: typeof Activity;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl border border-neutral-200 p-4 text-left hover:border-neutral-300 hover:bg-neutral-50"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
        <Icon className="size-4" />
      </span>
      <span>
        <span className="block text-sm font-bold text-neutral-900">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-neutral-500">
          {detail}
        </span>
      </span>
    </button>
  );
}

export function AdminSalesReportPage() {
  return <AdminReportCenter kind="sales" />;
}
export function AdminProductsReportPage() {
  return <AdminReportCenter kind="products" />;
}
export function AdminEscrowReportPage() {
  return <AdminReportCenter kind="escrow" />;
}
export function AdminCarbonReportPage() {
  return <AdminReportCenter kind="carbon" />;
}
