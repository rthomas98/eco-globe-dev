"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  DollarSign,
  CheckCircle2,
  Package,
  Tag,
  Users,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Printer,
  Copy,
  RefreshCw,
} from "lucide-react";
import { LineChart } from "../admin/line-chart";
import { ExportDropdown } from "../admin/export-dropdown";
import { DateRangeDropdown } from "../admin/date-range-dropdown";
import { SellerLayout } from "./seller-layout";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function Pagination({ currentPage, setCurrentPage }: { currentPage: number; setCurrentPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid #F0F0F0" }}>
      <div className="flex items-center gap-1">
        <button className="flex size-8 items-center justify-center rounded text-neutral-400">
          <ChevronLeft className="size-4" />
        </button>
        {[1, 2, 3, "...", 15].map((p, i) => (
          <button
            key={i}
            onClick={() => typeof p === "number" && setCurrentPage(p)}
            className={`flex size-8 items-center justify-center rounded text-sm ${
              p === currentPage ? "bg-green-50 font-medium text-green-700" : "text-neutral-500 hover:bg-neutral-100"
            }`}
          >
            {p}
          </button>
        ))}
        <button className="flex size-8 items-center justify-center rounded text-neutral-400">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-500" style={{ border: "1px solid #E0E0E0" }}>
        20 / page <ChevronDown className="size-3.5" />
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = {
    Completed: "bg-green-50 text-green-600",
    Failed: "bg-red-50 text-red-600",
    "In Progress": "bg-amber-50 text-amber-600",
  };
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${s[status] ?? "bg-neutral-100 text-neutral-600"}`}>
      {status}
    </span>
  );
}

function KpiCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white px-5 py-4" style={{ border: "1px solid #F0F0F0" }}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-500">{label}</span>
        <Icon className="size-4 text-neutral-400" />
      </div>
      <span className="text-2xl font-bold text-neutral-900">{value}</span>
    </div>
  );
}

function MoreMenu({ data, columns, filename }: { data: Record<string, unknown>[]; columns: { key: string; label: string }[]; filename: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const toCSV = () => {
    const header = columns.map((c) => c.label).join(",");
    const rows = data.map((row) =>
      columns
        .map((c) => {
          const v = String(row[c.key] ?? "");
          return v.includes(",") ? `"${v}"` : v;
        })
        .join(","),
    );
    return [header, ...rows].join("\n");
  };

  const download = (content: string, ext: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const actions = [
    { label: "Export CSV", icon: FileText, action: () => download(toCSV(), "csv", "text/csv") },
    { label: "Export Excel", icon: FileSpreadsheet, action: () => download(toCSV().replace(/,/g, "\t"), "xls", "application/vnd.ms-excel") },
    { label: "Print", icon: Printer, action: () => { window.print(); setOpen(false); } },
    {
      label: copied ? "Copied!" : "Copy table data",
      icon: Copy,
      action: () => {
        navigator.clipboard.writeText(toCSV());
        setCopied(true);
        setTimeout(() => { setCopied(false); setOpen(false); }, 1200);
      },
    },
    { label: "Refresh data", icon: RefreshCw, action: () => window.location.reload() },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"
        style={{ border: "1px solid #F0F0F0" }}
      >
        <MoreHorizontal className="size-4 text-neutral-500" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-12 z-30 w-[200px] rounded-xl bg-white py-1"
          style={{ border: "1px solid #F0F0F0", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
        >
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.action}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              <a.icon className="size-4 text-neutral-400" />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   SALES REPORT (seller view: own orders, with Fee/Net amount)
   ────────────────────────────────────────────────────────────── */

const sellerSalesOrders = [
  { id: "TS98765", buyer: "AgriCorp Solutions", product: "Oat Hull Animal Grade", qty: "123 lb", shipping: "Delivery", grossAmount: "$8,500", fee: "$425", netAmount: "$8,075", createdDate: "01/05/2027", completedDate: "01/05/2027", status: "Completed" },
  { id: "TS98766", buyer: "BioGreen Innovations", product: "Organic Fertilizer", qty: "500 lb", shipping: "Pickup", grossAmount: "$1,800", fee: "$90", netAmount: "$1,710", createdDate: "15/05/2027", completedDate: "15/05/2027", status: "Completed" },
  { id: "TS98767", buyer: "NutriFeed Industries", product: "Soybean Meal", qty: "200 lb", shipping: "Delivery", grossAmount: "$4,500", fee: "$225", netAmount: "$4,275", createdDate: "10/06/2027", completedDate: "10/06/2027", status: "Completed" },
  { id: "TS98768", buyer: "GreenHarvest Co.", product: "Corn Silage", qty: "1,000 lb", shipping: "Delivery", grossAmount: "$9,000", fee: "$450", netAmount: "$8,550", createdDate: "20/07/2027", completedDate: "20/07/2027", status: "Completed" },
  { id: "TS98769", buyer: "PurePastures Ltd.", product: "Alfalfa Hay", qty: "750 lb", shipping: "Pickup", grossAmount: "$3,000", fee: "$150", netAmount: "$2,850", createdDate: "30/08/2027", completedDate: "30/08/2027", status: "Completed" },
  { id: "TS98765", buyer: "AgriCorp Solutions", product: "Oat Hull Animal Grade", qty: "123 lb", shipping: "Delivery", grossAmount: "$6,500", fee: "$325", netAmount: "$6,175", createdDate: "01/05/2027", completedDate: "01/05/2027", status: "Completed" },
  { id: "TS98766", buyer: "Oceanic Innovations", product: "Seaweed Extract Premium", qty: "200 lb", shipping: "Delivery", grossAmount: "$2,800", fee: "$140", netAmount: "$2,660", createdDate: "03/15/2027", completedDate: "03/15/2027", status: "Failed" },
  { id: "TS98767", buyer: "GreenEarth Technologies", product: "Organic Fertilizer Blend", qty: "150 lb", shipping: "Delivery", grossAmount: "$7,800", fee: "$390", netAmount: "$7,410", createdDate: "02/20/2027", completedDate: "02/20/2027", status: "Completed" },
  { id: "TS98768", buyer: "NutriFeed Corp", product: "Alfalfa Pellets Feed Grade", qty: "250 lb", shipping: "Delivery", grossAmount: "$5,200", fee: "$260", netAmount: "$4,940", createdDate: "04/10/2027", completedDate: "04/10/2027", status: "Failed" },
  { id: "TS98769", buyer: "BioHarvest Ltd", product: "Compostable Mulch Film", qty: "300 lb", shipping: "Delivery", grossAmount: "$4,100", fee: "$205", netAmount: "$3,895", createdDate: "05/25/2027", completedDate: "05/25/2027", status: "Completed" },
  { id: "TS98770", buyer: "AgriTech Enterprises", product: "Insect Protein Powder", qty: "500 lb", shipping: "Delivery", grossAmount: "$8,700", fee: "$435", netAmount: "$8,265", createdDate: "06/30/2027", completedDate: "06/30/2027", status: "Completed" },
  { id: "TS98771", buyer: "CropScience Co.", product: "Bio-Stimulant Liquid", qty: "100 lb", shipping: "Delivery", grossAmount: "$1,500", fee: "$75", netAmount: "$1,425", createdDate: "07/15/2027", completedDate: "07/15/2027", status: "Completed" },
  { id: "TS98772", buyer: "Harvest Innovations", product: "Sustainable Seed Mix", qty: "400 lb", shipping: "Delivery", grossAmount: "$6,300", fee: "$315", netAmount: "$5,985", createdDate: "08/20/2027", completedDate: "08/20/2027", status: "Completed" },
  { id: "TS98773", buyer: "PureWater Systems", product: "Irrigation Water Treatment", qty: "600 lb", shipping: "Delivery", grossAmount: "$3,200", fee: "$160", netAmount: "$3,040", createdDate: "09/10/2027", completedDate: "09/10/2027", status: "Completed" },
  { id: "TS98774", buyer: "Rural Energy Corp", product: "Solar Farm Kits", qty: "700 lb", shipping: "Pickup", grossAmount: "$9,500", fee: "$475", netAmount: "$9,025", createdDate: "10/01/2027", completedDate: "10/01/2027", status: "Completed" },
  { id: "TS98775", buyer: "FarmTech Solutions", product: "Automated Irrigation System", qty: "800 lb", shipping: "Delivery", grossAmount: "$2,300", fee: "$115", netAmount: "$2,185", createdDate: "11/15/2027", completedDate: "11/15/2027", status: "Completed" },
  { id: "TS98776", buyer: "AgriWaste Group", product: "Anaerobic Digester Units", qty: "1000 lb", shipping: "Pickup", grossAmount: "$4,800", fee: "$240", netAmount: "$4,560", createdDate: "12/20/2027", completedDate: "12/20/2027", status: "Completed" },
  { id: "TS98777", buyer: "SmartAgri Tech", product: "Drone Crop Monitoring", qty: "200 lb", shipping: "Delivery", grossAmount: "$3,900", fee: "$195", netAmount: "$3,705", createdDate: "01/10/2028", completedDate: "01/10/2028", status: "Completed" },
  { id: "TS98778", buyer: "FoodSecure Ltd", product: "Farm Produce Storage Solutions", qty: "300 lb", shipping: "Pickup", grossAmount: "$7,400", fee: "$370", netAmount: "$7,030", createdDate: "02/25/2028", completedDate: "02/25/2028", status: "Completed" },
  { id: "TS98779", buyer: "NutriCrops Inc", product: "Crop Nutrient Fortifiers", qty: "400 lb", shipping: "Delivery", grossAmount: "$8,300", fee: "$415", netAmount: "$7,885", createdDate: "03/30/2028", completedDate: "03/30/2028", status: "Completed" },
];

export function SellerSalesReportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("yearly");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = sellerSalesOrders.filter(
    (o) =>
      !searchQuery.trim() ||
      o.buyer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SellerLayout title="Sales Reports">
      <div className="flex h-full flex-col rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <h1 className="text-2xl font-bold text-neutral-900">Sales Reports</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2" style={{ border: "1px solid #F0F0F0" }}>
              <Search className="size-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Seach"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </div>
            <DateRangeDropdown value={dateRange} onChange={setDateRange} />
            <ExportDropdown
              filename="seller-sales-report"
              columns={[
                { key: "id", label: "Order ID" },
                { key: "buyer", label: "Buyer" },
                { key: "product", label: "Product" },
                { key: "qty", label: "Qty" },
                { key: "shipping", label: "Shipping type" },
                { key: "grossAmount", label: "Gross amount" },
                { key: "fee", label: "Fee" },
                { key: "netAmount", label: "Net amount" },
                { key: "createdDate", label: "Created date" },
                { key: "completedDate", label: "Completed date" },
                { key: "status", label: "Status" },
              ]}
              data={filtered}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 px-6 pb-5 lg:grid-cols-4">
          <KpiCard label="Total revenue" value="$2,300.00" icon={DollarSign} />
          <KpiCard label="Total orders" value="140" icon={CheckCircle2} />
          <KpiCard label="Orders completed" value="124" icon={CheckCircle2} />
          <KpiCard label="Total order value" value="30 lb" icon={Package} />
        </div>

        <div className="px-6 pb-6">
          <div className="rounded-xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <h3 className="mb-4 text-base font-semibold text-neutral-900">Sales Overview</h3>
            <LineChart
              data={[18000, 10000, 19000, 22000, 5000, 10000, 1000, 26000, 13000, 17000, 10000, 35000, 38000]}
              labels={months}
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto px-6">
          <table className="w-full min-w-[1200px]">
            <thead>
              <tr className="text-left" style={{ borderBottom: "1px solid #F0F0F0" }}>
                <th className="pb-3 text-sm font-medium text-neutral-500">Order ID</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Buyer</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Product</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Qty</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Shipping type</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Gross amount</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Fee</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Net amount</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Created date</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Completed date</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Status</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #F8F8F8" }} className="hover:bg-neutral-50">
                  <td className="py-3.5 text-sm text-neutral-900">{o.id}</td>
                  <td className="py-3.5 text-sm text-neutral-700">{o.buyer}</td>
                  <td className="py-3.5 text-sm text-neutral-700">{o.product}</td>
                  <td className="py-3.5 text-sm text-neutral-700">{o.qty}</td>
                  <td className="py-3.5 text-sm text-neutral-700">{o.shipping}</td>
                  <td className="py-3.5 text-sm text-neutral-900">{o.grossAmount}</td>
                  <td className="py-3.5 text-sm text-neutral-700">{o.fee}</td>
                  <td className="py-3.5 text-sm text-neutral-900">{o.netAmount}</td>
                  <td className="py-3.5 text-sm text-neutral-700">{o.createdDate}</td>
                  <td className="py-3.5 text-sm text-neutral-700">{o.completedDate}</td>
                  <td className="py-3.5"><StatusBadge status={o.status} /></td>
                  <td className="py-3.5"><button className="text-neutral-400"><MoreHorizontal className="size-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>
    </SellerLayout>
  );
}

/* ──────────────────────────────────────────────────────────────
   PRODUCT PERFORMANCE (per-order, tons-based)
   ────────────────────────────────────────────────────────────── */

const productPerformance = [
  { id: "ID85739", date: "11/03/2027", qty: "3 tons", netAmount: "$600", shipping: "Delivery" },
  { id: "ID29573", date: "09/17/2027", qty: "17 tons", netAmount: "$3,400", shipping: "Pickup" },
  { id: "ID73658", date: "03/01/2028", qty: "2 tons", netAmount: "$400", shipping: "Pickup" },
  { id: "ID09274", date: "05/22/2028", qty: "8 tons", netAmount: "$1,600", shipping: "Pickup" },
  { id: "ID63920", date: "12/08/2027", qty: "1 ton", netAmount: "$200", shipping: "Delivery" },
  { id: "ID17495", date: "07/14/2028", qty: "12 tons", netAmount: "$2,400", shipping: "Delivery" },
  { id: "ID84629", date: "01/02/2028", qty: "6 tons", netAmount: "$1,200", shipping: "Delivery" },
  { id: "ID39572", date: "08/19/2027", qty: "14 tons", netAmount: "$2,800", shipping: "Pickup" },
  { id: "ID92753", date: "04/05/2028", qty: "9 tons", netAmount: "$1,800", shipping: "Delivery" },
  { id: "ID26491", date: "10/27/2027", qty: "4 tons", netAmount: "$800", shipping: "Pickup" },
  { id: "ID75839", date: "06/11/2028", qty: "11 tons", netAmount: "$2,200", shipping: "Delivery" },
  { id: "ID02957", date: "02/16/2028", qty: "5 tons", netAmount: "$1,000", shipping: "Pickup" },
  { id: "ID68240", date: "12/29/2027", qty: "15 tons", netAmount: "$3,000", shipping: "Delivery" },
  { id: "ID10396", date: "07/07/2028", qty: "18 tons", netAmount: "$3,600", shipping: "Pickup" },
  { id: "ID59264", date: "01/23/2028", qty: "7 tons", netAmount: "$1,400", shipping: "Delivery" },
  { id: "ID47192", date: "08/02/2027", qty: "19 tons", netAmount: "$3,800", shipping: "Delivery" },
  { id: "ID96038", date: "03/18/2028", qty: "20 tons", netAmount: "$4,000", shipping: "Delivery" },
  { id: "ID35927", date: "05/01/2028", qty: "16 tons", netAmount: "$3,200", shipping: "Pickup" },
  { id: "ID82649", date: "09/24/2027", qty: "13 tons", netAmount: "$2,600", shipping: "Delivery" },
  { id: "ID01753", date: "11/15/2027", qty: "10 tons", netAmount: "$2,000", shipping: "Pickup" },
];

export function SellerProductsReportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("yearly");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = productPerformance.filter(
    (p) => !searchQuery.trim() || p.id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SellerLayout title="Product Performance">
      <div className="flex h-full flex-col rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <h1 className="text-2xl font-bold text-neutral-900">Product Performance</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2" style={{ border: "1px solid #F0F0F0" }}>
              <Search className="size-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Seach"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </div>
            <DateRangeDropdown value={dateRange} onChange={setDateRange} />
            <ExportDropdown
              filename="product-performance"
              columns={[
                { key: "id", label: "Order ID" },
                { key: "date", label: "Date" },
                { key: "qty", label: "Quantity" },
                { key: "netAmount", label: "Net amount" },
                { key: "shipping", label: "Shipping type" },
              ]}
              data={filtered}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 px-6 pb-5 lg:grid-cols-4">
          <KpiCard label="Total quantity sold" value="2300 tons" icon={Package} />
          <KpiCard label="Total net revenue" value="$40,000" icon={DollarSign} />
          <KpiCard label="Avg selling price" value="$200/ton" icon={Tag} />
          <KpiCard label="Repeat buyers" value="30,1 %" icon={Users} />
        </div>

        <div className="px-6 pb-6">
          <div className="rounded-xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <h3 className="mb-4 text-base font-semibold text-neutral-900">Tons Sold Overview</h3>
            <LineChart
              data={[80, 140, 50, 10, 75, 50, 40, 130, 70, 80, 50, 145, 110]}
              labels={months}
              yPrefix=""
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto px-6">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="text-left" style={{ borderBottom: "1px solid #F0F0F0" }}>
                <th className="pb-3 text-sm font-medium text-neutral-500">Order ID</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Date</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Quantity</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Net amount</th>
                <th className="pb-3 text-sm font-medium text-neutral-500">Shipping type</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #F8F8F8" }} className="hover:bg-neutral-50">
                  <td className="py-3.5 text-sm text-neutral-900">{p.id}</td>
                  <td className="py-3.5 text-sm text-neutral-700">{p.date}</td>
                  <td className="py-3.5 text-sm text-neutral-700">{p.qty}</td>
                  <td className="py-3.5 text-sm text-neutral-900">{p.netAmount}</td>
                  <td className="py-3.5 text-sm text-neutral-700">{p.shipping}</td>
                  <td className="py-3.5"><button className="text-neutral-400"><MoreHorizontal className="size-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>
    </SellerLayout>
  );
}

/* ──────────────────────────────────────────────────────────────
   CARBON REPORT
   ────────────────────────────────────────────────────────────── */

const carbonData = [
  { period: "Nov 2025", product: "Oat Hull Animal Grade", count: 8, totalQty: 120, avgFootprint: 410, totalEmissions: 49200 },
  { period: "Dec 2025", product: "Rice Bran Animal Grade", count: 7, totalQty: 95, avgFootprint: 395, totalEmissions: 37525 },
  { period: "Jan 2026", product: "Barley Grain Animal Grade", count: 6, totalQty: 140, avgFootprint: 420, totalEmissions: 58800 },
  { period: "Feb 2026", product: "Wheat Straw Animal Grade", count: 10, totalQty: 110, avgFootprint: 405, totalEmissions: 44550 },
  { period: "Mar 2026", product: "Corn Silage Animal Grade", count: 9, totalQty: 108, avgFootprint: 402, totalEmissions: 43470 },
  { period: "Apr 2026", product: "Soybean Meal Animal Grade", count: 5, totalQty: 135, avgFootprint: 405, totalEmissions: 54675 },
  { period: "May 2026", product: "Pea Protein Animal Grade", count: 12, totalQty: 144, avgFootprint: 401, totalEmissions: 57744 },
  { period: "Jun 2026", product: "Alfalfa Hay Animal Grade", count: 11, totalQty: 121, avgFootprint: 401, totalEmissions: 48521 },
  { period: "Jul 2026", product: "Beet Pulp Animal Grade", count: 14, totalQty: 133, avgFootprint: 401, totalEmissions: 53333 },
  { period: "Aug 2026", product: "Coconut Meal Animal Grade", count: 13, totalQty: 117, avgFootprint: 401, totalEmissions: 46917 },
];

export function SellerCarbonReportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = carbonData.filter(
    (c) =>
      !searchQuery.trim() ||
      c.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.period.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SellerLayout title="Carbon Reports">
      <div className="flex h-full flex-col rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <h1 className="text-2xl font-bold text-neutral-900">Carbon Reports</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2" style={{ border: "1px solid #F0F0F0" }}>
              <Search className="size-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Seach"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </div>
            <MoreMenu
              filename="seller-carbon-report"
              columns={[
                { key: "period", label: "Period" },
                { key: "product", label: "Product" },
                { key: "count", label: "Product Count" },
                { key: "totalQty", label: "Total qty (tons)" },
                { key: "avgFootprint", label: "Avg footprint (kg CO2e/ton)" },
                { key: "totalEmissions", label: "Total emissions (kg CO2e)" },
              ]}
              data={filtered}
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto px-6 pb-2">
          <div className="rounded-xl" style={{ border: "1px solid #F0F0F0" }}>
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="text-left">
                  <th className="px-5 py-4 text-sm font-medium text-neutral-500">Period</th>
                  <th className="px-5 py-4 text-sm font-medium text-neutral-500">Product</th>
                  <th className="px-5 py-4 text-sm font-medium text-neutral-500">Product</th>
                  <th className="px-5 py-4 text-sm font-medium text-neutral-500">Total qty (tons)</th>
                  <th className="px-5 py-4 text-sm font-medium text-neutral-500">
                    Avg footprint
                    <br />
                    (kg CO2e/ton)
                  </th>
                  <th className="px-5 py-4 text-sm font-medium text-neutral-500">
                    Total emissions
                    <br />
                    (kg CO2e)
                  </th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #F8F8F8" }} className="hover:bg-neutral-50">
                    <td className="px-5 py-4 text-sm text-neutral-900">{c.period}</td>
                    <td className="px-5 py-4 text-sm text-neutral-700">{c.product}</td>
                    <td className="px-5 py-4 text-sm text-neutral-700">{c.count}</td>
                    <td className="px-5 py-4 text-sm text-neutral-700">{c.totalQty}</td>
                    <td className="px-5 py-4 text-sm text-neutral-700">{c.avgFootprint}</td>
                    <td className="px-5 py-4 text-sm text-neutral-700">{c.totalEmissions.toLocaleString()}</td>
                    <td className="px-5 py-4"><button className="text-neutral-400"><MoreHorizontal className="size-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>
    </SellerLayout>
  );
}
