"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, DollarSign, AlertTriangle, CheckCircle2, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, X, FileText, Download } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { ExportDropdown } from "./export-dropdown";
import { DateRangeDropdown } from "./date-range-dropdown";

type TxnStatus = "In Progress" | "Completed" | "Refunded";
interface Transaction { id: string; date: string; orderId: string; buyer: string; seller: string; amount: string; type: string; status: TxnStatus; }

const transactions: Transaction[] = [
  { id: "TS12346", date: "01/15/2027", orderId: "OD12346", buyer: "Acme Company", seller: "Globex Corp", amount: "$15,500,000", type: "Escrow", status: "Completed" },
  { id: "TS12348", date: "03/05/2027", orderId: "OD12348", buyer: "Vought Int", seller: "Umbrella Corp", amount: "$10,300,000", type: "Escrow", status: "Completed" },
  { id: "TS12349", date: "04/10/2027", orderId: "OD12349", buyer: "Reynholm Ind", seller: "Wayne Enterprises", amount: "$9,450,000", type: "Escrow", status: "Completed" },
  { id: "TS12350", date: "05/15/2027", orderId: "OD12350", buyer: "Dunder Mifflin", seller: "Stark Industries", amount: "$14,200,000", type: "Escrow", status: "Completed" },
  { id: "TS12347", date: "02/20/2027", orderId: "OD12347", buyer: "Krieger LLC", seller: "Cyberdyne Systems", amount: "$8,750,000", type: "Refund", status: "Refunded" },
  { id: "TS12351", date: "06/20/2027", orderId: "OD12351", buyer: "Nakatomi Corp", seller: "Tyrell Corp", amount: "$20,000,000", type: "Escrow", status: "Completed" },
  { id: "TS12352", date: "07/25/2027", orderId: "OD12352", buyer: "Soylent Corp", seller: "Oscorp", amount: "$18,750,000", type: "Escrow", status: "Completed" },
  { id: "TS12353", date: "08/30/2027", orderId: "OD12353", buyer: "Enron", seller: "Initech", amount: "$16,850,000", type: "Escrow", status: "Completed" },
  { id: "TS12354", date: "09/14/2027", orderId: "OD12354", buyer: "Omni Consumer", seller: "Gringotts Bank", amount: "$7,900,000", type: "Escrow", status: "Completed" },
  { id: "TS12355", date: "10/18/2027", orderId: "OD12355", buyer: "Frobozz Co.", seller: "Wayne Foundation", amount: "$22,100,000", type: "Escrow", status: "Completed" },
  { id: "TS12356", date: "11/22/2027", orderId: "OD12356", buyer: "MomCorp", seller: "Stark Foundation", amount: "$11,600,000", type: "Escrow", status: "Completed" },
  { id: "TS12357", date: "12/01/2027", orderId: "OD12357", buyer: "Bubba Gump", seller: "Cheers Inc.", amount: "$13,300,000", type: "Escrow", status: "Completed" },
  { id: "TS12358", date: "01/12/2028", orderId: "OD12358", buyer: "Springfield Power", seller: "Krusty Burger", amount: "$10,950,000", type: "Escrow", status: "Completed" },
  { id: "TS12359", date: "02/16/2028", orderId: "OD12359", buyer: "Strickland Propane", seller: "Los Pollos Hermanos", amount: "$9,200,000", type: "Escrow", status: "Completed" },
  { id: "TS12360", date: "03/21/2028", orderId: "OD12360", buyer: "Olivia Pope & Assoc.", seller: "Saul Goodman & Assoc.", amount: "$12,400,000", type: "Escrow", status: "Completed" },
  { id: "TS12361", date: "04/24/2028", orderId: "OD12361", buyer: "Veidt Ent.", seller: "Sterling Cooper", amount: "$19,800,000", type: "Escrow", status: "Completed" },
  { id: "TS12362", date: "05/30/2028", orderId: "OD12362", buyer: "Massive Dynamics", seller: "Wolfram & Hart", amount: "$21,500,000", type: "Escrow", status: "Completed" },
  { id: "TS12363", date: "06/15/2028", orderId: "OD12363", buyer: "Good Burger", seller: "Kwik-E-Mart", amount: "$17,750,000", type: "Escrow", status: "Completed" },
  { id: "TS12364", date: "07/10/2028", orderId: "OD12364", buyer: "Cheers Bar", seller: "Moe's Tavern", amount: "$15,900,000", type: "Escrow", status: "Completed" },
  { id: "TS12365", date: "08/22/2028", orderId: "OD12365", buyer: "Pemberton Softa", seller: "Kacola Beverages", amount: "$13,600,000", type: "Escrow", status: "Completed" },
];

const statusTabs = ["All Transaction", "In Escrow", "Processing", "Shipped", "Completed", "Cancelled"];

function StatusBadge({ status }: { status: TxnStatus }) {
  const s: Record<TxnStatus, string> = { "In Progress": "bg-amber-50 text-amber-600", Completed: "bg-green-50 text-green-600", Refunded: "bg-red-50 text-red-600" };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${s[status]}`}>{status}</span>;
}

function TxnDetailDrawer({ txn, onClose }: { txn: Transaction; onClose: () => void }) {
  const log = [
    { event: "Escrow funded", date: "Oct 29, 2024 10:10 AM", active: true },
    { event: "Quote approved", date: "Oct 29, 2024 10:10 AM", active: true },
    { event: "Buyer confirmed", date: "", active: false },
    { event: "Escrow released", date: "", active: false },
    { event: "Payout completed", date: "", active: false },
  ];
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-[680px] flex-col overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-6 py-4" style={{ borderBottom: "1px solid #F0F0F0" }}>
          <div>
            <div className="flex items-center gap-3"><h2 className="text-xl font-bold text-neutral-900">Transaction ID: {txn.id}</h2><StatusBadge status={txn.status} /></div>
            <p className="text-sm text-neutral-500">{txn.amount}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><MoreHorizontal className="size-5 text-neutral-500" /></button>
            <button onClick={onClose} className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><X className="size-5 text-neutral-500" /></button>
          </div>
        </div>
        <div className="flex flex-col gap-6 p-6">
          <section>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-neutral-900">Sale info</h3><button className="text-sm font-medium text-green-600">View Order Detail</button></div>
            <div className="grid grid-cols-2 gap-y-4 rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
              <div><p className="text-xs font-semibold text-neutral-500">Order ID</p><p className="text-sm text-neutral-900">{txn.orderId}</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Order Placed</p><p className="text-sm text-neutral-900">Oct 24, 2024 10:10 AM</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Buyer</p><p className="text-sm text-neutral-900">Shell Refinery Louisiana</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Seller</p><p className="text-sm text-neutral-900">Umbrella Corp</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Quantity</p><p className="text-sm text-neutral-900">20 tons</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Shipping</p><p className="text-sm text-neutral-900">Delivery</p></div>
            </div>
          </section>
          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Payment details</h3>
            <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
              <div className="grid grid-cols-2 gap-y-4">
                <div><p className="text-xs font-semibold text-neutral-500">Gross amount</p><p className="text-sm text-neutral-900">$15,500,000</p></div>
                <div><p className="text-xs font-semibold text-neutral-500">EcoGlobe fee</p><p className="text-sm text-neutral-900">$200.00</p></div>
                <div><p className="text-xs font-semibold text-neutral-500">Escrow fee</p><p className="text-sm text-neutral-900">$100.00</p></div>
                <div><p className="text-xs font-semibold text-neutral-500">Net amount</p><p className="text-sm text-neutral-900">$15,100,000</p></div>
                <div><p className="text-xs font-semibold text-neutral-500">Escrow funded date</p><p className="text-sm text-neutral-900">Oct 24, 2024 10:10 AM</p></div>
                <div><p className="text-xs font-semibold text-neutral-500">Release date</p><p className="text-sm text-neutral-900">ERD Oct 29, 2024 10:10 AM</p></div>
                <div><p className="text-xs font-semibold text-neutral-500">Bank account</p><p className="text-sm text-neutral-900">US Bank Account ****4567</p></div>
                <div><p className="text-xs font-semibold text-neutral-500">Payout status</p><p className="text-sm text-neutral-900">Pending</p></div>
              </div>
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
        <div><h4 className="mb-3 text-sm font-semibold text-neutral-900">Transaction date</h4><input type="date" className="w-full rounded-lg px-4 py-3 text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} /></div>
        <div><h4 className="mb-3 text-sm font-semibold text-neutral-900">Product category</h4><div className="grid grid-cols-2 gap-3">{["Plastics", "Rubber & Tire-Derived", "Oils & Liquid Feedstocks", "Biomass & Wood"].map((c) => <label key={c} className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4" /> {c}</label>)}</div></div>
        <div><h4 className="mb-3 text-sm font-semibold text-neutral-900">Escrow status</h4><div className="flex gap-6"><label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4" /> Funded</label><label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4" /> Released</label></div></div>
        <div><h4 className="mb-3 text-sm font-semibold text-neutral-900">Order status</h4><div className="grid grid-cols-2 gap-3">{["Pending", "Processing", "Completed", "Failed"].map((s) => <label key={s} className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4" /> {s}</label>)}</div></div>
        <div className="flex items-center justify-between pt-2"><button className="text-sm font-medium text-neutral-900">Reset</button><Button variant="primary" size="md">Apply</Button></div>
      </div>
    </div>
  );
}

export function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("30d");
  const [activeTab, setActiveTab] = useState("All Transaction");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredTxns = transactions.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.id.toLowerCase().includes(q) || t.buyer.toLowerCase().includes(q) || t.seller.toLowerCase().includes(q) || t.orderId.toLowerCase().includes(q);
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <h1 className="text-2xl font-bold text-neutral-900">Transactions</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2" style={{ border: "1px solid #F0F0F0" }}><Search className="size-4 text-neutral-400" /><input type="text" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-400" /></div>
          <DateRangeDropdown value={dateRange} onChange={setDateRange} />
          <div className="relative"><button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-neutral-700" style={{ border: "1px solid #F0F0F0" }}><SlidersHorizontal className="size-4" /> Filters</button>{showFilters && <FiltersPanel onClose={() => setShowFilters(false)} />}</div>
          <ExportDropdown
            filename="ecoglobe-transactions"
            columns={[
              { key: "id", label: "Transaction ID" }, { key: "date", label: "Date" }, { key: "orderId", label: "Order ID" },
              { key: "buyer", label: "Buyer" }, { key: "seller", label: "Seller" }, { key: "amount", label: "Amount" }, { key: "type", label: "Type" },
            ]}
            data={filteredTxns}
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 px-6 pb-5">
        {[{ l: "Total Revenue", v: "$123,456,789", i: DollarSign }, { l: "In Escrow", v: "$123,456,789", i: DollarSign }, { l: "Released", v: "$123,456,789", i: CheckCircle2 }, { l: "Disputed Funds", v: "$123,456,789", i: AlertTriangle }].map((s) => (
          <div key={s.l} className="flex flex-col gap-2 rounded-xl px-5 py-4" style={{ border: "1px solid #F0F0F0" }}><div className="flex items-center justify-between"><span className="text-sm text-neutral-500">{s.l}</span><s.i className="size-4 text-neutral-400" /></div><span className="text-2xl font-bold text-neutral-900">{s.v}</span></div>
        ))}
      </div>
      <div className="flex gap-6 px-6 pb-2" style={{ borderBottom: "1px solid #F0F0F0" }}>
        {statusTabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-medium ${activeTab === tab ? "text-neutral-900 border-b-2 border-neutral-900" : "text-neutral-400"}`}>{tab}</button>
        ))}
      </div>
      <div className="flex-1 overflow-x-auto px-6 pt-2">
        <table className="w-full min-w-[900px]">
          <thead><tr className="text-left" style={{ borderBottom: "1px solid #F0F0F0" }}><th className="pb-3 text-sm font-medium text-neutral-500">Transctn ID</th><th className="pb-3 text-sm font-medium text-neutral-500">Date</th><th className="pb-3 text-sm font-medium text-neutral-500">Order ID</th><th className="pb-3 text-sm font-medium text-neutral-500">Buyer</th><th className="pb-3 text-sm font-medium text-neutral-500">Seller</th><th className="pb-3 text-sm font-medium text-neutral-500">Amount</th><th className="pb-3 text-sm font-medium text-neutral-500">Type</th><th className="pb-3"></th></tr></thead>
          <tbody>
            {filteredTxns.map((t, i) => (
              <tr key={i} className="cursor-pointer hover:bg-neutral-50" style={{ borderBottom: "1px solid #F8F8F8" }} onClick={() => setSelectedTxn(t)}>
                <td className="py-3.5 text-sm text-neutral-900">{t.id}</td><td className="py-3.5 text-sm text-neutral-700">{t.date}</td><td className="py-3.5 text-sm text-neutral-700">{t.orderId}</td><td className="py-3.5 text-sm text-neutral-700">{t.buyer}</td><td className="py-3.5 text-sm text-neutral-700">{t.seller}</td><td className="py-3.5 text-sm text-neutral-900">{t.amount}</td><td className="py-3.5 text-sm text-neutral-700">{t.type}</td><td className="py-3.5"><button className="text-neutral-400"><MoreHorizontal className="size-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid #F0F0F0" }}>
        <div className="flex items-center gap-1"><button className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronLeft className="size-4" /></button>{[1, 2, 3, "...", 15].map((p, i) => <button key={i} className={`flex size-8 items-center justify-center rounded text-sm ${p === currentPage ? "bg-neutral-900 font-medium text-white" : "text-neutral-500 hover:bg-neutral-100"}`} onClick={() => typeof p === "number" && setCurrentPage(p)}>{p}</button>)}<button className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronRight className="size-4" /></button></div>
        <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-500" style={{ border: "1px solid #E0E0E0" }}>20 / page <ChevronDown className="size-3.5" /></button>
      </div>
      {selectedTxn && <TxnDetailDrawer txn={selectedTxn} onClose={() => setSelectedTxn(null)} />}
    </div>
  );
}
