"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, DollarSign, RefreshCw, CheckCircle2, AlertTriangle, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, X, FileText, Download } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { ExportDropdown } from "./export-dropdown";
import { DateRangeDropdown } from "./date-range-dropdown";

type EscrowStatus = "In Progress" | "Completed";
interface EscrowItem { id: string; date: string; escrow: string; orderId: string; buyer: string; seller: string; amount: string; status: EscrowStatus; }

const escrowItems: EscrowItem[] = Array.from({ length: 20 }, (_, i) => ({
  id: "TS12345",
  date: "12/12/2026",
  escrow: i < 2 ? "Fund" : "Escrow released",
  orderId: "OD12346",
  buyer: "Buyer name",
  seller: "Seller name",
  amount: "$12,900,000",
  status: i < 2 ? "In Progress" as EscrowStatus : "Completed" as EscrowStatus,
}));

function StatusBadge({ status }: { status: EscrowStatus }) {
  const s: Record<EscrowStatus, string> = { "In Progress": "bg-amber-50 text-amber-600", Completed: "bg-green-50 text-green-600" };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${s[status]}`}>{status}</span>;
}

function EscrowDetailDrawer({ item, onClose }: { item: EscrowItem; onClose: () => void }) {
  const log = [
    { event: "Buyer funded escrow", date: "Oct 29, 2024 10:10 AM", active: true },
    { event: "Seller uploaded BOL", date: "Oct 29, 2024 10:10 AM", active: true },
    { event: "Buyer confirms delivery", date: "", active: false },
    { event: "Funds released", date: "", active: false },
  ];
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-[680px] flex-col overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-6 py-4" style={{ borderBottom: "1px solid #F0F0F0" }}>
          <div>
            <div className="flex items-center gap-3"><h2 className="text-xl font-bold text-neutral-900">Escrow ID: EC12345</h2><StatusBadge status={item.status} /></div>
            <p className="text-sm text-neutral-500">$15,500,000</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><MoreHorizontal className="size-5 text-neutral-500" /></button>
            <button onClick={onClose} className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><X className="size-5 text-neutral-500" /></button>
          </div>
        </div>
        <div className="flex flex-col gap-6 p-6">
          <section>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-neutral-900">Escrow info</h3><button className="text-sm font-medium text-green-600">View Order Detail</button></div>
            <div className="grid grid-cols-2 gap-y-4 rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
              <div><p className="text-xs font-semibold text-neutral-500">Amount Total</p><p className="text-sm text-neutral-900">$15,500,000</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Amount held</p><p className="text-sm text-neutral-900">$15,500,000</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Funded date</p><p className="text-sm text-neutral-900">01/15/2027</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Order ID</p><p className="text-sm text-neutral-900">OD20411</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Buyer</p><p className="text-sm text-neutral-900">Shell Refinery Louisiana</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Seller</p><p className="text-sm text-neutral-900">Umbrella Corp</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Shipping type</p><p className="text-sm text-neutral-900">Delivery</p></div>
            </div>
          </section>
          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Documents</h3>
            <div className="flex flex-col gap-3">
              {["Example data name.pdf", "Example data name.pdf"].map((doc, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ border: "1px solid #F0F0F0" }}>
                  <div className="flex items-center gap-3"><FileText className="size-5 text-neutral-400" /><span className="text-sm text-neutral-900">{doc}</span></div>
                  <div className="flex items-center gap-2"><button className="text-neutral-400 hover:text-neutral-700"><Download className="size-4" /></button><button className="text-neutral-400 hover:text-neutral-700"><MoreHorizontal className="size-4" /></button></div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Activity Log</h3>
            <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
              {log.map((item, i) => (
                <div key={item.event} className="flex gap-4">
                  <div className="flex flex-col items-center"><div className={`size-3 rounded-full ${item.active ? "bg-green-500" : "bg-neutral-300"}`} />{i < log.length - 1 && <div className={`w-0.5 flex-1 ${item.active && log[i + 1]?.active ? "bg-green-500" : "bg-neutral-200"}`} />}</div>
                  <div className="flex flex-1 items-center justify-between pb-5"><span className={`text-sm ${item.active ? "font-medium text-neutral-900" : "text-neutral-400"}`}>{item.event}</span>{item.date && <span className="text-xs text-neutral-500">{item.date}</span>}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function FiltersPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute right-0 top-12 z-30 w-[380px] rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}>
      <div className="mb-6 flex items-center justify-between"><h3 className="text-lg font-semibold text-neutral-900">Filters</h3><button onClick={onClose} className="text-neutral-400 hover:text-neutral-900"><X className="size-5" /></button></div>
      <div className="flex flex-col gap-6">
        <div><h4 className="mb-3 text-sm font-semibold text-neutral-900">Order date</h4><input type="date" className="w-full rounded-lg px-4 py-3 text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} /></div>
        <div><h4 className="mb-3 text-sm font-semibold text-neutral-900">Escrow status</h4><div className="flex gap-6"><label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4" /> Funded</label><label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4" /> Released</label></div></div>
        <div className="flex items-center justify-between pt-2"><button className="text-sm font-medium text-neutral-900">Reset</button><Button variant="primary" size="md">Apply</Button></div>
      </div>
    </div>
  );
}

export function EscrowPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("30d");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EscrowItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredItems = escrowItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.id.toLowerCase().includes(q) || item.orderId.toLowerCase().includes(q) || item.buyer.toLowerCase().includes(q) || item.seller.toLowerCase().includes(q);
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <h1 className="text-2xl font-bold text-neutral-900">Escrow</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2" style={{ border: "1px solid #F0F0F0" }}><Search className="size-4 text-neutral-400" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-400" /></div>
          <DateRangeDropdown value={dateRange} onChange={setDateRange} />
          <div className="relative"><button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-neutral-700" style={{ border: "1px solid #F0F0F0" }}><SlidersHorizontal className="size-4" /> Filters</button>{showFilters && <FiltersPanel onClose={() => setShowFilters(false)} />}</div>
          <ExportDropdown
            filename="ecoglobe-escrow"
            columns={[
              { key: "id", label: "Transaction ID" }, { key: "date", label: "Date" }, { key: "escrow", label: "Escrow" },
              { key: "orderId", label: "Order ID" }, { key: "buyer", label: "Buyer" }, { key: "seller", label: "Seller" },
              { key: "amount", label: "Amount" }, { key: "status", label: "Status" },
            ]}
            data={filteredItems}
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 px-6 pb-5">
        {[{ l: "Funds on Hold", v: "$123,456,789", i: DollarSign }, { l: "Pending Release", v: "$123,456,789", i: RefreshCw }, { l: "Released Funds", v: "$123,456,789", i: CheckCircle2 }, { l: "Disputed Funds", v: "$123,456,789", i: AlertTriangle }].map((s) => (
          <div key={s.l} className="flex flex-col gap-2 rounded-xl px-5 py-4" style={{ border: "1px solid #F0F0F0" }}><div className="flex items-center justify-between"><span className="text-sm text-neutral-500">{s.l}</span><s.i className="size-4 text-neutral-400" /></div><span className="text-2xl font-bold text-neutral-900">{s.v}</span></div>
        ))}
      </div>
      <div className="flex-1 overflow-x-auto px-6">
        <table className="w-full min-w-[1000px]">
          <thead><tr className="text-left" style={{ borderBottom: "1px solid #F0F0F0" }}><th className="pb-3 text-sm font-medium text-neutral-500">Transctn ID</th><th className="pb-3 text-sm font-medium text-neutral-500">Date</th><th className="pb-3 text-sm font-medium text-neutral-500">Escrow</th><th className="pb-3 text-sm font-medium text-neutral-500">Order ID</th><th className="pb-3 text-sm font-medium text-neutral-500">Buyer</th><th className="pb-3 text-sm font-medium text-neutral-500">Seller</th><th className="pb-3 text-sm font-medium text-neutral-500">Amount</th><th className="pb-3 text-sm font-medium text-neutral-500">Status</th><th className="pb-3"></th></tr></thead>
          <tbody>
            {filteredItems.map((item, i) => (
              <tr key={i} className="cursor-pointer hover:bg-neutral-50" style={{ borderBottom: "1px solid #F8F8F8" }} onClick={() => setSelectedItem(item)}>
                <td className="py-3.5 text-sm text-neutral-900">{item.id}</td><td className="py-3.5 text-sm text-neutral-700">{item.date}</td><td className="py-3.5 text-sm text-neutral-700">{item.escrow}</td><td className="py-3.5 text-sm text-neutral-700">{item.orderId}</td><td className="py-3.5 text-sm text-neutral-700">{item.buyer}</td><td className="py-3.5 text-sm text-neutral-700">{item.seller}</td><td className="py-3.5 text-sm text-neutral-900">{item.amount}</td><td className="py-3.5"><StatusBadge status={item.status} /></td><td className="py-3.5"><button className="text-neutral-400"><MoreHorizontal className="size-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid #F0F0F0" }}>
        <div className="flex items-center gap-1"><button className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronLeft className="size-4" /></button>{[1, 2, 3, "...", 15].map((p, i) => <button key={i} className={`flex size-8 items-center justify-center rounded text-sm ${p === currentPage ? "bg-neutral-900 font-medium text-white" : "text-neutral-500 hover:bg-neutral-100"}`} onClick={() => typeof p === "number" && setCurrentPage(p)}>{p}</button>)}<button className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronRight className="size-4" /></button></div>
        <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-500" style={{ border: "1px solid #E0E0E0" }}>20 / page <ChevronDown className="size-3.5" /></button>
      </div>
      {selectedItem && <EscrowDetailDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  );
}
