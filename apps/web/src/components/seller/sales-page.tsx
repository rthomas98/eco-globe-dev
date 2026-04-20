"use client";

import { useState, useRef } from "react";
import { Search, SlidersHorizontal, DollarSign, CheckCircle2, Clock, RefreshCw, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, X, FileText, Download, Info } from "lucide-react";
import { Button, Input, Select } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";

type Action = "Send quote" | "Mark ready" | "Upload BOL" | "Respond" | "View Detail";
interface Order { id: string; buyer: string; product: string; qty: string; shipping: string; action: Action; }

const orders: Order[] = [
  { id: "TS98765", buyer: "AgriCorp Solutions", product: "Oat Hull Animal Grade", qty: "123 lb", shipping: "Delivery", action: "Send quote" },
  { id: "TS98766", buyer: "BioGreen Innovations", product: "Organic Fertilizer", qty: "500 lb", shipping: "Pickup", action: "Mark ready" },
  { id: "TS98767", buyer: "NutriFeed Industries", product: "Soybean Meal", qty: "200 lb", shipping: "Delivery", action: "Upload BOL" },
  { id: "TS98768", buyer: "GreenHarvest Co.", product: "Corn Silage", qty: "1,000 lb", shipping: "Delivery", action: "Respond" },
  { id: "TS98769", buyer: "PurePastures Ltd.", product: "Alfalfa Hay", qty: "750 lb", shipping: "Pickup", action: "Upload BOL" },
  { id: "TS98765", buyer: "AgriCorp Solutions", product: "Oat Hull Animal Grade", qty: "123 lb", shipping: "Delivery", action: "View Detail" },
  { id: "TS98766", buyer: "Oceanic Innovations", product: "Seaweed Extract Premium", qty: "200 lb", shipping: "Delivery", action: "View Detail" },
  { id: "TS98767", buyer: "GreenEarth Technologies", product: "Organic Fertilizer Blend", qty: "150 lb", shipping: "Delivery", action: "View Detail" },
  { id: "TS98768", buyer: "NutriFeed Corp", product: "Alfalfa Pellets Feed Grade", qty: "250 lb", shipping: "Delivery", action: "View Detail" },
  { id: "TS98769", buyer: "BioHarvest Ltd", product: "Compostable Mulch Film", qty: "300 lb", shipping: "Delivery", action: "View Detail" },
  { id: "TS98770", buyer: "AgriTech Enterprises", product: "Insect Protein Powder", qty: "500 lb", shipping: "Delivery", action: "View Detail" },
  { id: "TS98771", buyer: "CropScience Co.", product: "Bio-Stimulant Liquid", qty: "100 lb", shipping: "Delivery", action: "View Detail" },
  { id: "TS98772", buyer: "Harvest Innovations", product: "Sustainable Seed Mix", qty: "400 lb", shipping: "Delivery", action: "View Detail" },
  { id: "TS98773", buyer: "PureWater Systems", product: "Irrigation Water Treatment", qty: "600 lb", shipping: "Delivery", action: "View Detail" },
  { id: "TS98774", buyer: "Rural Energy Corp", product: "Solar Farm Kits", qty: "700 lb", shipping: "Pickup", action: "View Detail" },
  { id: "TS98775", buyer: "FarmTech Solutions", product: "Automated Irrigation System", qty: "800 lb", shipping: "Delivery", action: "View Detail" },
  { id: "TS98776", buyer: "AgriWaste Group", product: "Anaerobic Digester Units", qty: "1000 lb", shipping: "Pickup", action: "View Detail" },
  { id: "TS98777", buyer: "SmartAgri Tech", product: "Drone Crop Monitoring", qty: "200 lb", shipping: "Delivery", action: "View Detail" },
  { id: "TS98778", buyer: "FoodSecure Ltd", product: "Farm Produce Storage Solutions", qty: "300 lb", shipping: "Pickup", action: "View Detail" },
  { id: "TS98779", buyer: "NutriCrops Inc", product: "Crop Nutrient Fortifiers", qty: "400 lb", shipping: "Delivery", action: "View Detail" },
];

const tabs = ["All Order", "Action needed", "Processing", "Completed", "Disputes"];

function ActionButton({ action, onClick }: { action: Action; onClick: () => void }) {
  const isBlack = action !== "View Detail";
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} className={`rounded-full px-4 py-1.5 text-xs font-medium ${isBlack ? "bg-neutral-900 text-white" : "text-neutral-900"}`} style={!isBlack ? { border: "1px solid #E0E0E0" } : undefined}>
      {action}
    </button>
  );
}

/* ─── Filters Panel ─── */
function FiltersPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-[480px] flex-col overflow-y-auto bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between"><h3 className="text-xl font-bold text-neutral-900">Filters</h3><button onClick={onClose} className="text-neutral-400"><X className="size-5" /></button></div>
        <div className="flex flex-col gap-6 flex-1">
          <div><h4 className="mb-3 text-sm font-semibold text-neutral-900">Shipping type</h4><div className="flex gap-6"><label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4" /> Pickup</label><label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4" /> Delivery</label></div></div>
          <div><h4 className="mb-3 text-sm font-semibold text-neutral-900">Product category</h4><div className="grid grid-cols-2 gap-3">{["Plastics","Rubber & Tire-Derived","Oils & Liquid Feedstocks","Biomass & Wood"].map((c)=><label key={c} className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4" /> {c}</label>)}</div></div>
          <div><h4 className="mb-3 text-sm font-semibold text-neutral-900">Escrow status</h4><div className="flex gap-6"><label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4" /> Funded</label><label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4" /> Released</label></div></div>
          <div><h4 className="mb-3 text-sm font-semibold text-neutral-900">Order status</h4><div className="grid grid-cols-2 gap-3">{["Pending","Processing","Completed","Failed"].map((s)=><label key={s} className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4" /> {s}</label>)}</div></div>
          <div><h4 className="mb-3 text-sm font-semibold text-neutral-900">Order Date</h4><input type="date" className="w-full rounded-lg px-4 py-3 text-sm outline-none" style={{border:"1px solid #E0E0E0"}} /></div>
        </div>
        <div className="flex items-center justify-between pt-4"><button className="text-sm font-medium text-neutral-900">Reset</button><Button variant="primary" size="md">Apply</Button></div>
      </div>
    </div>
  );
}

/* ─── Create Quote Modal ─── */
function CreateQuoteModal({ onClose, onSend }: { onClose: () => void; onSend: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[680px] rounded-2xl bg-white p-8" style={{boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
        <div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-bold text-neutral-900">Create Quote</h2><button onClick={onClose} className="text-neutral-400"><X className="size-5" /></button></div>
        <div className="grid grid-cols-2 gap-4 mb-4"><div><p className="text-xs font-semibold text-neutral-500">Order ID</p><p className="text-sm text-neutral-900">OD20411</p></div><div><p className="text-xs font-semibold text-neutral-500">Buyer</p><p className="text-sm text-neutral-900">AgriCorp Solutions</p></div></div>
        <div className="mb-4"><p className="text-xs font-semibold text-neutral-500">Delivery address</p><p className="text-sm text-neutral-900">2012 Rue Beauregard, STE 202, Lafayette, LA 70508</p></div>
        <div className="mb-6"><p className="text-xs font-semibold text-neutral-500">Product</p><p className="text-sm text-neutral-900">Wood Sawdust Industrial High Quality - 20 tons</p></div>
        <div style={{borderTop:"1px solid #F0F0F0",paddingTop:"16px"}} className="mb-4"><h3 className="mb-4 text-base font-bold text-neutral-900">Product</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1.5 block text-sm font-medium text-neutral-900">Shipping cost</label><div className="flex items-center rounded-lg" style={{border:"1px solid #E0E0E0"}}><span className="px-3 text-sm text-neutral-400">$</span><input type="text" defaultValue="0.00" className="flex-1 bg-transparent px-2 py-3 text-sm outline-none" /></div></div>
            <Select label="Estimated delivery time" id="edt" options={[{value:"",label:"-- Choose --"},{value:"3d",label:"3 days"},{value:"1w",label:"1 week"},{value:"2w",label:"2 weeks"}]} />
          </div>
        </div>
        <div className="mb-6"><label className="mb-1.5 block text-sm font-medium text-neutral-900">Note to buyer</label><textarea rows={4} placeholder="Enter your message..." className="w-full rounded-lg px-4 py-3 text-sm outline-none placeholder:text-neutral-400 resize-none" style={{border:"1px solid #E0E0E0"}} /></div>
        <div className="flex justify-end gap-3"><Button variant="secondary" size="md" onClick={onClose}>Cancel</Button><Button variant="primary" size="md" onClick={onSend}>Send Quote</Button></div>
      </div>
    </div>
  );
}

/* ─── Upload BOL Modal ─── */
function UploadBOLModal({ onClose, onUpload }: { onClose: () => void; onUpload: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[680px] rounded-2xl bg-white p-8" style={{boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
        <div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-bold text-neutral-900">Upload BOL</h2><button onClick={onClose} className="text-neutral-400"><X className="size-5" /></button></div>
        <div onClick={() => ref.current?.click()} className="mb-4 flex cursor-pointer flex-col items-center gap-3 rounded-xl bg-neutral-50 py-10" style={{border:"2px dashed #D0D0D0"}}>
          <p className="text-sm text-neutral-700"><span className="font-semibold">Drop file here</span> or <span className="font-semibold text-green-600 cursor-pointer">Browse</span></p>
          <p className="text-xs text-neutral-400">Accepts .gif, .jpg, and .png</p>
          <input ref={ref} type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setFiles([...files, e.target.files[0]]); }} />
        </div>
        {files.map((f,i) => (
          <div key={i} className="mb-2 flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-2">
            <div className="flex items-center gap-2"><span className="text-red-500 text-xs">📄</span><span className="text-sm text-neutral-700">{f.name}</span></div>
            <button onClick={() => setFiles(files.filter((_,idx)=>idx!==i))} className="text-neutral-400"><X className="size-4" /></button>
          </div>
        ))}
        <div className="mt-4 flex justify-end gap-3"><Button variant="secondary" size="md" onClick={onClose}>Cancel</Button><Button variant="primary" size="md" onClick={onUpload}>Upload BOL</Button></div>
      </div>
    </div>
  );
}

/* ─── Success Modal ─── */
function SuccessModal({ title, message, status, onClose }: { title: string; message: string; status: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[560px] flex flex-col items-center rounded-2xl bg-white p-10 text-center" style={{boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
        <span className="mb-4 text-5xl">📋✅</span>
        <h2 className="mb-3 text-2xl font-bold text-neutral-900">{title}</h2>
        <p className="mb-5 text-sm text-neutral-500">{message}</p>
        <span className="mb-6 rounded-full bg-neutral-100 px-5 py-2 text-sm font-medium text-neutral-700">{status}</span>
        <Button variant="secondary" size="md" onClick={onClose}>Okay</Button>
      </div>
    </div>
  );
}

/* ─── Order Detail Drawer ─── */
function OrderDetailDrawer({ order, onClose, onAction }: { order: Order; onClose: () => void; onAction: (a: string) => void }) {
  const actionLabel = order.action === "Send quote" ? "Send quote" : order.action === "Upload BOL" ? "Upload BOL" : order.action === "Mark ready" ? "Mark ready" : "";
  return (
    <div className="fixed inset-0 z-50 flex justify-end"><div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-[780px] flex-col overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-6 py-4" style={{borderBottom:"1px solid #F0F0F0"}}>
          <div><h2 className="text-lg font-bold text-neutral-900">Order ID: OD20411</h2><p className="text-xs text-neutral-500">Delivery · Shipping quote required <Info className="inline size-3.5 text-neutral-400" /></p></div>
          <div className="flex items-center gap-2">
            {actionLabel && <Button variant="primary" size="md" onClick={() => onAction(actionLabel)}>{actionLabel}</Button>}
            <button className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><MoreHorizontal className="size-5 text-neutral-500" /></button>
            <button onClick={onClose} className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><X className="size-5 text-neutral-500" /></button>
          </div>
        </div>
        <div className="p-6">
          {/* Alert banner */}
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-neutral-50 px-5 py-4">
            <FileText className="mt-0.5 size-5 shrink-0 text-neutral-400" />
            <div><p className="text-sm font-semibold text-neutral-900">{order.action === "Upload BOL" ? "Upload Bill of Lading (BOL)" : "Send shipping quote"}</p><p className="text-xs text-neutral-500">{order.action === "Upload BOL" ? "Upload the BOL to confirm the shipment and keep escrow processing on track." : "The buyer selected Delivery. Please send a shipping quote to continue this order."}</p></div>
          </div>
          <div className="flex gap-6">
            <div className="flex-1 flex flex-col gap-6">
              {/* Order info */}
              <section className="rounded-xl p-5" style={{border:"1px solid #F0F0F0"}}>
                <h3 className="mb-4 text-lg font-semibold text-neutral-900">Order info</h3>
                <div className="grid grid-cols-2 gap-y-4">
                  <div><p className="text-xs font-semibold text-neutral-500">Order ID</p><p className="text-sm text-neutral-900">OD20411</p></div>
                  <div><p className="text-xs font-semibold text-neutral-500">Order Placed</p><p className="text-sm text-neutral-900">Oct 24, 2024 10:10 AM</p></div>
                  <div><p className="text-xs font-semibold text-neutral-500">Buyer</p><p className="text-sm text-neutral-900">AgriCorp Solutions</p></div>
                  <div><p className="text-xs font-semibold text-neutral-500">Status</p><p className="text-sm text-neutral-900">Quote awaiting approval</p></div>
                  <div><p className="text-xs font-semibold text-neutral-500">Shipping</p><p className="text-sm text-neutral-900">Delivery</p></div>
                  <div><p className="text-xs font-semibold text-neutral-500">Quantity</p><p className="text-sm text-neutral-900">20 tons</p></div>
                </div>
              </section>
              <section className="rounded-xl p-5" style={{border:"1px solid #F0F0F0"}}>
                <h3 className="mb-4 text-lg font-semibold text-neutral-900">Products</h3>
                <div className="flex items-center gap-4"><div className="size-12 shrink-0 overflow-hidden rounded-lg"><img src="/products/wood-chips.png" alt="" className="size-full object-cover" /></div><div><p className="text-sm font-medium text-neutral-900">Wood Sawdust Industrial High Quality</p><p className="text-sm text-neutral-500">$150.00 /tons</p></div></div>
              </section>
              <section className="rounded-xl p-5" style={{border:"1px solid #F0F0F0"}}>
                <h3 className="mb-4 text-lg font-semibold text-neutral-900">Delivery info</h3>
                <div className="grid grid-cols-2 gap-y-4"><div><p className="text-xs font-semibold text-neutral-500">Buyer</p><p className="text-sm text-neutral-900">AgriCorp Solutions</p></div><div><p className="text-xs font-semibold text-neutral-500">Contact person</p><p className="text-sm text-neutral-900">Will Smith</p></div><div><p className="text-xs font-semibold text-neutral-500">Phone number</p><p className="text-sm text-neutral-900">012345678910</p></div><div><p className="text-xs font-semibold text-neutral-500">Email</p><p className="text-sm text-neutral-900">example@mail.com</p></div></div>
                <div className="mt-4"><p className="text-xs font-semibold text-neutral-500">Destination address</p><p className="text-sm text-neutral-900">2012 Rue Beauregard, STE 202, Lafayette, LA 70508</p></div>
                <div className="mt-3"><p className="text-xs font-semibold text-neutral-500">Notes</p><p className="text-sm text-neutral-500">-</p></div>
              </section>
              <section className="rounded-xl p-5" style={{border:"1px solid #F0F0F0"}}>
                <h3 className="mb-4 text-lg font-semibold text-neutral-900">Payment Details</h3>
                <div className="grid grid-cols-2 gap-y-4 mb-4"><div><p className="text-xs font-semibold text-neutral-500">Transaction ID</p><p className="text-sm text-neutral-900">TS93863</p></div><div><p className="text-xs font-semibold text-neutral-500">Escrow amount</p><p className="text-sm text-neutral-900">$2,500.00</p></div><div><p className="text-xs font-semibold text-neutral-500">Escrow status</p><p className="text-sm text-neutral-900">Funded</p></div><div><p className="text-xs font-semibold text-neutral-500">Release date</p><p className="text-sm text-neutral-900">Oct 28, 2024 10:10 AM</p></div></div>
                <div className="flex items-center gap-3 rounded-lg bg-neutral-50 px-4 py-3"><span className="text-sm font-bold text-blue-600">VISA</span><span className="text-sm text-neutral-700">Visa ending with 2145</span></div>
              </section>
              <section className="rounded-xl p-5" style={{border:"1px solid #F0F0F0"}}>
                <h3 className="mb-4 text-lg font-semibold text-neutral-900">Documents</h3>
                {["Example Invoice data name.pdf","Example Carbon certificate data name.pdf"].map((d,i)=>(
                  <div key={i} className="flex items-center justify-between py-3" style={{borderBottom:"1px solid #F8F8F8"}}><div className="flex items-center gap-3"><FileText className="size-4 text-neutral-400" /><span className="text-sm text-neutral-900">{d}</span></div><div className="flex items-center gap-2"><Download className="size-4 text-neutral-400" /><MoreHorizontal className="size-4 text-neutral-400" /></div></div>
                ))}
              </section>
              <section className="rounded-xl p-5" style={{border:"1px solid #F0F0F0"}}>
                <h3 className="mb-4 text-lg font-semibold text-neutral-900">Activity Log</h3>
                {[{e:"Order placed",d:"Oct 29, 2024 10:10 AM",a:true},{e:"Escrow funded",d:"Oct 29, 2024 10:10 AM",a:true},{e:"Seller marked ready for pickup",d:"",a:false},{e:"Pickup confirmed",d:"",a:false},{e:"Escrow released",d:"",a:false},{e:"Order completed",d:"",a:false}].map((item,i,arr)=>(
                  <div key={item.e} className="flex gap-4"><div className="flex flex-col items-center"><div className={`size-3 rounded-full ${item.a?"bg-green-500":"bg-neutral-300"}`}/>{i<arr.length-1&&<div className={`w-0.5 flex-1 ${item.a&&arr[i+1]?.a?"bg-green-500":"bg-neutral-200"}`}/>}</div><div className="flex flex-1 items-center justify-between pb-5"><span className={`text-sm ${item.a?"font-medium text-neutral-900":"text-neutral-400"}`}>{item.e}</span>{item.d&&<span className="text-xs text-neutral-500">{item.d}</span>}</div></div>
                ))}
              </section>
            </div>
            {/* Summary sidebar */}
            <div className="w-[240px] shrink-0">
              <div className="sticky top-24 rounded-xl bg-neutral-50 p-5">
                <h3 className="mb-1 text-base font-bold text-neutral-900">Summary</h3>
                <p className="mb-4 text-xs text-neutral-500">1 product</p>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between"><span className="text-neutral-500">Item subtotal</span><span className="text-neutral-900">$600.00</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Shipping</span><span className="text-neutral-900">Quote</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Fees</span><span className="text-neutral-900">$2.00</span></div>
                  <div className="flex justify-between pt-3 font-bold" style={{borderTop:"1px solid #E0E0E0"}}><span>Total</span><span>$600.00</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Sales Page ─── */
export function SellerSalesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Order");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showBOLModal, setShowBOLModal] = useState(false);
  const [successModal, setSuccessModal] = useState<{title:string;message:string;status:string}|null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = orders.filter((o) => !searchQuery.trim() || o.buyer.toLowerCase().includes(searchQuery.toLowerCase()) || o.product.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleAction = (action: string) => {
    if (action === "Send quote") setShowQuoteModal(true);
    else if (action === "Upload BOL") setShowBOLModal(true);
    else if (action === "Mark ready" || action === "Respond") setSelectedOrder(orders[0]);
    else setSelectedOrder(orders[0]);
  };

  return (
    <SellerLayout title="Sales">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h1 className="text-2xl font-bold text-neutral-900">Sales</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2" style={{border:"1px solid #F0F0F0"}}><Search className="size-4 text-neutral-400" /><input type="text" placeholder="Search" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-400" /></div>
          <button onClick={()=>setShowFilters(true)} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-neutral-700" style={{border:"1px solid #F0F0F0"}}><SlidersHorizontal className="size-4" /> Filters</button>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[{l:"Total orders",v:"2300",i:DollarSign},{l:"New orders",v:"1900",i:CheckCircle2},{l:"In progress",v:"20",i:Clock},{l:"Completed",v:"380",i:RefreshCw}].map((s)=>(
          <div key={s.l} className="flex flex-col gap-2 rounded-xl px-5 py-4" style={{border:"1px solid #F0F0F0"}}><div className="flex items-center justify-between"><span className="text-sm text-neutral-500">{s.l}</span><s.i className="size-4 text-neutral-400"/></div><span className="text-2xl font-bold text-neutral-900">{s.v}</span></div>
        ))}
      </div>
      {/* Tabs */}
      <div className="flex gap-6 mb-4" style={{borderBottom:"1px solid #F0F0F0"}}>
        {tabs.map((t)=>(<button key={t} onClick={()=>setActiveTab(t)} className={`pb-3 text-sm font-medium ${activeTab===t?"text-neutral-900 border-b-2 border-neutral-900":"text-neutral-400"}`}>{t}</button>))}
      </div>
      {/* Table */}
      <table className="w-full min-w-[800px]">
        <thead><tr className="text-left" style={{borderBottom:"1px solid #F0F0F0"}}><th className="pb-3 text-sm font-medium text-neutral-500">Order ID</th><th className="pb-3 text-sm font-medium text-neutral-500">Buyer</th><th className="pb-3 text-sm font-medium text-neutral-500">Product</th><th className="pb-3 text-sm font-medium text-neutral-500">Qty</th><th className="pb-3 text-sm font-medium text-neutral-500">Shipping type</th><th className="pb-3 text-sm font-medium text-neutral-500">Action</th><th className="pb-3"></th></tr></thead>
        <tbody>{filtered.map((o,i)=>(
          <tr key={i} className="cursor-pointer hover:bg-neutral-50" style={{borderBottom:"1px solid #F8F8F8"}} onClick={()=>setSelectedOrder(o)}>
            <td className="py-3.5 text-sm text-neutral-900">{o.id}</td><td className="py-3.5 text-sm text-neutral-700">{o.buyer}</td><td className="py-3.5 text-sm text-neutral-700">{o.product}</td><td className="py-3.5 text-sm text-neutral-700">{o.qty}</td><td className="py-3.5 text-sm text-neutral-700">{o.shipping}</td>
            <td className="py-3.5"><ActionButton action={o.action} onClick={()=>handleAction(o.action)} /></td>
            <td className="py-3.5"><button className="text-neutral-400"><MoreHorizontal className="size-4" /></button></td>
          </tr>
        ))}</tbody>
      </table>
      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 pt-4" style={{borderTop:"1px solid #F0F0F0"}}>
        <div className="flex items-center gap-1"><button className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronLeft className="size-4"/></button>{[1,2,3,"...",15].map((p,i)=><button key={i} className={`flex size-8 items-center justify-center rounded text-sm ${p===currentPage?"bg-neutral-900 font-medium text-white":"text-neutral-500 hover:bg-neutral-100"}`} onClick={()=>typeof p==="number"&&setCurrentPage(p)}>{p}</button>)}<button className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronRight className="size-4"/></button></div>
        <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-500" style={{border:"1px solid #E0E0E0"}}>20 / page <ChevronDown className="size-3.5"/></button>
      </div>

      {showFilters && <FiltersPanel onClose={()=>setShowFilters(false)} />}
      {selectedOrder && <OrderDetailDrawer order={selectedOrder} onClose={()=>setSelectedOrder(null)} onAction={(a)=>{setSelectedOrder(null);handleAction(a);}} />}
      {showQuoteModal && <CreateQuoteModal onClose={()=>setShowQuoteModal(false)} onSend={()=>{setShowQuoteModal(false);setSuccessModal({title:"Shipping quote has been sent",message:"The buyer will review your quote. Once approved, they can fund escrow and you can proceed with fulfillment.",status:"Status: Awaiting buyer approval"});}} />}
      {showBOLModal && <UploadBOLModal onClose={()=>setShowBOLModal(false)} onUpload={()=>{setShowBOLModal(false);setSuccessModal({title:"Bill of Lading (BOL) uploaded",message:"The buyer will review your quote. Once approved, they can fund escrow and you can proceed with fulfillment.",status:"Status: Awaiting buyer delivery confirmation"});}} />}
      {successModal && <SuccessModal {...successModal} onClose={()=>setSuccessModal(null)} />}
    </SellerLayout>
  );
}
