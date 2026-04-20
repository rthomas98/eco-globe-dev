"use client";

import { useState } from "react";
import {
  Search,
  ChevronDown,
  SlidersHorizontal,
  Settings2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Download,
} from "lucide-react";
import { Button } from "@eco-globe/ui";
import { ExportDropdown } from "./export-dropdown";
import { DateRangeDropdown } from "./date-range-dropdown";

/* ─── Types ─── */
type OrderStatus = "Processing" | "Completed" | "Disputed";
type EscrowStatus = "Funded" | "Released";

interface Order {
  id: string;
  buyer: string;
  seller: string;
  product: string;
  category: string;
  qty: string;
  shippingType: "Pickup" | "Delivery";
  amount: string;
  escrow: EscrowStatus;
  orderDate: string;
  status: OrderStatus;
}

/* ─── Mock Data ─── */
const orders: Order[] = [
  { id: "TS98765", buyer: "BrightFuture Corp", seller: "TerraGenesis Biofuels", product: "Recycled Polyethylene Tereph...", category: "Plastics", qty: "2400 lbs", shippingType: "Pickup", amount: "$9,500,000", escrow: "Funded", orderDate: "01/05/2027", status: "Processing" },
  { id: "TS87654", buyer: "Evergreen Innovations", seller: "NovaGreen Energy", product: "Assorted Post-Consumer Was...", category: "Plastics", qty: "1550 lbs", shippingType: "Delivery", amount: "$15,250,000", escrow: "Funded", orderDate: "03/15/2027", status: "Processing" },
  { id: "TS76543", buyer: "Verdant Dynamics", seller: "AquaRenew Solutions", product: "Post-Consumer Polypropylen...", category: "Plastics", qty: "3200 lbs", shippingType: "Pickup", amount: "$6,800,000", escrow: "Funded", orderDate: "05/20/2027", status: "Processing" },
  { id: "TS65432", buyer: "TerraSphere Systems", seller: "VerdantEco Resources", product: "Premium Grade Hardwood Sa...", category: "Wood", qty: "1800 lbs", shippingType: "Delivery", amount: "$11,400,000", escrow: "Funded", orderDate: "07/01/2027", status: "Disputed" },
  { id: "TS54321", buyer: "NovaBlends Inc.", seller: "Zenith Sustainable", product: "High-Density Softwood Fiber...", category: "Wood", qty: "2700 lbs", shippingType: "Pickup", amount: "$7,900,000", escrow: "Funded", orderDate: "09/10/2027", status: "Processing" },
  { id: "TS43210", buyer: "OptimaGreen Solutions", seller: "EmberCore Industries", product: "Chemically Treated Lumber S...", category: "Wood", qty: "1950 lbs", shippingType: "Delivery", amount: "$13,650,000", escrow: "Released", orderDate: "11/22/2027", status: "Completed" },
  { id: "TS32109", buyer: "EcoNexus Enterprises", seller: "ClearSky Resources", product: "High-Quality Reclaimed Pallet...", category: "Wood", qty: "3100 lbs", shippingType: "Pickup", amount: "$8,200,000", escrow: "Released", orderDate: "02/01/2028", status: "Completed" },
  { id: "TS12356", buyer: "ClearSky Energy", seller: "FutureRenew Solutions", product: "Mixed Construction Wood De...", category: "Wood", qty: "2250 lbs", shippingType: "Delivery", amount: "$6,750,000", escrow: "Released", orderDate: "11/01/2027", status: "Completed" },
  { id: "TS12347", buyer: "PurePlanet Technologies", seller: "GlobalEvolve Energy", product: "Industrial Grade Cardboard B...", category: "Paper", qty: "1600 lbs", shippingType: "Pickup", amount: "$10,300,000", escrow: "Released", orderDate: "02/20/2027", status: "Completed" },
  { id: "TS12352", buyer: "FutureRenew Group", seller: "SummitGreen Ltd.", product: "High-Volume Newsprint Bundl...", category: "Paper", qty: "2900 lbs", shippingType: "Delivery", amount: "$9,800,000", escrow: "Released", orderDate: "07/20/2027", status: "Completed" },
  { id: "TS12357", buyer: "AquaTerra Holdings", seller: "HorizonEco Products", product: "Sorted Office Paper Waste", category: "Paper", qty: "1750 lbs", shippingType: "Pickup", amount: "$2,450,000", escrow: "Released", orderDate: "12/05/2027", status: "Completed" },
  { id: "TS12348", buyer: "GlobalEvolve Corp", seller: "PurePlanet Inc.", product: "Premium Textile Cut Waste", category: "Textile", qty: "2500 lbs", shippingType: "Delivery", amount: "$14,600,000", escrow: "Released", orderDate: "03/10/2027", status: "Completed" },
  { id: "TS12353", buyer: "ZenithEco Systems", seller: "OceanicRise Energy", product: "Quality Garment Production S...", category: "Textile", qty: "3300 lbs", shippingType: "Pickup", amount: "$4,200,000", escrow: "Released", orderDate: "08/18/2027", status: "Completed" },
  { id: "TS12358", buyer: "PeakNature Industries", seller: "OptimaGreen Inc.", product: "Durable Synthetic Fabric Trim", category: "Textile", qty: "2100 lbs", shippingType: "Delivery", amount: "$5,200,000", escrow: "Released", orderDate: "01/22/2028", status: "Completed" },
  { id: "TS12349", buyer: "VeritasTerra Innovations", seller: "UnitedEco Solutions", product: "Finely Ground Rubber Tire Cr...", category: "Rubber", qty: "1400 lbs", shippingType: "Pickup", amount: "$8,900,000", escrow: "Released", orderDate: "04/25/2027", status: "Completed" },
  { id: "TS12354", buyer: "HorizonEco Group", seller: "PeakNature Partners", product: "High-Purity EPDM Rubber Re...", category: "Rubber", qty: "3000 lbs", shippingType: "Delivery", amount: "$3,850,000", escrow: "Released", orderDate: "09/30/2027", status: "Completed" },
  { id: "TS12359", buyer: "SummitGreen Solutions", seller: "Evergreen Biofuels", product: "Industrial Silicone Rubber Scr...", category: "Rubber", qty: "2650 lbs", shippingType: "Pickup", amount: "$4,800,000", escrow: "Released", orderDate: "02/15/2028", status: "Completed" },
  { id: "TS12350", buyer: "UnitedEco Ventures", seller: "EcoNexus Industries", product: "Assorted Leather Hide Pieces", category: "Leather", qty: "1500 lbs", shippingType: "Delivery", amount: "$5,500,000", escrow: "Released", orderDate: "05/30/2027", status: "Completed" },
  { id: "TS12355", buyer: "OceanicRise Holdings", seller: "BrightFuture Innovations", product: "Naturally Vegetable Tanned L...", category: "Leather", qty: "2800 lbs", shippingType: "Pickup", amount: "$11,000,000", escrow: "Released", orderDate: "10/12/2027", status: "Completed" },
  { id: "TS12360", buyer: "EmberCore Energy", seller: "TerraSphere", product: "Processed Chrome Tanned S...", category: "Leather", qty: "2000 lbs", shippingType: "Delivery", amount: "$3,000,000", escrow: "Released", orderDate: "03/30/2028", status: "Completed" },
];

function StatusBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    Processing: "bg-amber-50 text-amber-600",
    Completed: "bg-green-50 text-green-600",
    Disputed: "bg-red-50 text-red-600",
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
    { label: "Total orders", value: "2300", icon: Settings2 },
    { label: "In Progress", value: "100", icon: RefreshCw },
    { label: "Completed", value: "1900", icon: CheckCircle2 },
    { label: "Issues", value: "300", icon: AlertCircle },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col gap-2 rounded-xl px-5 py-4"
          style={{ border: "1px solid #F0F0F0" }}
        >
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
    <div
      className="absolute right-0 top-12 z-30 w-[360px] rounded-xl bg-white p-6"
      style={{ border: "1px solid #F0F0F0", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
    >
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900">Filters</h3>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900">
          <X className="size-5" />
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {/* Shipping type */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Shipping type</h4>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" className="size-4 rounded border-neutral-300" /> Pickup
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" className="size-4 rounded border-neutral-300" /> Delivery
            </label>
          </div>
        </div>

        {/* Product category */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Product category</h4>
          <div className="grid grid-cols-2 gap-3">
            {["Plastics", "Rubber & Tire-Derived", "Oils & Liquid Feedstocks", "Biomass & Wood"].map((cat) => (
              <label key={cat} className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" className="size-4 rounded border-neutral-300" /> {cat}
              </label>
            ))}
          </div>
        </div>

        {/* Escrow status */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Escrow status</h4>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" className="size-4 rounded border-neutral-300" /> Funded
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" className="size-4 rounded border-neutral-300" /> Released
            </label>
          </div>
        </div>

        {/* Order status */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Order status</h4>
          <div className="grid grid-cols-2 gap-3">
            {["Pending", "Processing", "Completed", "Failed"].map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" className="size-4 rounded border-neutral-300" /> {s}
              </label>
            ))}
          </div>
        </div>

        {/* Order date */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Order Date</h4>
          <div className="relative">
            <input
              type="date"
              className="w-full rounded-lg px-4 py-3 text-sm text-neutral-500 outline-none"
              style={{ border: "1px solid #E0E0E0" }}
              placeholder="Input"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button className="text-sm font-medium text-neutral-900">Reset</button>
          <Button variant="primary" size="md">Apply</Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Order Detail Drawer ─── */
function OrderDetailDrawer({ onClose }: { order: Order; onClose: () => void }) {
  const activityLog = [
    { event: "Order placed", date: "Oct 29, 2024 10:10 AM", active: true },
    { event: "Escrow funded", date: "Oct 29, 2024 10:10 AM", active: true },
    { event: "Seller marked ready for pickup", date: "", active: false },
    { event: "Pickup confirmed", date: "", active: false },
    { event: "Escrow released", date: "", active: false },
    { event: "Order completed", date: "", active: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-[680px] flex-col overflow-y-auto bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-6 py-4" style={{ borderBottom: "1px solid #F0F0F0" }}>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-neutral-900">ID9870</h2>
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Paid</span>
            </div>
            <p className="text-sm text-neutral-500">03/22/2024, 11:15 AM</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100">
              <MoreHorizontal className="size-5 text-neutral-500" />
            </button>
            <button onClick={onClose} className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100">
              <X className="size-5 text-neutral-500" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6 p-6">
          {/* Order Info */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Order info</h3>
            <div className="grid grid-cols-2 gap-y-4 rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
              <div><p className="text-xs font-semibold text-neutral-500">Order ID</p><p className="text-sm text-neutral-900">OD20411</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Order Placed</p><p className="text-sm text-neutral-900">Oct 24, 2024 10:10 AM</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Buyer</p><p className="text-sm text-neutral-900">AgriCorp Solutions</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Status</p><p className="text-sm text-neutral-900">Quote awaiting approval</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Shipping</p><p className="text-sm text-neutral-900">Delivery</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Quantity</p><p className="text-sm text-neutral-900">25 tons</p></div>
            </div>
          </section>

          {/* Products */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Products</h3>
            <div className="flex items-center gap-4 rounded-xl p-4" style={{ border: "1px solid #F0F0F0" }}>
              <div className="size-12 shrink-0 rounded-lg bg-neutral-200" />
              <div>
                <p className="text-sm font-medium text-neutral-900">Wood Sawdust Industrial High Quality</p>
                <p className="text-sm text-neutral-500">$100.00 /tons</p>
              </div>
            </div>
          </section>

          {/* Payment Details */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Payment Details</h3>
            <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
              <div className="grid grid-cols-2 gap-y-4 mb-5">
                <div><p className="text-xs font-semibold text-neutral-500">Transaction ID</p><p className="text-sm text-neutral-900">TS93863</p></div>
                <div><p className="text-xs font-semibold text-neutral-500">Escrow amount</p><p className="text-sm text-neutral-900">$2,500.00</p></div>
                <div><p className="text-xs font-semibold text-neutral-500">Escrow status</p><p className="text-sm text-neutral-900">Funded</p></div>
                <div><p className="text-xs font-semibold text-neutral-500">Release date</p><p className="text-sm text-neutral-900">Oct 28, 2024 10:10 AM</p></div>
              </div>
              <div className="mb-4 flex items-center gap-3 rounded-lg bg-neutral-50 px-4 py-3">
                <span className="text-sm font-bold text-blue-600">VISA</span>
                <span className="text-sm text-neutral-700">Visa ending with 2145</span>
              </div>
              <div className="flex flex-col gap-3" style={{ borderTop: "1px solid #F0F0F0", paddingTop: "16px" }}>
                <div className="flex justify-between text-sm"><span className="text-neutral-500">Item(s) subtotal</span><span className="text-neutral-900">$2,500.00</span></div>
                <div className="flex justify-between text-sm"><span className="text-neutral-500">Shipping & handling</span><span className="text-neutral-900">$500.00</span></div>
                <div className="flex justify-between text-sm"><span className="text-neutral-500">Tax</span><span className="text-neutral-900">$250.00</span></div>
                <div className="flex justify-between text-sm font-semibold"><span className="text-neutral-900">Grand Total</span><span className="text-neutral-900">$3,250.00</span></div>
              </div>
            </div>
          </section>

          {/* Delivery Info */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Delivery info</h3>
            <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
              <div className="grid grid-cols-2 gap-y-4">
                <div><p className="text-xs font-semibold text-neutral-500">Buyer</p><p className="text-sm text-neutral-900">AgriCorp Solutions</p></div>
                <div><p className="text-xs font-semibold text-neutral-500">Contact person</p><p className="text-sm text-neutral-900">Will Smith</p></div>
                <div><p className="text-xs font-semibold text-neutral-500">Phone number</p><p className="text-sm text-neutral-900">012345678910</p></div>
                <div><p className="text-xs font-semibold text-neutral-500">Email</p><p className="text-sm text-neutral-900">example@mail.com</p></div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold text-neutral-500">Destination address</p>
                <p className="text-sm text-neutral-900">2012 Rue Beauregard, STE 202, Lafayette, LA 70508</p>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold text-neutral-500">Notes</p>
                <p className="text-sm text-neutral-500">-</p>
              </div>
            </div>
          </section>

          {/* Documents */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Documents</h3>
            <div className="flex flex-col gap-3">
              {["Example Invoice data name.pdf", "Example Bill of lading data name.pdf", "Example Carbon certificate data name.pdf"].map((doc) => (
                <div key={doc} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ border: "1px solid #F0F0F0" }}>
                  <div className="flex items-center gap-3">
                    <FileText className="size-5 text-neutral-400" />
                    <span className="text-sm text-neutral-900">{doc}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-neutral-400 hover:text-neutral-700"><Download className="size-4" /></button>
                    <button className="text-neutral-400 hover:text-neutral-700"><MoreHorizontal className="size-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Activity Log */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Activity Log</h3>
            <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
              <div className="flex flex-col">
                {activityLog.map((item, i) => (
                  <div key={item.event} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`size-3 rounded-full ${item.active ? "bg-green-500" : "bg-neutral-300"}`} />
                      {i < activityLog.length - 1 && (
                        <div className={`w-0.5 flex-1 ${item.active && activityLog[i + 1]?.active ? "bg-green-500" : "bg-neutral-200"}`} />
                      )}
                    </div>
                    <div className="flex flex-1 items-center justify-between pb-5">
                      <span className={`text-sm ${item.active ? "font-medium text-neutral-900" : "text-neutral-400"}`}>{item.event}</span>
                      {item.date && <span className="text-xs text-neutral-500">{item.date}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Sales Page ─── */
export function SalesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("30d");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      o.buyer.toLowerCase().includes(q) ||
      o.seller.toLowerCase().includes(q) ||
      o.product.toLowerCase().includes(q) ||
      o.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <h1 className="text-2xl font-bold text-neutral-900">Sales</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2" style={{ border: "1px solid #F0F0F0" }}>
            <Search className="size-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
          </div>
          <DateRangeDropdown value={dateRange} onChange={setDateRange} />
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-neutral-700"
              style={{ border: "1px solid #F0F0F0" }}
            >
              <SlidersHorizontal className="size-4" /> Filters
            </button>
            {showFilters && <FiltersPanel onClose={() => setShowFilters(false)} />}
          </div>
          <ExportDropdown
            filename="ecoglobe-sales"
            columns={[
              { key: "id", label: "Order ID" }, { key: "buyer", label: "Buyer" }, { key: "seller", label: "Seller" },
              { key: "product", label: "Product" }, { key: "category", label: "Category" }, { key: "amount", label: "Amount" },
              { key: "status", label: "Status" },
            ]}
            data={filteredOrders}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 pb-5">
        <StatsCards />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto px-6">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="text-left" style={{ borderBottom: "1px solid #F0F0F0" }}>
              <th className="pb-3 text-sm font-medium text-neutral-500">Order ID</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Buyer</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Seller</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Product</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Category</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Status</th>
              <th className="pb-3 text-sm font-medium text-neutral-500"></th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr
                key={order.id}
                className="cursor-pointer transition-colors hover:bg-neutral-50"
                style={{ borderBottom: "1px solid #F8F8F8" }}
                onClick={() => setSelectedOrder(order)}
              >
                <td className="py-3.5 text-sm text-neutral-900">{order.id}</td>
                <td className="py-3.5 text-sm text-neutral-900">{order.buyer}</td>
                <td className="py-3.5 text-sm text-neutral-900">{order.seller}</td>
                <td className="py-3.5 text-sm text-neutral-700 max-w-[200px] truncate">{order.product}</td>
                <td className="py-3.5 text-sm text-neutral-700">{order.category}</td>
                <td className="py-3.5"><StatusBadge status={order.status} /></td>
                <td className="py-3.5">
                  <button className="text-neutral-400 hover:text-neutral-700">
                    <MoreHorizontal className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid #F0F0F0" }}>
        <div className="flex items-center gap-1">
          <button className="flex size-8 items-center justify-center rounded text-neutral-400 hover:text-neutral-700">
            <ChevronLeft className="size-4" />
          </button>
          {[1, 2, 3, "...", 15].map((page, i) => (
            <button
              key={i}
              className={`flex size-8 items-center justify-center rounded text-sm ${
                page === currentPage
                  ? "bg-neutral-900 font-medium text-white"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
              onClick={() => typeof page === "number" && setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button className="flex size-8 items-center justify-center rounded text-neutral-400 hover:text-neutral-700">
            <ChevronRight className="size-4" />
          </button>
        </div>
        <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-500" style={{ border: "1px solid #E0E0E0" }}>
          20 / page <ChevronDown className="size-3.5" />
        </button>
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <OrderDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}
