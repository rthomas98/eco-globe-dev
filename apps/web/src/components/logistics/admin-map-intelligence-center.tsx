"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Factory,
  FileCheck2,
  Filter,
  Gauge,
  Layers3,
  Leaf,
  Mail,
  Map,
  MapPin,
  MessageSquare,
  Network,
  Plus,
  Route,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { MapIntelligenceWorkspaceProps } from "./map-intelligence-workspace";

const MapIntelligenceWorkspace = dynamic<MapIntelligenceWorkspaceProps>(
  () =>
    import("./map-intelligence-workspace").then(
      (module) => module.MapIntelligenceWorkspace,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[620px] items-center justify-center rounded-2xl bg-slate-100 text-sm font-medium text-slate-500">
        Loading Mapbox network intelligence…
      </div>
    ),
  },
);

type FacilityStatus = "Live" | "Pilot" | "Partner review";
type DetailTab = "Overview" | "Lanes" | "Compliance" | "Activity";
type LngLat = [number, number];

interface Facility {
  id: string;
  name: string;
  location: string;
  region: string;
  coordinate: LngLat;
  status: FacilityStatus;
  verified: boolean;
  readiness: number;
  utilization: number;
  capacity: string;
  volume: string;
  carbonAvoided: string;
  coverageMiles: number;
  materials: string[];
  manager: { name: string; email: string };
  lanes: Array<{
    id: string;
    destination: string;
    distance: string;
    cost: string;
    carbon: string;
    status: string;
  }>;
  documents: Array<{
    name: string;
    status: "Verified" | "Review due";
    updated: string;
  }>;
  activity: Array<{ title: string; detail: string; date: string }>;
}

const FACILITIES: Facility[] = [
  {
    id: "FAC-PORT-ALLEN",
    name: "Port Allen Circular Terminal",
    location: "Port Allen, LA",
    region: "Gulf Coast",
    coordinate: [-91.2068, 30.4515],
    status: "Live",
    verified: true,
    readiness: 96,
    utilization: 78,
    capacity: "26,000 t/mo",
    volume: "$1.28M",
    carbonAvoided: "4.2 kt",
    coverageMiles: 420,
    materials: ["Black Gypsum", "Polymer Blend", "Reclaimed Carbon"],
    manager: { name: "Amelia Landry", email: "amelia@portallen.example" },
    lanes: [
      {
        id: "LN-2401",
        destination: "Houston, TX",
        distance: "271 mi",
        cost: "$2,960",
        carbon: "360 kg",
        status: "Active",
      },
      {
        id: "LN-2384",
        destination: "Mobile, AL",
        distance: "205 mi",
        cost: "$2,180",
        carbon: "284 kg",
        status: "Active",
      },
      {
        id: "LN-2322",
        destination: "Atlanta, GA",
        distance: "516 mi",
        cost: "$4,820",
        carbon: "612 kg",
        status: "Review",
      },
    ],
    documents: [
      {
        name: "Facility operating permit",
        status: "Verified",
        updated: "Jun 24, 2026",
      },
      {
        name: "Environmental compliance",
        status: "Verified",
        updated: "Jul 2, 2026",
      },
      {
        name: "Scale calibration",
        status: "Verified",
        updated: "May 18, 2026",
      },
    ],
    activity: [
      {
        title: "Houston corridor optimized",
        detail: "Balanced routing reduced modeled CO2 by 14%.",
        date: "Today",
      },
      {
        title: "Capacity plan updated",
        detail: "August receiving capacity increased by 2,400 tons.",
        date: "Jul 14",
      },
      {
        title: "Verification renewed",
        detail: "Environmental evidence accepted by admin review.",
        date: "Jul 2",
      },
    ],
  },
  {
    id: "FAC-PLAQUEMINE",
    name: "Plaquemine Recovery Yard",
    location: "Plaquemine, LA",
    region: "Gulf Coast",
    coordinate: [-91.234, 30.2891],
    status: "Live",
    verified: true,
    readiness: 88,
    utilization: 84,
    capacity: "18,500 t/mo",
    volume: "$920K",
    carbonAvoided: "3.1 kt",
    coverageMiles: 310,
    materials: ["Scrap Polymer Blend", "Industrial Residue"],
    manager: { name: "Terrence Cole", email: "terrence@plaquemine.example" },
    lanes: [
      {
        id: "LN-2412",
        destination: "Port Allen, LA",
        distance: "18 mi",
        cost: "$740",
        carbon: "82 kg",
        status: "Exception",
      },
      {
        id: "LN-2375",
        destination: "New Orleans, LA",
        distance: "78 mi",
        cost: "$1,240",
        carbon: "118 kg",
        status: "Active",
      },
    ],
    documents: [
      {
        name: "Facility operating permit",
        status: "Verified",
        updated: "Apr 11, 2026",
      },
      {
        name: "Yard access controls",
        status: "Review due",
        updated: "Jul 15, 2026",
      },
    ],
    activity: [
      {
        title: "Access issue escalated",
        detail: "Carrier geofence exception opened for lane LN-2412.",
        date: "Today",
      },
      {
        title: "New Orleans lane activated",
        detail: "Weekly short-haul allocation approved.",
        date: "Jul 8",
      },
    ],
  },
  {
    id: "FAC-HOUSTON",
    name: "Houston Circular Materials",
    location: "Houston, TX",
    region: "Gulf Coast",
    coordinate: [-95.3698, 29.7604],
    status: "Live",
    verified: true,
    readiness: 93,
    utilization: 69,
    capacity: "34,000 t/mo",
    volume: "$1.74M",
    carbonAvoided: "5.6 kt",
    coverageMiles: 560,
    materials: ["Black Gypsum", "Equipment Recovery", "Biomass"],
    manager: { name: "Devon Brooks", email: "devon@houstoncircular.example" },
    lanes: [
      {
        id: "LN-2390",
        destination: "Baton Rouge, LA",
        distance: "271 mi",
        cost: "$2,960",
        carbon: "360 kg",
        status: "Active",
      },
      {
        id: "LN-2368",
        destination: "Dallas, TX",
        distance: "239 mi",
        cost: "$2,340",
        carbon: "318 kg",
        status: "Active",
      },
    ],
    documents: [
      {
        name: "Facility verification",
        status: "Verified",
        updated: "Jun 12, 2026",
      },
      {
        name: "Material handling plan",
        status: "Verified",
        updated: "May 28, 2026",
      },
    ],
    activity: [
      {
        title: "Dallas lane benchmarked",
        detail: "Rail comparison added to the scenario model.",
        date: "Jul 12",
      },
      {
        title: "Capacity verified",
        detail: "Q3 intake allocation confirmed.",
        date: "Jun 30",
      },
    ],
  },
  {
    id: "FAC-NEW-ORLEANS",
    name: "New Orleans Materials Exchange",
    location: "New Orleans, LA",
    region: "Gulf Coast",
    coordinate: [-90.0715, 29.9511],
    status: "Live",
    verified: true,
    readiness: 91,
    utilization: 73,
    capacity: "22,000 t/mo",
    volume: "$1.16M",
    carbonAvoided: "3.8 kt",
    coverageMiles: 480,
    materials: ["Reclaimed Carbon", "Port Drayage", "Pyrolysis Pitch"],
    manager: { name: "Simone Pierre", email: "simone@nolaexchange.example" },
    lanes: [
      {
        id: "LN-2406",
        destination: "Atlanta, GA",
        distance: "469 mi",
        cost: "$4,260",
        carbon: "544 kg",
        status: "Active",
      },
      {
        id: "LN-2350",
        destination: "Port Allen, LA",
        distance: "92 mi",
        cost: "$1,460",
        carbon: "132 kg",
        status: "Active",
      },
    ],
    documents: [
      {
        name: "Port facility verification",
        status: "Verified",
        updated: "Jul 1, 2026",
      },
    ],
    activity: [
      {
        title: "Atlanta port lane activated",
        detail: "First optimized shipment released.",
        date: "Jul 10",
      },
    ],
  },
  {
    id: "FAC-DALLAS",
    name: "Dallas Equipment Recovery",
    location: "Dallas, TX",
    region: "South Central",
    coordinate: [-96.797, 32.7767],
    status: "Pilot",
    verified: true,
    readiness: 76,
    utilization: 52,
    capacity: "9,500 units/mo",
    volume: "$640K",
    carbonAvoided: "1.4 kt",
    coverageMiles: 390,
    materials: ["Used Transformers", "Industrial Equipment"],
    manager: { name: "Kara Foster", email: "kara@dallasequipment.example" },
    lanes: [
      {
        id: "LN-2368",
        destination: "Houston, TX",
        distance: "239 mi",
        cost: "$2,340",
        carbon: "318 kg",
        status: "Pilot",
      },
    ],
    documents: [
      {
        name: "Pilot facility review",
        status: "Review due",
        updated: "Jul 9, 2026",
      },
    ],
    activity: [
      {
        title: "Pilot milestone reviewed",
        detail: "Equipment inspection SLA met.",
        date: "Jul 9",
      },
    ],
  },
  {
    id: "FAC-ATLANTA",
    name: "Atlanta Biofeedstock Hub",
    location: "Atlanta, GA",
    region: "Southeast",
    coordinate: [-84.388, 33.749],
    status: "Partner review",
    verified: false,
    readiness: 64,
    utilization: 41,
    capacity: "14,000 t/mo",
    volume: "$380K",
    carbonAvoided: "820 t",
    coverageMiles: 350,
    materials: ["Pyrolysis Pitch", "Agricultural Biomass"],
    manager: { name: "Michelle Grant", email: "michelle@atlantabio.example" },
    lanes: [
      {
        id: "LN-2406",
        destination: "New Orleans, LA",
        distance: "469 mi",
        cost: "$4,260",
        carbon: "544 kg",
        status: "Review",
      },
    ],
    documents: [
      {
        name: "Facility verification",
        status: "Review due",
        updated: "Jul 14, 2026",
      },
      {
        name: "Environmental permit",
        status: "Verified",
        updated: "Jun 22, 2026",
      },
    ],
    activity: [
      {
        title: "Verification evidence submitted",
        detail: "Admin review assigned to L. Harper.",
        date: "Today",
      },
    ],
  },
];

export function AdminMapIntelligenceCenter({
  facilityId,
}: {
  facilityId?: string;
}) {
  const router = useRouter();
  const [facilities, setFacilities] = useState(FACILITIES);
  const selected = facilities.find((facility) => facility.id === facilityId);

  const updateFacility = (id: string, update: Partial<Facility>) => {
    setFacilities((current) =>
      current.map((facility) =>
        facility.id === id ? { ...facility, ...update } : facility,
      ),
    );
  };

  if (facilityId) {
    return selected ? (
      <FacilityDetail
        facility={selected}
        onBack={() => router.push("/admin/map-intelligence")}
        onUpdate={(update) => updateFacility(selected.id, update)}
      />
    ) : (
      <FacilityNotFound onBack={() => router.push("/admin/map-intelligence")} />
    );
  }

  return (
    <MapIntelligenceOverview
      facilities={facilities}
      onOpen={(id) => router.push(`/admin/map-intelligence/${id}`)}
      onApprove={(id) =>
        updateFacility(id, { status: "Pilot", verified: true, readiness: 78 })
      }
    />
  );
}

function MapIntelligenceOverview({
  facilities,
  onOpen,
  onApprove,
}: {
  facilities: Facility[];
  onOpen: (id: string) => void;
  onApprove: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FacilityStatus | "All">("All");
  const [layerState, setLayerState] = useState({
    facilities: true,
    corridors: true,
    risk: true,
    carbon: false,
  });
  const [notice, setNotice] = useState("");

  const visible = useMemo(() => {
    const query = search.toLowerCase().trim();
    return facilities.filter(
      (facility) =>
        (status === "All" || facility.status === status) &&
        (!query ||
          [
            facility.name,
            facility.location,
            facility.region,
            facility.id,
            ...facility.materials,
          ].some((value) => value.toLowerCase().includes(query))),
    );
  }, [facilities, search, status]);

  const live = facilities.filter(
    (facility) => facility.status === "Live",
  ).length;
  const totalLanes = facilities.reduce(
    (total, facility) => total + facility.lanes.length,
    0,
  );
  const avgReadiness = Math.round(
    facilities.reduce((total, facility) => total + facility.readiness, 0) /
      facilities.length,
  );
  const review = facilities.filter(
    (facility) =>
      !facility.verified ||
      facility.documents.some((document) => document.status === "Review due"),
  ).length;

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-emerald-700">
              MAP AND NETWORK INTELLIGENCE
            </p>
            <h1 className="max-w-4xl text-3xl font-bold tracking-[-0.02em] text-neutral-950">
              Plan facilities, corridors, landed cost, carbon impact, and
              regional readiness.
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
              Use Mapbox-powered ZIP analysis alongside verified network
              capacity, corridor performance, facility risk, and expansion
              readiness.
            </p>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200">
            Mapbox network operations
          </div>
        </div>

        <section className="overflow-hidden rounded-[28px] bg-neutral-950 text-white shadow-sm">
          <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8 lg:py-9">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                <Map className="size-4" /> National network command
              </div>
              <h2 className="mt-4 max-w-3xl text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                Turn geographic coverage into qualified, lower-carbon
                marketplace capacity.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                Compare verified facilities and modeled lanes, then move the
                strongest opportunities into sourcing, logistics, and expansion
                review.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <HeroStat label="Live facilities" value={String(live)} />
              <HeroStat label="Modeled lanes" value={String(totalLanes)} />
              <HeroStat label="Readiness" value={`${avgReadiness}%`} />
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Factory}
            label="Mapped facilities"
            value={String(facilities.length)}
            detail={`${live} active in the network`}
          />
          <SummaryCard
            icon={Route}
            label="Qualified corridors"
            value={String(totalLanes)}
            detail="Active, pilot, and review lanes"
          />
          <SummaryCard
            icon={Gauge}
            label="Network readiness"
            value={`${avgReadiness}%`}
            detail="Weighted facility readiness"
            tone="emerald"
          />
          <SummaryCard
            icon={AlertTriangle}
            label="Review exposure"
            value={String(review)}
            detail="Facilities or evidence requiring action"
            tone={review ? "amber" : "emerald"}
          />
        </section>

        {notice && (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          >
            {notice}
          </p>
        )}

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-neutral-950">Network map layers</h2>
              <p className="text-xs text-neutral-500">
                Choose the signals used during regional analysis.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(layerState).map(([key, enabled]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={enabled}
                  onClick={() =>
                    setLayerState((current) => ({
                      ...current,
                      [key]: !enabled,
                    }))
                  }
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold capitalize ${enabled ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-500"}`}
                >
                  <Layers3 className="size-3.5" />
                  {key}
                </button>
              ))}
            </div>
          </div>
        </section>

        <MapIntelligenceWorkspace role="admin" />

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative flex-1 xl:max-w-lg">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                aria-label="Search network facilities"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search facility, region, material…"
                className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm outline-none focus:border-neutral-900 focus:bg-white"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterSelect
                label="Facility status"
                value={status}
                onChange={(value) => setStatus(value as FacilityStatus | "All")}
                options={["All", "Live", "Pilot", "Partner review"]}
              />
              {(search || status !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatus("All");
                  }}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-neutral-950">
                Facility coverage portfolio
              </h2>
              <p className="text-xs text-neutral-500">
                {visible.length} mapped network facilities
              </p>
            </div>
            <SlidersHorizontal className="size-4 text-neutral-400" />
          </div>
          <div className="divide-y divide-neutral-100">
            {visible.map((facility) => (
              <FacilityRow
                key={facility.id}
                facility={facility}
                onOpen={() => onOpen(facility.id)}
                onApprove={() => {
                  onApprove(facility.id);
                  setNotice(
                    `${facility.name} moved into the verified pilot portfolio.`,
                  );
                }}
              />
            ))}
            {visible.length === 0 && (
              <div className="px-6 py-16 text-center">
                <Search className="mx-auto size-6 text-neutral-300" />
                <p className="mt-3 font-semibold text-neutral-800">
                  No facilities match
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  Clear the filters or search another region.
                </p>
              </div>
            )}
          </div>
        </section>

        <CorridorPortfolio facilities={facilities} />
      </div>
    </div>
  );
}

function FacilityRow({
  facility,
  onOpen,
  onApprove,
}: {
  facility: Facility;
  onOpen: () => void;
  onApprove: () => void;
}) {
  return (
    <article className="grid gap-4 px-5 py-5 transition hover:bg-neutral-50/70 xl:grid-cols-[minmax(260px,1.2fr)_150px_120px_120px_160px] xl:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
          <Factory className="size-5 text-neutral-600" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-bold text-neutral-950">
              {facility.name}
            </h3>
            <StatusBadge status={facility.status} />
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {facility.location} · {facility.region}
          </p>
          <p className="mt-2 line-clamp-1 text-xs text-neutral-500">
            {facility.materials.join(" · ")}
          </p>
        </div>
      </div>
      <ReadinessScore value={facility.readiness} />
      <Metric label="Utilization" value={`${facility.utilization}%`} />
      <Metric label="Coverage" value={`${facility.coverageMiles} mi`} />
      <div className="flex flex-wrap justify-end gap-2">
        {facility.status === "Partner review" && (
          <button
            type="button"
            onClick={onApprove}
            className="rounded-full border border-neutral-300 px-3 py-2 text-xs font-bold"
          >
            Approve pilot
          </button>
        )}
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1 rounded-full bg-neutral-950 px-3.5 py-2 text-xs font-bold text-white"
        >
          View facility <ChevronRight className="size-3.5" />
        </button>
      </div>
    </article>
  );
}

function FacilityDetail({
  facility,
  onBack,
  onUpdate,
}: {
  facility: Facility;
  onBack: () => void;
  onUpdate: (update: Partial<Facility>) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("Overview");
  const [notice, setNotice] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-950"
        >
          <ArrowLeft className="size-4" /> Back to map intelligence
        </button>
        <section className="overflow-hidden rounded-[28px] bg-neutral-950 text-white shadow-sm">
          <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-neutral-950">
                <Factory className="size-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={facility.status} inverted />
                  {facility.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold">
                      <BadgeCheck className="size-3" /> Verified
                    </span>
                  )}
                  <span className="font-mono text-xs text-neutral-500">
                    {facility.id}
                  </span>
                </div>
                <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
                  {facility.name}
                </h1>
                <p className="mt-2 text-sm text-neutral-400">
                  {facility.location} · {facility.region} ·{" "}
                  {facility.coverageMiles}-mile coverage
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMessageOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm font-bold hover:bg-white/10"
              >
                <MessageSquare className="size-4" /> Contact manager
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-bold text-neutral-950"
              >
                <BarChart3 className="size-4" /> Update capacity
              </button>
            </div>
          </div>
        </section>
        {notice && (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          >
            {notice}
          </p>
        )}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Gauge}
            label="Readiness"
            value={`${facility.readiness}%`}
            detail={facility.status}
            tone="emerald"
          />
          <SummaryCard
            icon={Factory}
            label="Capacity"
            value={facility.capacity}
            detail={`${facility.utilization}% utilized`}
          />
          <SummaryCard
            icon={CircleDollarSign}
            label="90-day volume"
            value={facility.volume}
            detail={`${facility.lanes.length} modeled lanes`}
          />
          <SummaryCard
            icon={Leaf}
            label="CO2 avoided"
            value={facility.carbonAvoided}
            detail="Modeled network impact"
            tone="emerald"
          />
        </section>
        <FacilityFocusMap facility={facility} />
        <div
          className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1"
          role="tablist"
          aria-label="Facility details"
        >
          {(["Overview", "Lanes", "Compliance", "Activity"] as DetailTab[]).map(
            (item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                onClick={() => setTab(item)}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${tab === item ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
              >
                {item}
              </button>
            ),
          )}
        </div>
        {tab === "Overview" && <FacilityOverview facility={facility} />}
        {tab === "Lanes" && (
          <FacilityLanes
            facility={facility}
            onCreate={() =>
              setNotice(
                "New corridor scenario added to the facility planning queue.",
              )
            }
          />
        )}
        {tab === "Compliance" && (
          <FacilityCompliance
            facility={facility}
            onRequest={() =>
              setNotice(`Evidence request sent to ${facility.manager.name}.`)
            }
          />
        )}
        {tab === "Activity" && <FacilityActivity facility={facility} />}
        {editOpen && (
          <CapacityDialog
            facility={facility}
            onClose={() => setEditOpen(false)}
            onSave={(utilization) => {
              onUpdate({ utilization });
              setEditOpen(false);
              setNotice("Facility capacity and utilization plan updated.");
            }}
          />
        )}
        {messageOpen && (
          <MessageDialog
            facility={facility}
            onClose={() => setMessageOpen(false)}
            onSend={() => {
              setMessageOpen(false);
              setNotice(`Message sent to ${facility.manager.name}.`);
            }}
          />
        )}
      </div>
    </div>
  );
}

function FacilityFocusMap({ facility }: { facility: Facility }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const validToken = Boolean(
    token && token.startsWith("pk.") && token !== "placeholder",
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!validToken || !token || !containerRef.current || mapRef.current)
      return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: facility.coordinate,
      zoom: 7.4,
      cooperativeGestures: true,
    });
    map.scrollZoom.disable();
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    const marker = document.createElement("div");
    marker.className =
      "size-7 rounded-full border-4 border-white bg-emerald-500 shadow-xl";
    new mapboxgl.Marker({ element: marker })
      .setLngLat(facility.coordinate)
      .setPopup(
        new mapboxgl.Popup({ offset: 18 }).setText(
          `${facility.name} · ${facility.capacity}`,
        ),
      )
      .addTo(map);
    map.on("load", () => setReady(true));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [
    facility.capacity,
    facility.coordinate,
    facility.name,
    token,
    validToken,
  ]);

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div>
          <h2 className="font-bold text-neutral-950">Facility coverage map</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {facility.location} · {facility.coverageMiles}-mile operating radius
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
          Mapbox live
        </span>
      </div>
      <div className="relative h-[420px]">
        {validToken ? (
          <>
            <div ref={containerRef} className="h-full w-full" />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sm text-slate-500">
                Loading facility map…
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 via-emerald-50 to-blue-100 p-6 text-center">
            <div className="rounded-2xl bg-white/90 p-6 shadow-lg">
              <MapPin className="mx-auto size-6 text-emerald-700" />
              <p className="mt-3 font-bold">Mapbox token required</p>
              <p className="mt-1 text-sm text-neutral-600">
                Configure the shared public Mapbox token to load facility
                coverage.
              </p>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow">
          Facility · {facility.name}
        </div>
      </div>
    </section>
  );
}

function FacilityOverview({ facility }: { facility: Facility }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <Panel title="Materials and operating profile" icon={Factory}>
        <p className="text-sm leading-6 text-neutral-600">
          This facility supports verified marketplace sourcing, logistics, and
          regional capacity planning across the {facility.region} corridor.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {facility.materials.map((material) => (
            <span
              key={material}
              className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"
            >
              {material}
            </span>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <MetricBox label="Monthly capacity" value={facility.capacity} />
          <MetricBox
            label="Current utilization"
            value={`${facility.utilization}%`}
          />
          <MetricBox
            label="Coverage radius"
            value={`${facility.coverageMiles} miles`}
          />
          <MetricBox
            label="Network readiness"
            value={`${facility.readiness}%`}
          />
        </div>
      </Panel>
      <Panel title="Facility manager" icon={Users}>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-neutral-950 text-sm font-bold text-white">
            {facility.manager.name
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </div>
          <div>
            <p className="font-bold text-neutral-950">
              {facility.manager.name}
            </p>
            <p className="text-sm text-neutral-500">Network facility manager</p>
          </div>
        </div>
        <a
          href={`mailto:${facility.manager.email}`}
          className="mt-5 flex items-center gap-3 text-sm text-neutral-700"
        >
          <Mail className="size-4 text-neutral-400" />
          {facility.manager.email}
        </a>
      </Panel>
    </div>
  );
}

function FacilityLanes({
  facility,
  onCreate,
}: {
  facility: Facility;
  onCreate: () => void;
}) {
  return (
    <Panel
      title="Modeled and active corridors"
      icon={Route}
      action={
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1 rounded-full bg-neutral-950 px-3 py-2 text-xs font-bold text-white"
        >
          <Plus className="size-3.5" /> New corridor
        </button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-400">
            <tr>
              <th className="pb-3">Lane</th>
              <th className="pb-3">Destination</th>
              <th className="pb-3">Distance</th>
              <th className="pb-3">Cost</th>
              <th className="pb-3">Carbon</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {facility.lanes.map((lane) => (
              <tr key={lane.id}>
                <td className="py-4 font-mono text-xs">{lane.id}</td>
                <td className="py-4 font-bold text-neutral-900">
                  {lane.destination}
                </td>
                <td className="py-4">{lane.distance}</td>
                <td className="py-4">{lane.cost}</td>
                <td className="py-4">{lane.carbon}</td>
                <td className="py-4">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold">
                    {lane.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function FacilityCompliance({
  facility,
  onRequest,
}: {
  facility: Facility;
  onRequest: () => void;
}) {
  return (
    <Panel
      title="Facility verification and evidence"
      icon={ShieldCheck}
      action={
        <button
          type="button"
          onClick={onRequest}
          className="rounded-full border border-neutral-200 px-3 py-2 text-xs font-bold"
        >
          Request evidence
        </button>
      }
    >
      <div className="divide-y divide-neutral-100">
        {facility.documents.map((document) => (
          <div
            key={document.name}
            className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-neutral-100">
                <FileCheck2 className="size-5 text-neutral-600" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900">
                  {document.name}
                </p>
                <p className="text-xs text-neutral-500">
                  Updated {document.updated}
                </p>
              </div>
            </div>
            <span
              className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${document.status === "Verified" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
            >
              {document.status}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function FacilityActivity({ facility }: { facility: Facility }) {
  return (
    <Panel title="Network activity" icon={Activity}>
      <Timeline items={facility.activity} />
    </Panel>
  );
}

function CorridorPortfolio({ facilities }: { facilities: Facility[] }) {
  const corridors = facilities
    .flatMap((facility) =>
      facility.lanes.map((lane) => ({ ...lane, origin: facility.location })),
    )
    .slice(0, 6);
  return (
    <Panel
      title="Priority corridor portfolio"
      icon={Network}
      action={
        <span className="text-xs font-semibold text-neutral-400">
          Modeled network
        </span>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {corridors.map((corridor) => (
          <article
            key={`${corridor.origin}-${corridor.id}`}
            className="rounded-2xl border border-neutral-200 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold">{corridor.id}</span>
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold">
                {corridor.status}
              </span>
            </div>
            <p className="mt-3 font-bold text-neutral-900">
              {corridor.origin} → {corridor.destination}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniMetric label="Distance" value={corridor.distance} />
              <MiniMetric label="Cost" value={corridor.cost} />
              <MiniMetric label="CO2" value={corridor.carbon} />
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function CapacityDialog({
  facility,
  onClose,
  onSave,
}: {
  facility: Facility;
  onClose: () => void;
  onSave: (utilization: number) => void;
}) {
  const [utilization, setUtilization] = useState(facility.utilization);
  return (
    <Modal
      title="Update facility capacity"
      description={`${facility.name} · ${facility.capacity}`}
      onClose={onClose}
    >
      <label className="block text-sm font-semibold text-neutral-800">
        Current utilization: {utilization}%
        <input
          type="range"
          min={10}
          max={100}
          value={utilization}
          onChange={(event) => setUtilization(Number(event.target.value))}
          className="mt-4 w-full accent-emerald-600"
        />
      </label>
      <div className="mt-5 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">
        The updated utilization will feed corridor readiness and expansion
        planning.
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-2 text-sm font-bold text-neutral-600"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(utilization)}
          className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white"
        >
          Save capacity plan
        </button>
      </div>
    </Modal>
  );
}

function MessageDialog({
  facility,
  onClose,
  onSend,
}: {
  facility: Facility;
  onClose: () => void;
  onSend: () => void;
}) {
  const [message, setMessage] = useState(
    `Please review the latest capacity, corridor, and compliance signals for ${facility.name}.`,
  );
  return (
    <Modal
      title={`Contact ${facility.manager.name}`}
      description={`${facility.name} · ${facility.location}`}
      onClose={onClose}
    >
      <textarea
        aria-label="Facility manager message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        className="min-h-36 w-full rounded-xl border border-neutral-200 p-4 text-sm outline-none focus:border-neutral-900"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-2 text-sm font-bold text-neutral-600"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSend}
          disabled={!message.trim()}
          className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white disabled:bg-neutral-300"
        >
          Send message
        </button>
      </div>
    </Modal>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "emerald" | "amber";
}) {
  const colors =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-100 text-amber-700"
        : "bg-neutral-100 text-neutral-600";
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
      <div
        className={`flex size-9 items-center justify-center rounded-xl ${colors}`}
      >
        <Icon className="size-4" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-neutral-950">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </article>
  );
}
function Panel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-neutral-500" />
          <h2 className="font-bold text-neutral-950">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function StatusBadge({
  status,
  inverted = false,
}: {
  status: FacilityStatus;
  inverted?: boolean;
}) {
  const tone = inverted
    ? "bg-white/10 text-white"
    : status === "Live"
      ? "bg-emerald-100 text-emerald-800"
      : status === "Pilot"
        ? "bg-blue-100 text-blue-800"
        : "bg-amber-100 text-amber-800";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}
    >
      {status}
    </span>
  );
}
function ReadinessScore({ value }: { value: number }) {
  const color =
    value >= 85
      ? "bg-emerald-500"
      : value >= 70
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-500">Readiness</span>
        <span className="font-bold text-neutral-900">{value}%</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-neutral-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-neutral-900">{value}</p>
    </div>
  );
}
function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-neutral-900">{value}</p>
    </div>
  );
}
function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-neutral-400">{label}</p>
      <p className="mt-1 text-xs font-bold text-neutral-800">{value}</p>
    </div>
  );
}
function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.06] px-4 py-3 text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
    </div>
  );
}
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <Filter className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 appearance-none rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-8 text-sm font-semibold text-neutral-700 outline-none"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
function Timeline({ items }: { items: Facility["activity"] }) {
  return (
    <div>
      {items.map((item, index) => (
        <div
          key={`${item.title}-${item.date}`}
          className="relative flex gap-4 pb-5 last:pb-0"
        >
          <div className="relative z-10 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-3.5 text-emerald-700" />
          </div>
          {index < items.length - 1 && (
            <div className="absolute left-[11px] top-7 h-[calc(100%-20px)] w-px bg-neutral-200" />
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold text-neutral-900">{item.title}</p>
              <span className="text-xs text-neutral-400">{item.date}</span>
            </div>
            <p className="mt-1 text-sm text-neutral-500">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-neutral-950/45 backdrop-blur-sm"
      />
      <dialog
        open
        aria-modal="true"
        className="relative z-10 m-0 w-full max-w-xl rounded-[24px] bg-white p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-950">{title}</h2>
            <p className="mt-1 text-sm text-neutral-500">{description}</p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </dialog>
    </div>
  );
}
function FacilityNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-neutral-200">
        <AlertTriangle className="mx-auto size-8 text-amber-500" />
        <h1 className="mt-4 text-xl font-bold text-neutral-950">
          Facility record not found
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          This map intelligence record may have been removed or the address is
          incorrect.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white"
        >
          Return to map intelligence
        </button>
      </section>
    </div>
  );
}
