"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Clock3,
  Download,
  Filter,
  Flag,
  Gauge,
  MessageSquare,
  MonitorSmartphone,
  PackageCheck,
  Play,
  Radio,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TabletSmartphone,
  TestTube2,
  ToggleLeft,
  ToggleRight,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { MobileAccessPreview } from "./mobile-access-preview";

type ReleaseStatus = "Live" | "Pilot" | "Review" | "Paused";
type ReleaseTab = "Overview" | "Test matrix" | "Feedback" | "Preview";
type PlatformFilter = "All" | "Responsive web" | "iOS" | "Android";

interface MobileRelease {
  id: string;
  name: string;
  version: string;
  platform: Exclude<PlatformFilter, "All">;
  status: ReleaseStatus;
  audience: string;
  activeUsers: number;
  adoption: number;
  completion: number;
  crashFree: number;
  lastPublished: string;
  owner: string;
  summary: string;
  flows: string[];
  releaseNotes: string[];
}

const INITIAL_RELEASES: MobileRelease[] = [
  {
    id: "MOB-WEB-380",
    name: "Marketplace mobile web",
    version: "3.8.0",
    platform: "Responsive web",
    status: "Live",
    audience: "Buyers and sellers",
    activeUsers: 1842,
    adoption: 78,
    completion: 92,
    crashFree: 99.8,
    lastPublished: "Jul 15, 2026",
    owner: "Digital Marketplace",
    summary:
      "Production mobile-web experience for search, quote requests, shipment tracking, signatures, and alerts.",
    flows: ["Marketplace", "Tracking", "Signatures", "Alerts"],
    releaseNotes: [
      "Reduced quote-request steps from four to two",
      "Added delivery confirmation evidence status",
      "Improved low-bandwidth loading behavior",
    ],
  },
  {
    id: "MOB-IOS-094",
    name: "EcoGlobe iOS pilot",
    version: "0.9.4",
    platform: "iOS",
    status: "Pilot",
    audience: "42 invited buyers",
    activeUsers: 36,
    adoption: 86,
    completion: 89,
    crashFree: 99.4,
    lastPublished: "Jul 12, 2026",
    owner: "Mobile Product",
    summary:
      "TestFlight pilot focused on shipment tracking, push alerts, mobile signatures, and saved marketplace searches.",
    flows: ["Tracking", "Signatures", "Alerts"],
    releaseNotes: [
      "Added native push-notification preferences",
      "Improved signature consent accessibility",
      "Enabled background shipment refresh",
    ],
  },
  {
    id: "MOB-AND-092",
    name: "EcoGlobe Android pilot",
    version: "0.9.2",
    platform: "Android",
    status: "Review",
    audience: "Internal operations",
    activeUsers: 18,
    adoption: 64,
    completion: 83,
    crashFree: 98.9,
    lastPublished: "Jul 9, 2026",
    owner: "Mobile Product",
    summary:
      "Internal Android build validating device coverage, document capture, location permissions, and alert delivery.",
    flows: ["Tracking", "Documents", "Alerts"],
    releaseNotes: [
      "Added camera upload compression",
      "Expanded Android 13 and 14 coverage",
      "Flagged background-location permission copy for review",
    ],
  },
  {
    id: "MOB-WEB-DRV",
    name: "Carrier field portal",
    version: "2.6.1",
    platform: "Responsive web",
    status: "Live",
    audience: "Drivers and dispatchers",
    activeUsers: 624,
    adoption: 71,
    completion: 95,
    crashFree: 99.9,
    lastPublished: "Jul 14, 2026",
    owner: "Logistics Operations",
    summary:
      "Field-optimized delivery workflow for milestones, geofence events, proof of delivery, and exception reporting.",
    flows: ["Tracking", "Proof of delivery", "Exceptions"],
    releaseNotes: [
      "Added offline POD upload queue",
      "Improved arrival geofence messaging",
      "Reduced image payload size by 41%",
    ],
  },
];

const DEVICE_TESTS = [
  {
    device: "iPhone 15 Pro",
    system: "iOS 18.5",
    viewport: "393 × 852",
    status: "Passed",
    duration: "3m 42s",
  },
  {
    device: "Pixel 9",
    system: "Android 15",
    viewport: "412 × 915",
    status: "Passed",
    duration: "4m 08s",
  },
  {
    device: "Galaxy A54",
    system: "Android 14",
    viewport: "360 × 800",
    status: "Review",
    duration: "4m 31s",
  },
  {
    device: "iPad Mini",
    system: "iPadOS 18",
    viewport: "744 × 1133",
    status: "Passed",
    duration: "3m 55s",
  },
];

const INITIAL_FEEDBACK = [
  {
    id: "FDB-3108",
    releaseId: "MOB-IOS-094",
    title: "Shipment map recenters after returning from alerts",
    reporter: "Joanna Bell",
    priority: "High",
    status: "Open",
    date: "Today",
  },
  {
    id: "FDB-3104",
    releaseId: "MOB-AND-092",
    title: "Location permission explanation needs clearer value copy",
    reporter: "Admin QA",
    priority: "Medium",
    status: "Open",
    date: "Jul 15",
  },
  {
    id: "FDB-3097",
    releaseId: "MOB-WEB-380",
    title: "Quote confirmation should link directly to order activity",
    reporter: "Buyer pilot group",
    priority: "Low",
    status: "Triaged",
    date: "Jul 14",
  },
];

const FEATURE_FLAGS = [
  { id: "push", label: "Push notifications", enabled: true },
  { id: "offline-pod", label: "Offline POD uploads", enabled: true },
  { id: "biometric", label: "Biometric re-entry", enabled: false },
  { id: "live-map", label: "Live shipment map", enabled: true },
];

export function AdminMobileAccessCenter({ releaseId }: { releaseId?: string }) {
  const [releases, setReleases] = useState(INITIAL_RELEASES);
  const release = releases.find((item) => item.id === releaseId);

  if (releaseId && release) {
    return (
      <ReleaseDetail
        release={release}
        onUpdate={(updates) =>
          setReleases((current) =>
            current.map((item) =>
              item.id === release.id ? { ...item, ...updates } : item,
            ),
          )
        }
      />
    );
  }

  return <MobileOperationsHome releases={releases} />;
}

function MobileOperationsHome({ releases }: { releases: MobileRelease[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<PlatformFilter>("All");
  const [notice, setNotice] = useState("");
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [flags, setFlags] = useState(FEATURE_FLAGS);

  const visibleReleases = useMemo(
    () =>
      releases.filter((release) => {
        const matchesPlatform =
          platform === "All" || release.platform === platform;
        const matchesSearch =
          `${release.name} ${release.id} ${release.platform} ${release.owner}`
            .toLowerCase()
            .includes(search.toLowerCase());
        return matchesPlatform && matchesSearch;
      }),
    [platform, releases, search],
  );

  const activeUsers = releases.reduce(
    (total, release) => total + release.activeUsers,
    0,
  );
  const weightedCompletion = Math.round(
    releases.reduce(
      (total, release) => total + release.completion * release.activeUsers,
      0,
    ) / activeUsers,
  );

  return (
    <div className="min-h-full bg-neutral-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeading
        eyebrow="MOBILE OPERATIONS"
        title="Manage mobile releases, adoption, reliability, and field readiness."
        body="Operate responsive web and native pilots from one workspace, validate critical marketplace flows across devices, and move feedback into release decisions."
        actions={
          <>
            <button
              type="button"
              onClick={() => setTestDialogOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold text-neutral-800 hover:bg-neutral-50"
            >
              <TestTube2 className="size-4" />
              Create test run
            </button>
            <button
              type="button"
              onClick={() =>
                setNotice("Release readiness brief generated for admin review.")
              }
              className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-neutral-800"
            >
              <Download className="size-4" />
              Export readiness brief
            </button>
          </>
        }
      />

      {notice && <Notice message={notice} onClose={() => setNotice("")} />}

      <section className="mt-6 overflow-hidden rounded-3xl bg-neutral-950 p-6 text-white shadow-xl sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr] xl:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
              <Radio className="size-4" /> Live mobile command
            </p>
            <h2 className="mt-4 max-w-2xl text-2xl font-black tracking-tight sm:text-3xl">
              Keep every high-value field workflow fast, dependable, and
              release-ready.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">
              Marketplace search, delivery confirmation, signatures, and alerts
              are measured against adoption, task completion, device coverage,
              and operational feedback.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
            <DarkMetric
              value={activeUsers.toLocaleString()}
              label="Active users"
            />
            <DarkMetric
              value={`${weightedCompletion}%`}
              label="Task completion"
            />
            <DarkMetric value="99.7%" label="Crash free" />
            <DarkMetric value="3" label="Feedback open" />
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Weekly active users"
          value={activeUsers.toLocaleString()}
          detail="+12% over prior period"
          tone="emerald"
        />
        <MetricCard
          icon={CircleGauge}
          label="Flow completion"
          value={`${weightedCompletion}%`}
          detail="Across four critical flows"
          tone="blue"
        />
        <MetricCard
          icon={ShieldCheck}
          label="Crash-free sessions"
          value="99.7%"
          detail="Within 99.5% release target"
          tone="emerald"
        />
        <MetricCard
          icon={MessageSquare}
          label="Feedback requiring action"
          value="3"
          detail="1 high-priority report"
          tone="amber"
        />
      </div>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-neutral-950">
              Release portfolio
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Compare rollout health, adoption, completion, and reliability.
            </p>
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <label className="relative min-w-56 flex-1 sm:max-w-xs">
              <span className="sr-only">Search mobile releases</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search releases"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
              />
            </label>
            <label className="relative">
              <span className="sr-only">Filter by platform</span>
              <Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <select
                value={platform}
                onChange={(event) =>
                  setPlatform(event.target.value as PlatformFilter)
                }
                className="h-10 appearance-none rounded-xl border border-neutral-200 bg-white pl-9 pr-8 text-sm font-semibold text-neutral-700"
              >
                {(["All", "Responsive web", "iOS", "Android"] as const).map(
                  (item) => (
                    <option key={item}>{item}</option>
                  ),
                )}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {visibleReleases.map((release) => (
            <button
              type="button"
              key={release.id}
              onClick={() => router.push(`/admin/mobile-access/${release.id}`)}
              className="group rounded-2xl border border-neutral-200 p-5 text-left transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 group-hover:bg-neutral-950 group-hover:text-white">
                    <PlatformIcon platform={release.platform} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-neutral-950">
                        {release.name}
                      </h3>
                      <StatusBadge status={release.status} />
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      {release.id} · v{release.version} · {release.platform}
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-5 shrink-0 text-neutral-300 group-hover:text-neutral-700" />
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-neutral-600">
                {release.summary}
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <SmallMetric
                  label="Users"
                  value={release.activeUsers.toLocaleString()}
                />
                <SmallMetric
                  label="Completion"
                  value={`${release.completion}%`}
                />
                <SmallMetric
                  label="Crash free"
                  value={`${release.crashFree}%`}
                />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-100 pt-4 text-xs">
                <span className="font-semibold text-neutral-500">
                  {release.audience}
                </span>
                <span className="font-bold text-neutral-900">
                  Published {release.lastPublished}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-neutral-950">
                Device readiness
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Latest critical-flow regression run.
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              3 passed · 1 review
            </span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-neutral-400">
                <tr>
                  <th className="pb-3 font-semibold">Device</th>
                  <th className="pb-3 font-semibold">System</th>
                  <th className="pb-3 font-semibold">Viewport</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 text-right font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {DEVICE_TESTS.map((test) => (
                  <tr key={test.device}>
                    <td className="py-3 font-bold text-neutral-900">
                      {test.device}
                    </td>
                    <td className="py-3 text-neutral-600">{test.system}</td>
                    <td className="py-3 text-neutral-600">{test.viewport}</td>
                    <td className="py-3">
                      <TestStatus status={test.status} />
                    </td>
                    <td className="py-3 text-right font-semibold text-neutral-500">
                      {test.duration}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-neutral-950">
                Feature controls
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Admin-managed capabilities across pilot builds.
              </p>
            </div>
            <Sparkles className="size-5 text-violet-600" />
          </div>
          <div className="mt-4 space-y-2">
            {flags.map((flag) => (
              <button
                key={flag.id}
                type="button"
                aria-pressed={flag.enabled}
                onClick={() =>
                  setFlags((current) =>
                    current.map((item) =>
                      item.id === flag.id
                        ? { ...item, enabled: !item.enabled }
                        : item,
                    ),
                  )
                }
                className="flex w-full items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 text-left hover:bg-neutral-100"
              >
                <span>
                  <span className="block text-sm font-bold text-neutral-900">
                    {flag.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {flag.enabled
                      ? "Enabled for eligible users"
                      : "Disabled across pilots"}
                  </span>
                </span>
                {flag.enabled ? (
                  <ToggleRight className="size-7 text-emerald-600" />
                ) : (
                  <ToggleLeft className="size-7 text-neutral-400" />
                )}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
              EXPERIENCE LAB
            </p>
            <h2 className="mt-2 text-2xl font-black text-neutral-950">
              Validate the complete mobile workflow.
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Run marketplace, tracking, signature, and alert interactions in
              the admin preview.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-neutral-700 ring-1 ring-neutral-200">
            <Wifi className="size-3.5 text-emerald-600" /> Interactive session
          </span>
        </div>
        <MobileAccessPreview role="admin" />
      </section>

      {testDialogOpen && (
        <TestRunDialog
          onClose={() => setTestDialogOpen(false)}
          onCreate={(scope) => {
            setTestDialogOpen(false);
            setNotice(
              `${scope} test run queued across the selected device matrix.`,
            );
          }}
        />
      )}
    </div>
  );
}

function ReleaseDetail({
  release,
  onUpdate,
}: {
  release: MobileRelease;
  onUpdate: (updates: Partial<MobileRelease>) => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<ReleaseTab>("Overview");
  const [notice, setNotice] = useState("");
  const [flags, setFlags] = useState(FEATURE_FLAGS);
  const [feedback, setFeedback] = useState(INITIAL_FEEDBACK);
  const [publishing, setPublishing] = useState(false);

  const releaseFeedback = feedback.filter(
    (item) => item.releaseId === release.id,
  );

  const publish = () => {
    setPublishing(true);
    window.setTimeout(() => {
      onUpdate({ status: "Live", lastPublished: "Today" });
      setPublishing(false);
      setNotice(
        `Version ${release.version} promoted to the live release channel.`,
      );
    }, 450);
  };

  return (
    <div className="min-h-full bg-neutral-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <button
        type="button"
        onClick={() => router.push("/admin/mobile-access")}
        className="inline-flex items-center gap-2 text-sm font-bold text-neutral-600 hover:text-neutral-950"
      >
        <ArrowLeft className="size-4" /> Back to mobile operations
      </button>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-lg">
            <PlatformIcon platform={release.platform} className="size-7" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                {release.id}
              </p>
              <StatusBadge status={release.status} />
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">
              {release.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
              {release.summary}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              onUpdate({
                status: release.status === "Paused" ? "Pilot" : "Paused",
              });
              setNotice(
                release.status === "Paused"
                  ? "Pilot access resumed."
                  : "Release rollout paused for new sessions.",
              );
            }}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold text-neutral-800 hover:bg-neutral-50"
          >
            {release.status === "Paused" ? "Resume rollout" : "Pause rollout"}
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={publishing}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {publishing ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <Rocket className="size-4" />
            )}
            {publishing ? "Publishing…" : "Publish release"}
          </button>
        </div>
      </div>

      {notice && <Notice message={notice} onClose={() => setNotice("")} />}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Active users"
          value={release.activeUsers.toLocaleString()}
          detail={release.audience}
          tone="emerald"
        />
        <MetricCard
          icon={BarChart3}
          label="Adoption"
          value={`${release.adoption}%`}
          detail="Of eligible audience"
          tone="blue"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Task completion"
          value={`${release.completion}%`}
          detail="Critical flow average"
          tone="emerald"
        />
        <MetricCard
          icon={ShieldCheck}
          label="Crash free"
          value={`${release.crashFree}%`}
          detail={`Last published ${release.lastPublished}`}
          tone="amber"
        />
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-neutral-200">
        {(["Overview", "Test matrix", "Feedback", "Preview"] as const).map(
          (item) => (
            <button
              type="button"
              key={item}
              onClick={() => setTab(item)}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                tab === item
                  ? "bg-neutral-950 text-white shadow"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              {item}
            </button>
          ),
        )}
      </div>

      {tab === "Overview" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-6">
            <Panel title="Release health" icon={Gauge}>
              <div className="grid gap-3 sm:grid-cols-3">
                <HealthGauge label="Adoption" value={release.adoption} />
                <HealthGauge label="Completion" value={release.completion} />
                <HealthGauge
                  label="Reliability"
                  value={Math.round(release.crashFree)}
                />
              </div>
              <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                <strong>Release recommendation:</strong> reliability and task
                completion are within rollout thresholds. Continue monitoring
                feedback before expanding the eligible audience.
              </div>
            </Panel>

            <Panel title="Release notes" icon={PackageCheck}>
              <div className="space-y-3">
                {release.releaseNotes.map((note) => (
                  <div
                    key={note}
                    className="flex items-start gap-3 rounded-xl bg-neutral-50 p-3"
                  >
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="size-3.5" />
                    </span>
                    <p className="text-sm font-semibold leading-6 text-neutral-700">
                      {note}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Release profile" icon={Smartphone}>
              <dl className="space-y-3 text-sm">
                <DetailRow label="Version" value={release.version} />
                <DetailRow label="Platform" value={release.platform} />
                <DetailRow label="Audience" value={release.audience} />
                <DetailRow label="Owner" value={release.owner} />
                <DetailRow label="Published" value={release.lastPublished} />
              </dl>
            </Panel>
            <Panel title="Feature controls" icon={Flag}>
              <div className="space-y-2">
                {flags.map((flag) => (
                  <button
                    type="button"
                    key={flag.id}
                    onClick={() =>
                      setFlags((current) =>
                        current.map((item) =>
                          item.id === flag.id
                            ? { ...item, enabled: !item.enabled }
                            : item,
                        ),
                      )
                    }
                    className="flex w-full items-center justify-between rounded-xl bg-neutral-50 px-3 py-3 text-left"
                  >
                    <span className="text-sm font-bold text-neutral-800">
                      {flag.label}
                    </span>
                    {flag.enabled ? (
                      <ToggleRight className="size-7 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="size-7 text-neutral-400" />
                    )}
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === "Test matrix" && (
        <Panel
          className="mt-6"
          title="Critical-flow device matrix"
          icon={TestTube2}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-400">
                <tr>
                  <th className="pb-3 font-semibold">Device</th>
                  <th className="pb-3 font-semibold">System</th>
                  <th className="pb-3 font-semibold">Viewport</th>
                  <th className="pb-3 font-semibold">Result</th>
                  <th className="pb-3 font-semibold">Duration</th>
                  <th className="pb-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {DEVICE_TESTS.map((test) => (
                  <tr key={test.device}>
                    <td className="py-4 font-bold text-neutral-900">
                      {test.device}
                    </td>
                    <td className="py-4 text-neutral-600">{test.system}</td>
                    <td className="py-4 text-neutral-600">{test.viewport}</td>
                    <td className="py-4">
                      <TestStatus status={test.status} />
                    </td>
                    <td className="py-4 text-neutral-500">{test.duration}</td>
                    <td className="py-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setNotice(`${test.device} regression run queued.`)
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                      >
                        <Play className="size-3.5" /> Rerun
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "Feedback" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
          <Panel title="Release feedback" icon={MessageSquare}>
            {releaseFeedback.length ? (
              <div className="space-y-3">
                {releaseFeedback.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-neutral-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-neutral-400">
                            {item.id}
                          </span>
                          <PriorityBadge priority={item.priority} />
                        </div>
                        <h3 className="mt-2 font-black text-neutral-950">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm text-neutral-500">
                          {item.reporter} · {item.date}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFeedback((current) =>
                            current.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, status: "Resolved" }
                                : entry,
                            ),
                          );
                          setNotice(`${item.id} marked resolved.`);
                        }}
                        disabled={item.status === "Resolved"}
                        className="rounded-full bg-neutral-950 px-3 py-2 text-xs font-bold text-white disabled:bg-emerald-600"
                      >
                        {item.status === "Resolved" ? "Resolved" : "Resolve"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-emerald-50 p-8 text-center">
                <CheckCircle2 className="mx-auto size-7 text-emerald-600" />
                <p className="mt-3 font-black text-emerald-950">
                  No open release feedback
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  This build is clear for the next review gate.
                </p>
              </div>
            )}
          </Panel>
          <Panel title="Triage target" icon={Clock3}>
            <p className="text-3xl font-black text-neutral-950">4 hrs</p>
            <p className="mt-1 text-sm text-neutral-500">
              High-priority acknowledgement
            </p>
            <div className="mt-5 space-y-3">
              <DetailRow
                label="Open"
                value={String(
                  releaseFeedback.filter((item) => item.status !== "Resolved")
                    .length,
                )}
              />
              <DetailRow label="Resolved this week" value="8" />
              <DetailRow label="Median resolution" value="1.8 days" />
            </div>
          </Panel>
        </div>
      )}

      {tab === "Preview" && (
        <div className="mt-6">
          <MobileAccessPreview role="admin" />
        </div>
      )}
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  body,
  actions,
}: {
  eyebrow: string;
  title: string;
  body: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">
          {eyebrow}
        </p>
        <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-tight text-neutral-950">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          {body}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  tone: "emerald" | "blue" | "amber";
}) {
  const toneClass = {
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
  }[tone];
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
      <span
        className={`flex size-10 items-center justify-center rounded-xl ${toneClass}`}
      >
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-neutral-950">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </section>
  );
}

function DarkMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/8 px-4 py-4 ring-1 ring-white/10">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-neutral-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ReleaseStatus }) {
  const tone = {
    Live: "bg-emerald-100 text-emerald-800",
    Pilot: "bg-blue-100 text-blue-800",
    Review: "bg-amber-100 text-amber-800",
    Paused: "bg-neutral-200 text-neutral-700",
  }[status];
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${tone}`}>
      {status}
    </span>
  );
}

function TestStatus({ status }: { status: string }) {
  const passed = status === "Passed";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
        passed
          ? "bg-emerald-100 text-emerald-800"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      {passed ? (
        <CheckCircle2 className="size-3.5" />
      ) : (
        <AlertTriangle className="size-3.5" />
      )}
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const tone =
    priority === "High"
      ? "bg-red-100 text-red-700"
      : priority === "Medium"
        ? "bg-amber-100 text-amber-700"
        : "bg-neutral-100 text-neutral-600";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>
      {priority}
    </span>
  );
}

function PlatformIcon({
  platform,
  className = "size-5",
}: {
  platform: MobileRelease["platform"];
  className?: string;
}) {
  if (platform === "Responsive web")
    return <MonitorSmartphone className={className} />;
  if (platform === "iOS") return <Smartphone className={className} />;
  return <TabletSmartphone className={className} />;
}

function Notice({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
    >
      <span className="flex items-center gap-2">
        <CheckCircle2 className="size-4 shrink-0" />
        {message}
      </span>
      <button
        type="button"
        aria-label="Dismiss message"
        onClick={onClose}
        className="text-emerald-700 hover:text-emerald-950"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200 ${className}`}
    >
      <div className="mb-5 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
          <Icon className="size-4.5" />
        </span>
        <h2 className="text-lg font-black text-neutral-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function HealthGauge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-neutral-700">{label}</span>
        <span className="font-black text-neutral-950">{value}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right font-bold text-neutral-900">{value}</dd>
    </div>
  );
}

function TestRunDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (scope: string) => void;
}) {
  const [scope, setScope] = useState("Critical mobile flows");
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="test-run-title"
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              DEVICE QUALITY
            </p>
            <h2
              id="test-run-title"
              className="mt-2 text-2xl font-black text-neutral-950"
            >
              Create a mobile test run
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Queue a validation pass against the current phone and tablet
              matrix.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close test run dialog"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600"
          >
            <X className="size-4" />
          </button>
        </div>
        <label className="mt-6 block text-sm font-bold text-neutral-800">
          Test scope
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold"
          >
            <option>Critical mobile flows</option>
            <option>Marketplace and quote flow</option>
            <option>Tracking and proof of delivery</option>
            <option>Signatures and alerts</option>
          </select>
        </label>
        <div className="mt-5 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">
          <p className="font-bold text-neutral-900">4 target devices</p>
          <p className="mt-1">
            iPhone 15 Pro, Pixel 9, Galaxy A54, and iPad Mini.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-bold text-neutral-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onCreate(scope)}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
          >
            <Play className="size-4" />
            Queue test run
          </button>
        </div>
      </div>
    </div>
  );
}
