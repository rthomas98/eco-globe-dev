"use client";

import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Settings2,
  AlertTriangle,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  DollarSign,
} from "lucide-react";
import { Button, Input, Select } from "@eco-globe/ui";

/* ─── Types ─── */
type BuyerStatus = "Active" | "Inactive" | "Pending";

interface Buyer {
  name: string;
  industry: string;
  location: string;
  totalOrders: string;
  totalGMV: string;
  status: BuyerStatus;
}

/* ─── Mock Data ─── */
const buyers: Buyer[] = [
  { name: "Superstar Inc", industry: "Manufacture", location: "Baton Rouge", totalOrders: "12 tons", totalGMV: "$12,900,000.00", status: "Active" },
  { name: "Galaxy Tech", industry: "Manufacture", location: "Austin", totalOrders: "10 tons", totalGMV: "$10,500,000.00", status: "Active" },
  { name: "Nova Solutions", industry: "Manufacture", location: "Miami", totalOrders: "15 tons", totalGMV: "$15,750,000.00", status: "Inactive" },
  { name: "Echo Innovations", industry: "Manufacture", location: "San Francisco", totalOrders: "8 tons", totalGMV: "$8,200,000.00", status: "Active" },
  { name: "Pioneer Enterprises", industry: "Manufacture", location: "Seattle", totalOrders: "20 tons", totalGMV: "$22,000,000.00", status: "Pending" },
  { name: "Aspect Robotics", industry: "Manufacture", location: "Chicago", totalOrders: "18 tons", totalGMV: "$18,600,000.00", status: "Active" },
  { name: "Quantum Dynamics", industry: "Manufacture", location: "Denver", totalOrders: "5 tons", totalGMV: "$5,000,000.00", status: "Inactive" },
  { name: "Vertex Industries", industry: "Manufacture", location: "Los Angeles", totalOrders: "14 tons", totalGMV: "$14,950,000.00", status: "Active" },
  { name: "Infinity Group", industry: "Manufacture", location: "Boston", totalOrders: "9 tons", totalGMV: "$9,300,000.00", status: "Active" },
  { name: "Stratosphere Corp", industry: "Manufacture", location: "Orlando", totalOrders: "11 tons", totalGMV: "$11,400,000.00", status: "Pending" },
  { name: "Superstar Inc", industry: "Manufacture", location: "Baton Rouge", totalOrders: "12 tons", totalGMV: "$12,900,000.00", status: "Active" },
  { name: "Galaxy Tech", industry: "Manufacture", location: "Austin", totalOrders: "10 tons", totalGMV: "$10,500,000.00", status: "Active" },
  { name: "Nova Solutions", industry: "Manufacture", location: "Miami", totalOrders: "15 tons", totalGMV: "$15,750,000.00", status: "Inactive" },
  { name: "Echo Innovations", industry: "Manufacture", location: "San Francisco", totalOrders: "8 tons", totalGMV: "$8,200,000.00", status: "Active" },
  { name: "Pioneer Enterprises", industry: "Manufacture", location: "Seattle", totalOrders: "20 tons", totalGMV: "$22,000,000.00", status: "Pending" },
  { name: "Aspect Robotics", industry: "Manufacture", location: "Chicago", totalOrders: "18 tons", totalGMV: "$18,600,000.00", status: "Active" },
  { name: "Quantum Dynamics", industry: "Manufacture", location: "Denver", totalOrders: "5 tons", totalGMV: "$5,000,000.00", status: "Inactive" },
  { name: "Vertex Industries", industry: "Manufacture", location: "Los Angeles", totalOrders: "14 tons", totalGMV: "$14,950,000.00", status: "Active" },
  { name: "Infinity Group", industry: "Manufacture", location: "Boston", totalOrders: "9 tons", totalGMV: "$9,300,000.00", status: "Active" },
  { name: "Stratosphere Corp", industry: "Manufacture", location: "Orlando", totalOrders: "11 tons", totalGMV: "$11,400,000.00", status: "Pending" },
];

function StatusBadge({ status }: { status: BuyerStatus }) {
  const styles: Record<BuyerStatus, string> = {
    Active: "bg-green-50 text-green-600",
    Inactive: "bg-amber-50 text-amber-600",
    Pending: "bg-amber-50 text-amber-600",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}>{status}</span>;
}

/* ─── Stats Cards ─── */
function StatsCards() {
  const stats = [
    { label: "Total Buyer", value: "243", icon: Settings2 },
    { label: "Active Buyers", value: "105", icon: DollarSign },
    { label: "Buyer Disputes", value: "3", icon: AlertTriangle },
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

/* ─── Buyer Detail: Overview Tab ─── */
function OverviewTab({ buyer }: { buyer: Buyer }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Orders", value: "40" },
          { label: "Total GMV", value: "$90,000,203" },
          { label: "Disputes Count", value: "2" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-1 rounded-xl px-4 py-3" style={{ border: "1px solid #F0F0F0" }}>
            <span className="text-xs text-neutral-500">{s.label}</span>
            <span className="text-lg font-bold text-neutral-900">{s.value}</span>
          </div>
        ))}
      </div>

      <section>
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Buyer Info</h3>
        <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
          <div className="grid grid-cols-2 gap-y-4">
            <div><p className="text-xs font-semibold text-neutral-500">Company Name</p><p className="text-sm text-neutral-900">{buyer.name}</p></div>
            <div><p className="text-xs font-semibold text-neutral-500">Legal Entity Type</p><p className="text-sm text-neutral-900">Manufacture</p></div>
            <div><p className="text-xs font-semibold text-neutral-500">Registration Number</p><p className="text-sm text-neutral-900">RG03760</p></div>
            <div><p className="text-xs font-semibold text-neutral-500">Contact Person</p><p className="text-sm text-neutral-900">William Smith</p></div>
            <div><p className="text-xs font-semibold text-neutral-500">Phone</p><p className="text-sm text-neutral-900">012345678910</p></div>
            <div><p className="text-xs font-semibold text-neutral-500">Business Email</p><p className="text-sm text-neutral-900">betadynamic@mail.com</p></div>
          </div>
          <div className="mt-4"><p className="text-xs font-semibold text-neutral-500">Location</p><p className="text-sm text-neutral-900">2012 Rue Beauregard, STE 202, Lafayette, LA 70508</p></div>
        </div>
      </section>
    </div>
  );
}

/* ─── Buyer Detail: Orders Tab ─── */
function OrdersTab() {
  const orders = [
    { id: "TS98765", product: "Oat Hull Animal Grade", qty: "123 lb", shipping: "Delivery", total: "$3,000.00", orderPlaced: "01/05/2027", status: "Completed" },
    { id: "TS98766", product: "Soybean Meal Animal Grade", qty: "50 lb", shipping: "Pickup", total: "$1,500.00", orderPlaced: "02/15/2027", status: "Completed" },
    { id: "TS98767", product: "Corn Gluten Feed", qty: "200 lb", shipping: "Delivery", total: "$2,200.00", orderPlaced: "03/10/2027", status: "Completed" },
    { id: "TS98768", product: "Beet Pulp Pellets", qty: "100 lb", shipping: "Pickup", total: "$1,800.00", orderPlaced: "04/01/2027", status: "Completed" },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr style={{ borderBottom: "1px solid #F0F0F0" }}>
            <th className="pb-3 text-left text-sm font-medium text-neutral-500">Order ID</th>
            <th className="pb-3 text-left text-sm font-medium text-neutral-500">Product</th>
            <th className="pb-3 text-left text-sm font-medium text-neutral-500">Qty</th>
            <th className="pb-3 text-left text-sm font-medium text-neutral-500">Shipping</th>
            <th className="pb-3 text-left text-sm font-medium text-neutral-500">Total</th>
            <th className="pb-3 text-left text-sm font-medium text-neutral-500">Order Placed</th>
            <th className="pb-3 text-left text-sm font-medium text-neutral-500">Status</th>
            <th className="pb-3"></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #F8F8F8" }}>
              <td className="py-3.5 text-sm text-neutral-900">{o.id}</td>
              <td className="py-3.5 text-sm text-neutral-700">{o.product}</td>
              <td className="py-3.5 text-sm text-neutral-700">{o.qty}</td>
              <td className="py-3.5 text-sm text-neutral-700">{o.shipping}</td>
              <td className="py-3.5 text-sm text-neutral-900">{o.total}</td>
              <td className="py-3.5 text-sm text-neutral-700">{o.orderPlaced}</td>
              <td className="py-3.5"><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">{o.status}</span></td>
              <td className="py-3.5"><button className="text-neutral-400 hover:text-neutral-700"><MoreHorizontal className="size-4" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Buyer Detail Drawer ─── */
function BuyerDetailDrawer({ buyer, onClose }: { buyer: Buyer; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"overview" | "orders">("overview");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-[720px] flex-col overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 bg-white px-6 pt-5 pb-0" style={{ borderBottom: "1px solid #F0F0F0" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-neutral-900">{buyer.name}</h2>
                <StatusBadge status={buyer.status} />
              </div>
              <p className="text-sm text-neutral-500">Since 12/12/2026</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><MoreHorizontal className="size-5 text-neutral-500" /></button>
              <button onClick={onClose} className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><X className="size-5 text-neutral-500" /></button>
            </div>
          </div>
          <div className="flex gap-6">
            {([{ key: "overview", label: "Overview" }, { key: "orders", label: "Orders" }] as const).map((tab) => (
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
          {activeTab === "overview" && <OverviewTab buyer={buyer} />}
          {activeTab === "orders" && <OrdersTab />}
        </div>
      </div>
    </div>
  );
}

/* ─── Add Buyer Drawer ─── */
function AddBuyerDrawer({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    industry: "",
    registrationNumber: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    notes: "",
  });
  const [step, setStep] = useState<1 | 2>(1);
  const [submitted, setSubmitted] = useState(false);

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const step1Valid =
    formData.companyName.trim() &&
    formData.contactPerson.trim() &&
    formData.email.trim() &&
    formData.phone.trim();

  const step2Valid =
    formData.city.trim() && formData.state.trim() && formData.country.trim();

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const industries = [
    { value: "manufacture", label: "Manufacture" },
    { value: "distributor", label: "Distributor" },
    { value: "recycler", label: "Recycler" },
    { value: "processor", label: "Processor" },
    { value: "other", label: "Other" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-[560px] flex-col bg-white shadow-xl">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid #F0F0F0" }}
        >
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Add New Buyer</h2>
            <p className="text-sm text-neutral-500">
              {submitted
                ? "Buyer created successfully"
                : step === 1
                  ? "Step 1 of 2 — Company & Contact"
                  : "Step 2 of 2 — Location & Details"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"
          >
            <X className="size-5 text-neutral-500" />
          </button>
        </div>

        {submitted ? (
          /* ─── Success State ─── */
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-50">
              <svg className="size-8 text-green-600" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-neutral-900">Buyer Added</h3>
              <p className="mt-2 text-neutral-500">
                {formData.companyName} has been added as a new buyer
                <br />
                with status set to <span className="font-medium text-amber-600">Pending Verification</span>.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" size="md" onClick={onClose}>
                Back to Buyers
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setFormData({ companyName: "", contactPerson: "", email: "", phone: "", industry: "", registrationNumber: "", street: "", city: "", state: "", zipCode: "", country: "", notes: "" });
                  setStep(1);
                  setSubmitted(false);
                }}
              >
                Add Another
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Step indicators */}
            <div className="flex gap-2 px-6 pt-5">
              <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-neutral-900" : "bg-neutral-200"}`} />
              <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-neutral-900" : "bg-neutral-200"}`} />
            </div>

            {/* Form content */}
            <div className="flex-1 overflow-y-auto p-6">
              {step === 1 ? (
                <div className="flex flex-col gap-5">
                  <Input
                    label="Company Name"
                    id="companyName"

                    value={formData.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                  />
                  <Input
                    label="Contact Person"
                    id="contactPerson"

                    value={formData.contactPerson}
                    onChange={(e) => update("contactPerson", e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Business Email"
                      id="email"
                      type="email"

                      value={formData.email}
                      onChange={(e) => update("email", e.target.value)}
                    />
                    <Input
                      label="Phone Number"
                      id="phone"
                      type="tel"

                      value={formData.phone}
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </div>
                  <Select
                    label="Industry"
                    id="industry"
                    options={industries}
                    value={formData.industry}
                    onChange={(e) => update("industry", e.target.value)}
                  />
                  <Input
                    label="Registration Number"
                    id="registrationNumber"

                    value={formData.registrationNumber}
                    onChange={(e) => update("registrationNumber", e.target.value)}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <Input
                    label="Street Address"
                    id="street"

                    value={formData.street}
                    onChange={(e) => update("street", e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="City"
                      id="city"

                      value={formData.city}
                      onChange={(e) => update("city", e.target.value)}
                    />
                    <Input
                      label="State"
                      id="state"

                      value={formData.state}
                      onChange={(e) => update("state", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="ZIP Code"
                      id="zipCode"

                      value={formData.zipCode}
                      onChange={(e) => update("zipCode", e.target.value)}
                    />
                    <Input
                      label="Country"
                      id="country"

                      value={formData.country}
                      onChange={(e) => update("country", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-neutral-900">
                      Notes <span className="text-neutral-400">(optional)</span>
                    </label>
                    <textarea
                      rows={4}

                      value={formData.notes}
                      onChange={(e) => update("notes", e.target.value)}
                      className="w-full rounded-lg px-4 py-3 text-sm outline-none placeholder:text-neutral-400 resize-none"
                      style={{ border: "1px solid #E0E0E0" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderTop: "1px solid #F0F0F0" }}
            >
              {step === 2 ? (
                <button
                  onClick={() => setStep(1)}
                  className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
                >
                  Back
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
                >
                  Cancel
                </button>
              )}
              {step === 1 ? (
                <Button
                  variant="primary"
                  size="md"
                  disabled={!step1Valid}
                  style={!step1Valid ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                  onClick={() => setStep(2)}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  disabled={!step2Valid}
                  style={!step2Valid ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                  onClick={handleSubmit}
                >
                  Create Buyer
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Main Buyers Page ─── */
export function AdminBuyersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [showAddBuyer, setShowAddBuyer] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <h1 className="text-2xl font-bold text-neutral-900">Buyers</h1>
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
          <Button variant="primary" size="md" onClick={() => setShowAddBuyer(true)}>Add Buyer</Button>
        </div>
      </div>

      <div className="px-6 pb-5"><StatsCards /></div>

      <div className="flex-1 overflow-x-auto px-6">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="text-left" style={{ borderBottom: "1px solid #F0F0F0" }}>
              <th className="pb-3 text-sm font-medium text-neutral-500">Buyer Name</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Industry</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Location</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Total Orders</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Total GMV</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Status</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody>
            {buyers.map((buyer, i) => (
              <tr key={i} className="cursor-pointer transition-colors hover:bg-neutral-50" style={{ borderBottom: "1px solid #F8F8F8" }} onClick={() => setSelectedBuyer(buyer)}>
                <td className="py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600">A</div>
                    <span className="text-sm text-neutral-900">{buyer.name}</span>
                  </div>
                </td>
                <td className="py-3.5 text-sm text-neutral-700">{buyer.industry}</td>
                <td className="py-3.5 text-sm text-neutral-700">{buyer.location}</td>
                <td className="py-3.5 text-sm text-neutral-700">{buyer.totalOrders}</td>
                <td className="py-3.5 text-sm text-neutral-900">{buyer.totalGMV}</td>
                <td className="py-3.5"><StatusBadge status={buyer.status} /></td>
                <td className="py-3.5"><button className="text-neutral-400 hover:text-neutral-700"><MoreHorizontal className="size-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      {selectedBuyer && <BuyerDetailDrawer buyer={selectedBuyer} onClose={() => setSelectedBuyer(null)} />}
      {showAddBuyer && <AddBuyerDrawer onClose={() => setShowAddBuyer(false)} />}
    </div>
  );
}
