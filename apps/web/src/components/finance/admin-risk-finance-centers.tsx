"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Archive,
  ArrowDownToLine,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  FileCheck2,
  FileText,
  Fingerprint,
  Gauge,
  History,
  Landmark,
  Leaf,
  Link2,
  LockKeyhole,
  PackageCheck,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Upload,
  WalletCards,
  X,
} from "lucide-react";

type AssetStatus = "Verified" | "Needs evidence" | "Under review" | "Rejected";
type TransactionStatus =
  | "In escrow"
  | "Release ready"
  | "Completed"
  | "Flagged"
  | "Refunded";
type PaymentStatus =
  | "Paid"
  | "Processing"
  | "Needs review"
  | "Scheduled"
  | "Failed";
type AssetTab = "Overview" | "Evidence" | "Verification checks" | "Activity";
type TransactionTab = "Overview" | "Ledger" | "Controls" | "Activity";
type PaymentTab = "Overview" | "Rail events" | "Controls" | "Audit";

interface AssetRecord {
  id: string;
  material: string;
  owner: string;
  status: AssetStatus;
  type: string;
  certificate: string;
  listing: string;
  facility: string;
  score: number;
  risk: string;
  quantity: string;
  marketValue: string;
  transaction: string;
  document: string;
  evidence: Array<{ name: string; type: string; state: string }>;
  checks: Array<{
    label: string;
    state: "Passed" | "Review" | "Missing";
    detail: string;
  }>;
  activity: Array<{ title: string; detail: string; date: string }>;
}

interface TransactionRecord {
  id: string;
  order: string;
  buyer: string;
  seller: string;
  material: string;
  amount: string;
  numericAmount: number;
  fee: string;
  net: string;
  type: string;
  status: TransactionStatus;
  date: string;
  risk: string;
  asset: string;
  contract: string;
  payment: string;
  ledger: Array<{ entry: string; date: string; amount: string; state: string }>;
  milestones: Array<{ label: string; state: string; date: string }>;
}

interface PaymentRecord {
  id: string;
  title: string;
  payer: string;
  payee: string;
  rail: string;
  amount: string;
  status: PaymentStatus;
  initiated: string;
  expected: string;
  transaction: string;
  contract: string;
  offset: string;
  risk: string;
  events: Array<{
    title: string;
    detail: string;
    time: string;
    state: "Complete" | "Current" | "Pending";
  }>;
}

const ASSETS: AssetRecord[] = [
  {
    id: "AST-24018",
    material: "Black Gypsum",
    owner: "EcoPack Co.",
    status: "Verified",
    type: "Feedstock batch",
    certificate: "CERT-BG-8841",
    listing: "LIST-11048",
    facility: "Port Allen Circular Terminal",
    score: 96,
    risk: "Low",
    quantity: "200 tons",
    marketValue: "$10,400",
    transaction: "TX-50021",
    document: "DOC-7101",
    evidence: [
      {
        name: "Black Gypsum COA.pdf",
        type: "Certificate of analysis",
        state: "Verified",
      },
      {
        name: "Origin declaration.pdf",
        type: "Origin evidence",
        state: "Verified",
      },
      {
        name: "Scale calibration.pdf",
        type: "Quantity control",
        state: "Verified",
      },
    ],
    checks: [
      {
        label: "Owner identity",
        state: "Passed",
        detail: "EcoPack Co. verification is active.",
      },
      {
        label: "Material specification",
        state: "Passed",
        detail: "Composition matches the approved listing.",
      },
      {
        label: "Certificate integrity",
        state: "Passed",
        detail: "Issuer signature and dates validate.",
      },
      {
        label: "Origin and custody",
        state: "Passed",
        detail: "Facility and batch chain are complete.",
      },
    ],
    activity: [
      {
        title: "Asset verification renewed",
        detail: "All current evidence passed automated and admin review.",
        date: "Jul 15, 2026",
      },
      {
        title: "Transaction eligibility confirmed",
        detail: "Asset released for TX-50021 escrow funding.",
        date: "Jul 14, 2026",
      },
      {
        title: "COA evidence uploaded",
        detail: "DOC-7101 linked by EcoPack Co.",
        date: "Jul 10, 2026",
      },
    ],
  },
  {
    id: "AST-24022",
    material: "Scrap Polymer Blend",
    owner: "TerraGenesis Biofuels",
    status: "Needs evidence",
    type: "Waste stream",
    certificate: "CERT-SP-4118",
    listing: "LIST-11052",
    facility: "Plaquemine Recovery Yard",
    score: 72,
    risk: "Medium",
    quantity: "1,000 tons",
    marketValue: "EUR 60,000",
    transaction: "TX-50009",
    document: "DOC-7103",
    evidence: [
      {
        name: "Polymer SDS v4.pdf",
        type: "Safety data sheet",
        state: "Expiring soon",
      },
      {
        name: "Composition report.pdf",
        type: "Material evidence",
        state: "Pending",
      },
    ],
    checks: [
      {
        label: "Owner identity",
        state: "Passed",
        detail: "TerraGenesis verification is active.",
      },
      {
        label: "Material specification",
        state: "Review",
        detail: "Impurity range needs buyer acceptance.",
      },
      {
        label: "Certificate integrity",
        state: "Passed",
        detail: "Current certificate validates.",
      },
      {
        label: "Safety evidence",
        state: "Missing",
        detail: "Replacement SDS required before August 1.",
      },
    ],
    activity: [
      {
        title: "Replacement evidence requested",
        detail: "SDS renewal request sent to the owner.",
        date: "Today",
      },
      {
        title: "Buyer acceptance pending",
        detail: "BrightFuture Corp reviewing impurity tolerance.",
        date: "Jul 15, 2026",
      },
    ],
  },
  {
    id: "AST-24031",
    material: "Used Dry Transformer",
    owner: "Metal Reclaim LLC",
    status: "Under review",
    type: "Recoverable equipment",
    certificate: "CERT-TR-2901",
    listing: "LIST-11057",
    facility: "Houston Circular Materials",
    score: 81,
    risk: "Medium",
    quantity: "50 units",
    marketValue: "$40,000",
    transaction: "TX-50012",
    document: "DOC-7104",
    evidence: [
      {
        name: "Inspection photos.zip",
        type: "Inspection evidence",
        state: "Verified",
      },
      {
        name: "Condition report.pdf",
        type: "Equipment evidence",
        state: "Pending review",
      },
    ],
    checks: [
      {
        label: "Owner identity",
        state: "Passed",
        detail: "Metal Reclaim verification is active.",
      },
      {
        label: "Equipment identity",
        state: "Passed",
        detail: "Serial range matches submitted evidence.",
      },
      {
        label: "Condition evidence",
        state: "Review",
        detail: "Admin inspection review is open.",
      },
      {
        label: "Special handling",
        state: "Passed",
        detail: "Carrier requirement recorded.",
      },
    ],
    activity: [
      {
        title: "Admin review opened",
        detail: "Condition report assigned to asset operations.",
        date: "Jul 14, 2026",
      },
    ],
  },
  {
    id: "AST-24038",
    material: "Harvested Corn Stover",
    owner: "Louisiana BioMass Partners",
    status: "Verified",
    type: "Certified biomass",
    certificate: "CERT-CS-7442",
    listing: "LIST-11061",
    facility: "Acadiana Biomass Hub",
    score: 93,
    risk: "Low",
    quantity: "100 tons / month",
    marketValue: "$4,200 / month",
    transaction: "TX-50032",
    document: "DOC-7105",
    evidence: [
      {
        name: "Sustainability certificate.pdf",
        type: "Sustainability evidence",
        state: "Verified",
      },
      {
        name: "Farm origin schedule.pdf",
        type: "Origin evidence",
        state: "Verified",
      },
    ],
    checks: [
      {
        label: "Owner identity",
        state: "Passed",
        detail: "Supplier identity is active.",
      },
      {
        label: "Sustainability certification",
        state: "Passed",
        detail: "Certificate covers the active term.",
      },
      {
        label: "Origin schedule",
        state: "Passed",
        detail: "Farm sources match the contract.",
      },
      {
        label: "Moisture control",
        state: "Passed",
        detail: "Tolerance policy is recorded.",
      },
    ],
    activity: [
      {
        title: "Asset approved",
        detail: "Released for recurring contract use.",
        date: "Jul 12, 2026",
      },
    ],
  },
];

const TRANSACTIONS: TransactionRecord[] = [
  {
    id: "TX-50021",
    order: "EG-50021",
    buyer: "GreenHarvest Co.",
    seller: "EcoPack Co.",
    material: "Black Gypsum",
    amount: "$13,440",
    numericAmount: 13440,
    fee: "$268.80",
    net: "$13,171.20",
    type: "Escrow purchase",
    status: "In escrow",
    date: "Jul 14, 2026",
    risk: "Low",
    asset: "AST-24018",
    contract: "CTR-1048",
    payment: "PAY-8042",
    ledger: [
      {
        entry: "Buyer ACH funded",
        date: "Jul 14 · 9:25 AM",
        amount: "$13,440.00",
        state: "Posted",
      },
      {
        entry: "Held in escrow",
        date: "Jul 14 · 9:26 AM",
        amount: "−$13,440.00",
        state: "Posted",
      },
      {
        entry: "Platform fee accrued",
        date: "Jul 14 · 9:26 AM",
        amount: "$268.80",
        state: "Pending",
      },
    ],
    milestones: [
      { label: "Buyer funding", state: "Complete", date: "Jul 14" },
      { label: "Asset verification", state: "Complete", date: "Jul 15" },
      { label: "Delivery confirmation", state: "Open", date: "Jul 18" },
      { label: "Escrow release", state: "Pending", date: "Jul 20" },
    ],
  },
  {
    id: "TX-50018",
    order: "EG-50018",
    buyer: "BrightFuture Corp",
    seller: "TerraGenesis Biofuels",
    material: "Scrap Polymer Blend",
    amount: "EUR 15,000",
    numericAmount: 16320,
    fee: "EUR 300",
    net: "EUR 14,700",
    type: "Deposit",
    status: "Flagged",
    date: "Jul 13, 2026",
    risk: "Medium",
    asset: "AST-24022",
    contract: "CTR-1052",
    payment: "PAY-8041",
    ledger: [
      {
        entry: "Buyer wire initiated",
        date: "Jul 13 · 11:18 AM",
        amount: "EUR 15,000",
        state: "Processing",
      },
      {
        entry: "Compliance hold",
        date: "Jul 15 · 9:18 AM",
        amount: "EUR 15,000",
        state: "Held",
      },
    ],
    milestones: [
      { label: "Buyer funding", state: "Processing", date: "Jul 13" },
      { label: "Asset evidence", state: "Blocked", date: "Jul 15" },
      { label: "Escrow availability", state: "Pending", date: "After review" },
    ],
  },
  {
    id: "TX-50012",
    order: "EG-50012",
    buyer: "NutriFeed Industries",
    seller: "Metal Reclaim LLC",
    material: "Used Dry Transformer",
    amount: "$40,000",
    numericAmount: 40000,
    fee: "$800",
    net: "$39,200",
    type: "Inspection hold",
    status: "Release ready",
    date: "Jul 12, 2026",
    risk: "Medium",
    asset: "AST-24031",
    contract: "CTR-1057",
    payment: "PAY-8036",
    ledger: [
      {
        entry: "Card authorization",
        date: "Jul 12 · 1:10 PM",
        amount: "$40,000",
        state: "Posted",
      },
      {
        entry: "Inspection hold",
        date: "Jul 12 · 1:11 PM",
        amount: "−$40,000",
        state: "Posted",
      },
    ],
    milestones: [
      { label: "Funding", state: "Complete", date: "Jul 12" },
      { label: "Inspection upload", state: "Complete", date: "Jul 14" },
      { label: "Admin review", state: "Due", date: "Today" },
      { label: "Release decision", state: "Pending", date: "After review" },
    ],
  },
  {
    id: "TX-49984",
    order: "EG-49984",
    buyer: "AgriCorp Solutions",
    seller: "Louisiana BioMass Partners",
    material: "Corn Stover",
    amount: "$4,200",
    numericAmount: 4200,
    fee: "$84",
    net: "$4,116",
    type: "Recurring invoice",
    status: "Completed",
    date: "Jul 8, 2026",
    risk: "Low",
    asset: "AST-24038",
    contract: "CTR-1061",
    payment: "PAY-8031",
    ledger: [
      {
        entry: "Invoice funded",
        date: "Jul 8 · 8:10 AM",
        amount: "$4,200",
        state: "Posted",
      },
      {
        entry: "Seller payout",
        date: "Jul 10 · 4:30 PM",
        amount: "−$4,116",
        state: "Completed",
      },
      {
        entry: "Platform fee",
        date: "Jul 10 · 4:30 PM",
        amount: "−$84",
        state: "Completed",
      },
    ],
    milestones: [
      { label: "Invoice funding", state: "Complete", date: "Jul 8" },
      { label: "Delivery confirmation", state: "Complete", date: "Jul 10" },
      { label: "Seller payout", state: "Complete", date: "Jul 10" },
    ],
  },
];

const PAYMENTS: PaymentRecord[] = [
  {
    id: "PAY-8042",
    title: "Black Gypsum escrow funding",
    payer: "GreenHarvest Co.",
    payee: "EcoPack Co.",
    rail: "ACH",
    amount: "$13,440",
    status: "Processing",
    initiated: "Jul 14 · 9:25 AM",
    expected: "After delivery confirmation",
    transaction: "TX-50021",
    contract: "CTR-1048",
    offset: "1.8 t CO2e matched",
    risk: "Low",
    events: [
      {
        title: "ACH instruction accepted",
        detail: "Buyer bank account ending 4567 authorized.",
        time: "Jul 14 · 9:25 AM",
        state: "Complete",
      },
      {
        title: "Funds held in escrow",
        detail: "Balance secured for EG-50021.",
        time: "Jul 14 · 9:26 AM",
        state: "Current",
      },
      {
        title: "Seller payout",
        detail: "Requires delivery confirmation and inspection window.",
        time: "Pending",
        state: "Pending",
      },
    ],
  },
  {
    id: "PAY-8041",
    title: "Scrap Polymer Blend deposit",
    payer: "BrightFuture Corp",
    payee: "TerraGenesis Biofuels",
    rail: "Wire",
    amount: "EUR 15,000",
    status: "Needs review",
    initiated: "Jul 13 · 11:18 AM",
    expected: "After compliance clearance",
    transaction: "TX-50018",
    contract: "CTR-1052",
    offset: "Offset quote pending",
    risk: "Medium",
    events: [
      {
        title: "Wire instruction received",
        detail: "International transfer reference matched.",
        time: "Jul 13 · 11:18 AM",
        state: "Complete",
      },
      {
        title: "Compliance hold",
        detail: "Replacement SDS required before availability.",
        time: "Jul 15 · 9:18 AM",
        state: "Current",
      },
      {
        title: "Escrow availability",
        detail: "Pending finance and compliance review.",
        time: "Pending",
        state: "Pending",
      },
    ],
  },
  {
    id: "PAY-8036",
    title: "Transformer inspection hold",
    payer: "NutriFeed Industries",
    payee: "Metal Reclaim LLC",
    rail: "Card",
    amount: "$40,000",
    status: "Processing",
    initiated: "Jul 12 · 1:10 PM",
    expected: "Admin release decision",
    transaction: "TX-50012",
    contract: "CTR-1057",
    offset: "0.4 t CO2e matched",
    risk: "Medium",
    events: [
      {
        title: "Card authorization captured",
        detail: "Corporate card authorization approved.",
        time: "Jul 12 · 1:10 PM",
        state: "Complete",
      },
      {
        title: "Inspection hold active",
        detail: "Funds protected while evidence is reviewed.",
        time: "Jul 12 · 1:11 PM",
        state: "Current",
      },
      {
        title: "Release or reversal",
        detail: "Admin decision required.",
        time: "Pending",
        state: "Pending",
      },
    ],
  },
  {
    id: "PAY-8031",
    title: "Corn Stover recurring payout",
    payer: "AgriCorp Solutions",
    payee: "Louisiana BioMass Partners",
    rail: "ACH",
    amount: "$4,200",
    status: "Paid",
    initiated: "Jul 8 · 8:10 AM",
    expected: "Completed Jul 10",
    transaction: "TX-49984",
    contract: "CTR-1061",
    offset: "2.1 t CO2e matched",
    risk: "Low",
    events: [
      {
        title: "Invoice funded",
        detail: "Monthly recurring instruction completed.",
        time: "Jul 8 · 8:10 AM",
        state: "Complete",
      },
      {
        title: "Delivery confirmed",
        detail: "Receiving evidence accepted.",
        time: "Jul 10 · 1:42 PM",
        state: "Complete",
      },
      {
        title: "Seller payout completed",
        detail: "$4,116 deposited after platform fee.",
        time: "Jul 10 · 4:30 PM",
        state: "Complete",
      },
    ],
  },
];

export function AdminAssetVerificationCenter({
  assetId,
}: {
  assetId?: string;
}) {
  const asset = ASSETS.find((item) => item.id === assetId);
  if (assetId && asset) return <AssetDetail asset={asset} />;
  return <AssetHome />;
}

function AssetHome() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AssetStatus | "All">("All");
  const [notice, setNotice] = useState("");
  const visible = useMemo(
    () =>
      ASSETS.filter(
        (asset) =>
          (status === "All" || asset.status === status) &&
          `${asset.id} ${asset.material} ${asset.owner} ${asset.certificate} ${asset.facility}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, status],
  );
  return (
    <Workspace
      eyebrow="ASSET VERIFICATION OPERATIONS"
      title="Validate marketplace assets, certificates, origin, and transaction eligibility."
      body="Review feedstock batches, waste streams, recoverable equipment, and biomass evidence before assets enter contracts, escrow, and delivery workflows."
      actions={
        <button
          type="button"
          onClick={() =>
            setNotice(
              "Asset verification portfolio exported for compliance review.",
            )
          }
          className="rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
        >
          Export verification report
        </button>
      }
    >
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      <Hero
        icon={Fingerprint}
        eyebrow="VERIFICATION NETWORK"
        title="Turn submitted materials into trusted, transaction-ready assets."
        body="Each asset combines owner identity, material specifications, certificates, evidence, facility context, and admin review."
        metrics={[
          ["4", "Assets"],
          ["2", "Verified"],
          ["1", "Needs evidence"],
          ["86%", "Avg score"],
        ]}
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Managed assets"
          value="4"
          detail="Across feedstock and equipment"
          icon={PackageCheck}
        />
        <Metric
          label="Verified"
          value="2"
          detail="Eligible for active transactions"
          icon={BadgeCheck}
        />
        <Metric
          label="Evidence queue"
          value="2"
          detail="Review or replacement needed"
          icon={FileCheck2}
        />
        <Metric
          label="Protected value"
          value="$70.9K"
          detail="Assets under verification"
          icon={CircleDollarSign}
        />
      </div>
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-neutral-950">
              Asset portfolio
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Open an asset to inspect evidence, checks, activity, and
              eligibility.
            </p>
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <label className="relative min-w-56 flex-1 sm:max-w-xs">
              <span className="sr-only">Search assets</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search material, owner, or certificate"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm"
              />
            </label>
            <select
              aria-label="Filter asset verification status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as AssetStatus | "All")
              }
              className="h-10 rounded-xl border border-neutral-200 px-3 text-sm font-semibold"
            >
              <option>All</option>
              <option>Verified</option>
              <option>Needs evidence</option>
              <option>Under review</option>
              <option>Rejected</option>
            </select>
          </div>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {visible.map((asset) => (
            <button
              type="button"
              key={asset.id}
              onClick={() =>
                router.push(`/admin/asset-verification/${asset.id}`)
              }
              className="group rounded-2xl border border-neutral-200 p-5 text-left hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 group-hover:bg-neutral-950 group-hover:text-white">
                  <Fingerprint className="size-5" />
                </span>
                <AssetBadge status={asset.status} />
              </div>
              <p className="mt-4 font-mono text-xs text-neutral-400">
                {asset.id} · {asset.certificate}
              </p>
              <h3 className="mt-2 text-lg font-black text-neutral-950">
                {asset.material}
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                {asset.owner} · {asset.facility}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <SmallMetric label="Score" value={`${asset.score}%`} />
                <SmallMetric label="Quantity" value={asset.quantity} />
                <SmallMetric label="Value" value={asset.marketValue} />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4">
                <span className="text-xs font-semibold text-neutral-500">
                  {asset.type}
                </span>
                <ChevronRight className="size-4 text-neutral-300" />
              </div>
            </button>
          ))}
        </div>
      </section>
    </Workspace>
  );
}

function AssetDetail({ asset }: { asset: AssetRecord }) {
  const router = useRouter();
  const [tab, setTab] = useState<AssetTab>("Overview");
  const [status, setStatus] = useState<AssetStatus>(asset.status);
  const [notice, setNotice] = useState("");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  return (
    <Workspace
      before={
        <Back
          onClick={() => router.push("/admin/asset-verification")}
          label="Back to asset verification"
        />
      }
      eyebrow={`${asset.id} · ${asset.certificate}`}
      title={asset.material}
      body={`${asset.owner} · ${asset.type} · ${asset.facility}`}
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              setStatus("Needs evidence");
              setNotice(
                "Replacement evidence request sent to the asset owner.",
              );
            }}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold"
          >
            Request evidence
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus("Verified");
              setNotice(
                "Asset verified and released for eligible transactions.",
              );
            }}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
          >
            <BadgeCheck className="size-4" />
            Verify asset
          </button>
        </>
      }
    >
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Status"
          value={status}
          detail="Current verification state"
          icon={BadgeCheck}
        />
        <Metric
          label="Verification score"
          value={`${asset.score}%`}
          detail={`Risk ${asset.risk.toLowerCase()}`}
          icon={Gauge}
        />
        <Metric
          label="Quantity"
          value={asset.quantity}
          detail={asset.type}
          icon={PackageCheck}
        />
        <Metric
          label="Market value"
          value={asset.marketValue}
          detail="Protected marketplace value"
          icon={CircleDollarSign}
        />
      </div>
      <Tabs
        items={["Overview", "Evidence", "Verification checks", "Activity"]}
        active={tab}
        onChange={(item) => setTab(item as AssetTab)}
      />
      {tab === "Overview" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <Panel title="Asset profile" icon={Fingerprint}>
            <dl className="grid gap-5 sm:grid-cols-2">
              <Detail label="Owner" value={asset.owner} />
              <Detail label="Asset type" value={asset.type} />
              <Detail label="Certificate" value={asset.certificate} />
              <Detail label="Facility" value={asset.facility} />
              <Detail label="Listing" value={asset.listing} />
              <Detail label="Risk" value={asset.risk} />
            </dl>
          </Panel>
          <section className="rounded-2xl bg-neutral-950 p-5 text-white shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              TRANSACTION ELIGIBILITY
            </p>
            <h2 className="mt-3 text-2xl font-black">
              {status === "Verified" ? "Eligible" : "On hold"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-300">
              {status === "Verified"
                ? "Verification evidence supports listing, contracting, escrow, and fulfillment workflows."
                : "This asset cannot open new financial commitments until review completes."}
            </p>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/admin/accounting/transactions/${asset.transaction}`,
                )
              }
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-neutral-950"
            >
              <Link2 className="size-4" />
              Open transaction
            </button>
          </section>
        </div>
      )}
      {tab === "Evidence" && (
        <Panel
          className="mt-6"
          title="Verification evidence"
          icon={FileCheck2}
          actions={
            <button
              type="button"
              onClick={() => setEvidenceOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-3 py-2 text-xs font-bold text-white"
            >
              <Upload className="size-3.5" />
              Add evidence
            </button>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            {asset.evidence.map((item) => (
              <div
                key={item.name}
                className="flex items-start gap-3 rounded-xl bg-neutral-50 p-4"
              >
                <FileText className="mt-0.5 size-5 text-neutral-500" />
                <div>
                  <p className="font-bold text-neutral-900">{item.name}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {item.type} · {item.state}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {tab === "Verification checks" && (
        <Panel className="mt-6" title="Verification checks" icon={ShieldCheck}>
          <div className="grid gap-3 md:grid-cols-2">
            {asset.checks.map((check) => (
              <div
                key={check.label}
                className="rounded-xl border border-neutral-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-black text-neutral-950">{check.label}</p>
                  <CheckBadge state={check.state} />
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  {check.detail}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {tab === "Activity" && (
        <Panel className="mt-6" title="Asset activity" icon={History}>
          <Timeline
            items={asset.activity.map((item) => ({
              title: item.title,
              detail: item.detail,
              time: item.date,
            }))}
          />
        </Panel>
      )}
      {evidenceOpen && (
        <SimpleDialog
          title="Add verification evidence"
          fields={["Evidence name", "Evidence type"]}
          confirm="Add to review"
          onClose={() => setEvidenceOpen(false)}
          onConfirm={() => {
            setEvidenceOpen(false);
            setNotice("New evidence added to the asset review queue.");
          }}
        />
      )}
    </Workspace>
  );
}

export function AdminTransactionsCenter({
  transactionId,
}: {
  transactionId?: string;
}) {
  const transaction = TRANSACTIONS.find((item) => item.id === transactionId);
  if (transactionId && transaction)
    return <TransactionDetail transaction={transaction} />;
  return <TransactionsHome />;
}
function TransactionsHome() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TransactionStatus | "All">("All");
  const [notice, setNotice] = useState("");
  const visible = useMemo(
    () =>
      TRANSACTIONS.filter(
        (transaction) =>
          (status === "All" || transaction.status === status) &&
          `${transaction.id} ${transaction.order} ${transaction.buyer} ${transaction.seller} ${transaction.material}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, status],
  );
  const volume = TRANSACTIONS.reduce(
    (sum, item) => sum + item.numericAmount,
    0,
  );
  return (
    <Workspace
      eyebrow="TRANSACTION OPERATIONS"
      title="Monitor escrow, releases, refunds, fees, and transaction risk."
      body="Operate the financial lifecycle behind EcoGlobe orders with linked assets, contracts, payments, ledger entries, milestones, and exception controls."
      actions={
        <button
          type="button"
          onClick={() =>
            setNotice(
              "Transaction ledger export prepared for finance operations.",
            )
          }
          className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
        >
          <Download className="size-4" />
          Export ledger
        </button>
      }
    >
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      <Hero
        icon={Landmark}
        eyebrow="MARKETPLACE LEDGER"
        title="Keep every marketplace dollar traceable from funding to settlement."
        body="Transaction operations connect verified assets, contracts, order milestones, payment rails, escrow controls, and accounting evidence."
        metrics={[
          [`$${(volume / 1000).toFixed(1)}K`, "Volume"],
          ["$53.4K", "In escrow"],
          ["1", "Flagged"],
          ["98.7%", "Reconciled"],
        ]}
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Transaction volume"
          value={`$${(volume / 1000).toFixed(1)}K`}
          detail="Modeled active portfolio"
          icon={CircleDollarSign}
        />
        <Metric
          label="Escrow controlled"
          value="$53.4K"
          detail="Funded or inspection held"
          icon={LockKeyhole}
        />
        <Metric
          label="Platform fees"
          value="$1.45K"
          detail="Accrued marketplace revenue"
          icon={Banknote}
        />
        <Metric
          label="Exceptions"
          value="1"
          detail="Finance review required"
          icon={ShieldAlert}
        />
      </div>
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-neutral-950">
              Transaction ledger
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Inspect settlement state, counterparties, fees, and linked
              controls.
            </p>
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <label className="relative min-w-56 flex-1 sm:max-w-xs">
              <span className="sr-only">Search transactions</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search transaction, order, or company"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm"
              />
            </label>
            <select
              aria-label="Filter transaction status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as TransactionStatus | "All")
              }
              className="h-10 rounded-xl border border-neutral-200 px-3 text-sm font-semibold"
            >
              <option>All</option>
              <option>In escrow</option>
              <option>Release ready</option>
              <option>Completed</option>
              <option>Flagged</option>
              <option>Refunded</option>
            </select>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="pb-3 font-semibold">Transaction</th>
                <th className="pb-3 font-semibold">Order</th>
                <th className="pb-3 font-semibold">Counterparties</th>
                <th className="pb-3 font-semibold">Material</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Risk</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visible.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-neutral-50">
                  <td className="py-4">
                    <p className="font-mono font-bold text-neutral-900">
                      {transaction.id}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      {transaction.date}
                    </p>
                  </td>
                  <td className="py-4 font-semibold text-neutral-700">
                    {transaction.order}
                  </td>
                  <td className="py-4">
                    <p className="font-semibold text-neutral-800">
                      {transaction.buyer}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      to {transaction.seller}
                    </p>
                  </td>
                  <td className="py-4 text-neutral-600">
                    {transaction.material}
                  </td>
                  <td className="py-4 font-black text-neutral-900">
                    {transaction.amount}
                  </td>
                  <td className="py-4 text-neutral-600">{transaction.risk}</td>
                  <td className="py-4">
                    <TransactionBadge status={transaction.status} />
                  </td>
                  <td className="py-4 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/admin/accounting/transactions/${transaction.id}`,
                        )
                      }
                      className="rounded-full bg-neutral-950 px-3 py-2 text-xs font-bold text-white"
                    >
                      View transaction
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Workspace>
  );
}

function TransactionDetail({
  transaction,
}: {
  transaction: TransactionRecord;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TransactionTab>("Overview");
  const [status, setStatus] = useState<TransactionStatus>(transaction.status);
  const [notice, setNotice] = useState("");
  return (
    <Workspace
      before={
        <Back
          onClick={() => router.push("/admin/accounting/transactions")}
          label="Back to transactions"
        />
      }
      eyebrow={`${transaction.id} · ${transaction.order}`}
      title={`${transaction.material} transaction`}
      body={`${transaction.buyer} to ${transaction.seller} · ${transaction.type}`}
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              setStatus("Flagged");
              setNotice("Transaction flagged and assigned to finance review.");
            }}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold"
          >
            Flag transaction
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus("Refunded");
              setNotice(
                "Refund workflow opened with ledger reversal controls.",
              );
            }}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
          >
            <RotateCcw className="size-4" />
            Issue refund
          </button>
        </>
      }
    >
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Status"
          value={status}
          detail="Current settlement state"
          icon={Landmark}
        />
        <Metric
          label="Gross amount"
          value={transaction.amount}
          detail={transaction.type}
          icon={CircleDollarSign}
        />
        <Metric
          label="Platform fee"
          value={transaction.fee}
          detail={`Net ${transaction.net}`}
          icon={Banknote}
        />
        <Metric
          label="Risk"
          value={transaction.risk}
          detail="Finance control profile"
          icon={ShieldCheck}
        />
      </div>
      <Tabs
        items={["Overview", "Ledger", "Controls", "Activity"]}
        active={tab}
        onChange={(item) => setTab(item as TransactionTab)}
      />
      {tab === "Overview" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <Panel title="Transaction profile" icon={Receipt}>
            <dl className="grid gap-5 sm:grid-cols-2">
              <Detail label="Order" value={transaction.order} />
              <Detail label="Transaction type" value={transaction.type} />
              <Detail label="Buyer" value={transaction.buyer} />
              <Detail label="Seller" value={transaction.seller} />
              <Detail label="Initiated" value={transaction.date} />
              <Detail label="Risk" value={transaction.risk} />
            </dl>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <Linked
                label="Asset"
                value={transaction.asset}
                onClick={() =>
                  router.push(`/admin/asset-verification/${transaction.asset}`)
                }
              />
              <Linked
                label="Contract"
                value={transaction.contract}
                onClick={() =>
                  router.push(`/admin/contracts/${transaction.contract}`)
                }
              />
              <Linked
                label="Payment"
                value={transaction.payment}
                onClick={() =>
                  router.push(
                    `/admin/accounting/payments/${transaction.payment}`,
                  )
                }
              />
            </div>
          </Panel>
          <Panel title="Settlement milestones" icon={Clock3}>
            <div className="space-y-3">
              {transaction.milestones.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 p-3"
                >
                  <div>
                    <p className="text-sm font-bold text-neutral-900">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">{item.date}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-neutral-700 ring-1 ring-neutral-200">
                    {item.state}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
      {tab === "Ledger" && (
        <Panel className="mt-6" title="Double-entry ledger" icon={Landmark}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-400">
                <tr>
                  <th className="pb-3">Entry</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">State</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {transaction.ledger.map((entry) => (
                  <tr key={entry.entry}>
                    <td className="py-4 font-bold text-neutral-900">
                      {entry.entry}
                    </td>
                    <td className="py-4 text-neutral-500">{entry.date}</td>
                    <td className="py-4 text-neutral-500">{entry.state}</td>
                    <td className="py-4 text-right font-black text-neutral-900">
                      {entry.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {tab === "Controls" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <ControlCard
            icon={LockKeyhole}
            title="Escrow control"
            body="Hold or release funds only after verified fulfillment events."
            action="Review escrow"
            onClick={() => setNotice("Escrow control review opened.")}
          />
          <ControlCard
            icon={RotateCcw}
            title="Refund control"
            body="Create a governed reversal with reason, approval, and ledger entries."
            action="Prepare refund"
            onClick={() => setNotice("Refund preparation workflow opened.")}
          />
          <ControlCard
            icon={ShieldAlert}
            title="Risk control"
            body="Flag the transaction and stop automated release paths."
            action="Open risk review"
            onClick={() => {
              setStatus("Flagged");
              setNotice("Risk review opened.");
            }}
          />
        </div>
      )}
      {tab === "Activity" && (
        <Panel className="mt-6" title="Transaction activity" icon={History}>
          <Timeline
            items={transaction.milestones.map((item) => ({
              title: item.label,
              detail: `Status: ${item.state}`,
              time: item.date,
            }))}
          />
        </Panel>
      )}
    </Workspace>
  );
}

export function AdminPaymentsCenter({ paymentId }: { paymentId?: string }) {
  const payment = PAYMENTS.find((item) => item.id === paymentId);
  if (paymentId && payment) return <PaymentDetail payment={payment} />;
  return <PaymentsHome />;
}
function PaymentsHome() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "All">("All");
  const [notice, setNotice] = useState("");
  const [methodOpen, setMethodOpen] = useState(false);
  const [rails, setRails] = useState([
    { label: "ACH", enabled: true, detail: "Escrow and payouts" },
    { label: "Wire", enabled: true, detail: "High-value transfers" },
    { label: "Card", enabled: true, detail: "Deposits and holds" },
    { label: "Green offsets", enabled: true, detail: "Checkout matching" },
  ]);
  const visible = useMemo(
    () =>
      PAYMENTS.filter(
        (payment) =>
          (status === "All" || payment.status === status) &&
          `${payment.id} ${payment.title} ${payment.payer} ${payment.payee} ${payment.rail}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, status],
  );
  return (
    <Workspace
      eyebrow="PAYMENT OPERATIONS"
      title="Operate payment rails, funding exceptions, receipts, and payout readiness."
      body="Monitor ACH, wire, and card instructions from initiation through escrow and payout, with transaction links, carbon offsets, and finance controls."
      actions={
        <>
          <button
            type="button"
            onClick={() =>
              setNotice(
                "Payment operations report exported for finance review.",
              )
            }
            className="rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold"
          >
            Export payments
          </button>
          <button
            type="button"
            onClick={() => setMethodOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
          >
            <Plus className="size-4" />
            Add payment method
          </button>
        </>
      }
    >
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      <Hero
        icon={WalletCards}
        eyebrow="PAYMENT RAILS ONLINE"
        title="Move funds safely through governed marketplace milestones."
        body="Rail health, escrow availability, finance exceptions, payout readiness, receipts, and offset matching stay visible in one command center."
        metrics={[
          ["$72.6K", "Processed"],
          ["$53.4K", "Controlled"],
          ["1", "Needs review"],
          ["99.98%", "Rail uptime"],
        ]}
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rails.map((rail, index) => (
          <button
            type="button"
            key={rail.label}
            onClick={() =>
              setRails((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index
                    ? { ...item, enabled: !item.enabled }
                    : item,
                ),
              )
            }
            className="rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-neutral-200"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                {rail.label === "ACH" ? (
                  <Building2 className="size-5" />
                ) : rail.label === "Wire" ? (
                  <ArrowDownToLine className="size-5" />
                ) : rail.label === "Card" ? (
                  <CreditCard className="size-5" />
                ) : (
                  <Leaf className="size-5" />
                )}
              </span>
              {rail.enabled ? (
                <ToggleRight className="size-7 text-emerald-600" />
              ) : (
                <ToggleLeft className="size-7 text-neutral-400" />
              )}
            </div>
            <p className="mt-4 font-black text-neutral-950">{rail.label}</p>
            <p className="mt-1 text-xs text-neutral-500">
              {rail.detail} · {rail.enabled ? "Enabled" : "Disabled"}
            </p>
          </button>
        ))}
      </div>
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-neutral-950">
              Payment queue
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Inspect rail events, exceptions, controls, and linked
              transactions.
            </p>
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <label className="relative min-w-56 flex-1 sm:max-w-xs">
              <span className="sr-only">Search payments</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search payment or counterparty"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm"
              />
            </label>
            <select
              aria-label="Filter payment status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as PaymentStatus | "All")
              }
              className="h-10 rounded-xl border border-neutral-200 px-3 text-sm font-semibold"
            >
              <option>All</option>
              <option>Paid</option>
              <option>Processing</option>
              <option>Needs review</option>
              <option>Scheduled</option>
              <option>Failed</option>
            </select>
          </div>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {visible.map((payment) => (
            <button
              type="button"
              key={payment.id}
              onClick={() =>
                router.push(`/admin/accounting/payments/${payment.id}`)
              }
              className="group rounded-2xl border border-neutral-200 p-5 text-left hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 group-hover:bg-neutral-950 group-hover:text-white">
                  <WalletCards className="size-5" />
                </span>
                <PaymentBadge status={payment.status} />
              </div>
              <p className="mt-4 font-mono text-xs text-neutral-400">
                {payment.id} · {payment.rail}
              </p>
              <h3 className="mt-2 text-lg font-black text-neutral-950">
                {payment.title}
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                {payment.payer} to {payment.payee}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <SmallMetric label="Amount" value={payment.amount} />
                <SmallMetric label="Risk" value={payment.risk} />
                <SmallMetric
                  label="Offset"
                  value={payment.offset.split(" ")[0]}
                />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4 text-xs">
                <span className="font-semibold text-neutral-500">
                  {payment.initiated}
                </span>
                <ChevronRight className="size-4 text-neutral-300" />
              </div>
            </button>
          ))}
        </div>
      </section>
      {methodOpen && (
        <SimpleDialog
          title="Add payment method"
          fields={["Method name", "Settlement purpose"]}
          confirm="Add method"
          onClose={() => setMethodOpen(false)}
          onConfirm={() => {
            setMethodOpen(false);
            setNotice("Payment method added in review mode.");
          }}
        />
      )}
    </Workspace>
  );
}

function PaymentDetail({ payment }: { payment: PaymentRecord }) {
  const router = useRouter();
  const [tab, setTab] = useState<PaymentTab>("Overview");
  const [status, setStatus] = useState<PaymentStatus>(payment.status);
  const [notice, setNotice] = useState("");
  return (
    <Workspace
      before={
        <Back
          onClick={() => router.push("/admin/accounting/payments")}
          label="Back to payments"
        />
      }
      eyebrow={`${payment.id} · ${payment.rail}`}
      title={payment.title}
      body={`${payment.payer} to ${payment.payee} · ${payment.amount}`}
      actions={
        <>
          <button
            type="button"
            onClick={() =>
              setNotice(
                "Receipt generated and added to the finance download queue.",
              )
            }
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold"
          >
            <Receipt className="size-4" />
            Receipt
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus("Processing");
              setNotice(
                "Finance review accepted and payment processing resumed.",
              );
            }}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
          >
            <ShieldCheck className="size-4" />
            Approve review
          </button>
        </>
      }
    >
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Status"
          value={status}
          detail="Current rail state"
          icon={WalletCards}
        />
        <Metric
          label="Amount"
          value={payment.amount}
          detail={`${payment.rail} instruction`}
          icon={CircleDollarSign}
        />
        <Metric
          label="Expected"
          value={payment.expected}
          detail="Settlement timing"
          icon={Clock3}
        />
        <Metric
          label="Risk"
          value={payment.risk}
          detail={payment.offset}
          icon={ShieldCheck}
        />
      </div>
      <Tabs
        items={["Overview", "Rail events", "Controls", "Audit"]}
        active={tab}
        onChange={(item) => setTab(item as PaymentTab)}
      />
      {tab === "Overview" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <Panel title="Payment profile" icon={WalletCards}>
            <dl className="grid gap-5 sm:grid-cols-2">
              <Detail label="Payer" value={payment.payer} />
              <Detail label="Payee" value={payment.payee} />
              <Detail label="Rail" value={payment.rail} />
              <Detail label="Initiated" value={payment.initiated} />
              <Detail label="Expected" value={payment.expected} />
              <Detail label="Carbon offset" value={payment.offset} />
            </dl>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Linked
                label="Transaction"
                value={payment.transaction}
                onClick={() =>
                  router.push(
                    `/admin/accounting/transactions/${payment.transaction}`,
                  )
                }
              />
              <Linked
                label="Contract"
                value={payment.contract}
                onClick={() =>
                  router.push(`/admin/contracts/${payment.contract}`)
                }
              />
            </div>
          </Panel>
          <section className="rounded-2xl bg-neutral-950 p-5 text-white shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              RAIL HEALTH
            </p>
            <h2 className="mt-3 text-2xl font-black">
              {payment.rail} operational
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-300">
              Instruction accepted, event monitoring active, and finance
              controls available.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <DarkMetric value="99.98%" label="Uptime" />
              <DarkMetric value="42 sec" label="Median update" />
            </div>
          </section>
        </div>
      )}
      {tab === "Rail events" && (
        <Panel className="mt-6" title="Payment rail timeline" icon={Activity}>
          <div className="space-y-3">
            {payment.events.map((event) => (
              <div
                key={event.title}
                className="flex gap-4 rounded-xl border border-neutral-200 p-4"
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full ${event.state === "Complete" ? "bg-emerald-100 text-emerald-700" : event.state === "Current" ? "bg-blue-100 text-blue-700" : "bg-neutral-100 text-neutral-400"}`}
                >
                  {event.state === "Complete" ? (
                    <Check className="size-4" />
                  ) : (
                    <Clock3 className="size-4" />
                  )}
                </span>
                <div>
                  <p className="font-black text-neutral-950">{event.title}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {event.detail}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-neutral-400">
                    {event.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {tab === "Controls" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <ControlCard
            icon={RefreshCw}
            title="Retry instruction"
            body="Retry a failed or delayed rail instruction with the same idempotency key."
            action="Retry payment"
            onClick={() => {
              setStatus("Processing");
              setNotice("Payment instruction queued for a controlled retry.");
            }}
          />
          <ControlCard
            icon={Archive}
            title="Archive evidence"
            body="Retain receipts and rail responses under the finance policy."
            action="Archive evidence"
            onClick={() =>
              setNotice(
                "Payment evidence archived under finance retention policy.",
              )
            }
          />
          <ControlCard
            icon={ShieldAlert}
            title="Open exception"
            body="Pause settlement and assign a finance exception owner."
            action="Open exception"
            onClick={() => {
              setStatus("Needs review");
              setNotice("Finance exception opened and settlement paused.");
            }}
          />
        </div>
      )}
      {tab === "Audit" && (
        <Panel className="mt-6" title="Payment audit" icon={History}>
          <Timeline
            items={payment.events.map((event) => ({
              title: event.title,
              detail: event.detail,
              time: event.time,
            }))}
          />
        </Panel>
      )}
    </Workspace>
  );
}

function Workspace({
  eyebrow,
  title,
  body,
  actions,
  before,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  actions: React.ReactNode;
  before?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-neutral-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {before}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
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
      {children}
    </div>
  );
}
function Hero({
  icon: Icon,
  eyebrow,
  title,
  body,
  metrics,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: string;
  metrics: string[][];
}) {
  return (
    <section className="mt-6 rounded-3xl bg-neutral-950 p-6 text-white shadow-xl sm:p-8">
      <div className="grid gap-6 xl:grid-cols-[1fr_560px] xl:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            <Icon className="size-4" />
            {eyebrow}
          </p>
          <h2 className="mt-4 max-w-2xl text-2xl font-black sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">
            {body}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map(([value, label]) => (
            <DarkMetric key={label} value={value} label={label} />
          ))}
        </div>
      </div>
    </section>
  );
}
function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-neutral-950">{value}</p>
          <p className="mt-1 text-xs text-neutral-500">{detail}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
          <Icon className="size-5" />
        </span>
      </div>
    </section>
  );
}
function DarkMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
      <p className="text-xl font-black">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
    </div>
  );
}
function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-neutral-900">
        {value}
      </p>
    </div>
  );
}
function Panel({
  title,
  icon: Icon,
  children,
  className = "",
  actions,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200 ${className}`}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
            <Icon className="size-4" />
          </span>
          <h2 className="text-lg font-black text-neutral-950">{title}</h2>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-bold text-neutral-900">{value}</dd>
    </div>
  );
}
function Tabs({
  items,
  active,
  onChange,
}: {
  items: string[];
  active: string;
  onChange: (item: string) => void;
}) {
  return (
    <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-neutral-200">
      {items.map((item) => (
        <button
          type="button"
          key={item}
          onClick={() => onChange(item)}
          className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold ${active === item ? "bg-neutral-950 text-white" : "text-neutral-500 hover:bg-neutral-50"}`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
function Back({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-neutral-600"
    >
      <ArrowLeft className="size-4" />
      {label}
    </button>
  );
}
function Linked({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between rounded-xl bg-neutral-50 p-3 text-left"
    >
      <span>
        <span className="block text-[10px] font-bold uppercase text-neutral-400">
          {label}
        </span>
        <span className="mt-1 block font-mono text-sm font-bold text-neutral-900">
          {value}
        </span>
      </span>
      <ChevronRight className="size-4 text-neutral-400" />
    </button>
  );
}
function Timeline({
  items,
}: {
  items: Array<{ title: string; detail: string; time: string }>;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={`${item.title}-${item.time}`}
          className="flex gap-3 rounded-xl bg-neutral-50 p-4"
        >
          <History className="mt-0.5 size-5 shrink-0 text-neutral-500" />
          <div>
            <p className="font-bold text-neutral-900">{item.title}</p>
            <p className="mt-1 text-sm text-neutral-500">{item.detail}</p>
            <p className="mt-2 text-xs text-neutral-400">{item.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
function ControlCard({
  icon: Icon,
  title,
  body,
  action,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
      <span className="flex size-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
        <Icon className="size-5" />
      </span>
      <h2 className="mt-4 font-black text-neutral-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-500">{body}</p>
      <button
        type="button"
        onClick={onClick}
        className="mt-5 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
      >
        {action}
      </button>
    </section>
  );
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
      className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-100"
    >
      <span className="flex items-center gap-2">
        <CheckCircle2 className="size-4" />
        {message}
      </span>
      <button type="button" aria-label="Dismiss message" onClick={onClose}>
        <X className="size-4" />
      </button>
    </div>
  );
}
function AssetBadge({ status }: { status: AssetStatus }) {
  const tone =
    status === "Verified"
      ? "bg-emerald-100 text-emerald-800"
      : status === "Rejected"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${tone}`}>
      {status}
    </span>
  );
}
function TransactionBadge({ status }: { status: TransactionStatus }) {
  const tone =
    status === "Completed"
      ? "bg-emerald-100 text-emerald-800"
      : status === "Flagged"
        ? "bg-red-100 text-red-700"
        : status === "Release ready"
          ? "bg-blue-100 text-blue-700"
          : "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${tone}`}>
      {status}
    </span>
  );
}
function PaymentBadge({ status }: { status: PaymentStatus }) {
  const tone =
    status === "Paid"
      ? "bg-emerald-100 text-emerald-800"
      : status === "Needs review" || status === "Failed"
        ? "bg-red-100 text-red-700"
        : status === "Processing"
          ? "bg-blue-100 text-blue-700"
          : "bg-neutral-100 text-neutral-700";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${tone}`}>
      {status}
    </span>
  );
}
function CheckBadge({
  state,
}: {
  state: AssetRecord["checks"][number]["state"];
}) {
  const tone =
    state === "Passed"
      ? "bg-emerald-100 text-emerald-800"
      : state === "Missing"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${tone}`}>
      {state}
    </span>
  );
}
function SimpleDialog({
  title,
  fields,
  confirm,
  onClose,
  onConfirm,
}: {
  title: string;
  fields: string[];
  confirm: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const id = title.toLowerCase().replaceAll(" ", "-");
  const complete = fields.every((field) => values[field]?.trim());
  return (
    <dialog
      open
      aria-labelledby={`${id}-title`}
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/40 p-4"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              ADMIN WORKFLOW
            </p>
            <h2
              id={`${id}-title`}
              className="mt-2 text-2xl font-black text-neutral-950"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            aria-label={`Close ${title}`}
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-neutral-100"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-6 grid gap-4">
          {fields.map((field) => (
            <label key={field} className="text-sm font-bold">
              {field}
              <input
                value={values[field] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field]: event.target.value,
                  }))
                }
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3"
              />
            </label>
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
            disabled={!complete}
            onClick={onConfirm}
            className="rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {confirm}
          </button>
        </div>
      </div>
    </dialog>
  );
}
