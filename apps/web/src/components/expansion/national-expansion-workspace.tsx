"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  CircleAlert,
  Download,
  Factory,
  Handshake,
  Leaf,
  Target,
  TrendingUp,
} from "lucide-react";

type Role = "buyer" | "seller" | "admin" | "public";
type RegionStatus = "Live" | "Pilot" | "Partner review" | "Scouting";
type FacilityStatus = "Active" | "Onboarding" | "Planned";
type RangeKey = "90 days" | "12 months" | "3 years";
type LngLat = [number, number];

interface Facility {
  id: string;
  name: string;
  location: string;
  coordinate: LngLat;
  materials: string;
  capacity: string;
  status: FacilityStatus;
}

interface Partner {
  name: string;
  type: string;
  status: "Active" | "Due diligence" | "Introduced";
  transactions: number;
  volume: string;
  contact: string;
}

interface RegionDefinition {
  id: string;
  name: string;
  corridor: string;
  coordinate: LngLat;
  zoom: number;
  states: string[];
  status: RegionStatus;
  readiness: number;
  facilities: number;
  partners: number;
  transactions: number;
  volumeMillions: number;
  tonnage: number;
  carbon: number;
  trend: number[];
  opportunity: string;
  blocker: string;
  milestones: string[];
  facilityList: Facility[];
  partnerList: Partner[];
}

export interface NationalExpansionWorkspaceProps {
  role: Role;
}

const regions: RegionDefinition[] = [
  {
    id: "gulf",
    name: "Gulf Coast",
    corridor: "Texas · Louisiana · Mississippi · Alabama",
    coordinate: [-92.4, 30.1],
    zoom: 5.1,
    states: ["TX", "LA", "MS", "AL"],
    status: "Live",
    readiness: 94,
    facilities: 18,
    partners: 14,
    transactions: 642,
    volumeMillions: 1.28,
    tonnage: 18200,
    carbon: 59.4,
    trend: [72, 84, 91, 108, 126, 142],
    opportunity: "$4.2M qualified annual pipeline",
    blocker: "Three partner certificates renew this quarter.",
    milestones: [
      "Anchor buyers active",
      "Carrier coverage established",
      "Assurance partner contracted",
      "Regional marketing launched",
    ],
    facilityList: [
      {
        id: "FAC-GC-01",
        name: "Houston Circular Materials",
        location: "Houston, TX",
        coordinate: [-95.3698, 29.7604],
        materials: "Industrial byproducts",
        capacity: "8,400 t / mo",
        status: "Active",
      },
      {
        id: "FAC-GC-02",
        name: "Port Allen Circular Terminal",
        location: "Port Allen, LA",
        coordinate: [-91.2068, 30.4515],
        materials: "Recovered feedstocks",
        capacity: "5,100 t / mo",
        status: "Active",
      },
      {
        id: "FAC-GC-03",
        name: "Mobile Recovery Hub",
        location: "Mobile, AL",
        coordinate: [-88.0399, 30.6954],
        materials: "Biomass and polymers",
        capacity: "3,600 t / mo",
        status: "Onboarding",
      },
    ],
    partnerList: [
      {
        name: "GreenLine Logistics",
        type: "Transport",
        status: "Active",
        transactions: 138,
        volume: "$412k",
        contact: "Morgan Lee",
      },
      {
        name: "Bayou Industrial Sponsors",
        type: "Regional sponsor",
        status: "Active",
        transactions: 44,
        volume: "$186k",
        contact: "Andre Mitchell",
      },
      {
        name: "Circular Assurance Group",
        type: "Assurance",
        status: "Active",
        transactions: 39,
        volume: "$162k",
        contact: "Elena Brooks",
      },
    ],
  },
  {
    id: "southeast",
    name: "Southeast",
    corridor: "Georgia · Florida · Carolinas · Tennessee",
    coordinate: [-83.6, 33.4],
    zoom: 5,
    states: ["GA", "FL", "NC", "SC", "TN"],
    status: "Pilot",
    readiness: 78,
    facilities: 12,
    partners: 9,
    transactions: 284,
    volumeMillions: 0.74,
    tonnage: 9600,
    carbon: 31.8,
    trend: [28, 34, 39, 47, 58, 67],
    opportunity: "$2.6M food recovery and biomass pipeline",
    blocker: "Cold-chain capacity is limited in two target metros.",
    milestones: [
      "Pilot schools enrolled",
      "Pantry network committed",
      "Cold-chain lane confirmed",
      "State procurement review complete",
    ],
    facilityList: [
      {
        id: "FAC-SE-01",
        name: "Atlanta Biofeedstock Hub",
        location: "Atlanta, GA",
        coordinate: [-84.388, 33.749],
        materials: "Biomass",
        capacity: "4,200 t / mo",
        status: "Active",
      },
      {
        id: "FAC-SE-02",
        name: "Savannah Food Recovery",
        location: "Savannah, GA",
        coordinate: [-81.0998, 32.0809],
        materials: "Food recovery",
        capacity: "1,900 t / mo",
        status: "Onboarding",
      },
      {
        id: "FAC-SE-03",
        name: "Charlotte Materials Exchange",
        location: "Charlotte, NC",
        coordinate: [-80.8431, 35.2271],
        materials: "Recovered materials",
        capacity: "2,800 t / mo",
        status: "Planned",
      },
    ],
    partnerList: [
      {
        name: "Southeast Circular Schools",
        type: "School network",
        status: "Active",
        transactions: 62,
        volume: "$144k",
        contact: "Dana Hughes",
      },
      {
        name: "Coastal Pantry Alliance",
        type: "Pantry network",
        status: "Due diligence",
        transactions: 18,
        volume: "$72k",
        contact: "Maya Grant",
      },
      {
        name: "Atlantic Green Freight",
        type: "Transport",
        status: "Introduced",
        transactions: 0,
        volume: "$0",
        contact: "Derrick Cole",
      },
    ],
  },
  {
    id: "midwest",
    name: "Midwest Biomass",
    corridor: "Illinois · Iowa · Wisconsin · Minnesota",
    coordinate: [-91.4, 42.3],
    zoom: 4.7,
    states: ["IL", "IA", "WI", "MN"],
    status: "Partner review",
    readiness: 64,
    facilities: 9,
    partners: 7,
    transactions: 118,
    volumeMillions: 0.48,
    tonnage: 7400,
    carbon: 24.6,
    trend: [12, 16, 20, 24, 29, 35],
    opportunity: "$3.1M agricultural residue pipeline",
    blocker: "Seasonal storage standards need regional alignment.",
    milestones: [
      "Feedstock supply mapped",
      "Anchor processor identified",
      "Storage protocol approved",
      "Winter carrier capacity reserved",
    ],
    facilityList: [
      {
        id: "FAC-MW-01",
        name: "Iowa Agricultural Exchange",
        location: "Des Moines, IA",
        coordinate: [-93.625, 41.5868],
        materials: "Corn stover",
        capacity: "6,700 t / mo",
        status: "Onboarding",
      },
      {
        id: "FAC-MW-02",
        name: "Chicago Recovery Terminal",
        location: "Chicago, IL",
        coordinate: [-87.6298, 41.8781],
        materials: "Recovered polymers",
        capacity: "4,100 t / mo",
        status: "Planned",
      },
      {
        id: "FAC-MW-03",
        name: "Twin Cities Biomass Yard",
        location: "Minneapolis, MN",
        coordinate: [-93.265, 44.9778],
        materials: "Agricultural residue",
        capacity: "5,300 t / mo",
        status: "Planned",
      },
    ],
    partnerList: [
      {
        name: "Heartland Bio Cooperative",
        type: "Supplier network",
        status: "Due diligence",
        transactions: 22,
        volume: "$96k",
        contact: "Rachel Kim",
      },
      {
        name: "Midwest Rail Logistics",
        type: "Transport",
        status: "Introduced",
        transactions: 0,
        volume: "$0",
        contact: "Tom Erickson",
      },
      {
        name: "Prairie Assurance",
        type: "Assurance",
        status: "Due diligence",
        transactions: 8,
        volume: "$31k",
        contact: "Chris Allen",
      },
    ],
  },
  {
    id: "midatlantic",
    name: "Mid-Atlantic",
    corridor: "Pennsylvania · Maryland · Virginia · New Jersey",
    coordinate: [-76.7, 39.3],
    zoom: 5.4,
    states: ["PA", "MD", "VA", "NJ"],
    status: "Pilot",
    readiness: 72,
    facilities: 11,
    partners: 8,
    transactions: 176,
    volumeMillions: 0.62,
    tonnage: 8100,
    carbon: 27.1,
    trend: [18, 23, 27, 32, 41, 48],
    opportunity: "$2.2M manufacturing byproduct pipeline",
    blocker: "Cross-state waste classifications need legal review.",
    milestones: [
      "Buyer demand validated",
      "Two carriers qualified",
      "State classification review",
      "Pilot contracts signed",
    ],
    facilityList: [
      {
        id: "FAC-MA-01",
        name: "Baltimore Circular Port",
        location: "Baltimore, MD",
        coordinate: [-76.6122, 39.2904],
        materials: "Industrial byproducts",
        capacity: "4,900 t / mo",
        status: "Active",
      },
      {
        id: "FAC-MA-02",
        name: "Richmond Materials Hub",
        location: "Richmond, VA",
        coordinate: [-77.436, 37.5407],
        materials: "Recovered materials",
        capacity: "3,200 t / mo",
        status: "Onboarding",
      },
      {
        id: "FAC-MA-03",
        name: "Lehigh Valley Exchange",
        location: "Allentown, PA",
        coordinate: [-75.4902, 40.6084],
        materials: "Manufacturing residue",
        capacity: "2,700 t / mo",
        status: "Planned",
      },
    ],
    partnerList: [
      {
        name: "Atlantic Manufacturers Council",
        type: "Regional sponsor",
        status: "Active",
        transactions: 36,
        volume: "$118k",
        contact: "Nora Blake",
      },
      {
        name: "Chesapeake Freight",
        type: "Transport",
        status: "Active",
        transactions: 47,
        volume: "$153k",
        contact: "Caleb Price",
      },
      {
        name: "Keystone Circular Buyers",
        type: "Buyer network",
        status: "Due diligence",
        transactions: 14,
        volume: "$54k",
        contact: "Priya Shah",
      },
    ],
  },
  {
    id: "southwest",
    name: "Southwest",
    corridor: "Arizona · New Mexico · Nevada",
    coordinate: [-111.1, 34.8],
    zoom: 4.8,
    states: ["AZ", "NM", "NV"],
    status: "Scouting",
    readiness: 41,
    facilities: 5,
    partners: 4,
    transactions: 42,
    volumeMillions: 0.19,
    tonnage: 2900,
    carbon: 9.8,
    trend: [4, 5, 7, 8, 11, 14],
    opportunity: "$1.7M construction recovery pipeline",
    blocker: "Long-haul economics require two local anchor buyers.",
    milestones: [
      "Material supply mapped",
      "Anchor buyers recruited",
      "Local carrier economics validated",
      "Pilot city selected",
    ],
    facilityList: [
      {
        id: "FAC-SW-01",
        name: "Phoenix Recovery Yard",
        location: "Phoenix, AZ",
        coordinate: [-112.074, 33.4484],
        materials: "Construction recovery",
        capacity: "2,600 t / mo",
        status: "Onboarding",
      },
      {
        id: "FAC-SW-02",
        name: "Albuquerque Materials Exchange",
        location: "Albuquerque, NM",
        coordinate: [-106.6504, 35.0844],
        materials: "Industrial residue",
        capacity: "1,800 t / mo",
        status: "Planned",
      },
      {
        id: "FAC-SW-03",
        name: "Las Vegas Circular Hub",
        location: "Las Vegas, NV",
        coordinate: [-115.1398, 36.1699],
        materials: "Recovered construction",
        capacity: "2,100 t / mo",
        status: "Planned",
      },
    ],
    partnerList: [
      {
        name: "Desert Recovery Alliance",
        type: "Supplier network",
        status: "Introduced",
        transactions: 6,
        volume: "$21k",
        contact: "Luis Ortega",
      },
      {
        name: "Southwest Clean Freight",
        type: "Transport",
        status: "Due diligence",
        transactions: 8,
        volume: "$28k",
        contact: "Jamie Ross",
      },
      {
        name: "Arizona Circular Council",
        type: "Regional sponsor",
        status: "Introduced",
        transactions: 0,
        volume: "$0",
        contact: "Alicia Moore",
      },
    ],
  },
  {
    id: "west",
    name: "West Coast",
    corridor: "California · Oregon · Washington",
    coordinate: [-121.4, 38.6],
    zoom: 4.5,
    states: ["CA", "OR", "WA"],
    status: "Scouting",
    readiness: 53,
    facilities: 8,
    partners: 6,
    transactions: 86,
    volumeMillions: 0.37,
    tonnage: 5100,
    carbon: 18.2,
    trend: [8, 11, 13, 17, 21, 27],
    opportunity: "$3.8M low-carbon procurement pipeline",
    blocker: "Local regulatory and marketplace integrations are unconfirmed.",
    milestones: [
      "Demand interviews complete",
      "Anchor supplier identified",
      "Regulatory pathway confirmed",
      "Marketplace integration scoped",
    ],
    facilityList: [
      {
        id: "FAC-WC-01",
        name: "Sacramento Circular Exchange",
        location: "Sacramento, CA",
        coordinate: [-121.4944, 38.5816],
        materials: "Low-carbon feedstocks",
        capacity: "3,700 t / mo",
        status: "Onboarding",
      },
      {
        id: "FAC-WC-02",
        name: "Portland Recovery Network",
        location: "Portland, OR",
        coordinate: [-122.6765, 45.5231],
        materials: "Recovered materials",
        capacity: "2,900 t / mo",
        status: "Planned",
      },
      {
        id: "FAC-WC-03",
        name: "Puget Sound Materials Hub",
        location: "Seattle, WA",
        coordinate: [-122.3321, 47.6062],
        materials: "Industrial byproducts",
        capacity: "3,100 t / mo",
        status: "Planned",
      },
    ],
    partnerList: [
      {
        name: "Pacific Circular Buyers",
        type: "Buyer network",
        status: "Due diligence",
        transactions: 18,
        volume: "$68k",
        contact: "Sonia Patel",
      },
      {
        name: "WestGreen Logistics",
        type: "Transport",
        status: "Introduced",
        transactions: 0,
        volume: "$0",
        contact: "Marcus Liu",
      },
      {
        name: "California Materials Council",
        type: "Regional sponsor",
        status: "Introduced",
        transactions: 0,
        volume: "$0",
        contact: "Evan Brooks",
      },
    ],
  },
];

const rangeLabels: Record<RangeKey, string[]> = {
  "90 days": ["May 1", "May 18", "Jun 4", "Jun 21", "Jul 8", "Today"],
  "12 months": ["Aug", "Oct", "Dec", "Feb", "Apr", "Today"],
  "3 years": ["2024 H1", "2024 H2", "2025 H1", "2025 H2", "2026 H1", "Today"],
};

const rangeScale: Record<RangeKey, number> = {
  "90 days": 1,
  "12 months": 3.2,
  "3 years": 8.4,
};
const statusColors: Record<RegionStatus, string> = {
  Live: "#059669",
  Pilot: "#2563EB",
  "Partner review": "#D97706",
  Scouting: "#64748B",
};
const STATIC_MAP_CENTER: LngLat = [-98.4, 38.2];
const STATIC_MAP_ZOOM = 3.1;
const STATIC_MAP_WIDTH = 1280;
const STATIC_MAP_HEIGHT = 500;

function validMapToken(token: string | undefined): token is string {
  return Boolean(token && token !== "placeholder" && token.startsWith("pk."));
}

function projectCoordinate([longitude, latitude]: LngLat) {
  const worldSize = 512 * 2 ** STATIC_MAP_ZOOM;
  const mercatorX = (value: number) => (value + 180) / 360;
  const mercatorY = (value: number) => {
    const radians = (Math.max(-85, Math.min(85, value)) * Math.PI) / 180;
    return (
      (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2
    );
  };
  const x =
    (mercatorX(longitude) - mercatorX(STATIC_MAP_CENTER[0])) * worldSize +
    STATIC_MAP_WIDTH / 2;
  const y =
    (mercatorY(latitude) - mercatorY(STATIC_MAP_CENTER[1])) * worldSize +
    STATIC_MAP_HEIGHT / 2;
  return {
    left: `${(x / STATIC_MAP_WIDTH) * 100}%`,
    top: `${(y / STATIC_MAP_HEIGHT) * 100}%`,
  };
}

export function NationalExpansionWorkspace({
  role,
}: NationalExpansionWorkspaceProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const hasMap = validMapToken(token);
  const [selectedId, setSelectedId] = useState("gulf");
  const [range, setRange] = useState<RangeKey>("90 days");
  const [selectedPoint, setSelectedPoint] = useState(5);
  const [facilityFilter, setFacilityFilter] = useState<FacilityStatus | "All">(
    "All",
  );
  const [selectedPartner, setSelectedPartner] = useState(0);
  const [compareId, setCompareId] = useState("southeast");
  const [milestones, setMilestones] = useState<Record<string, number[]>>({});
  const [notice, setNotice] = useState("");

  const selected =
    regions.find((region) => region.id === selectedId) ?? regions[0];
  const comparison =
    regions.find((region) => region.id === compareId) ?? regions[1];
  const labels = rangeLabels[range];
  const trend = selected.trend.map((value) =>
    Math.round(value * rangeScale[range]),
  );
  const maxTrend = Math.max(...trend) * 1.08;
  const visibleFacilities = selected.facilityList.filter(
    (facility) =>
      facilityFilter === "All" || facility.status === facilityFilter,
  );
  const activePartner =
    selected.partnerList[selectedPartner] ?? selected.partnerList[0];
  const completed = milestones[selected.id] ?? [];
  const staticMapUrl = hasMap
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${STATIC_MAP_CENTER[0]},${STATIC_MAP_CENTER[1]},${STATIC_MAP_ZOOM},0/${STATIC_MAP_WIDTH}x${STATIC_MAP_HEIGHT}@2x?access_token=${token}`
    : undefined;
  const totals = useMemo(
    () => ({
      facilities: regions.reduce((sum, region) => sum + region.facilities, 0),
      partners: regions.reduce((sum, region) => sum + region.partners, 0),
      transactions: regions.reduce(
        (sum, region) => sum + region.transactions,
        0,
      ),
      volume: regions.reduce((sum, region) => sum + region.volumeMillions, 0),
    }),
    [],
  );

  function changeRegion(id: string) {
    setSelectedId(id);
    setSelectedPoint(5);
    setFacilityFilter("All");
    setSelectedPartner(0);
    setNotice("");
    if (id === compareId)
      setCompareId(regions.find((region) => region.id !== id)?.id ?? "gulf");
  }

  function toggleMilestone(index: number) {
    setMilestones((current) => {
      const items = current[selected.id] ?? [];
      return {
        ...current,
        [selected.id]: items.includes(index)
          ? items.filter((item) => item !== index)
          : [...items, index],
      };
    });
  }

  function exportBrief() {
    const rows = [
      ["Region", selected.name],
      ["Status", selected.status],
      ["Readiness", `${selected.readiness}%`],
      ["Facilities", selected.facilities],
      ["Partners", selected.partners],
      ["Transactions", selected.transactions],
      ["Opportunity", selected.opportunity],
      ["Blocker", selected.blocker],
    ];
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selected.id}-expansion-brief.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`${selected.name} expansion brief prepared.`);
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-sm">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-emerald-300">
              <Target className="size-5" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                National growth command center
              </span>
            </div>
            <h2 className="mt-3 max-w-3xl text-2xl font-bold sm:text-3xl">
              Plan regional expansion with coverage, liquidity, and readiness in
              one view.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-neutral-300">
              Compare six corridors, inspect Mapbox-powered facility coverage,
              and move the strongest markets toward launch.
            </p>
          </div>
          <button
            type="button"
            onClick={exportBrief}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-bold text-emerald-950"
          >
            <Download className="size-4" />
            Export expansion brief
          </button>
        </div>
        {notice && (
          <div
            className="border-t border-white/10 bg-white/5 px-5 py-3 text-sm text-emerald-200"
            role="status"
          >
            {notice}
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Factory}
          label="Mapped facilities"
          value={String(totals.facilities)}
          detail="Across six priority corridors"
        />
        <SummaryCard
          icon={Handshake}
          label="Pilot partners"
          value={String(totals.partners)}
          detail="Active, review, and introduced"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Transactions"
          value={totals.transactions.toLocaleString()}
          detail="Completed and pilot activity"
        />
        <SummaryCard
          icon={Leaf}
          label="Network volume"
          value={`$${totals.volume.toFixed(2)}M`}
          detail="Modeled 90-day marketplace value"
        />
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
        <div className="grid xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <div
            className="relative min-h-[500px] overflow-hidden bg-slate-100 bg-cover bg-center"
            style={
              staticMapUrl
                ? { backgroundImage: `url("${staticMapUrl}")` }
                : undefined
            }
            role="img"
            aria-label="National expansion Mapbox map"
          >
            {hasMap ? (
              <>
                <div className="absolute inset-0 bg-slate-950/5" />
                {regions.map((region) => {
                  const active = selected.id === region.id;
                  return (
                    <button
                      key={region.id}
                      type="button"
                      aria-label={`Select ${region.name} region`}
                      aria-pressed={active}
                      onClick={() => changeRegion(region.id)}
                      className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white text-xs font-extrabold text-white shadow-lg transition-transform hover:scale-110"
                      style={{
                        ...projectCoordinate(region.coordinate),
                        width: active ? 44 : 36,
                        height: active ? 44 : 36,
                        backgroundColor: statusColors[region.status],
                        boxShadow: active
                          ? "0 0 0 8px rgba(5,150,105,.2), 0 8px 20px rgba(15,23,42,.35)"
                          : "0 4px 12px rgba(15,23,42,.3)",
                      }}
                    >
                      {region.facilities}
                    </button>
                  );
                })}
                {selected.facilityList.map((facility) => (
                  <button
                    key={facility.id}
                    type="button"
                    aria-label={facility.name}
                    title={`${facility.name} · ${facility.status}`}
                    className="absolute z-30 size-5 -translate-x-1/2 -translate-y-1/2 rounded border-2 border-white shadow-lg transition-transform hover:scale-125"
                    style={{
                      ...projectCoordinate(facility.coordinate),
                      backgroundColor:
                        facility.status === "Active"
                          ? "#0F172A"
                          : facility.status === "Onboarding"
                            ? "#F59E0B"
                            : "#94A3B8",
                    }}
                  />
                ))}
                <div className="absolute bottom-3 left-3 z-20 rounded-lg bg-white/95 px-3 py-2 text-[10px] font-semibold text-neutral-600 shadow">
                  Mapbox Streets · Region circles show mapped facilities
                </div>
                <div className="absolute bottom-2 right-2 z-20 flex gap-2 rounded bg-white/90 px-2 py-1 text-[9px] text-neutral-600">
                  <a
                    href="https://www.mapbox.com/about/maps"
                    target="_blank"
                    rel="noreferrer"
                  >
                    © Mapbox
                  </a>
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noreferrer"
                  >
                    © OpenStreetMap
                  </a>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 grid grid-cols-2 gap-3 bg-slate-950 p-5 sm:grid-cols-3">
                {regions.map((region) => (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => changeRegion(region.id)}
                    className="rounded-2xl bg-white/10 p-4 text-left text-white"
                  >
                    <b>{region.name}</b>
                    <span className="mt-1 block text-xs">
                      {region.facilities} facilities
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <aside className="border-t border-neutral-100 p-4 xl:max-h-[500px] xl:overflow-y-auto xl:border-l xl:border-t-0">
            <h2 className="px-1 text-lg font-bold">Regional portfolio</h2>
            <p className="px-1 text-sm text-neutral-500">
              Select a corridor to focus the map and metrics.
            </p>
            <div className="mt-4 space-y-2">
              {regions.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  aria-pressed={selected.id === region.id}
                  onClick={() => changeRegion(region.id)}
                  className={`w-full rounded-xl p-3 text-left ring-1 ${selected.id === region.id ? "bg-neutral-950 text-white ring-neutral-950" : "bg-white ring-neutral-200"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{region.name}</p>
                      <p
                        className={`text-xs ${selected.id === region.id ? "text-neutral-300" : "text-neutral-500"}`}
                      >
                        {region.corridor}
                      </p>
                    </div>
                    <RegionBadge
                      status={region.status}
                      inverted={selected.id === region.id}
                    />
                  </div>
                  <div className="mt-3 flex justify-between text-xs">
                    <span>{region.facilities} facilities</span>
                    <span>{region.readiness}% ready</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
        <div className="grid gap-6 bg-neutral-950 p-5 text-white sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2">
              <RegionBadge status={selected.status} inverted />
              <span className="font-mono text-xs text-neutral-400">
                {selected.states.join(" · ")}
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-bold">{selected.name}</h2>
            <p className="mt-1 text-sm text-neutral-300">{selected.corridor}</p>
          </div>
          <div className="lg:text-right">
            <p className="text-xs text-neutral-400">Qualified opportunity</p>
            <p className="mt-1 text-lg font-bold text-emerald-300">
              {selected.opportunity}
            </p>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Readiness" value={`${selected.readiness}%`} />
          <Metric label="Facilities" value={String(selected.facilities)} />
          <Metric label="Partners" value={String(selected.partners)} />
          <Metric
            label="Transactions"
            value={selected.transactions.toLocaleString()}
          />
          <Metric
            label="Material volume"
            value={`${selected.tonnage.toLocaleString()} t`}
          />
        </div>
        <div className="border-t bg-amber-50 px-5 py-3 text-sm text-amber-900">
          <b>Primary constraint:</b> {selected.blocker}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Transaction growth</h2>
              <p className="text-sm text-neutral-500">
                Select a reporting point to inspect activity.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(rangeLabels) as RangeKey[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={range === item}
                  onClick={() => {
                    setRange(item);
                    setSelectedPoint(5);
                  }}
                  className={`rounded-full px-3 py-2 text-xs font-bold ${range === item ? "bg-neutral-950 text-white" : "bg-neutral-50 ring-1 ring-neutral-200"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 flex justify-between rounded-xl bg-neutral-50 px-4 py-3">
            <span className="text-sm text-neutral-500">
              {labels[selectedPoint]}
            </span>
            <b>{trend[selectedPoint]} transactions</b>
          </div>
          <div
            className="mt-4 grid h-64 grid-cols-6 items-end gap-2 rounded-2xl bg-neutral-50 p-3 sm:gap-4 sm:p-5"
            role="img"
            aria-label={`${selected.name} transaction chart for ${range}`}
          >
            {trend.map((value, index) => (
              <div
                key={labels[index]}
                className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
              >
                <button
                  type="button"
                  aria-label={`${labels[index]}: ${value} transactions`}
                  aria-pressed={selectedPoint === index}
                  onClick={() => setSelectedPoint(index)}
                  className={`w-full max-w-16 rounded-t-xl ${selectedPoint === index ? "bg-emerald-600 ring-4 ring-emerald-100" : "bg-emerald-200"}`}
                  style={{
                    height: `${Math.max(12, (value / maxTrend) * 100)}%`,
                  }}
                />
                <span className="truncate text-[10px] text-neutral-500 sm:text-xs">
                  {labels[index]}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-bold">Compare corridors</h2>
          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-semibold text-neutral-500">
              COMPARE WITH
            </span>
            <select
              aria-label="Compare region"
              value={comparison.id}
              onChange={(event) => setCompareId(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-neutral-200 px-3"
            >
              {regions
                .filter((region) => region.id !== selected.id)
                .map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="mt-5 space-y-5">
            <Comparison
              label="Readiness"
              current={selected.readiness}
              other={comparison.readiness}
              names={[selected.name, comparison.name]}
            />
            <Comparison
              label="Facilities"
              current={selected.facilities}
              other={comparison.facilities}
              names={[selected.name, comparison.name]}
            />
            <Comparison
              label="Transactions"
              current={selected.transactions}
              other={comparison.transactions}
              names={[selected.name, comparison.name]}
            />
            <Comparison
              label="Partners"
              current={selected.partners}
              other={comparison.partners}
              names={[selected.name, comparison.name]}
            />
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
          <div className="border-b p-5">
            <h2 className="text-lg font-bold">Facility pipeline</h2>
            <p className="text-sm text-neutral-500">
              Inspect operating, onboarding, and planned capacity.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["All", "Active", "Onboarding", "Planned"] as const).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={facilityFilter === status}
                    onClick={() => setFacilityFilter(status)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${facilityFilter === status ? "bg-neutral-950 text-white" : "bg-neutral-50 ring-1 ring-neutral-200"}`}
                  >
                    {status}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="divide-y">
            {visibleFacilities.map((facility) => (
              <div
                key={facility.id}
                className="flex items-center justify-between gap-3 p-5"
              >
                <div className="flex gap-3">
                  <Building2 className="size-9 rounded-xl bg-emerald-50 p-2 text-emerald-700" />
                  <div>
                    <p className="font-bold">{facility.name}</p>
                    <p className="text-sm text-neutral-500">
                      {facility.location} · {facility.materials}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{facility.capacity}</p>
                  <FacilityBadge status={facility.status} />
                </div>
              </div>
            ))}
            {visibleFacilities.length === 0 && (
              <p className="p-8 text-center text-sm text-neutral-500">
                No facilities match this status.
              </p>
            )}
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
          <div className="border-b p-5">
            <h2 className="text-lg font-bold">Pilot partners</h2>
            <p className="text-sm text-neutral-500">
              Select a partner to review its contribution.
            </p>
          </div>
          <div className="grid sm:grid-cols-[1fr_220px]">
            <div className="divide-y">
              {selected.partnerList.map((partner, index) => (
                <button
                  key={partner.name}
                  type="button"
                  aria-pressed={selectedPartner === index}
                  onClick={() => setSelectedPartner(index)}
                  className={`flex w-full items-center justify-between gap-3 p-4 text-left ${selectedPartner === index ? "bg-emerald-50" : ""}`}
                >
                  <div>
                    <p className="font-bold">{partner.name}</p>
                    <p className="text-xs text-neutral-500">
                      {partner.type} · {partner.status}
                    </p>
                  </div>
                  <ArrowRight className="size-4" />
                </button>
              ))}
            </div>
            <aside className="border-t bg-neutral-950 p-5 text-white sm:border-l sm:border-t-0">
              <p className="text-xs text-emerald-300">SELECTED PARTNER</p>
              <h3 className="mt-2 font-bold">{activePartner.name}</h3>
              <div className="mt-5 space-y-3">
                <Detail
                  label="Transactions"
                  value={String(activePartner.transactions)}
                />
                <Detail label="Volume" value={activePartner.volume} />
                <Detail label="Contact" value={activePartner.contact} />
              </div>
            </aside>
          </div>
        </section>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Readiness milestones</h2>
            <p className="text-sm text-neutral-500">
              Complete launch gates and prepare the next review.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setNotice(
                `${selected.name} readiness review scheduled for the expansion team.`,
              )
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-bold text-white"
          >
            Advance readiness review
            <ArrowRight className="size-4" />
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {selected.milestones.map((milestone, index) => {
            const baseline = index < Math.floor(selected.readiness / 25);
            const complete = baseline || completed.includes(index);
            return (
              <button
                key={milestone}
                type="button"
                aria-pressed={complete}
                onClick={() => toggleMilestone(index)}
                className={`flex items-center gap-3 rounded-xl p-4 text-left ring-1 ${complete ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "ring-neutral-200"}`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full ${complete ? "bg-emerald-600 text-white" : "bg-neutral-100"}`}
                >
                  {complete ? <Check className="size-4" /> : index + 1}
                </span>
                {milestone}
              </button>
            );
          })}
        </div>
      </section>
      <section className="grid gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:grid-cols-[auto_1fr]">
        <CircleAlert className="size-5 text-blue-700" />
        <div>
          <h2 className="font-bold text-blue-950">Expansion planning scope</h2>
          <p className="mt-1 text-sm text-blue-900/80">
            This workspace models regional readiness using frontend data. Live
            rollout can later connect partner onboarding, facility verification,
            CRM pipeline, and transaction reporting for the {role} portal.
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
}: {
  icon: typeof Factory;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
      <Icon className="size-9 rounded-xl bg-emerald-50 p-2 text-emerald-700" />
      <p className="mt-4 text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      <p className="text-xs text-neutral-500">{detail}</p>
    </section>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
function RegionBadge({
  status,
  inverted = false,
}: {
  status: RegionStatus;
  inverted?: boolean;
}) {
  if (inverted)
    return (
      <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white">
        {status}
      </span>
    );
  const tone = {
    Live: "bg-emerald-100 text-emerald-700",
    Pilot: "bg-blue-100 text-blue-700",
    "Partner review": "bg-amber-100 text-amber-800",
    Scouting: "bg-slate-100 text-slate-700",
  }[status];
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>
      {status}
    </span>
  );
}
function FacilityBadge({ status }: { status: FacilityStatus }) {
  const tone = {
    Active: "bg-emerald-100 text-emerald-700",
    Onboarding: "bg-amber-100 text-amber-800",
    Planned: "bg-slate-100 text-slate-700",
  }[status];
  return (
    <span
      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${tone}`}
    >
      {status}
    </span>
  );
}
function Comparison({
  label,
  current,
  other,
  names,
}: {
  label: string;
  current: number;
  other: number;
  names: [string, string];
}) {
  const max = Math.max(current, other, 1);
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <b>{label}</b>
        <span className="text-neutral-500">
          {current} vs {other}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-20 truncate text-[10px]">{names[0]}</span>
          <span
            className="h-2 rounded-full bg-emerald-600"
            style={{ width: `${(current / max) * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-20 truncate text-[10px]">{names[1]}</span>
          <span
            className="h-2 rounded-full bg-blue-300"
            style={{ width: `${(other / max) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-white/10 pb-2">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}
