"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, MessageSquare, ChevronRight, Filter } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";

type DisputeStatus = "Open" | "Awaiting buyer" | "Under review" | "Resolved";

interface Dispute {
  id: string;
  orderId: string;
  buyer: string;
  reason: string;
  amount: string;
  opened: string;
  status: DisputeStatus;
  unread: number;
}

const disputes: Dispute[] = [
  { id: "DSP-2041", orderId: "TS98765", buyer: "AgriCorp Solutions", reason: "Quantity mismatch on delivery", amount: "$13,440.00", opened: "2026-05-01", status: "Open", unread: 2 },
  { id: "DSP-2038", orderId: "TS98742", buyer: "GreenHarvest Co.", reason: "Quality below specification", amount: "$8,210.00", opened: "2026-04-28", status: "Under review", unread: 0 },
  { id: "DSP-2031", orderId: "TS98711", buyer: "NutriFeed Industries", reason: "Damaged in transit", amount: "$4,990.00", opened: "2026-04-22", status: "Awaiting buyer", unread: 1 },
  { id: "DSP-2027", orderId: "TS98699", buyer: "BioGreen Innovations", reason: "Wrong product shipped", amount: "$2,180.00", opened: "2026-04-15", status: "Resolved", unread: 0 },
  { id: "DSP-2018", orderId: "TS98641", buyer: "PurePastures Ltd.", reason: "Carbon certification missing", amount: "$5,640.00", opened: "2026-04-08", status: "Resolved", unread: 0 },
];

const STATUS_FILTERS: Array<DisputeStatus | "All"> = ["All", "Open", "Awaiting buyer", "Under review", "Resolved"];

export function SellerDisputesPage() {
  const [filter, setFilter] = useState<DisputeStatus | "All">("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = disputes.filter((d) => filter === "All" || d.status === filter);
  const selected = disputes.find((d) => d.id === selectedId) ?? filtered[0] ?? null;

  return (
    <SellerLayout title="Disputes">
      <div className="px-8 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Disputes</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Active and recently resolved buyer disputes. Responding within 24 hours
              keeps your seller score green.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-neutral-500" />
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filter === s
                      ? "bg-neutral-900 text-white"
                      : "bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                  style={filter !== s ? { border: "1px solid #E0E0E0" } : undefined}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* List */}
          <div className="rounded-xl bg-white lg:col-span-2" style={{ border: "1px solid #F0F0F0" }}>
            {filtered.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-neutral-700">No disputes match.</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Try a different filter.
                </p>
              </div>
            ) : (
              filtered.map((d, i) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors ${
                    selected?.id === d.id ? "bg-neutral-50" : "hover:bg-neutral-50"
                  }`}
                  style={{ borderBottom: i === filtered.length - 1 ? undefined : "1px solid #F4F4F5" }}
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-neutral-500">{d.id}</span>
                      <DisputeStatusBadge status={d.status} />
                      {d.unread > 0 && (
                        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                          {d.unread}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-medium text-neutral-900">{d.reason}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {d.buyer} · Order {d.orderId} · {d.amount}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-neutral-300" />
                </button>
              ))
            )}
          </div>

          {/* Detail */}
          <div className="rounded-xl bg-white p-6 lg:col-span-3" style={{ border: "1px solid #F0F0F0" }}>
            {selected ? <DisputeDetail dispute={selected} /> : <p className="text-sm text-neutral-500">Pick a dispute to view details.</p>}
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}

function DisputeStatusBadge({ status }: { status: DisputeStatus }) {
  const tone: Record<DisputeStatus, { bg: string; fg: string }> = {
    Open: { bg: "#FEE2E2", fg: "#991B1B" },
    "Awaiting buyer": { bg: "#FEF3C7", fg: "#92400E" },
    "Under review": { bg: "#EDE9FE", fg: "#5B21B6" },
    Resolved: { bg: "#DCFCE7", fg: "#166534" },
  };
  const t = tone[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: t.bg, color: t.fg }}
    >
      {status}
    </span>
  );
}

function DisputeDetail({ dispute }: { dispute: Dispute }) {
  const [reply, setReply] = useState("");
  const conversation = [
    { who: "buyer", name: dispute.buyer, time: dispute.opened + " 09:14 AM", msg: dispute.reason + ". Please review and respond within 24h." },
    { who: "seller", name: "You", time: dispute.opened + " 11:42 AM", msg: "Acknowledged — pulling delivery records now. Will respond by EOD." },
  ];
  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-neutral-500">{dispute.id}</span>
            <DisputeStatusBadge status={dispute.status} />
          </div>
          <h2 className="mt-1 text-xl font-bold text-neutral-900">{dispute.reason}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            <Link href={`/seller/sales/${dispute.orderId}`} className="underline hover:text-neutral-900">
              Order {dispute.orderId}
            </Link>{" "}
            · {dispute.buyer} · {dispute.amount} · Opened {dispute.opened}
          </p>
        </div>
      </header>

      <section>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">
          Conversation
        </h3>
        <div className="flex flex-col gap-3">
          {conversation.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                m.who === "seller"
                  ? "ml-auto bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-900"
              }`}
            >
              <div className={`mb-1 flex items-center justify-between gap-2 text-[10px] uppercase ${m.who === "seller" ? "text-neutral-400" : "text-neutral-500"}`}>
                <span>{m.name}</span>
                <span>{m.time}</span>
              </div>
              <p className="text-sm">{m.msg}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-neutral-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">Respond</h3>
        <textarea
          rows={4}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Explain your position, attach supporting documents, or propose a resolution…"
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
        />
        <div className="mt-3 flex items-center justify-between gap-2">
          <button className="text-sm font-medium text-neutral-700 underline">
            Attach documents
          </button>
          <div className="flex gap-2">
            <Button variant="secondary" size="md">
              Save draft
            </Button>
            <Button variant="primary" size="md" disabled={!reply.trim()}>
              <MessageSquare className="size-4" />
              Send response
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
