"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  FileCheck2,
  FileText,
  Filter,
  Handshake,
  Mail,
  MapPin,
  MessageSquare,
  Network,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Users,
  X,
} from "lucide-react";

type Role = "buyer" | "seller" | "admin";
type PartnerType = "Customer" | "Sponsor" | "Assurer" | "Logistics provider";
type PartnerStatus = "Active" | "Pending review" | "At risk";
type DetailTab = "Overview" | "Compliance" | "Trades" | "Relationship";

interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  region: string;
  status: PartnerStatus;
  health: number;
  certification: string;
  certificationExpires: string;
  activeTrades: number;
  tradeVolume: string;
  onTimeRate: number;
  relationshipSince: string;
  description: string;
  capabilities: string[];
  riskSignal?: string;
  contact: {
    name: string;
    role: string;
    email: string;
    phone: string;
  };
  documents: Array<{
    name: string;
    status: "Verified" | "Review due";
    updated: string;
  }>;
  trades: Array<{
    id: string;
    material: string;
    value: string;
    status: string;
  }>;
  timeline: Array<{ title: string; detail: string; date: string }>;
}

const INITIAL_PARTNERS: Partner[] = [
  {
    id: "PAR-1101",
    name: "GreenLine Logistics",
    type: "Logistics provider",
    region: "US Gulf",
    status: "Active",
    health: 94,
    certification: "Low-emission fleet",
    certificationExpires: "Mar 18, 2027",
    activeTrades: 18,
    tradeVolume: "$1.84M",
    onTimeRate: 96,
    relationshipSince: "March 2024",
    description:
      "Regional carrier specializing in verified industrial byproduct and biomass lanes across the Gulf Coast.",
    capabilities: [
      "Live GPS tracking",
      "Proof of delivery",
      "Low-emission fleet",
      "Hazmat-ready drivers",
    ],
    contact: {
      name: "Morgan Lee",
      role: "Partnership manager",
      email: "morgan@greenline.example",
      phone: "+1 (225) 555-0184",
    },
    documents: [
      {
        name: "Fleet emissions certificate",
        status: "Verified",
        updated: "Jul 12, 2026",
      },
      {
        name: "Carrier insurance",
        status: "Verified",
        updated: "Jun 28, 2026",
      },
      {
        name: "Hazmat operating authority",
        status: "Verified",
        updated: "May 16, 2026",
      },
    ],
    trades: [
      {
        id: "TR-8421",
        material: "Black Gypsum",
        value: "$148,200",
        status: "In transit",
      },
      {
        id: "TR-8398",
        material: "Corn Stover",
        value: "$96,400",
        status: "Delivered",
      },
      {
        id: "TR-8354",
        material: "Polymer Blend",
        value: "$72,800",
        status: "Booked",
      },
    ],
    timeline: [
      {
        title: "Baton Rouge lane accepted",
        detail: "Capacity confirmed for two weekly loads.",
        date: "Today",
      },
      {
        title: "Emissions certificate renewed",
        detail: "Independent fleet evidence approved.",
        date: "Jul 12",
      },
      {
        title: "Quarterly review completed",
        detail: "SLA and exception rates reviewed with operations.",
        date: "Jun 30",
      },
    ],
  },
  {
    id: "PAR-1102",
    name: "Circular Assurance Group",
    type: "Assurer",
    region: "North America",
    status: "Active",
    health: 91,
    certification: "ESG verification",
    certificationExpires: "Nov 2, 2027",
    activeTrades: 9,
    tradeVolume: "$920K",
    onTimeRate: 98,
    relationshipSince: "August 2024",
    description:
      "Independent assurance partner for sustainability evidence, chain-of-custody reviews, and ESG reporting.",
    capabilities: [
      "ESG assurance",
      "Certificate review",
      "Chain of custody",
      "Audit support",
    ],
    contact: {
      name: "Elena Brooks",
      role: "Assurance lead",
      email: "elena@circularassurance.example",
      phone: "+1 (312) 555-0148",
    },
    documents: [
      {
        name: "Assurance methodology",
        status: "Verified",
        updated: "Jul 8, 2026",
      },
      {
        name: "Professional liability",
        status: "Verified",
        updated: "Apr 19, 2026",
      },
      {
        name: "Independence declaration",
        status: "Verified",
        updated: "Jan 5, 2026",
      },
    ],
    trades: [
      {
        id: "VR-2240",
        material: "COA bundle review",
        value: "$18,600",
        status: "In review",
      },
      {
        id: "VR-2218",
        material: "ESG evidence audit",
        value: "$34,200",
        status: "Complete",
      },
    ],
    timeline: [
      {
        title: "Three COA bundles verified",
        detail: "Evidence released to buyer workspaces.",
        date: "Yesterday",
      },
      {
        title: "Q2 ESG review completed",
        detail: "No material exceptions reported.",
        date: "Jul 7",
      },
      {
        title: "Methodology updated",
        detail: "2026 assurance controls published.",
        date: "Jun 18",
      },
    ],
  },
  {
    id: "PAR-1103",
    name: "Bayou Industrial Sponsors",
    type: "Sponsor",
    region: "Louisiana",
    status: "Pending review",
    health: 72,
    certification: "Pilot sponsor",
    certificationExpires: "Review pending",
    activeTrades: 3,
    tradeVolume: "$410K",
    onTimeRate: 88,
    relationshipSince: "June 2026",
    description:
      "Louisiana industrial network supporting circular-material pilots, introductions, and facility access.",
    capabilities: [
      "Pilot sponsorship",
      "Facility introductions",
      "Regional outreach",
      "Program funding",
    ],
    riskSignal: "Beneficial ownership evidence is awaiting final review.",
    contact: {
      name: "Andre Mitchell",
      role: "Program director",
      email: "andre@bayouindustrial.example",
      phone: "+1 (504) 555-0196",
    },
    documents: [
      {
        name: "Sponsor verification",
        status: "Review due",
        updated: "Jul 14, 2026",
      },
      {
        name: "Funding declaration",
        status: "Verified",
        updated: "Jul 10, 2026",
      },
      {
        name: "Beneficial ownership",
        status: "Review due",
        updated: "Jul 9, 2026",
      },
    ],
    trades: [
      {
        id: "PL-1082",
        material: "Regional biomass pilot",
        value: "$220,000",
        status: "Planning",
      },
      {
        id: "PL-1074",
        material: "Facility access program",
        value: "$190,000",
        status: "Pending",
      },
    ],
    timeline: [
      {
        title: "Sponsor verification submitted",
        detail: "Compliance review assigned to T. Nguyen.",
        date: "Today",
      },
      {
        title: "Two facilities introduced",
        detail: "Introductions added to the Gulf pilot.",
        date: "Jul 13",
      },
      {
        title: "Pilot scope requested",
        detail: "Operations brief shared for review.",
        date: "Jul 9",
      },
    ],
  },
  {
    id: "PAR-1104",
    name: "Atlas Carbon Black",
    type: "Customer",
    region: "Mexico",
    status: "At risk",
    health: 58,
    certification: "Buyer verification renewal",
    certificationExpires: "Aug 4, 2026",
    activeTrades: 5,
    tradeVolume: "$680K",
    onTimeRate: 74,
    relationshipSince: "November 2025",
    description:
      "Cross-border buyer sourcing verified recovered carbon feedstocks for industrial manufacturing.",
    capabilities: [
      "Cross-border procurement",
      "Recurring contracts",
      "Bulk receiving",
      "Quality inspection",
    ],
    riskSignal:
      "Verification renewal is due in 19 days and two trades are missing customs evidence.",
    contact: {
      name: "Sofia Ramirez",
      role: "Procurement lead",
      email: "sofia@atlascarbon.example",
      phone: "+52 81 5555 0142",
    },
    documents: [
      {
        name: "Buyer verification",
        status: "Review due",
        updated: "Jul 1, 2026",
      },
      {
        name: "Cross-border tax record",
        status: "Verified",
        updated: "Jun 22, 2026",
      },
      {
        name: "Receiving specification",
        status: "Verified",
        updated: "Jul 11, 2026",
      },
    ],
    trades: [
      {
        id: "TR-8412",
        material: "Recovered carbon fines",
        value: "$240,000",
        status: "Docs needed",
      },
      {
        id: "TR-8387",
        material: "Carbon black blend",
        value: "$188,000",
        status: "In transit",
      },
      {
        id: "TR-8291",
        material: "Industrial carbon feed",
        value: "$152,000",
        status: "Delivered",
      },
    ],
    timeline: [
      {
        title: "Renewal reminder escalated",
        detail: "Procurement and compliance contacts notified.",
        date: "Today",
      },
      {
        title: "Receiving specification updated",
        detail: "Moisture tolerance revised to 4.5%.",
        date: "Jul 11",
      },
      {
        title: "Customs evidence requested",
        detail: "Two active trades placed on review watch.",
        date: "Jul 8",
      },
    ],
  },
  {
    id: "PAR-1105",
    name: "Crescent Circular Markets",
    type: "Customer",
    region: "Southeast US",
    status: "Active",
    health: 87,
    certification: "Verified buyer",
    certificationExpires: "Jan 22, 2027",
    activeTrades: 12,
    tradeVolume: "$1.12M",
    onTimeRate: 93,
    relationshipSince: "January 2025",
    description:
      "Multi-facility processor purchasing agricultural and manufacturing byproducts across the Southeast.",
    capabilities: [
      "Multi-site receiving",
      "Long-term contracts",
      "Quality inspection",
      "Escrow settlement",
    ],
    contact: {
      name: "Priya Shah",
      role: "Supply director",
      email: "priya@crescentcircular.example",
      phone: "+1 (404) 555-0108",
    },
    documents: [
      {
        name: "Buyer verification",
        status: "Verified",
        updated: "Jun 25, 2026",
      },
      {
        name: "Facility licenses",
        status: "Verified",
        updated: "May 30, 2026",
      },
    ],
    trades: [
      {
        id: "TR-8402",
        material: "Rice hull ash",
        value: "$118,000",
        status: "In transit",
      },
      {
        id: "TR-8366",
        material: "Corn fiber",
        value: "$84,000",
        status: "Delivered",
      },
    ],
    timeline: [
      {
        title: "Annual plan expanded",
        detail: "Two Georgia facilities added.",
        date: "Jul 10",
      },
      {
        title: "Quality review completed",
        detail: "Acceptance rate remains above target.",
        date: "Jun 28",
      },
    ],
  },
  {
    id: "PAR-1106",
    name: "Heartland Freight Cooperative",
    type: "Logistics provider",
    region: "Midwest",
    status: "Active",
    health: 84,
    certification: "SmartWay carrier",
    certificationExpires: "May 14, 2027",
    activeTrades: 7,
    tradeVolume: "$530K",
    onTimeRate: 91,
    relationshipSince: "September 2025",
    description:
      "Member-owned bulk carrier network serving agricultural residue and recovered-material corridors.",
    capabilities: [
      "Bulk hoppers",
      "Route telemetry",
      "Rural pickup",
      "POD automation",
    ],
    contact: {
      name: "Caleb Morris",
      role: "Network coordinator",
      email: "caleb@heartlandfreight.example",
      phone: "+1 (515) 555-0162",
    },
    documents: [
      {
        name: "SmartWay certificate",
        status: "Verified",
        updated: "May 14, 2026",
      },
      { name: "Carrier insurance", status: "Verified", updated: "Apr 2, 2026" },
    ],
    trades: [
      {
        id: "TR-8408",
        material: "Corn stover",
        value: "$102,000",
        status: "Booked",
      },
      {
        id: "TR-8372",
        material: "Soy hulls",
        value: "$76,000",
        status: "Delivered",
      },
    ],
    timeline: [
      {
        title: "Iowa corridor activated",
        detail: "Five member carriers available.",
        date: "Jul 6",
      },
      {
        title: "Telemetry connection verified",
        detail: "Live milestones now reporting.",
        date: "Jun 19",
      },
    ],
  },
];

export function AdminPartnerNetworkPage({ partnerId }: { partnerId?: string }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-emerald-700">
              PARTNER NETWORK
            </p>
            <h1 className="max-w-4xl text-3xl font-bold tracking-[-0.02em] text-neutral-950">
              {partnerId
                ? "Partner relationship workspace"
                : "Manage customers, sponsors, assurers, and logistics providers."}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
              {partnerId
                ? "Review compliance, trade performance, contacts, history, and the next action for this relationship."
                : "Monitor certification, network health, active trades, renewal exposure, and role-specific relationship management."}
            </p>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200">
            Admin relationship operations
          </div>
        </div>
        <PartnerNetworkWorkspace role="admin" partnerId={partnerId} />
      </div>
    </div>
  );
}

export function PartnerNetworkWorkspace({
  role,
  partnerId,
}: {
  role: Role;
  partnerId?: string;
}) {
  const router = useRouter();
  const [partners, setPartners] = useState(INITIAL_PARTNERS);
  const [localPartnerId, setLocalPartnerId] = useState<string | null>(null);
  const activePartnerId = partnerId ?? localPartnerId;
  const selectedPartner = partners.find(
    (partner) => partner.id === activePartnerId,
  );

  const openPartner = (id: string) => {
    if (role === "admin") router.push(`/admin/partners/${id}`);
    else setLocalPartnerId(id);
  };

  const closePartner = () => {
    if (role === "admin") router.push("/admin/partners");
    else setLocalPartnerId(null);
  };

  const updatePartner = (id: string, update: Partial<Partner>) => {
    setPartners((current) =>
      current.map((partner) =>
        partner.id === id ? { ...partner, ...update } : partner,
      ),
    );
  };

  if (activePartnerId) {
    return selectedPartner ? (
      <PartnerDetail
        partner={selectedPartner}
        role={role}
        onBack={closePartner}
        onUpdate={updatePartner}
      />
    ) : (
      <PartnerNotFound onBack={closePartner} />
    );
  }

  return (
    <PartnerDirectory
      partners={partners}
      role={role}
      onOpen={openPartner}
      onAdd={(partner) => setPartners((current) => [partner, ...current])}
      onApprove={(id) => updatePartner(id, { status: "Active", health: 86 })}
    />
  );
}

function PartnerDirectory({
  partners,
  role,
  onOpen,
  onAdd,
  onApprove,
}: {
  partners: Partner[];
  role: Role;
  onOpen: (id: string) => void;
  onAdd: (partner: Partner) => void;
  onApprove: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<PartnerType | "All">("All");
  const [status, setStatus] = useState<PartnerStatus | "All">("All");
  const [showAdd, setShowAdd] = useState(false);
  const [notice, setNotice] = useState("");

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return partners.filter(
      (partner) =>
        (type === "All" || partner.type === type) &&
        (status === "All" || partner.status === status) &&
        (!query ||
          [
            partner.name,
            partner.region,
            partner.certification,
            partner.id,
          ].some((value) => value.toLowerCase().includes(query))),
    );
  }, [partners, search, status, type]);

  const activeTrades = partners.reduce(
    (total, partner) => total + partner.activeTrades,
    0,
  );
  const activePartners = partners.filter(
    (partner) => partner.status === "Active",
  ).length;
  const reviewPartners = partners.filter(
    (partner) => partner.status !== "Active",
  ).length;
  const averageHealth = Math.round(
    partners.reduce((total, partner) => total + partner.health, 0) /
      partners.length,
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] bg-neutral-950 text-white shadow-sm">
        <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8 lg:py-9">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">
              Network command center
            </p>
            <h2 className="mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              Build trusted relationships across the complete circular supply
              network.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
              Monitor partner readiness, certification exposure, trade activity,
              and relationship health from onboarding through renewal.
            </p>
          </div>
          {role === "admin" && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-bold text-neutral-950 hover:bg-emerald-300"
            >
              <Plus className="size-4" /> Add partner
            </button>
          )}
        </div>
      </section>

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Partner network summary"
      >
        <SummaryCard
          icon={Network}
          label="Network partners"
          value={String(partners.length)}
          detail={`${activePartners} active relationships`}
        />
        <SummaryCard
          icon={Activity}
          label="Network health"
          value={`${averageHealth}%`}
          detail="Weighted compliance and delivery"
          tone="emerald"
        />
        <SummaryCard
          icon={Handshake}
          label="Active trades"
          value={String(activeTrades)}
          detail="Across the partner network"
        />
        <SummaryCard
          icon={CalendarClock}
          label="Action needed"
          value={String(reviewPartners)}
          detail="Reviews or renewals due"
          tone="amber"
        />
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex-1 xl:max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <input
              aria-label="Search partners"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search partner, region, certification…"
              className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm outline-none focus:border-neutral-900 focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterSelect
              label="Partner type"
              value={type}
              onChange={(value) => setType(value as PartnerType | "All")}
              options={[
                "All",
                "Customer",
                "Sponsor",
                "Assurer",
                "Logistics provider",
              ]}
            />
            <FilterSelect
              label="Partner status"
              value={status}
              onChange={(value) => setStatus(value as PartnerStatus | "All")}
              options={["All", "Active", "Pending review", "At risk"]}
            />
            {(search || type !== "All" || status !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setType("All");
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

      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          {notice}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-neutral-950">Partner directory</h3>
            <p className="text-xs text-neutral-500">
              {visible.length} of {partners.length} relationships
            </p>
          </div>
          <SlidersHorizontal className="size-4 text-neutral-400" />
        </div>
        <div className="divide-y divide-neutral-100">
          {visible.map((partner) => (
            <PartnerRow
              key={partner.id}
              partner={partner}
              role={role}
              onOpen={onOpen}
              onApprove={() => {
                onApprove(partner.id);
                setNotice(`${partner.name} is approved and active.`);
              }}
            />
          ))}
          {visible.length === 0 && (
            <div className="px-6 py-16 text-center">
              <Search className="mx-auto size-6 text-neutral-300" />
              <p className="mt-3 font-semibold text-neutral-800">
                No partners match these filters
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                Try a broader search or clear the filters.
              </p>
            </div>
          )}
        </div>
      </section>

      {showAdd && (
        <AddPartnerDialog
          onClose={() => setShowAdd(false)}
          onAdd={(partner) => {
            onAdd(partner);
            setShowAdd(false);
            setNotice(`${partner.name} was added to the review queue.`);
          }}
        />
      )}
    </div>
  );
}

function PartnerRow({
  partner,
  role,
  onOpen,
  onApprove,
}: {
  partner: Partner;
  role: Role;
  onOpen: (id: string) => void;
  onApprove: () => void;
}) {
  const Icon =
    partner.type === "Logistics provider"
      ? Truck
      : partner.type === "Assurer"
        ? ShieldCheck
        : partner.type === "Sponsor"
          ? Handshake
          : Building2;
  return (
    <article className="grid gap-4 px-5 py-5 transition hover:bg-neutral-50/70 xl:grid-cols-[minmax(260px,1.4fr)_minmax(150px,.8fr)_120px_120px_132px] xl:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate font-bold text-neutral-950">
              {partner.name}
            </h4>
            <StatusBadge status={partner.status} />
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {partner.type} · {partner.region}
          </p>
          <p className="mt-2 line-clamp-1 text-xs text-neutral-500">
            {partner.certification} · Renewal {partner.certificationExpires}
          </p>
        </div>
      </div>
      <HealthScore value={partner.health} />
      <Metric
        label="Active trades"
        value={String(partner.activeTrades)}
        compact
      />
      <Metric label="12m volume" value={partner.tradeVolume} compact />
      <div className="flex flex-wrap gap-2 xl:justify-end">
        {role === "admin" && partner.status === "Pending review" && (
          <button
            type="button"
            onClick={onApprove}
            className="rounded-full border border-neutral-300 px-3 py-2 text-xs font-bold text-neutral-800 hover:bg-white"
          >
            Approve
          </button>
        )}
        <button
          type="button"
          onClick={() => onOpen(partner.id)}
          className="inline-flex items-center gap-1 rounded-full bg-neutral-950 px-3.5 py-2 text-xs font-bold text-white"
        >
          View details <ChevronRight className="size-3.5" />
        </button>
      </div>
    </article>
  );
}

function PartnerDetail({
  partner,
  role,
  onBack,
  onUpdate,
}: {
  partner: Partner;
  role: Role;
  onBack: () => void;
  onUpdate: (id: string, update: Partial<Partner>) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("Overview");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [messageOpen, setMessageOpen] = useState(false);

  const approve = () => {
    onUpdate(partner.id, {
      status: "Active",
      health: Math.max(partner.health, 86),
    });
    setNotice(`${partner.name} is approved and active.`);
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-950"
      >
        <ArrowLeft className="size-4" /> Back to partner directory
      </button>

      <section className="overflow-hidden rounded-[28px] bg-neutral-950 text-white shadow-sm">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-neutral-950">
              <Building2 className="size-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={partner.status} inverted />
                <span className="font-mono text-xs text-neutral-500">
                  {partner.id}
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                {partner.name}
              </h2>
              <p className="mt-2 text-sm text-neutral-400">
                {partner.type} · {partner.region} · Partner since{" "}
                {partner.relationshipSince}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMessageOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10"
            >
              <MessageSquare className="size-4" /> Message
            </button>
            {role === "admin" && partner.status !== "Active" && (
              <button
                type="button"
                onClick={approve}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-bold text-neutral-950"
              >
                <BadgeCheck className="size-4" /> Approve partner
              </button>
            )}
          </div>
        </div>
      </section>

      {partner.riskSignal && partner.status !== "Active" && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">Relationship action required</p>
            <p className="mt-1 text-amber-800">{partner.riskSignal}</p>
          </div>
        </div>
      )}
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
          icon={Activity}
          label="Relationship health"
          value={`${partner.health}%`}
          detail={
            partner.health >= 80
              ? "Healthy relationship"
              : "Intervention recommended"
          }
          tone={partner.health >= 80 ? "emerald" : "amber"}
        />
        <SummaryCard
          icon={Handshake}
          label="Active trades"
          value={String(partner.activeTrades)}
          detail="Current network activity"
        />
        <SummaryCard
          icon={CircleDollarSign}
          label="12m trade volume"
          value={partner.tradeVolume}
          detail="Settled and active value"
        />
        <SummaryCard
          icon={Truck}
          label="On-time rate"
          value={`${partner.onTimeRate}%`}
          detail="Rolling 90-day performance"
        />
      </section>

      <div
        className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1"
        role="tablist"
        aria-label="Partner details"
      >
        {(
          ["Overview", "Compliance", "Trades", "Relationship"] as DetailTab[]
        ).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${tab === item ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <OverviewTab
          partner={partner}
          note={note}
          setNote={setNote}
          onSaveNote={() => {
            setNotice("Relationship note saved to the partner record.");
            setNote("");
          }}
        />
      )}
      {tab === "Compliance" && (
        <ComplianceTab
          partner={partner}
          onRequest={() =>
            setNotice(`Evidence request sent to ${partner.contact.name}.`)
          }
        />
      )}
      {tab === "Trades" && <TradesTab partner={partner} />}
      {tab === "Relationship" && <RelationshipTab partner={partner} />}

      {messageOpen && (
        <MessageDialog
          partner={partner}
          onClose={() => setMessageOpen(false)}
          onSend={() => {
            setMessageOpen(false);
            setNotice(`Message sent to ${partner.contact.name}.`);
          }}
        />
      )}
    </div>
  );
}

function OverviewTab({
  partner,
  note,
  setNote,
  onSaveNote,
}: {
  partner: Partner;
  note: string;
  setNote: (value: string) => void;
  onSaveNote: () => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <div className="space-y-6">
        <Panel title="Relationship summary" icon={Network}>
          <p className="text-sm leading-6 text-neutral-600">
            {partner.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {partner.capabilities.map((item) => (
              <span
                key={item}
                className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"
              >
                {item}
              </span>
            ))}
          </div>
        </Panel>
        <Panel title="Recent activity" icon={Activity}>
          <Timeline items={partner.timeline} />
        </Panel>
        <Panel title="Internal relationship note" icon={FileText}>
          <textarea
            aria-label="Relationship note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Capture a decision, follow-up, or internal context…"
            className="min-h-28 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none focus:border-neutral-900 focus:bg-white"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onSaveNote}
              disabled={!note.trim()}
              className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-bold text-white disabled:bg-neutral-300"
            >
              Save note
            </button>
          </div>
        </Panel>
      </div>
      <div className="space-y-6">
        <ContactCard partner={partner} />
        <Panel title="Certification" icon={BadgeCheck}>
          <p className="font-bold text-neutral-950">{partner.certification}</p>
          <p className="mt-2 text-sm text-neutral-500">Renewal or expiry</p>
          <p className="mt-1 text-sm font-semibold text-neutral-800">
            {partner.certificationExpires}
          </p>
          <div className="mt-4 h-2 rounded-full bg-neutral-100">
            <div
              className={`h-full rounded-full ${partner.status === "At risk" ? "w-1/4 bg-amber-500" : "w-4/5 bg-emerald-500"}`}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ComplianceTab({
  partner,
  onRequest,
}: {
  partner: Partner;
  onRequest: () => void;
}) {
  return (
    <Panel
      title="Certification and evidence"
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
        {partner.documents.map((document) => (
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

function TradesTab({ partner }: { partner: Partner }) {
  return (
    <Panel title="Active and recent trades" icon={Handshake}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-400">
            <tr>
              <th className="pb-3">Trade</th>
              <th className="pb-3">Material / service</th>
              <th className="pb-3">Value</th>
              <th className="pb-3">Status</th>
              <th className="pb-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {partner.trades.map((trade) => (
              <tr key={trade.id}>
                <td className="py-4 font-mono text-xs">{trade.id}</td>
                <td className="py-4 font-semibold text-neutral-900">
                  {trade.material}
                </td>
                <td className="py-4">{trade.value}</td>
                <td className="py-4">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold">
                    {trade.status}
                  </span>
                </td>
                <td className="py-4 text-right">
                  <button
                    type="button"
                    aria-label={`Open ${trade.id}`}
                    className="rounded-full p-2 hover:bg-neutral-100"
                  >
                    <ArrowUpRight className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function RelationshipTab({ partner }: { partner: Partner }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <Panel title="Relationship timeline" icon={Activity}>
        <Timeline items={partner.timeline} />
      </Panel>
      <ContactCard partner={partner} />
    </div>
  );
}

function ContactCard({ partner }: { partner: Partner }) {
  return (
    <Panel title="Primary contact" icon={Users}>
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-neutral-950 text-sm font-bold text-white">
          {partner.contact.name
            .split(" ")
            .map((part) => part[0])
            .join("")}
        </div>
        <div>
          <p className="font-bold text-neutral-950">{partner.contact.name}</p>
          <p className="text-sm text-neutral-500">{partner.contact.role}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3 text-sm">
        <a
          href={`mailto:${partner.contact.email}`}
          className="flex items-center gap-3 text-neutral-700 hover:text-neutral-950"
        >
          <Mail className="size-4 text-neutral-400" />
          {partner.contact.email}
        </a>
        <a
          href={`tel:${partner.contact.phone}`}
          className="flex items-center gap-3 text-neutral-700 hover:text-neutral-950"
        >
          <Phone className="size-4 text-neutral-400" />
          {partner.contact.phone}
        </a>
        <p className="flex items-center gap-3 text-neutral-700">
          <MapPin className="size-4 text-neutral-400" />
          {partner.region}
        </p>
      </div>
    </Panel>
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
          <h3 className="font-bold text-neutral-950">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Timeline({ items }: { items: Partner["timeline"] }) {
  return (
    <div className="space-y-0">
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

function HealthScore({ value }: { value: number }) {
  const color =
    value >= 80
      ? "bg-emerald-500"
      : value >= 65
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-500">Network health</span>
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

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "rounded-xl bg-neutral-50 p-3"}>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-neutral-950">{value}</p>
    </div>
  );
}

function StatusBadge({
  status,
  inverted = false,
}: {
  status: PartnerStatus;
  inverted?: boolean;
}) {
  const tone = inverted
    ? "bg-white/10 text-white"
    : status === "Active"
      ? "bg-emerald-100 text-emerald-800"
      : status === "Pending review"
        ? "bg-blue-100 text-blue-800"
        : "bg-red-100 text-red-800";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}
    >
      {status}
    </span>
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
        <option value="All">All {label.toLowerCase()}s</option>
        {options
          .filter((option) => option !== "All")
          .map((option) => (
            <option key={option}>{option}</option>
          ))}
      </select>
    </label>
  );
}

function AddPartnerDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (partner: Partner) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PartnerType>("Customer");
  const [region, setRegion] = useState("");
  return (
    <Modal
      title="Add network partner"
      description="Create a relationship record and begin the verification review."
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onAdd({
            ...INITIAL_PARTNERS[2],
            id: `PAR-${1110 + Math.floor(Math.random() * 80)}`,
            name,
            type,
            region,
            status: "Pending review",
            health: 60,
            activeTrades: 0,
            tradeVolume: "$0",
            relationshipSince: "July 2026",
          });
        }}
        className="space-y-4"
      >
        <FormField label="Organization name" value={name} onChange={setName} />
        <label className="block text-sm font-semibold text-neutral-800">
          Partner role
          <select
            value={type}
            onChange={(event) => setType(event.target.value as PartnerType)}
            className="mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4"
          >
            <option>Customer</option>
            <option>Sponsor</option>
            <option>Assurer</option>
            <option>Logistics provider</option>
          </select>
        </label>
        <FormField label="Primary region" value={region} onChange={setRegion} />
        <div className="flex justify-end gap-2 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-bold text-neutral-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || !region.trim()}
            className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white disabled:bg-neutral-300"
          >
            Add to review queue
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MessageDialog({
  partner,
  onClose,
  onSend,
}: {
  partner: Partner;
  onClose: () => void;
  onSend: () => void;
}) {
  const [message, setMessage] = useState("");
  return (
    <Modal
      title={`Message ${partner.contact.name}`}
      description={`Send a relationship update to ${partner.name}.`}
      onClose={onClose}
    >
      <textarea
        aria-label="Message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Write your message…"
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
        className="relative z-10 m-0 w-full max-w-lg rounded-[24px] bg-white p-6 shadow-2xl"
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

function FormField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold text-neutral-800">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-900"
      />
    </label>
  );
}

function PartnerNotFound({ onBack }: { onBack: () => void }) {
  return (
    <section className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-neutral-200">
      <AlertTriangle className="mx-auto size-8 text-amber-500" />
      <h2 className="mt-4 text-xl font-bold text-neutral-950">
        Partner record not found
      </h2>
      <p className="mt-2 text-sm text-neutral-500">
        This relationship may have been removed or the address is incorrect.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white"
      >
        Return to partner directory
      </button>
    </section>
  );
}
