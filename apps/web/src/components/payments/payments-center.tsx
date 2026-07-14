"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  BadgeCheck,
  Building2,
  CreditCard,
  Download,
  Leaf,
  Receipt,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

type Role = "buyer" | "seller" | "admin";
type PaymentStatus = "Paid" | "Processing" | "Needs review" | "Scheduled";

interface PaymentRecord {
  id: string;
  title: string;
  counterparty: string;
  method: string;
  amount: string;
  status: PaymentStatus;
  date: string;
  carbonOffset: string;
}

const payments: PaymentRecord[] = [
  {
    id: "PAY-8042",
    title: "Black Gypsum monthly delivery",
    counterparty: "EcoPack Co. to GreenHarvest Co.",
    method: "ACH escrow draw",
    amount: "$10,400",
    status: "Paid",
    date: "Jul 8, 2026",
    carbonOffset: "1.8 t CO2e matched",
  },
  {
    id: "PAY-8041",
    title: "Scrap Polymer Blend deposit",
    counterparty: "BrightFuture Corp to TerraGenesis Biofuels",
    method: "Wire transfer",
    amount: "EUR 15,000",
    status: "Processing",
    date: "Jul 13, 2026",
    carbonOffset: "Offset quote pending",
  },
  {
    id: "PAY-8036",
    title: "Used Dry Transformer inspection hold",
    counterparty: "NutriFeed Industries to Metal Reclaim LLC",
    method: "Card authorization",
    amount: "$40,000",
    status: "Needs review",
    date: "Jul 14, 2026",
    carbonOffset: "0.4 t CO2e matched",
  },
  {
    id: "PAY-8031",
    title: "Corn Stover recurring invoice",
    counterparty: "AgriCorp Solutions to Louisiana BioMass Partners",
    method: "Monthly invoice",
    amount: "$4,200",
    status: "Scheduled",
    date: "Aug 1, 2026",
    carbonOffset: "2.1 t CO2e forecast",
  },
];

const roleCopy: Record<Role, { eyebrow: string; title: string; body: string }> = {
  buyer: {
    eyebrow: "PAYMENT CENTER",
    title: "Manage saved methods, invoices, receipts, and escrow-funded payments.",
    body: "Buyer-facing view for funding orders, downloading receipts, and tracking carbon-offset options tied to each transaction.",
  },
  seller: {
    eyebrow: "PAYOUT CENTER",
    title: "Track incoming payments, payout timing, and held escrow balances.",
    body: "Seller-facing view for payout readiness, receipt history, and payment methods accepted on active listings.",
  },
  admin: {
    eyebrow: "PAYMENT OPERATIONS",
    title: "Monitor payment rails, exceptions, receipts, and green payment settings.",
    body: "Admin-facing view for reviewing transaction funding, payment methods, carbon-offset status, and items needing finance approval.",
  },
};

const methods = [
  { name: "ACH", detail: "Default for escrow funding", enabled: true, icon: Building2 },
  { name: "Wire", detail: "High-value bulk transactions", enabled: true, icon: ArrowDownToLine },
  { name: "Card", detail: "Deposits and inspection holds", enabled: true, icon: CreditCard },
  { name: "Green offsets", detail: "Carbon offset matching at checkout", enabled: true, icon: Leaf },
];

export function PaymentsCenter({ role }: { role: Role }) {
  const [selected, setSelected] = useState(payments[0]);
  const [status, setStatus] = useState<Record<string, PaymentStatus>>({});
  const copy = roleCopy[role];

  const visiblePayments =
    role === "buyer"
      ? payments.filter((item) => item.counterparty.includes("to"))
      : role === "seller"
        ? payments.filter((item) => item.status !== "Needs review")
        : payments;

  const activeStatus = status[selected.id] ?? selected.status;

  const markReviewed = () => {
    setStatus((current) => ({ ...current, [selected.id]: "Processing" }));
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <div className="px-8 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-emerald-700">
              {copy.eyebrow}
            </p>
            <h1 className="max-w-3xl text-3xl font-bold text-neutral-950">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">{copy.body}</p>
          </div>
          <button className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white">
            Add payment method
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {methods.map((method) => (
            <div key={method.name} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
              <method.icon className="mb-4 size-5 text-neutral-700" />
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-neutral-950">{method.name}</p>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Enabled
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">{method.detail}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-950">Payment history</h2>
                <p className="text-sm text-neutral-500">Sample transaction funding and receipt records.</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium">
                <Download className="size-4" />
                Export
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-neutral-100">
              {visiblePayments.map((payment) => {
                const isSelected = selected.id === payment.id;
                return (
                  <button
                    key={payment.id}
                    type="button"
                    onClick={() => setSelected(payment)}
                    className={`grid w-full gap-3 px-4 py-4 text-left transition md:grid-cols-[120px_1fr_120px_130px] ${
                      isSelected ? "bg-neutral-950 text-white" : "bg-white hover:bg-neutral-50"
                    }`}
                  >
                    <span className="font-mono text-xs">{payment.id}</span>
                    <span>
                      <span className="block text-sm font-semibold">{payment.title}</span>
                      <span className={isSelected ? "text-xs text-neutral-300" : "text-xs text-neutral-500"}>
                        {payment.counterparty}
                      </span>
                    </span>
                    <span className="text-sm font-semibold">{payment.amount}</span>
                    <StatusBadge status={status[payment.id] ?? payment.status} inverted={isSelected} />
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-neutral-950">Payment detail</h2>
                <p className="text-sm text-neutral-500">{selected.id}</p>
              </div>
              <StatusBadge status={activeStatus} />
            </div>
            <div className="space-y-4 text-sm">
              <Detail label="Amount" value={selected.amount} />
              <Detail label="Method" value={selected.method} />
              <Detail label="Date" value={selected.date} />
              <Detail label="Carbon offset" value={selected.carbonOffset} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold">
                <Receipt className="mr-1 inline size-4" />
                Receipt
              </button>
              <button className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">
                <ShieldCheck className="mr-1 inline size-4" />
                Review
              </button>
            </div>
            {role === "admin" && activeStatus === "Needs review" && (
              <button
                type="button"
                onClick={markReviewed}
                className="mt-3 w-full rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900"
              >
                Mark finance review in progress
              </button>
            )}
            <div className="mt-6 rounded-xl bg-emerald-50 p-4">
              <div className="mb-2 flex items-center gap-2 font-semibold text-emerald-900">
                <BadgeCheck className="size-4" />
                Demo workflow ready
              </div>
              <p className="text-sm text-emerald-800">
                The frontend now shows payment rails, receipt actions, review status, and offset visibility for this role.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-950">{value}</span>
    </div>
  );
}

function StatusBadge({ status, inverted = false }: { status: PaymentStatus; inverted?: boolean }) {
  const tone: Record<PaymentStatus, string> = {
    Paid: "bg-emerald-100 text-emerald-700",
    Processing: "bg-blue-100 text-blue-700",
    "Needs review": "bg-amber-100 text-amber-800",
    Scheduled: "bg-neutral-100 text-neutral-700",
  };
  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        inverted ? "bg-white/15 text-white" : tone[status]
      }`}
    >
      {status === "Processing" && <RefreshCw className="size-3" />}
      {status}
    </span>
  );
}
