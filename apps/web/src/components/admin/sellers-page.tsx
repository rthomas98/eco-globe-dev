"use client";

import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Settings2,
  RefreshCw,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
  Download,
  Users,
} from "lucide-react";
import { Button } from "@eco-globe/ui";

/* ─── Types ─── */
type SellerStatus = "Active" | "Inactive" | "Pending";

interface Seller {
  name: string;
  industry: string;
  location: string;
  totalOrders: string;
  totalGMV: string;
  status: SellerStatus;
}

/* ─── Mock Data ─── */
const sellers: Seller[] = [
  { name: "Acme Corp", industry: "Manufacture", location: "Baton Rouge", totalOrders: "12 tons", totalGMV: "$12,900,000.00", status: "Active" },
  { name: "Beta Dynamics", industry: "Manufacture", location: "Austin", totalOrders: "10 tons", totalGMV: "$10,500,000.00", status: "Active" },
  { name: "Gamma Industries", industry: "Manufacture", location: "Miami", totalOrders: "15 tons", totalGMV: "$15,750,000.00", status: "Inactive" },
  { name: "Delta Systems", industry: "Manufacture", location: "San Francisco", totalOrders: "8 tons", totalGMV: "$8,200,000.00", status: "Active" },
  { name: "Epsilon Group", industry: "Manufacture", location: "Seattle", totalOrders: "20 tons", totalGMV: "$22,000,000.00", status: "Pending" },
  { name: "Zeta Enterprises", industry: "Manufacture", location: "Chicago", totalOrders: "18 tons", totalGMV: "$18,600,000.00", status: "Active" },
  { name: "Eta Solutions", industry: "Manufacture", location: "Denver", totalOrders: "5 tons", totalGMV: "$5,000,000.00", status: "Inactive" },
  { name: "Theta Innovations", industry: "Manufacture", location: "Los Angeles", totalOrders: "14 tons", totalGMV: "$14,950,000.00", status: "Active" },
  { name: "Iota Machines", industry: "Manufacture", location: "Boston", totalOrders: "9 tons", totalGMV: "$9,300,000.00", status: "Active" },
  { name: "Kappa Tech", industry: "Manufacture", location: "Orlando", totalOrders: "11 tons", totalGMV: "$11,400,000.00", status: "Pending" },
  { name: "Lambda Corp", industry: "Manufacture", location: "Baton Rouge", totalOrders: "12 tons", totalGMV: "$12,900,000.00", status: "Active" },
  { name: "Mu Dynamics", industry: "Manufacture", location: "Austin", totalOrders: "10 tons", totalGMV: "$10,500,000.00", status: "Active" },
  { name: "Nu Industries", industry: "Manufacture", location: "Miami", totalOrders: "15 tons", totalGMV: "$15,750,000.00", status: "Inactive" },
  { name: "Xi Systems", industry: "Manufacture", location: "San Francisco", totalOrders: "8 tons", totalGMV: "$8,200,000.00", status: "Active" },
  { name: "Omicron Group", industry: "Manufacture", location: "Seattle", totalOrders: "20 tons", totalGMV: "$22,000,000.00", status: "Pending" },
  { name: "Pi Enterprises", industry: "Manufacture", location: "Chicago", totalOrders: "18 tons", totalGMV: "$18,600,000.00", status: "Active" },
  { name: "Rho Solutions", industry: "Manufacture", location: "Denver", totalOrders: "5 tons", totalGMV: "$5,000,000.00", status: "Inactive" },
  { name: "Sigma Innovations", industry: "Manufacture", location: "Los Angeles", totalOrders: "14 tons", totalGMV: "$14,950,000.00", status: "Active" },
  { name: "Tau Machines", industry: "Manufacture", location: "Boston", totalOrders: "9 tons", totalGMV: "$9,300,000.00", status: "Active" },
  { name: "Upsilon Tech", industry: "Manufacture", location: "Orlando", totalOrders: "11 tons", totalGMV: "$11,400,000.00", status: "Pending" },
];

function StatusBadge({ status }: { status: SellerStatus }) {
  const styles: Record<SellerStatus, string> = {
    Active: "bg-green-50 text-green-600",
    Inactive: "bg-amber-50 text-amber-600",
    Pending: "bg-amber-50 text-amber-600",
  };
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

/* ─── Stats Cards ─── */
function StatsCards() {
  const stats = [
    { label: "Total Seller", value: "243", icon: Users },
    { label: "Active Sellers", value: "105", icon: Settings2 },
    { label: "Pending Verification", value: "3", icon: RefreshCw },
  ];
  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-2 rounded-xl px-5 py-4" style={{ border: "1px solid #F0F0F0" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">{stat.label}</span>
            <stat.icon className="size-4 text-neutral-400" />
          </div>
          <span className="text-2xl font-bold text-neutral-900">{stat.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Filters Panel ─── */
function FiltersPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute right-0 top-12 z-30 w-[380px] rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}>
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900">Filters</h3>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900"><X className="size-5" /></button>
      </div>
      <div className="flex flex-col gap-6">
        <div>
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Industry</h4>
          <div className="grid grid-cols-2 gap-3">
            {["Plastics", "Rubber & Tire-Derived", "Oils & Liquid Feedstocks", "Biomass & Wood"].map((cat) => (
              <label key={cat} className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4 rounded border-neutral-300" /> {cat}</label>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Location</h4>
          <div className="grid grid-cols-2 gap-3">
            {["Louisiana", "El Salvador", "Honduras", "Belize"].map((loc) => (
              <label key={loc} className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4 rounded border-neutral-300" /> {loc}</label>
            ))}
          </div>
          <button className="mt-2 text-sm font-medium text-neutral-900 underline">View More</button>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Status</h4>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4 rounded border-neutral-300" /> Active</label>
            <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4 rounded border-neutral-300" /> Inactive</label>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <button className="text-sm font-medium text-neutral-900">Reset</button>
          <Button variant="primary" size="md">Apply</Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Seller Detail: Overview Tab ─── */
function OverviewTab() {
  return (
    <div className="flex flex-col gap-6">
      {/* Mini stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Listings", value: "4" },
          { label: "Total orders", value: "12490" },
          { label: "Total GMV", value: "$90,000,203" },
          { label: "Disputes Count", value: "25" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-1 rounded-xl px-4 py-3" style={{ border: "1px solid #F0F0F0" }}>
            <span className="text-xs text-neutral-500">{s.label}</span>
            <span className="text-lg font-bold text-neutral-900">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Seller Info */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Seller Info</h3>
        <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
          <div className="grid grid-cols-2 gap-y-4">
            <div><p className="text-xs font-semibold text-neutral-500">Company Name</p><p className="text-sm text-neutral-900">Beta Dynamics</p></div>
            <div><p className="text-xs font-semibold text-neutral-500">Legal Entity Type</p><p className="text-sm text-neutral-900">Manufacture</p></div>
            <div><p className="text-xs font-semibold text-neutral-500">Registration Number</p><p className="text-sm text-neutral-900">RG03760</p></div>
            <div><p className="text-xs font-semibold text-neutral-500">Contact Person</p><p className="text-sm text-neutral-900">William Smith</p></div>
            <div><p className="text-xs font-semibold text-neutral-500">Phone</p><p className="text-sm text-neutral-900">012345678910</p></div>
            <div><p className="text-xs font-semibold text-neutral-500">Business Email</p><p className="text-sm text-neutral-900">betadynamic@mail.com</p></div>
          </div>
          <div className="mt-4"><p className="text-xs font-semibold text-neutral-500">Location</p><p className="text-sm text-neutral-900">2012 Rue Beauregard, STE 202, Lafayette, LA 70508</p></div>
        </div>
      </section>

      {/* Verification */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Verification</h3>
        <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
          <div className="grid grid-cols-2 gap-y-4 mb-5">
            <div><p className="text-xs font-semibold text-neutral-500">Verification status</p><p className="text-sm text-neutral-900">Verified</p></div>
            <div><p className="text-xs font-semibold text-neutral-500">Verified date</p><p className="text-sm text-neutral-900">12/12/2026 10:30 AM</p></div>
          </div>
          <div className="flex flex-col gap-3">
            {["Example Invoice data name.pdf", "Example Bill of lading data name.pdf", "Example Carbon certificate data name.pdf"].map((doc) => (
              <div key={doc} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ border: "1px solid #F0F0F0" }}>
                <div className="flex items-center gap-3"><FileText className="size-5 text-neutral-400" /><span className="text-sm text-neutral-900">{doc}</span></div>
                <div className="flex items-center gap-2">
                  <button className="text-neutral-400 hover:text-neutral-700"><Download className="size-4" /></button>
                  <button className="text-neutral-400 hover:text-neutral-700"><MoreHorizontal className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Seller Detail: Products Tab ─── */
function ProductsTab() {
  const products = [
    { name: "Rice Husk Industrial Grade", category: "Plastic", price: "$400/ton", sustainability: "Verified", status: "Active" },
    { name: "Rice Husk Industrial Grade", category: "Plastic", price: "$400/ton", sustainability: "Verified", status: "Active" },
    { name: "Rice Husk Industrial Grade", category: "Plastic", price: "$400/ton", sustainability: "Verified", status: "Active" },
    { name: "Rice Husk Industrial Grade", category: "Plastic", price: "$400/ton", sustainability: "Verified", status: "Active" },
  ];
  return (
    <table className="w-full">
      <thead>
        <tr style={{ borderBottom: "1px solid #F0F0F0" }}>
          <th className="pb-3 text-left text-sm font-medium text-neutral-500">Product Name</th>
          <th className="pb-3 text-left text-sm font-medium text-neutral-500">Category</th>
          <th className="pb-3 text-left text-sm font-medium text-neutral-500">Price</th>
          <th className="pb-3 text-left text-sm font-medium text-neutral-500">Sustainability</th>
          <th className="pb-3 text-left text-sm font-medium text-neutral-500">Status</th>
          <th className="pb-3"></th>
        </tr>
      </thead>
      <tbody>
        {products.map((p, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #F8F8F8" }}>
            <td className="py-3.5">
              <div className="flex items-center gap-3">
                <div className="size-10 shrink-0 overflow-hidden rounded-lg"><img src="/hero.jpg" alt="" className="size-full object-cover" /></div>
                <span className="text-sm text-neutral-900">{p.name}</span>
              </div>
            </td>
            <td className="py-3.5 text-sm text-neutral-700">{p.category}</td>
            <td className="py-3.5 text-sm text-neutral-900">{p.price}</td>
            <td className="py-3.5"><span className="flex items-center gap-1.5 text-sm text-neutral-700"><span className="size-2 rounded-full bg-green-500" />{p.sustainability}</span></td>
            <td className="py-3.5"><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">{p.status}</span></td>
            <td className="py-3.5"><button className="text-neutral-400 hover:text-neutral-700"><MoreHorizontal className="size-4" /></button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─── Seller Detail: Sales Tab ─── */
function SalesTab() {
  const sales = [
    { id: "TS98765", buyer: "AgriCorp Solutions", product: "Oat Hull Animal Grade", qty: "123 lb", shippingType: "Delivery" },
    { id: "TS98766", buyer: "BioGreen Innovations", product: "Organic Fertilizer", qty: "500 lb", shippingType: "Pickup" },
    { id: "TS98767", buyer: "NutriFeed Industries", product: "Soybean Meal", qty: "200 lb", shippingType: "Delivery" },
    { id: "TS98768", buyer: "GreenHarvest Co.", product: "Corn Silage", qty: "1,000 lb", shippingType: "Delivery" },
    { id: "TS98769", buyer: "PurePastures Ltd.", product: "Alfalfa Hay", qty: "750 lb", shippingType: "Pickup" },
    { id: "TS98765", buyer: "AgriCorp Solutions", product: "Oat Hull Animal Grade", qty: "123 lb", shippingType: "Delivery" },
    { id: "TS98766", buyer: "Oceanic Innovations", product: "Seaweed Extract Premium", qty: "200 lb", shippingType: "Delivery" },
    { id: "TS98767", buyer: "GreenEarth Technologies", product: "Organic Fertilizer Blend", qty: "150 lb", shippingType: "Delivery" },
    { id: "TS98768", buyer: "NutriFeed Corp", product: "Alfalfa Pellets Feed Grade", qty: "250 lb", shippingType: "Delivery" },
    { id: "TS98769", buyer: "BioHarvest Ltd", product: "Compostable Mulch Film", qty: "300 lb", shippingType: "Delivery" },
    { id: "TS98770", buyer: "AgriTech Enterprises", product: "Insect Protein Powder", qty: "500 lb", shippingType: "Delivery" },
    { id: "TS98771", buyer: "CropScience Co.", product: "Bio-Stimulant Liquid", qty: "100 lb", shippingType: "Delivery" },
    { id: "TS98772", buyer: "Harvest Innovations", product: "Sustainable Seed Mix", qty: "400 lb", shippingType: "Delivery" },
    { id: "TS98773", buyer: "PureWater Systems", product: "Irrigation Water Treatment", qty: "600 lb", shippingType: "Delivery" },
    { id: "TS98774", buyer: "Rural Energy Corp", product: "Solar Farm Kits", qty: "700 lb", shippingType: "Pickup" },
    { id: "TS98775", buyer: "FarmTech Solutions", product: "Automated Irrigation System", qty: "800 lb", shippingType: "Delivery" },
    { id: "TS98776", buyer: "AgriWaste Group", product: "Anaerobic Digester Units", qty: "1000 lb", shippingType: "Pickup" },
    { id: "TS98777", buyer: "SmartAgri Tech", product: "Drone Crop Monitoring", qty: "200 lb", shippingType: "Delivery" },
    { id: "TS98778", buyer: "FoodSecure Ltd", product: "Farm Produce Storage Solutions", qty: "300 lb", shippingType: "Pickup" },
    { id: "TS98779", buyer: "NutriCrops Inc", product: "Crop Nutrient Fortifiers", qty: "400 lb", shippingType: "Delivery" },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr style={{ borderBottom: "1px solid #F0F0F0" }}>
            <th className="pb-3 text-left text-sm font-medium text-neutral-500">Order ID</th>
            <th className="pb-3 text-left text-sm font-medium text-neutral-500">Buyer</th>
            <th className="pb-3 text-left text-sm font-medium text-neutral-500">Product</th>
            <th className="pb-3 text-left text-sm font-medium text-neutral-500">Qty</th>
            <th className="pb-3 text-left text-sm font-medium text-neutral-500">Shipping type</th>
            <th className="pb-3"></th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #F8F8F8" }}>
              <td className="py-3.5 text-sm text-neutral-900">{s.id}</td>
              <td className="py-3.5 text-sm text-neutral-700">{s.buyer}</td>
              <td className="py-3.5 text-sm text-neutral-700">{s.product}</td>
              <td className="py-3.5 text-sm text-neutral-700">{s.qty}</td>
              <td className="py-3.5 text-sm text-neutral-700">{s.shippingType}</td>
              <td className="py-3.5"><button className="text-neutral-400 hover:text-neutral-700"><MoreHorizontal className="size-4" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Seller Detail Drawer ─── */
function SellerDetailDrawer({ seller, onClose }: { seller: Seller; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "sales">("overview");
  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "products" as const, label: "Products" },
    { key: "sales" as const, label: "Sales" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-[720px] flex-col overflow-y-auto bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white px-6 pt-5 pb-0" style={{ borderBottom: "1px solid #F0F0F0" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-neutral-900">{seller.name}</h2>
                <StatusBadge status={seller.status} />
              </div>
              <p className="text-sm text-neutral-500">Since 12/12/2026</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><MoreHorizontal className="size-5 text-neutral-500" /></button>
              <button onClick={onClose} className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><X className="size-5 text-neutral-500" /></button>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm font-medium transition-colors ${activeTab === tab.key ? "text-neutral-900 border-b-2 border-neutral-900" : "text-neutral-400 hover:text-neutral-700"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "products" && <ProductsTab />}
          {activeTab === "sales" && <SalesTab />}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Sellers Page ─── */
export function AdminSellersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <h1 className="text-2xl font-bold text-neutral-900">Sellers</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2" style={{ border: "1px solid #F0F0F0" }}>
            <Search className="size-4 text-neutral-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-400" />
          </div>
          <div className="relative">
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-neutral-700" style={{ border: "1px solid #F0F0F0" }}>
              <SlidersHorizontal className="size-4" /> Filters
            </button>
            {showFilters && <FiltersPanel onClose={() => setShowFilters(false)} />}
          </div>
          <Button variant="primary" size="md">Add Seller</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 pb-5"><StatsCards /></div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto px-6">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="text-left" style={{ borderBottom: "1px solid #F0F0F0" }}>
              <th className="pb-3 text-sm font-medium text-neutral-500">Seller Name</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Industry</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Location</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Total Orders</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Total GMV</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Status</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((seller, i) => (
              <tr key={i} className="cursor-pointer transition-colors hover:bg-neutral-50" style={{ borderBottom: "1px solid #F8F8F8" }} onClick={() => setSelectedSeller(seller)}>
                <td className="py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600">A</div>
                    <span className="text-sm text-neutral-900">{seller.name}</span>
                  </div>
                </td>
                <td className="py-3.5 text-sm text-neutral-700">{seller.industry}</td>
                <td className="py-3.5 text-sm text-neutral-700">{seller.location}</td>
                <td className="py-3.5 text-sm text-neutral-700">{seller.totalOrders}</td>
                <td className="py-3.5 text-sm text-neutral-900">{seller.totalGMV}</td>
                <td className="py-3.5"><StatusBadge status={seller.status} /></td>
                <td className="py-3.5"><button className="text-neutral-400 hover:text-neutral-700"><MoreHorizontal className="size-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid #F0F0F0" }}>
        <div className="flex items-center gap-1">
          <button className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronLeft className="size-4" /></button>
          {[1, 2, 3, "...", 15].map((page, i) => (
            <button key={i} className={`flex size-8 items-center justify-center rounded text-sm ${page === currentPage ? "bg-neutral-900 font-medium text-white" : "text-neutral-500 hover:bg-neutral-100"}`} onClick={() => typeof page === "number" && setCurrentPage(page)}>{page}</button>
          ))}
          <button className="flex size-8 items-center justify-center rounded text-neutral-400"><ChevronRight className="size-4" /></button>
        </div>
        <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-500" style={{ border: "1px solid #E0E0E0" }}>20 / page <ChevronDown className="size-3.5" /></button>
      </div>

      {selectedSeller && <SellerDetailDrawer seller={selectedSeller} onClose={() => setSelectedSeller(null)} />}
    </div>
  );
}
