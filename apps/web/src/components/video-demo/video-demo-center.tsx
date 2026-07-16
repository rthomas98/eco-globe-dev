"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpenCheck,
  Captions,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileText,
  Heart,
  MapPinned,
  Pause,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Users,
  X,
} from "lucide-react";

type Role = "public" | "buyer" | "seller" | "admin";
type Category =
  | "All"
  | "Marketplace"
  | "Operations"
  | "Compliance"
  | "Intelligence";

interface Chapter {
  title: string;
  time: number;
  scene: string;
  transcript: string;
}

interface DemoVideo {
  id: string;
  title: string;
  roles: Array<Role | "all">;
  category: Exclude<Category, "All">;
  duration: number;
  level: "Getting started" | "Workflow" | "Advanced";
  description: string;
  outcomes: string[];
  chapters: Chapter[];
  resources: Array<{ label: string; href: string }>;
}

const demos: DemoVideo[] = [
  {
    id: "marketplace",
    title: "Marketplace search and quote request",
    roles: ["buyer", "public"],
    category: "Marketplace",
    duration: 240,
    level: "Getting started",
    description:
      "Search by material, distance, quantity, price, and carbon impact, then request a verified quote.",
    outcomes: [
      "Build a precise search",
      "Compare verified listings",
      "Submit a quote request",
    ],
    chapters: [
      {
        title: "Start a material search",
        time: 0,
        scene: "Search verified feedstocks",
        transcript:
          "Begin by entering a material, delivery location, and required quantity. EcoGlobe narrows the marketplace to listings that can serve the request.",
      },
      {
        title: "Open product details",
        time: 58,
        scene: "Review supplier evidence",
        transcript:
          "Open a listing to review specifications, availability, supplier verification, certifications, and delivery readiness.",
      },
      {
        title: "Compare carbon impact",
        time: 124,
        scene: "Balance cost and CO2",
        transcript:
          "Compare landed price, distance, transport mode, and modeled carbon impact before choosing the strongest match.",
      },
      {
        title: "Request a quote",
        time: 188,
        scene: "Send the sourcing request",
        transcript:
          "Confirm quantity and delivery requirements, attach any buyer specifications, and submit the quote request.",
      },
    ],
    resources: [
      { label: "Open marketplace", href: "/buyer/browse" },
      { label: "View recommendations", href: "/buyer/recommendations" },
    ],
  },
  {
    id: "logistics",
    title: "Shipping quotes, Mapbox tracking, and delivery",
    roles: ["buyer", "seller", "admin"],
    category: "Operations",
    duration: 330,
    level: "Workflow",
    description:
      "Compare carriers, book a lane, follow the live route, and complete proof of delivery.",
    outcomes: [
      "Compare carrier options",
      "Track an active route",
      "Confirm delivery",
    ],
    chapters: [
      {
        title: "Calculate shipping",
        time: 0,
        scene: "Prepare the lane request",
        transcript:
          "Enter origin, destination, quantity, and the desired optimization goal to generate comparable carrier options.",
      },
      {
        title: "Book the best carrier",
        time: 82,
        scene: "Compare cost, carbon, and ETA",
        transcript:
          "Review each carrier on price, modeled emissions, delivery time, and service history before booking.",
      },
      {
        title: "Track on Mapbox",
        time: 166,
        scene: "Follow the live shipment",
        transcript:
          "Use the route map, milestones, and exception signals to understand exactly where the shipment stands.",
      },
      {
        title: "Confirm delivery",
        time: 258,
        scene: "Record proof and release readiness",
        transcript:
          "Confirm the receiver, review proof of delivery, and record the event that prepares escrow for release.",
      },
    ],
    resources: [
      { label: "Open logistics", href: "/buyer/logistics" },
      { label: "Open delivery tracking", href: "/buyer/delivery-tracking" },
    ],
  },
  {
    id: "contracts",
    title: "Contracts, signatures, and escrow milestones",
    roles: ["buyer", "seller", "admin"],
    category: "Operations",
    duration: 372,
    level: "Advanced",
    description:
      "Create recurring terms, manage negotiation, send signatures, and monitor release milestones.",
    outcomes: [
      "Create contract terms",
      "Request a redline",
      "Send for signature",
    ],
    chapters: [
      {
        title: "Create the contract",
        time: 0,
        scene: "Choose a template and counterparty",
        transcript:
          "Start with a recurring supply template and define quantity, pricing, delivery cadence, and renewal timing.",
      },
      {
        title: "Negotiate terms",
        time: 96,
        scene: "Capture redlines and notes",
        transcript:
          "Use the terms workspace to record negotiation notes and request a redline without losing the selected contract context.",
      },
      {
        title: "Collect signatures",
        time: 188,
        scene: "Send the agreement",
        transcript:
          "Send the approved version for signatures and monitor buyer, seller, and assurer completion.",
      },
      {
        title: "Track milestones",
        time: 284,
        scene: "Connect fulfillment to escrow",
        transcript:
          "Monitor deposit, shipment, inspection, and renewal milestones that affect contract readiness.",
      },
    ],
    resources: [
      { label: "Open contracts", href: "/buyer/contracts" },
      { label: "Open e-signatures", href: "/buyer/e-signatures" },
    ],
  },
  {
    id: "verification",
    title: "Buyer verification and document readiness",
    roles: ["buyer", "admin"],
    category: "Compliance",
    duration: 286,
    level: "Workflow",
    description:
      "Understand requirements, submit evidence, and monitor business, financial, and sustainability reviews.",
    outcomes: [
      "Review requirements",
      "Upload evidence",
      "Track approval status",
    ],
    chapters: [
      {
        title: "Understand the four sections",
        time: 0,
        scene: "Review verification coverage",
        transcript:
          "Buyer verification combines business identity, sustainability documents, financial readiness, and ongoing compliance.",
      },
      {
        title: "Review requirements",
        time: 66,
        scene: "Open the evidence checklist",
        transcript:
          "Each section explains the exact documents, supported file types, and expected review timing.",
      },
      {
        title: "Submit a document",
        time: 136,
        scene: "Attach current evidence",
        transcript:
          "Choose the correct section, upload an accepted file, and confirm that the submission moves into review.",
      },
      {
        title: "Resolve a gap",
        time: 216,
        scene: "Respond to review feedback",
        transcript:
          "Use the status and review notes to replace expired or incomplete evidence before the next order.",
      },
    ],
    resources: [
      { label: "Open verification", href: "/buyer/verification" },
      { label: "Open documents", href: "/buyer/documents" },
    ],
  },
  {
    id: "intelligence",
    title: "Analytics and AI-style recommendations",
    roles: ["buyer", "seller", "admin"],
    category: "Intelligence",
    duration: 348,
    level: "Advanced",
    description:
      "Explore portal performance, inspect impact trends, and convert explainable recommendations into action plans.",
    outcomes: [
      "Explore portal analytics",
      "Read recommendation evidence",
      "Create an action plan",
    ],
    chapters: [
      {
        title: "Choose a portal view",
        time: 0,
        scene: "Explore external portal performance",
        transcript:
          "Switch among buyer, school, pantry, operator, and transport views to understand each operating audience.",
      },
      {
        title: "Inspect working charts",
        time: 88,
        scene: "Compare ranges and impact",
        transcript:
          "Change time ranges, select a metric, inspect individual chart points, and review the activity mix.",
      },
      {
        title: "Review recommendation evidence",
        time: 176,
        scene: "Understand the decision signal",
        transcript:
          "Open a recommendation to see confidence, modeled impact, supporting evidence, and the reasons it surfaced.",
      },
      {
        title: "Create the action plan",
        time: 270,
        scene: "Assign accountable next steps",
        transcript:
          "Accept the recommendation, work through its checklist, and keep the supporting evidence visible.",
      },
    ],
    resources: [
      { label: "Open analytics", href: "/buyer/analytics" },
      { label: "Open recommendations", href: "/buyer/recommendations" },
    ],
  },
  {
    id: "mobile",
    title: "Mobile marketplace, tracking, and alerts",
    roles: ["buyer"],
    category: "Marketplace",
    duration: 270,
    level: "Getting started",
    description:
      "Preview the highest-value mobile workflows for browsing, tracking, signatures, and notifications.",
    outcomes: ["Browse and save", "Track a shipment", "Sign and review alerts"],
    chapters: [
      {
        title: "Browse materials",
        time: 0,
        scene: "Search from a mobile device",
        transcript:
          "Use the compact marketplace to search verified listings, save a result, and request a quote.",
      },
      {
        title: "Track delivery",
        time: 68,
        scene: "Follow the active shipment",
        transcript:
          "Review route status and confirm a delivery from the mobile tracking flow.",
      },
      {
        title: "Sign an agreement",
        time: 136,
        scene: "Complete mobile consent",
        transcript:
          "Review the key terms, confirm consent, and complete the signature flow.",
      },
      {
        title: "Manage alerts",
        time: 206,
        scene: "Stay current on activity",
        transcript:
          "Review delivery, payment, and compliance alerts and mark the queue as read.",
      },
    ],
    resources: [
      { label: "Open mobile access", href: "/buyer/mobile-access" },
      { label: "Open delivery tracking", href: "/buyer/delivery-tracking" },
    ],
  },
];

const categories: Category[] = [
  "All",
  "Marketplace",
  "Operations",
  "Compliance",
  "Intelligence",
];
const roleTitle: Record<Role, string> = {
  public: "EcoGlobe video demos",
  buyer: "Buyer video demos",
  seller: "Seller video demos",
  admin: "Admin video demos",
};

function formatTime(value: number) {
  const seconds = Math.max(0, Math.round(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function sceneIcon(id: string) {
  if (id === "logistics") return MapPinned;
  if (id === "verification") return ShieldCheck;
  if (id === "intelligence") return BarChart3;
  if (id === "mobile") return Smartphone;
  return ShoppingCart;
}

export function VideoDemoCenter({
  role,
  demoId,
}: {
  role: Role;
  demoId?: string;
}) {
  const available = useMemo(
    () =>
      demos.filter(
        (demo) =>
          demo.roles.includes("all") ||
          demo.roles.includes(role) ||
          role === "public",
      ),
    [role],
  );
  const [selectedId, setSelectedId] = useState(
    available.some((demo) => demo.id === demoId)
      ? demoId!
      : (available[0]?.id ?? "marketplace"),
  );
  const [category, setCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [captions, setCaptions] = useState(true);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [published, setPublished] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(available.map((demo) => [demo.id, true])),
  );

  const selected =
    available.find((demo) => demo.id === selectedId) ?? available[0];
  const visible = available.filter(
    (demo) =>
      (category === "All" || demo.category === category) &&
      (!query.trim() ||
        `${demo.title} ${demo.description}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  const activeChapter = selected.chapters.reduce(
    (current, chapter) => (chapter.time <= seconds ? chapter : current),
    selected.chapters[0],
  );
  const SceneIcon = sceneIcon(selected.id);
  const progress = (seconds / selected.duration) * 100;
  const completedCount = Object.values(completed).filter(Boolean).length;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setSeconds((current) =>
        Math.min(selected.duration, current + 0.5 * speed),
      );
    }, 500);
    return () => window.clearInterval(timer);
  }, [playing, selected, speed]);

  useEffect(() => {
    if (!playing || seconds < selected.duration) return;
    setPlaying(false);
    setCompleted((items) => ({ ...items, [selected.id]: true }));
    setNotice(`${selected.title} completed.`);
  }, [playing, seconds, selected]);

  function chooseDemo(id: string) {
    setSelectedId(id);
    setSeconds(0);
    setPlaying(false);
    setNotice("");
  }

  function downloadTranscript() {
    const transcript = selected.chapters
      .map(
        (chapter) =>
          `${formatTime(chapter.time)} — ${chapter.title}\n${chapter.transcript}`,
      )
      .join("\n\n");
    const url = URL.createObjectURL(
      new Blob([transcript], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selected.id}-transcript.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`${selected.title} transcript prepared.`);
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="mb-6 flex w-full flex-col items-start gap-4 lg:flex-row lg:items-start lg:justify-start">
          <div className="mr-auto w-full max-w-4xl self-start text-left">
            <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-emerald-700">
              VIDEO DEMO CENTER
            </p>
            <h1 className="text-3xl font-bold text-neutral-950">
              {roleTitle[role]}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-600">
              Learn complete EcoGlobe workflows through interactive guided demos
              with chapters, captions, transcripts, and progress tracking.
            </p>
          </div>
          {role === "admin" ? (
            <div className="flex shrink-0 flex-wrap gap-2 self-start lg:ml-auto">
              <button
                type="button"
                onClick={() => setAssignmentOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold text-neutral-800"
              >
                <Users className="size-4" /> Assign learning
              </button>
              <button
                type="button"
                onClick={() => setCatalogOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
              >
                <Settings2 className="size-4" /> Manage catalog
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Metric label="Available" value={String(available.length)} />
              <Metric
                label="Completed"
                value={`${completedCount}/${available.length}`}
              />
              <Metric
                label="Learning time"
                value={`${Math.round(available.reduce((sum, demo) => sum + demo.duration, 0) / 60)} min`}
              />
            </div>
          )}
        </header>

        {notice && (
          <div
            className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
            role="status"
          >
            {notice}
          </div>
        )}

        {role === "admin" && (
          <section className="mb-6 rounded-3xl bg-neutral-950 p-6 text-white shadow-xl sm:p-8">
            <div className="grid gap-6 xl:grid-cols-[1fr_620px] xl:items-end">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                  <BookOpenCheck className="size-4" /> Learning operations
                </p>
                <h2 className="mt-4 text-2xl font-black sm:text-3xl">
                  Publish guided learning and measure workflow readiness.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">
                  Govern the demo catalog, assign required learning, inspect
                  completion, and keep resources aligned with live admin
                  workflows.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <AdminMetric value={String(available.length)} label="Lessons" />
                <AdminMetric
                  value={String(
                    Object.values(published).filter(Boolean).length,
                  )}
                  label="Published"
                />
                <AdminMetric value="86%" label="Completion" />
                <AdminMetric value="148" label="Assigned" />
              </div>
            </div>
          </section>
        )}

        <section className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200">
          <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-end">
            <label>
              <span className="mb-2 block text-xs font-semibold text-neutral-500">
                SEARCH DEMOS
              </span>
              <span className="relative block">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search workflows"
                  className="min-h-11 w-full rounded-xl border border-neutral-200 py-2 pl-10 pr-3 outline-none focus:border-emerald-500"
                />
              </span>
            </label>
            <div className="flex flex-wrap gap-2" aria-label="Demo categories">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                  className={`rounded-full px-3 py-2 text-xs font-bold ${category === item ? "bg-neutral-950 text-white" : "bg-neutral-50 ring-1 ring-neutral-200"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Demo library</h2>
                <p className="text-xs text-neutral-500">
                  {visible.length} lessons
                </p>
              </div>
              <Sparkles className="size-5 text-amber-500" />
            </div>
            <div className="max-h-[720px] space-y-2 overflow-y-auto">
              {visible.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  aria-pressed={selected.id === demo.id}
                  onClick={() => chooseDemo(demo.id)}
                  className={`w-full rounded-xl p-4 text-left ring-1 ${selected.id === demo.id ? "bg-neutral-950 text-white ring-neutral-950" : "bg-white ring-neutral-200 hover:bg-neutral-50"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold ${selected.id === demo.id ? "bg-white/10" : "bg-neutral-100 text-neutral-600"}`}
                    >
                      {demo.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <Clock3 className="size-3" />
                      {formatTime(demo.duration)}
                    </span>
                  </div>
                  <h3 className="mt-3 font-bold">{demo.title}</h3>
                  <p
                    className={`mt-1 text-sm ${selected.id === demo.id ? "text-neutral-300" : "text-neutral-500"}`}
                  >
                    {demo.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span>{demo.level}</span>
                    {role === "admin" ? (
                      <span
                        className={`flex items-center gap-1 font-bold ${published[demo.id] ? "text-emerald-400" : "text-amber-400"}`}
                      >
                        {published[demo.id] ? (
                          <Eye className="size-3" />
                        ) : (
                          <Pause className="size-3" />
                        )}
                        {published[demo.id] ? "Published" : "Draft"}
                      </span>
                    ) : completed[demo.id] ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="size-3" />
                        Complete
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-neutral-200">
              <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-neutral-950 via-emerald-950 to-slate-950 text-white">
                <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,#34d399_0,transparent_35%),radial-gradient(circle_at_80%_70%,#3b82f6_0,transparent_32%)]" />
                <div className="relative flex h-full flex-col justify-between p-5 sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                      INTERACTIVE WALKTHROUGH
                    </span>
                    <button
                      type="button"
                      aria-label={
                        favorites[selected.id]
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                      aria-pressed={Boolean(favorites[selected.id])}
                      onClick={() =>
                        setFavorites((items) => ({
                          ...items,
                          [selected.id]: !items[selected.id],
                        }))
                      }
                      className="rounded-full bg-white/10 p-2"
                    >
                      <Heart
                        className={`size-5 ${favorites[selected.id] ? "fill-rose-400 text-rose-400" : ""}`}
                      />
                    </button>
                  </div>
                  <div className="mx-auto text-center">
                    <SceneIcon className="mx-auto size-12 text-emerald-300" />
                    <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-emerald-300">
                      {activeChapter.title}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold sm:text-4xl">
                      {activeChapter.scene}
                    </h2>
                    {captions && (
                      <p className="mx-auto mt-4 max-w-2xl rounded-lg bg-black/50 px-4 py-2 text-sm text-white">
                        {activeChapter.transcript}
                      </p>
                    )}
                  </div>
                  <div>
                    <input
                      type="range"
                      aria-label="Demo progress"
                      min={0}
                      max={selected.duration}
                      step={1}
                      value={Math.round(seconds)}
                      onChange={(event) =>
                        setSeconds(Number(event.target.value))
                      }
                      className="w-full accent-emerald-400"
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-mono text-xs">
                        {formatTime(seconds)} / {formatTime(selected.duration)}
                      </span>
                      <span className="text-xs">
                        {Math.round(progress)}% complete
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 border-b border-neutral-100 p-4">
                <button
                  type="button"
                  aria-label="Back 10 seconds"
                  onClick={() => setSeconds((value) => Math.max(0, value - 10))}
                  className="rounded-full p-2 hover:bg-neutral-100"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label={playing ? "Pause demo" : "Play demo"}
                  onClick={() => setPlaying((value) => !value)}
                  className="flex size-12 items-center justify-center rounded-full bg-neutral-950 text-white"
                >
                  {playing ? (
                    <Pause className="size-5 fill-current" />
                  ) : (
                    <Play className="ml-0.5 size-5 fill-current" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Forward 10 seconds"
                  onClick={() =>
                    setSeconds((value) =>
                      Math.min(selected.duration, value + 10),
                    )
                  }
                  className="rounded-full p-2 hover:bg-neutral-100"
                >
                  <ChevronRight className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="Toggle captions"
                  aria-pressed={captions}
                  onClick={() => setCaptions((value) => !value)}
                  className={`ml-2 rounded-full p-2 ${captions ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100"}`}
                >
                  <Captions className="size-5" />
                </button>
                <select
                  aria-label="Playback speed"
                  value={speed}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                  className="rounded-full border border-neutral-200 px-3 py-2 text-sm font-bold"
                >
                  <option value={0.75}>0.75×</option>
                  <option value={1}>1×</option>
                  <option value={1.25}>1.25×</option>
                  <option value={1.5}>1.5×</option>
                </select>
                <button
                  type="button"
                  onClick={downloadTranscript}
                  className="ml-auto inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-2 text-sm font-bold"
                >
                  <Download className="size-4" />
                  Transcript
                </button>
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold text-emerald-700">
                      {selected.category} · {selected.level}
                    </p>
                    <h2 className="mt-1 text-2xl font-bold">
                      {selected.title}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm text-neutral-600">
                      {selected.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCompleted((items) => ({
                        ...items,
                        [selected.id]: true,
                      }));
                      setNotice(`${selected.title} marked complete.`);
                    }}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-bold text-white"
                  >
                    {completed[selected.id] ? (
                      <Check className="size-4" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    {completed[selected.id] ? "Completed" : "Mark complete"}
                  </button>
                </div>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
                <h2 className="font-bold">Chapters</h2>
                <div className="mt-4 space-y-2">
                  {selected.chapters.map((chapter, index) => (
                    <button
                      key={chapter.title}
                      type="button"
                      aria-pressed={activeChapter.title === chapter.title}
                      onClick={() => {
                        setSeconds(chapter.time);
                        setPlaying(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ring-1 ${activeChapter.title === chapter.title ? "bg-emerald-50 ring-emerald-300" : "ring-neutral-200"}`}
                    >
                      <span
                        className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${activeChapter.title === chapter.title ? "bg-emerald-600 text-white" : "bg-neutral-100"}`}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">
                          {chapter.title}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {chapter.scene}
                        </span>
                      </span>
                      <span className="font-mono text-xs text-neutral-400">
                        {formatTime(chapter.time)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              <div className="space-y-6">
                <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
                  <h2 className="font-bold">What you’ll learn</h2>
                  <div className="mt-4 space-y-2">
                    {selected.outcomes.map((outcome) => (
                      <div
                        key={outcome}
                        className="flex gap-2 text-sm text-neutral-700"
                      >
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        {outcome}
                      </div>
                    ))}
                  </div>
                </section>
                <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
                  <h2 className="flex items-center gap-2 font-bold">
                    <FileText className="size-4" />
                    Related resources
                  </h2>
                  <div className="mt-3 space-y-2">
                    {selected.resources.map((resource) => (
                      <a
                        key={resource.href}
                        href={resource.href}
                        className="flex items-center justify-between rounded-xl bg-neutral-50 p-3 text-sm font-semibold hover:bg-neutral-100"
                      >
                        {resource.label}
                        <ChevronRight className="size-4" />
                      </a>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
      {catalogOpen && (
        <CatalogDialog
          demos={available}
          published={published}
          onToggle={(id) =>
            setPublished((current) => ({ ...current, [id]: !current[id] }))
          }
          onClose={() => setCatalogOpen(false)}
          onSave={() => {
            setCatalogOpen(false);
            setNotice("Demo catalog publication settings saved.");
          }}
        />
      )}
      {assignmentOpen && (
        <AssignmentDialog
          demos={available}
          onClose={() => setAssignmentOpen(false)}
          onAssign={(demo, audience) => {
            setAssignmentOpen(false);
            setNotice(`${demo} assigned to ${audience}.`);
          }}
        />
      )}
    </div>
  );
}

function CatalogDialog({
  demos,
  published,
  onToggle,
  onClose,
  onSave,
}: {
  demos: DemoVideo[];
  published: Record<string, boolean>;
  onToggle: (id: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <dialog
      open
      aria-labelledby="catalog-dialog-title"
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/40 p-4"
    >
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              CATALOG GOVERNANCE
            </p>
            <h2
              id="catalog-dialog-title"
              className="mt-2 text-2xl font-black text-neutral-950"
            >
              Manage video demos
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              Control which guided workflows are visible to assigned audiences.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close catalog dialog"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-neutral-100"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-6 space-y-2">
          {demos.map((demo) => (
            <button
              key={demo.id}
              type="button"
              aria-pressed={published[demo.id]}
              onClick={() => onToggle(demo.id)}
              className="flex w-full items-center justify-between rounded-xl bg-neutral-50 p-4 text-left"
            >
              <span>
                <span className="block font-bold text-neutral-900">
                  {demo.title}
                </span>
                <span className="mt-1 block text-xs text-neutral-500">
                  {demo.category} · {formatTime(demo.duration)}
                </span>
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${published[demo.id] ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-700"}`}
              >
                {published[demo.id] ? "Published" : "Draft"}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
          >
            Save catalog
          </button>
        </div>
      </div>
    </dialog>
  );
}

function AssignmentDialog({
  demos,
  onClose,
  onAssign,
}: {
  demos: DemoVideo[];
  onClose: () => void;
  onAssign: (demo: string, audience: string) => void;
}) {
  const [demoId, setDemoId] = useState(demos[0]?.id ?? "");
  const [audience, setAudience] = useState("Admin operations");
  const demo = demos.find((item) => item.id === demoId);
  return (
    <dialog
      open
      aria-labelledby="assignment-dialog-title"
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/40 p-4"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              LEARNING ASSIGNMENT
            </p>
            <h2
              id="assignment-dialog-title"
              className="mt-2 text-2xl font-black text-neutral-950"
            >
              Assign required learning
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close assignment dialog"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-neutral-100"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-6 grid gap-4">
          <label className="text-sm font-bold">
            Demo
            <select
              value={demoId}
              onChange={(event) => setDemoId(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3"
            >
              {demos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            Audience
            <select
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3"
            >
              <option>Admin operations</option>
              <option>Contract operations</option>
              <option>Logistics operations</option>
              <option>Compliance reviewers</option>
              <option>All internal users</option>
            </select>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!demo}
            onClick={() => demo && onAssign(demo.title, audience)}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
          >
            <Plus className="size-4" />
            Assign demo
          </button>
        </div>
      </div>
    </dialog>
  );
}

function AdminMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-24 rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-neutral-200">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 font-bold text-neutral-950">{value}</p>
    </div>
  );
}
