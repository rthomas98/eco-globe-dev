"use client";

import { useState, useRef, useEffect } from "react";
import { Search, DollarSign, CheckCircle2, Settings2, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, FileSpreadsheet, FileText, Printer, Copy, RefreshCw } from "lucide-react";
import { LineChart } from "./line-chart";
import { ExportDropdown } from "./export-dropdown";
import { DateRangeDropdown } from "./date-range-dropdown";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function Pagination({ currentPage, setCurrentPage }: { currentPage: number; setCurrentPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid #F0F0F0" }}>
      <div className="flex items-center gap-1">
        <button className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronLeft className="size-4" /></button>
        {[1, 2, 3, "...", 15].map((p, i) => <button key={i} className={`flex size-8 items-center justify-center rounded text-sm ${p === currentPage ? "bg-neutral-900 font-medium text-white" : "text-neutral-500 hover:bg-neutral-100"}`} onClick={() => typeof p === "number" && setCurrentPage(p)}>{p}</button>)}
        <button className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronRight className="size-4" /></button>
      </div>
      <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-500" style={{ border: "1px solid #E0E0E0" }}>20 / page <ChevronDown className="size-3.5" /></button>
    </div>
  );
}

function MoreMenu({ data, columns, filename }: { data: Record<string, unknown>[]; columns: { key: string; label: string }[]; filename: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toCSV = () => {
    const header = columns.map((c) => c.label).join(",");
    const rows = data.map((row) => columns.map((c) => { const v = String(row[c.key] ?? ""); return v.includes(",") ? `"${v}"` : v; }).join(","));
    return [header, ...rows].join("\n");
  };

  const handleExportCSV = () => {
    const csv = toCSV();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${filename}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    setOpen(false);
  };

  const handleExportExcel = () => {
    const csv = toCSV();
    const tsv = csv.replace(/,/g, "\t");
    const blob = new Blob([tsv], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${filename}.xls`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    setOpen(false);
  };

  const handlePrint = () => { window.print(); setOpen(false); };

  const handleCopyTable = () => {
    const csv = toCSV();
    navigator.clipboard.writeText(csv);
    setCopied(true);
    setTimeout(() => { setCopied(false); setOpen(false); }, 1200);
  };

  const handleRefresh = () => { window.location.reload(); };

  const actions = [
    { label: "Export CSV", icon: FileText, action: handleExportCSV },
    { label: "Export Excel", icon: FileSpreadsheet, action: handleExportExcel },
    { label: "Print", icon: Printer, action: handlePrint },
    { label: copied ? "Copied!" : "Copy table data", icon: Copy, action: handleCopyTable },
    { label: "Refresh data", icon: RefreshCw, action: handleRefresh },
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100" style={{ border: "1px solid #F0F0F0" }}>
        <MoreHorizontal className="size-4 text-neutral-500" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-30 w-[200px] rounded-xl bg-white py-1" style={{ border: "1px solid #F0F0F0", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}>
          {actions.map((a) => (
            <button key={a.label} onClick={a.action} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-50">
              <a.icon className="size-4 text-neutral-400" />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { Completed: "bg-green-50 text-green-600", Failed: "bg-red-50 text-red-600", "In Progress": "bg-amber-50 text-amber-600", Active: "bg-green-50 text-green-600" };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${s[status] ?? "bg-neutral-100 text-neutral-600"}`}>{status}</span>;
}

/* ════════════════════════════════════════════════════════════
   SALES REPORT
   ════════════════════════════════════════════════════════════ */
const salesOrders = [
  { id: "TS98765", buyer: "AgriCorp Solutions", seller: "Golden Grain Farms", product: "Oat Hull Animal Grade", qty: "123 lb", shipping: "Delivery", grossAmount: "$8,500", createdDate: "01/05/2027", completedDate: "01/05/2027", status: "Completed" },
  { id: "TS98766", buyer: "BioGreen Innovations", seller: "Evergreen AgroTech", product: "Organic Fertilizer", qty: "500 lb", shipping: "Pickup", grossAmount: "$1,800", createdDate: "15/05/2027", completedDate: "15/05/2027", status: "Completed" },
  { id: "TS98767", buyer: "NutriFeed Industries", seller: "CropPlus Solutions", product: "Soybean Meal", qty: "200 lb", shipping: "Delivery", grossAmount: "$4,500", createdDate: "10/06/2027", completedDate: "10/06/2027", status: "Completed" },
  { id: "TS98768", buyer: "GreenHarvest Co.", seller: "TerraFarms Inc.", product: "Corn Silage", qty: "1,000 lb", shipping: "Delivery", grossAmount: "$9,000", createdDate: "20/07/2027", completedDate: "20/07/2027", status: "Completed" },
  { id: "TS98769", buyer: "PurePastures Ltd.", seller: "Verdant Fields Co.", product: "Alfalfa Hay", qty: "750 lb", shipping: "Pickup", grossAmount: "$3,000", createdDate: "30/08/2027", completedDate: "30/08/2027", status: "Completed" },
  { id: "TS98765", buyer: "AgriCorp Solutions", seller: "Sunrise Harvest Ltd.", product: "Oat Hull Animal Grade", qty: "123 lb", shipping: "Delivery", grossAmount: "$6,500", createdDate: "01/05/2027", completedDate: "01/05/2027", status: "Completed" },
  { id: "TS98766", buyer: "Oceanic Innovations", seller: "AquaCrops Systems", product: "Seaweed Extract Premium", qty: "200 lb", shipping: "Delivery", grossAmount: "$2,800", createdDate: "03/15/2027", completedDate: "03/15/2027", status: "Failed" },
  { id: "TS98767", buyer: "GreenEarth Technologies", seller: "EcoAgri Innovations", product: "Organic Fertilizer Blend", qty: "150 lb", shipping: "Delivery", grossAmount: "$7,800", createdDate: "02/20/2027", completedDate: "02/20/2027", status: "Completed" },
  { id: "TS98768", buyer: "NutriFeed Corp", seller: "PrimeCrops Group", product: "Alfalfa Pellets Feed Grade", qty: "250 lb", shipping: "Delivery", grossAmount: "$5,200", createdDate: "04/10/2027", completedDate: "04/10/2027", status: "Failed" },
  { id: "TS98769", buyer: "BioHarvest Ltd", seller: "AgriYield Solutions", product: "Compostable Mulch Film", qty: "300 lb", shipping: "Delivery", grossAmount: "$4,100", createdDate: "05/25/2027", completedDate: "05/25/2027", status: "Completed" },
  { id: "TS98770", buyer: "AgriTech Enterprises", seller: "FutureFarms Co.", product: "Insect Protein Powder", qty: "500 lb", shipping: "Delivery", grossAmount: "$8,700", createdDate: "06/30/2027", completedDate: "06/30/2027", status: "Completed" },
  { id: "TS98771", buyer: "CropScience Co.", seller: "GlobalGrains Inc.", product: "Bio-Stimulant Liquid", qty: "100 lb", shipping: "Delivery", grossAmount: "$1,500", createdDate: "07/15/2027", completedDate: "07/15/2027", status: "Completed" },
  { id: "TS98772", buyer: "Harvest Innovations", seller: "AgriNova Systems", product: "Sustainable Seed Mix", qty: "400 lb", shipping: "Delivery", grossAmount: "$6,300", createdDate: "08/20/2027", completedDate: "08/20/2027", status: "Completed" },
  { id: "TS98773", buyer: "PureWater Systems", seller: "ClearWater Solutions", product: "Irrigation Water Treatment", qty: "600 lb", shipping: "Delivery", grossAmount: "$3,200", createdDate: "09/10/2027", completedDate: "09/10/2027", status: "Completed" },
  { id: "TS98774", buyer: "Rural Energy Corp", seller: "Solaris Farms Ltd.", product: "Solar Farm Kits", qty: "700 lb", shipping: "Pickup", grossAmount: "$9,500", createdDate: "10/01/2027", completedDate: "10/01/2027", status: "Completed" },
  { id: "TS98775", buyer: "FarmTech Solutions", seller: "Precision AgriCorp", product: "Automated Irrigation System", qty: "800 lb", shipping: "Delivery", grossAmount: "$2,300", createdDate: "11/15/2027", completedDate: "11/15/2027", status: "Completed" },
  { id: "TS98776", buyer: "AgriWaste Group", seller: "WasteNot Solutions", product: "Anaerobic Digester Units", qty: "1000 lb", shipping: "Pickup", grossAmount: "$4,800", createdDate: "12/20/2027", completedDate: "12/20/2027", status: "Completed" },
  { id: "TS98777", buyer: "SmartAgri Tech", seller: "IntelliFarm Tech", product: "Drone Crop Monitoring", qty: "200 lb", shipping: "Delivery", grossAmount: "$3,900", createdDate: "01/10/2028", completedDate: "01/10/2028", status: "Completed" },
  { id: "TS98778", buyer: "FoodSecure Ltd", seller: "SecureHarvest Co.", product: "Farm Produce Storage Solutions", qty: "300 lb", shipping: "Pickup", grossAmount: "$7,400", createdDate: "02/25/2028", completedDate: "02/25/2028", status: "Completed" },
  { id: "TS98779", buyer: "NutriCrops Inc", seller: "VitalCrops Group", product: "Crop Nutrient Fortifiers", qty: "400 lb", shipping: "Delivery", grossAmount: "$8,300", createdDate: "03/30/2028", completedDate: "03/30/2028", status: "Completed" },
];

export function SalesReportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("30d");
  const [currentPage, setCurrentPage] = useState(1);
  const filtered = salesOrders.filter((o) => !searchQuery.trim() || o.buyer.toLowerCase().includes(searchQuery.toLowerCase()) || o.seller.toLowerCase().includes(searchQuery.toLowerCase()) || o.product.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <h1 className="text-2xl font-bold text-neutral-900">Sales Reports</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2" style={{ border: "1px solid #F0F0F0" }}><Search className="size-4 text-neutral-400" /><input type="text" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-400" /></div>
          <DateRangeDropdown value={dateRange} onChange={setDateRange} />
          <ExportDropdown filename="sales-report" columns={[{key:"id",label:"Order ID"},{key:"buyer",label:"Buyer"},{key:"seller",label:"Seller"},{key:"product",label:"Product"},{key:"qty",label:"Qty"},{key:"grossAmount",label:"Amount"},{key:"status",label:"Status"}]} data={filtered} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 px-6 pb-5">
        {[{l:"Total revenue",v:"$1,250,800.00",i:DollarSign},{l:"Total orders",v:"140",i:CheckCircle2},{l:"Orders completed",v:"124",i:CheckCircle2},{l:"Total order value",v:"30 lb",i:Settings2}].map((s)=>(
          <div key={s.l} className="flex flex-col gap-2 rounded-xl px-5 py-4" style={{border:"1px solid #F0F0F0"}}><div className="flex items-center justify-between"><span className="text-sm text-neutral-500">{s.l}</span><s.i className="size-4 text-neutral-400"/></div><span className="text-2xl font-bold text-neutral-900">{s.v}</span></div>
        ))}
      </div>
      <div className="px-6 pb-6">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Sales Overview</h3>
        <div className="rounded-xl p-4" style={{border:"1px solid #F0F0F0"}}>
          <LineChart data={[180000,150000,190000,120000,100000,160000,80000,90000,85000,95000,350000,320000]} labels={months} />
        </div>
      </div>
      <div className="flex-1 overflow-x-auto px-6">
        <table className="w-full min-w-[1100px]"><thead><tr className="text-left" style={{borderBottom:"1px solid #F0F0F0"}}><th className="pb-3 text-sm font-medium text-neutral-500">Order ID</th><th className="pb-3 text-sm font-medium text-neutral-500">Buyer</th><th className="pb-3 text-sm font-medium text-neutral-500">Seller</th><th className="pb-3 text-sm font-medium text-neutral-500">Product</th><th className="pb-3 text-sm font-medium text-neutral-500">Qty</th><th className="pb-3 text-sm font-medium text-neutral-500">Shipping type</th><th className="pb-3 text-sm font-medium text-neutral-500">Gross amount</th><th className="pb-3 text-sm font-medium text-neutral-500">Created date</th><th className="pb-3 text-sm font-medium text-neutral-500">Completed date</th><th className="pb-3 text-sm font-medium text-neutral-500">Status</th><th className="pb-3"></th></tr></thead>
        <tbody>{filtered.map((o,i)=>(<tr key={i} style={{borderBottom:"1px solid #F8F8F8"}} className="hover:bg-neutral-50"><td className="py-3.5 text-sm text-neutral-900">{o.id}</td><td className="py-3.5 text-sm text-neutral-700">{o.buyer}</td><td className="py-3.5 text-sm text-neutral-700">{o.seller}</td><td className="py-3.5 text-sm text-neutral-700">{o.product}</td><td className="py-3.5 text-sm text-neutral-700">{o.qty}</td><td className="py-3.5 text-sm text-neutral-700">{o.shipping}</td><td className="py-3.5 text-sm text-neutral-900">{o.grossAmount}</td><td className="py-3.5 text-sm text-neutral-700">{o.createdDate}</td><td className="py-3.5 text-sm text-neutral-700">{o.completedDate}</td><td className="py-3.5"><StatusBadge status={o.status}/></td><td className="py-3.5"><button className="text-neutral-400"><MoreHorizontal className="size-4"/></button></td></tr>))}</tbody></table>
      </div>
      <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PRODUCTS REPORT
   ════════════════════════════════════════════════════════════ */
const productListings = [
  {id:"ID85739",name:"Sustainably Sourced Cedar Wood Chips",seller:"TerraCycle Inc.",category:"Plastic",price:"$210/ton",qty:"75 tons",date:"03/15/2024",sustainability:"Verified",status:"Active"},
  {id:"ID29573",name:"High-Density Recycled Plastic Pellets",seller:"Renewable Resources Co.",category:"Wood",price:"$195/ton",qty:"120 tons",date:"07/22/2023",sustainability:"Verified",status:"Active"},
  {id:"ID73658",name:"Fine Grade Oak Sawdust for Composting",seller:"EcoTech Waste Solutions",category:"Wood",price:"$220/ton",qty:"90 tons",date:"11/01/2023",sustainability:"Verified",status:"Active"},
  {id:"ID09274",name:"Aromatic White Pine Shavings for Animal Bedding",seller:"Sustainable Materials Group",category:"Plant",price:"$175/ton",qty:"110 tons",date:"01/19/2024",sustainability:"Verified",status:"Active"},
  {id:"ID63920",name:"All-Natural Bamboo Fiber for Construction",seller:"GreenFiber Solutions LLC",category:"Wood",price:"$200/ton",qty:"60 tons",date:"05/08/2023",sustainability:"Verified",status:"Active"},
  {id:"ID17495",name:"Kiln-Dried Maple Wood Flakes for Smoking",seller:"BioMass Recycling Systems",category:"Plastic",price:"$230/ton",qty:"100 tons",date:"09/26/2023",sustainability:"Verified",status:"Active"},
  {id:"ID84629",name:"Post-Industrial Acrylic Scraps for Recycling",seller:"EnviroCraft Products Ltd.",category:"Wood",price:"$190/ton",qty:"80 tons",date:"04/03/2024",sustainability:"Verified",status:"Active"},
  {id:"ID39572",name:"Rustic Birch Bark Pieces for Decoration",seller:"Reclaim Global Industries",category:"Wood",price:"$215/ton",qty:"130 tons",date:"08/11/2023",sustainability:"Verified",status:"Active"},
  {id:"ID92753",name:"Premium Teak Wood Crumbs for Landscaping",seller:"Verdant Earth Innovations",category:"Plastic",price:"$180/ton",qty:"95 tons",date:"12/20/2023",sustainability:"Verified",status:"Active"},
  {id:"ID26491",name:"Recycled Polyester Fiber for Insulation",seller:"Circular Solutions Corp.",category:"Plastic",price:"$205/ton",qty:"115 tons",date:"02/07/2024",sustainability:"Verified",status:"Active"},
  {id:"ID75839",name:"Durable Rubber Mulch for Playgrounds",seller:"Alpine Waste Management",category:"Plastic",price:"$225/ton",qty:"70 tons",date:"06/14/2023",sustainability:"Verified",status:"Active"},
  {id:"ID02957",name:"Crushed Walnut Shells for Abrasive Blasting",seller:"Nova Polymers Recycling",category:"Plant",price:"$170/ton",qty:"105 tons",date:"10/02/2023",sustainability:"Verified",status:"Active"},
  {id:"ID68240",name:"Cleaned Cherry Pits for Biomass Fuel",seller:"Peakstone Sustainable Goods",category:"Plant",price:"$198/ton",qty:"85 tons",date:"03/21/2024",sustainability:"Verified",status:"Active"},
  {id:"ID10396",name:"Sorted HDPE Flakes for Plastic Production",seller:"Zenith Eco Resources",category:"Plastic",price:"$212/ton",qty:"125 tons",date:"07/28/2023",sustainability:"Verified",status:"Active"},
  {id:"ID59264",name:"Virgin PVC Granules for Manufacturing",seller:"Optima Green Technologies",category:"Plant",price:"$188/ton",qty:"65 tons",date:"11/07/2023",sustainability:"Verified",status:"Active"},
  {id:"ID47192",name:"High-Quality Nylon Shavings for Composites",seller:"Vanguard Recycling Systems",category:"Plant",price:"$208/ton",qty:"135 tons",date:"01/25/2024",sustainability:"Verified",status:"Active"},
  {id:"ID96038",name:"Shredded Cardboard Scraps for Packaging",seller:"Pinnacle Eco Solutions",category:"Plant",price:"$235/ton",qty:"92 tons",date:"05/14/2023",sustainability:"Verified",status:"Active"},
  {id:"ID35927",name:"Treated Hemp Fiber for Textile Production",seller:"Evergreen Waste Innovations",category:"Plant",price:"$165/ton",qty:"118 tons",date:"09/02/2023",sustainability:"Verified",status:"Active"},
  {id:"ID82649",name:"Processed Coconut Coir for Horticulture",seller:"Summit Sustainable Products",category:"Plastic",price:"$192/ton",qty:"72 tons",date:"04/09/2024",sustainability:"Verified",status:"Active"},
  {id:"ID01753",name:"Refined Olive Pomace for Animal Feed",seller:"Horizon Recycling Group",category:"Plant",price:"$218/ton",qty:"103 tons",date:"08/17/2023",sustainability:"Verified",status:"Active"},
];

export function ProductsReportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("30d");
  const [currentPage, setCurrentPage] = useState(1);
  const filtered = productListings.filter((p) => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.seller.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <h1 className="text-2xl font-bold text-neutral-900">Product Performance</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2" style={{border:"1px solid #F0F0F0"}}><Search className="size-4 text-neutral-400"/><input type="text" placeholder="Search" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-400"/></div>
          <DateRangeDropdown value={dateRange} onChange={setDateRange}/>
          <ExportDropdown filename="product-report" columns={[{key:"id",label:"Listing ID"},{key:"name",label:"Product"},{key:"seller",label:"Seller"},{key:"category",label:"Category"},{key:"price",label:"Price"},{key:"qty",label:"Qty"},{key:"status",label:"Status"}]} data={filtered}/>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 px-6 pb-5">
        {[{l:"Total listings",v:"180",i:Settings2},{l:"Active listings",v:"145",i:Settings2},{l:"Draft listings",v:"30",i:Settings2},{l:"Suspended",v:"5",i:Settings2}].map((s)=>(
          <div key={s.l} className="flex flex-col gap-2 rounded-xl px-5 py-4" style={{border:"1px solid #F0F0F0"}}><div className="flex items-center justify-between"><span className="text-sm text-neutral-500">{s.l}</span><s.i className="size-4 text-neutral-400"/></div><span className="text-2xl font-bold text-neutral-900">{s.v}</span></div>
        ))}
      </div>
      <div className="px-6 pb-6">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Tons Sold Overview</h3>
        <div className="rounded-xl p-4" style={{border:"1px solid #F0F0F0"}}>
          <LineChart data={[80,120,70,60,50,90,40,45,50,60,100,95]} labels={months} yPrefix="" />
        </div>
      </div>
      <div className="flex-1 overflow-x-auto px-6">
        <table className="w-full min-w-[1000px]"><thead><tr className="text-left" style={{borderBottom:"1px solid #F0F0F0"}}><th className="pb-3 text-sm font-medium text-neutral-500">Listing ID</th><th className="pb-3 text-sm font-medium text-neutral-500">Product name</th><th className="pb-3 text-sm font-medium text-neutral-500">Seller</th><th className="pb-3 text-sm font-medium text-neutral-500">Category</th><th className="pb-3 text-sm font-medium text-neutral-500">Price</th><th className="pb-3 text-sm font-medium text-neutral-500">Availability qty</th><th className="pb-3 text-sm font-medium text-neutral-500">Created date</th><th className="pb-3 text-sm font-medium text-neutral-500">Sustainability</th><th className="pb-3 text-sm font-medium text-neutral-500">Status</th><th className="pb-3"></th></tr></thead>
        <tbody>{filtered.map((p,i)=>(<tr key={i} style={{borderBottom:"1px solid #F8F8F8"}} className="hover:bg-neutral-50"><td className="py-3.5 text-sm text-neutral-900">{p.id}</td><td className="py-3.5 text-sm text-neutral-700 max-w-[250px] truncate">{p.name}</td><td className="py-3.5 text-sm text-neutral-700">{p.seller}</td><td className="py-3.5 text-sm text-neutral-700">{p.category}</td><td className="py-3.5 text-sm text-neutral-900">{p.price}</td><td className="py-3.5 text-sm text-neutral-700">{p.qty}</td><td className="py-3.5 text-sm text-neutral-700">{p.date}</td><td className="py-3.5"><span className="flex items-center gap-1.5 text-sm text-neutral-700"><span className="size-2 rounded-full bg-green-500"/>{p.sustainability}</span></td><td className="py-3.5"><StatusBadge status={p.status}/></td><td className="py-3.5"><button className="text-neutral-400"><MoreHorizontal className="size-4"/></button></td></tr>))}</tbody></table>
      </div>
      <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage}/>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ESCROW REPORT
   ════════════════════════════════════════════════════════════ */
const escrowReport = [
  {escrowId:"EC12345",txnId:"TS12345",buyer:"Buyer name",seller:"Seller name",amount:"$12,900,000",txnDate:"12/12/2026",releaseDate:"12/12/2026",status:"In Progress"},
  {escrowId:"EC12355",txnId:"TS12355",buyer:"Sophie Bell",seller:"Tommy Parker",amount:"$12,400,000",txnDate:"10/28/2027",releaseDate:"10/28/2027",status:"In Progress"},
  {escrowId:"EC12346",txnId:"TS12346",buyer:"Alice Johnson",seller:"Bob Smith",amount:"$9,750,000",txnDate:"01/15/2027",releaseDate:"01/15/2027",status:"In Progress"},
  {escrowId:"EC12356",txnId:"TS12356",buyer:"Uma Nelson",seller:"Victor Lee",amount:"$22,700,000",txnDate:"11/30/2027",releaseDate:"11/30/2027",status:"In Progress"},
  {escrowId:"EC12347",txnId:"TS12347",buyer:"Cathy Brown",seller:"David Wilson",amount:"$14,200,000",txnDate:"02/20/2027",releaseDate:"02/20/2027",status:"In Progress"},
  {escrowId:"EC12357",txnId:"TS12357",buyer:"Vera King",seller:"Willow Cruz",amount:"$8,900,000",txnDate:"12/09/2027",releaseDate:"12/09/2027",status:"In Progress"},
  {escrowId:"EC12348",txnId:"TS12348",buyer:"Evelyn White",seller:"Frank Black",amount:"$5,500,000",txnDate:"03/11/2027",releaseDate:"03/11/2027",status:"In Progress"},
  {escrowId:"EC12358",txnId:"TS12358",buyer:"Xander Roberts",seller:"Yara Scott",amount:"$6,300,000",txnDate:"01/02/2028",releaseDate:"01/02/2028",status:"Completed"},
  {escrowId:"EC12349",txnId:"TS12349",buyer:"George Taylor",seller:"Hannah Green",amount:"$18,300,000",txnDate:"04/22/2027",releaseDate:"04/22/2027",status:"Completed"},
  {escrowId:"EC12359",txnId:"TS12359",buyer:"Zoe Young",seller:"Aaron Reed",amount:"$17,600,000",txnDate:"02/14/2028",releaseDate:"02/14/2028",status:"Completed"},
  {escrowId:"EC12350",txnId:"TS12350",buyer:"Ivy Lewis",seller:"Jack Martin",amount:"$7,150,000",txnDate:"05/30/2027",releaseDate:"05/30/2027",status:"Completed"},
  {escrowId:"EC12360",txnId:"TS12360",buyer:"Bella Kim",seller:"Chris Lee",amount:"$10,200,000",txnDate:"03/21/2028",releaseDate:"03/21/2028",status:"Completed"},
  {escrowId:"EC12351",txnId:"TS12351",buyer:"Kate Hall",seller:"Liam King",amount:"$11,600,000",txnDate:"06/13/2027",releaseDate:"06/13/2027",status:"Completed"},
  {escrowId:"EC12361",txnId:"TS12361",buyer:"Diana Fisher",seller:"Ethan Taylor",amount:"$13,900,000",txnDate:"04/15/2028",releaseDate:"04/15/2028",status:"Completed"},
  {escrowId:"EC12352",txnId:"TS12352",buyer:"Mona Scott",seller:"Nate Adams",amount:"$3,800,000",txnDate:"07/07/2027",releaseDate:"07/07/2027",status:"Completed"},
  {escrowId:"EC12362",txnId:"TS12362",buyer:"Freya Green",seller:"Gabe Martin",amount:"$9,000,000",txnDate:"05/01/2028",releaseDate:"05/01/2028",status:"Completed"},
  {escrowId:"EC12353",txnId:"TS12353",buyer:"Olivia Carter",seller:"Paul Wright",amount:"$15,900,000",txnDate:"08/19/2027",releaseDate:"08/19/2027",status:"Completed"},
  {escrowId:"EC12363",txnId:"TS12363",buyer:"Holly Brooks",seller:"Isaac Moore",amount:"$24,800,000",txnDate:"06/18/2028",releaseDate:"06/18/2028",status:"Completed"},
  {escrowId:"EC12354",txnId:"TS12354",buyer:"Quincy Harris",seller:"Rachel Young",amount:"$20,500,000",txnDate:"09/14/2027",releaseDate:"09/14/2027",status:"Completed"},
  {escrowId:"EC12364",txnId:"TS12364",buyer:"Jackie Norris",seller:"Kyle Jenkins",amount:"$15,500,000",txnDate:"07/30/2028",releaseDate:"07/30/2028",status:"Completed"},
];

export function EscrowReportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("30d");
  const [currentPage, setCurrentPage] = useState(1);
  const filtered = escrowReport.filter((e) => !searchQuery.trim() || e.buyer.toLowerCase().includes(searchQuery.toLowerCase()) || e.seller.toLowerCase().includes(searchQuery.toLowerCase()) || e.escrowId.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <h1 className="text-2xl font-bold text-neutral-900">Escrow</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2" style={{border:"1px solid #F0F0F0"}}><Search className="size-4 text-neutral-400"/><input type="text" placeholder="Search" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-400"/></div>
          <DateRangeDropdown value={dateRange} onChange={setDateRange}/>
          <ExportDropdown filename="escrow-report" columns={[{key:"escrowId",label:"Escrow ID"},{key:"txnId",label:"Transaction ID"},{key:"buyer",label:"Buyer"},{key:"seller",label:"Seller"},{key:"amount",label:"Amount"},{key:"status",label:"Status"}]} data={filtered}/>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 px-6 pb-5">
        {[{l:"Total escrow funded",v:"$1,250,800.00",i:DollarSign},{l:"Total escrow released",v:"$975,500.00",i:DollarSign},{l:"In escrow",v:"$510,900.00",i:DollarSign},{l:"Platform fees collected",v:"$1,040,200.00",i:DollarSign}].map((s)=>(
          <div key={s.l} className="flex flex-col gap-2 rounded-xl px-5 py-4" style={{border:"1px solid #F0F0F0"}}><div className="flex items-center justify-between"><span className="text-sm text-neutral-500">{s.l}</span><s.i className="size-4 text-neutral-400"/></div><span className="text-2xl font-bold text-neutral-900">{s.v}</span></div>
        ))}
      </div>
      <div className="px-6 pb-6">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Sales Overview</h3>
        <div className="rounded-xl p-4" style={{border:"1px solid #F0F0F0"}}>
          <LineChart data={[180000,150000,190000,120000,100000,160000,80000,90000,85000,95000,350000,320000]} labels={months} secondaryData={[120000,100000,150000,80000,70000,130000,60000,70000,65000,80000,280000,250000]} secondaryColor="#C38F4A" legend={{primary:"Escrow funded",secondary:"Escrow released"}} />
        </div>
      </div>
      <div className="flex-1 overflow-x-auto px-6">
        <table className="w-full min-w-[1000px]"><thead><tr className="text-left" style={{borderBottom:"1px solid #F0F0F0"}}><th className="pb-3 text-sm font-medium text-neutral-500">Escrow ID</th><th className="pb-3 text-sm font-medium text-neutral-500">Order ID</th><th className="pb-3 text-sm font-medium text-neutral-500">Buyer</th><th className="pb-3 text-sm font-medium text-neutral-500">Seller</th><th className="pb-3 text-sm font-medium text-neutral-500">Amount</th><th className="pb-3 text-sm font-medium text-neutral-500">Transaction Date</th><th className="pb-3 text-sm font-medium text-neutral-500">Release Date</th><th className="pb-3 text-sm font-medium text-neutral-500">Status</th><th className="pb-3"></th></tr></thead>
        <tbody>{filtered.map((e,i)=>(<tr key={i} style={{borderBottom:"1px solid #F8F8F8"}} className="hover:bg-neutral-50"><td className="py-3.5 text-sm text-neutral-900">{e.escrowId}</td><td className="py-3.5 text-sm text-neutral-700">{e.txnId}</td><td className="py-3.5 text-sm text-neutral-700">{e.buyer}</td><td className="py-3.5 text-sm text-neutral-700">{e.seller}</td><td className="py-3.5 text-sm text-neutral-900">{e.amount}</td><td className="py-3.5 text-sm text-neutral-700">{e.txnDate}</td><td className="py-3.5 text-sm text-neutral-700">{e.releaseDate}</td><td className="py-3.5"><StatusBadge status={e.status}/></td><td className="py-3.5"><button className="text-neutral-400"><MoreHorizontal className="size-4"/></button></td></tr>))}</tbody></table>
      </div>
      <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage}/>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   CARBON REPORT
   ════════════════════════════════════════════════════════════ */
const carbonData = [
  {period:"Nov 2025",product:"Oat Hull Animal Grade",count:8,totalQty:120,avgFootprint:410,totalEmissions:49200},
  {period:"Dec 2025",product:"Rice Bran Animal Grade",count:7,totalQty:95,avgFootprint:395,totalEmissions:37525},
  {period:"Jan 2026",product:"Barley Grain Animal Grade",count:6,totalQty:140,avgFootprint:420,totalEmissions:58800},
  {period:"Feb 2026",product:"Wheat Straw Animal Grade",count:10,totalQty:110,avgFootprint:405,totalEmissions:44550},
  {period:"Mar 2026",product:"Corn Silage Animal Grade",count:9,totalQty:108,avgFootprint:402,totalEmissions:43470},
  {period:"Apr 2026",product:"Soybean Meal Animal Grade",count:5,totalQty:135,avgFootprint:405,totalEmissions:54675},
  {period:"May 2026",product:"Pea Protein Animal Grade",count:12,totalQty:144,avgFootprint:401,totalEmissions:57744},
  {period:"Jun 2026",product:"Alfalfa Hay Animal Grade",count:11,totalQty:121,avgFootprint:401,totalEmissions:48521},
  {period:"Jul 2026",product:"Beet Pulp Animal Grade",count:14,totalQty:133,avgFootprint:401,totalEmissions:53333},
  {period:"Aug 2026",product:"Coconut Meal Animal Grade",count:13,totalQty:117,avgFootprint:401,totalEmissions:46917},
];

export function CarbonReportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const filtered = carbonData.filter((c) => !searchQuery.trim() || c.product.toLowerCase().includes(searchQuery.toLowerCase()) || c.period.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <h1 className="text-2xl font-bold text-neutral-900">Carbon</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2" style={{border:"1px solid #F0F0F0"}}><Search className="size-4 text-neutral-400"/><input type="text" placeholder="Search" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-400"/></div>
          <MoreMenu
            filename="carbon-report"
            columns={[{key:"period",label:"Period"},{key:"product",label:"Product"},{key:"count",label:"Product Count"},{key:"totalQty",label:"Total qty (tons)"},{key:"avgFootprint",label:"Avg footprint (kg CO2e/ton)"},{key:"totalEmissions",label:"Total emissions (kg CO2e)"}]}
            data={filtered}
          />
        </div>
      </div>
      <div className="flex-1 overflow-x-auto px-6">
        <table className="w-full min-w-[900px]"><thead><tr className="text-left" style={{borderBottom:"1px solid #F0F0F0"}}><th className="pb-3 text-sm font-medium text-neutral-500">Period</th><th className="pb-3 text-sm font-medium text-neutral-500">Product</th><th className="pb-3 text-sm font-medium text-neutral-500">Product</th><th className="pb-3 text-sm font-medium text-neutral-500">Total qty (tons)</th><th className="pb-3 text-sm font-medium text-neutral-500">Avg footprint<br/>(kg CO2e/ton)</th><th className="pb-3 text-sm font-medium text-neutral-500">Total emissions<br/>(kg CO2e)</th><th className="pb-3"></th></tr></thead>
        <tbody>{filtered.map((c,i)=>(<tr key={i} style={{borderBottom:"1px solid #F8F8F8"}} className="hover:bg-neutral-50"><td className="py-3.5 text-sm text-neutral-900">{c.period}</td><td className="py-3.5 text-sm text-neutral-700">{c.product}</td><td className="py-3.5 text-sm text-neutral-700">{c.count}</td><td className="py-3.5 text-sm text-neutral-700">{c.totalQty}</td><td className="py-3.5 text-sm text-neutral-700">{c.avgFootprint}</td><td className="py-3.5 text-sm text-neutral-700">{c.totalEmissions.toLocaleString()}</td><td className="py-3.5"><button className="text-neutral-400"><MoreHorizontal className="size-4"/></button></td></tr>))}</tbody></table>
      </div>
      <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage}/>
    </div>
  );
}
