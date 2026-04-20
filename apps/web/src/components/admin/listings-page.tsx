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
  FileText,
  Download,
} from "lucide-react";
import { Button } from "@eco-globe/ui";
import { ListingMap } from "../public/listing-map";

/* ─── Types ─── */
type ListingStatus = "Pending" | "Active";

interface Listing {
  id: string;
  product: string;
  category: string;
  seller: string;
  pricePerTon: string;
  availableQty: string;
  moq: string;
  grade: string;
  carbonData: string;
  createdDate: string;
  status: ListingStatus;
}

/* ─── Mock Data ─── */
const listings: Listing[] = [
  { id: "LS98766", product: "Bio-Based Polypropylene Gra...", category: "Plastic", seller: "EcoPlastics Inc.", pricePerTon: "$150.00", availableQty: "1800 ton", moq: "2 ton", grade: "Standard", carbonData: "Yes", createdDate: "02/15/2027", status: "Pending" },
  { id: "LS98767", product: "Compostable Polylactic Acid", category: "Bioplastic", seller: "GreenCycle Solutions", pricePerTon: "$200.00", availableQty: "1200 ton", moq: "2 ton", grade: "Premium", carbonData: "Yes", createdDate: "03/01/2027", status: "Pending" },
  { id: "LS98768", product: "Recycled High-Density Polyet...", category: "Plastic", seller: "PureCycle Technologies", pricePerTon: "$90.00", availableQty: "2200 ton", moq: "2 ton", grade: "Standard", carbonData: "Yes", createdDate: "04/10/2027", status: "Pending" },
  { id: "LS98769", product: "Plant-Based Polyurethane", category: "Bioplastic", seller: "Renewable Materials Co.", pricePerTon: "$250.00", availableQty: "1500 ton", moq: "2 ton", grade: "Premium", carbonData: "Yes", createdDate: "05/20/2027", status: "Pending" },
  { id: "LS98770", product: "Biodegradable Polyvinyl Chlor...", category: "Plastic", seller: "EcoFriendly PVC Corp.", pricePerTon: "$180.00", availableQty: "2000 ton", moq: "2 ton", grade: "Standard", carbonData: "Yes", createdDate: "06/30/2027", status: "Active" },
  { id: "LS98771", product: "Recycled Polypropylene", category: "Plastic", seller: "Park world", pricePerTon: "$120.00", availableQty: "1600 ton", moq: "2 ton", grade: "Standard", carbonData: "Yes", createdDate: "07/15/2027", status: "Active" },
  { id: "LS98772", product: "Natural Fiber Composite", category: "Composite", seller: "BioMaterials Group", pricePerTon: "$300.00", availableQty: "1000 ton", moq: "2 ton", grade: "Premium", carbonData: "Yes", createdDate: "08/05/2027", status: "Active" },
  { id: "LS98773", product: "Sustainable Wood Flour", category: "Wood", seller: "EcoWood Industries", pricePerTon: "$70.00", availableQty: "500 ton", moq: "2 ton", grade: "Standard", carbonData: "Yes", createdDate: "09/12/2027", status: "Active" },
  { id: "LS98774", product: "Recycled Nylon", category: "Fiber", seller: "Nylon Reclaim Co.", pricePerTon: "$220.00", availableQty: "900 ton", moq: "2 ton", grade: "Premium", carbonData: "Yes", createdDate: "10/20/2027", status: "Active" },
  { id: "LS98775", product: "Eco-Friendly Resin", category: "Resin", seller: "Sustainable PolyResin", pricePerTon: "$160.00", availableQty: "700 ton", moq: "2 ton", grade: "Standard", carbonData: "Yes", createdDate: "11/01/2027", status: "Active" },
  { id: "LS98776", product: "Thermoplastic Starch", category: "Bioplastic", seller: "NatureWorks LLC", pricePerTon: "$145.00", availableQty: "1100 ton", moq: "2 ton", grade: "Standard", carbonData: "Yes", createdDate: "12/15/2027", status: "Active" },
  { id: "LS98777", product: "Green Polyethylene", category: "Plastic", seller: "BioGreen Industries", pricePerTon: "$130.00", availableQty: "1300 ton", moq: "2 ton", grade: "Standard", carbonData: "Yes", createdDate: "01/25/2028", status: "Active" },
  { id: "LS98778", product: "Recycled PETG", category: "Plastic", seller: "Circular Plastics", pricePerTon: "$190.00", availableQty: "800 ton", moq: "2 ton", grade: "Premium", carbonData: "Yes", createdDate: "02/20/2028", status: "Active" },
  { id: "LS98779", product: "Wood Biocomposite", category: "Composite", seller: "WoodEco Solutions", pricePerTon: "$210.00", availableQty: "650 ton", moq: "2 ton", grade: "Premium", carbonData: "Yes", createdDate: "03/15/2028", status: "Active" },
  { id: "LS98780", product: "Plant-Based PET", category: "Plastic", seller: "EnviroPlast Corp.", pricePerTon: "$240.00", availableQty: "900 ton", moq: "2 ton", grade: "Premium", carbonData: "Yes", createdDate: "04/25/2028", status: "Active" },
  { id: "LS98781", product: "Recycled Biodegradable Plast...", category: "Plastic", seller: "Compost Plastics Co.", pricePerTon: "$115.00", availableQty: "850 ton", moq: "2 ton", grade: "Standard", carbonData: "Yes", createdDate: "05/30/2028", status: "Active" },
  { id: "LS98782", product: "Eco-Friendly Coating", category: "Coating", seller: "BioFinish Technologies", pricePerTon: "$130.00", availableQty: "400 ton", moq: "2 ton", grade: "Standard", carbonData: "Yes", createdDate: "06/10/2028", status: "Active" },
  { id: "LS98783", product: "Sustainable Foam", category: "Foam", seller: "GreenFoam Innovations", pricePerTon: "$170.00", availableQty: "600 ton", moq: "2 ton", grade: "Standard", carbonData: "Yes", createdDate: "07/20/2028", status: "Active" },
  { id: "LS98784", product: "Organic Cotton Fiber", category: "Fiber", seller: "EcoTextiles Ltd.", pricePerTon: "$140.00", availableQty: "300 ton", moq: "2 ton", grade: "Standard", carbonData: "Yes", createdDate: "08/15/2028", status: "Active" },
  { id: "LS98785", product: "Sustainable Ink", category: "Ink", seller: "GreenPrint Co.", pricePerTon: "$90.00", availableQty: "250 ton", moq: "2 ton", grade: "Standard", carbonData: "Yes", createdDate: "09/30/2028", status: "Active" },
];

function StatusBadge({ status }: { status: ListingStatus }) {
  const styles: Record<ListingStatus, string> = {
    Pending: "bg-neutral-100 text-neutral-600",
    Active: "bg-green-50 text-green-600",
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
    { label: "Total listings", value: "148", icon: Settings2 },
    { label: "Active Listings", value: "45", icon: Settings2 },
    { label: "Pending Approval", value: "4", icon: AlertTriangle },
    { label: "Flagged Products", value: "23", icon: AlertTriangle },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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

        {/* Price */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Price</h4>
          {/* Mini bar chart visualization */}
          <div className="mb-3 flex h-12 items-end gap-0.5">
            {[3,5,8,6,4,7,9,5,3,6,8,7,4,5,9,6,3,7,8,5,4,6,7,3,5,8,6,4,7,5].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm bg-green-400" style={{ height: `${h * 10}%` }} />
            ))}
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2.5" style={{ border: "1px solid #E0E0E0" }}>
              <span className="text-sm text-neutral-400">$</span>
              <input type="text" className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400" />
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2.5" style={{ border: "1px solid #E0E0E0" }}>
              <span className="text-sm text-neutral-400">$</span>
              <input type="text" defaultValue="340" className="w-full bg-transparent text-sm outline-none" />
            </div>
          </div>
        </div>

        {/* Quantity Available */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Quantity Available</h4>
          <div className="flex gap-3">
            <input type="text" className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400" style={{ border: "1px solid #E0E0E0" }} />
            <input type="text" className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400" style={{ border: "1px solid #E0E0E0" }} />
          </div>
        </div>

        {/* Carbon data */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Carbon data</h4>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4 rounded border-neutral-300" /> Yes</label>
            <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4 rounded border-neutral-300" /> No</label>
          </div>
        </div>

        {/* Grade */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Grade</h4>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" defaultChecked className="size-4 rounded border-neutral-300 accent-neutral-900" /> Standard</label>
            <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="size-4 rounded border-neutral-300" /> Great</label>
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

/* ─── Listing Detail Drawer ─── */
function ListingDetailDrawer({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const images = ["/hero.jpg", "/hero.jpg", "/hero.jpg", "/hero.jpg", "/hero.jpg", "/hero.jpg", "/hero.jpg"];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-[680px] flex-col overflow-y-auto bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-6 py-4" style={{ borderBottom: "1px solid #F0F0F0" }}>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-neutral-900">Wood Sawdust Industrial Grade A</h2>
              <StatusBadge status={listing.status} />
            </div>
            <p className="text-sm text-neutral-500">{listing.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><MoreHorizontal className="size-5 text-neutral-500" /></button>
            <button onClick={onClose} className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><X className="size-5 text-neutral-500" /></button>
          </div>
        </div>

        <div className="flex flex-col gap-6 p-6">
          {/* Product Information */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Product Information</h3>
            <div className="grid grid-cols-2 gap-y-4 rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
              <div><p className="text-xs font-semibold text-neutral-500">Listing ID</p><p className="text-sm text-neutral-900">{listing.id}</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Product name</p><p className="text-sm text-neutral-900">Wood Sawdust Industrial Grade A</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Price/ton</p><p className="text-sm text-neutral-900">{listing.pricePerTon}</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Available Qty</p><p className="text-sm text-neutral-900">{listing.availableQty}</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">MOQ</p><p className="text-sm text-neutral-900">3 ton</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Grade</p><p className="text-sm text-neutral-900">{listing.grade}</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Carbon Data</p><p className="text-sm text-neutral-900">300 kg CO₂e</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Created Date</p><p className="text-sm text-neutral-900">{listing.createdDate}</p></div>
            </div>
          </section>

          {/* Seller Info */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Seller Info</h3>
            <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
              <div className="grid grid-cols-2 gap-y-4">
                <div><p className="text-xs font-semibold text-neutral-500">Seller</p><p className="text-sm text-neutral-900">AgriCorp Solutions</p></div>
                <div><p className="text-xs font-semibold text-neutral-500">Contact person</p><p className="text-sm text-neutral-900">Will Smith</p></div>
                <div><p className="text-xs font-semibold text-neutral-500">Phone number</p><p className="text-sm text-neutral-900">012345678910</p></div>
                <div><p className="text-xs font-semibold text-neutral-500">Email</p><p className="text-sm text-neutral-900">example@mail.com</p></div>
              </div>
              <div className="mt-4"><p className="text-xs font-semibold text-neutral-500">Address</p><p className="text-sm text-neutral-900">2012 Rue Beauregard, STE 202, Lafayette, LA 70508</p></div>
            </div>
          </section>

          {/* Images */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Image</h3>
            <div className="flex gap-3 overflow-x-auto rounded-xl p-4" style={{ border: "1px solid #F0F0F0" }}>
              {images.map((img, i) => (
                <div key={i} className="size-20 shrink-0 overflow-hidden rounded-lg">
                  <img src={img} alt="" className="size-full object-cover" />
                </div>
              ))}
            </div>
          </section>

          {/* Specifications */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Specifications</h3>
            <div className="grid grid-cols-2 gap-y-4 rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
              <div><p className="text-xs font-semibold text-neutral-500">Storage Type</p><p className="text-sm text-neutral-900">In dry place</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Specification</p><p className="text-sm text-neutral-900">Export Standard</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Shelf Life</p><p className="text-sm text-neutral-900">12 months</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Composition</p><p className="text-sm text-neutral-900">Rice Husk</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Address</p><p className="text-sm text-neutral-900">Denham Springs, LA</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Manufacturer</p><p className="text-sm text-neutral-900">Denham Springs, LA</p></div>
            </div>
          </section>

          {/* Overview */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Overview</h3>
            <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
              <p className="text-sm leading-relaxed text-neutral-700">
                Premium quality wood sawdust sourced from sustainably managed forests. Ideal for industrial applications including biomass energy production, composite manufacturing, and agricultural bedding. Our sawdust meets export-grade standards with consistent particle size and low moisture content.
              </p>
              <button className="mt-2 text-sm font-semibold text-neutral-900 underline">Read More</button>
            </div>
          </section>

          {/* Map */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Maps</h3>
            <div className="h-[250px] overflow-hidden rounded-xl">
              <ListingMap />
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
        </div>
      </div>
    </div>
  );
}

/* ─── Main Listings Page ─── */
export function AdminListingsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <h1 className="text-2xl font-bold text-neutral-900">Listings</h1>
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
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 pb-5">
        <StatsCards />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto px-6">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr className="text-left" style={{ borderBottom: "1px solid #F0F0F0" }}>
              <th className="pb-3 text-sm font-medium text-neutral-500">Listing ID</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Product</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Category</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Seller</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Price/ton</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Available Qty</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Status</th>
              <th className="pb-3 text-sm font-medium text-neutral-500"></th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.id} className="cursor-pointer transition-colors hover:bg-neutral-50" style={{ borderBottom: "1px solid #F8F8F8" }} onClick={() => setSelectedListing(listing)}>
                <td className="py-3.5 text-sm text-neutral-900">{listing.id}</td>
                <td className="py-3.5 text-sm text-neutral-900 max-w-[220px] truncate">{listing.product}</td>
                <td className="py-3.5 text-sm text-neutral-700">{listing.category}</td>
                <td className="py-3.5 text-sm text-neutral-700">{listing.seller}</td>
                <td className="py-3.5 text-sm text-neutral-900">{listing.pricePerTon}</td>
                <td className="py-3.5 text-sm text-neutral-700">{listing.availableQty}</td>
                <td className="py-3.5"><StatusBadge status={listing.status} /></td>
                <td className="py-3.5"><button className="text-neutral-400 hover:text-neutral-700"><MoreHorizontal className="size-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid #F0F0F0" }}>
        <div className="flex items-center gap-1">
          <button className="flex size-8 items-center justify-center rounded text-neutral-400 hover:text-neutral-700"><ChevronLeft className="size-4" /></button>
          {[1, 2, 3, "...", 15].map((page, i) => (
            <button key={i} className={`flex size-8 items-center justify-center rounded text-sm ${page === currentPage ? "bg-neutral-900 font-medium text-white" : "text-neutral-500 hover:bg-neutral-100"}`} onClick={() => typeof page === "number" && setCurrentPage(page)}>{page}</button>
          ))}
          <button className="flex size-8 items-center justify-center rounded text-neutral-400 hover:text-neutral-700"><ChevronRight className="size-4" /></button>
        </div>
        <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-500" style={{ border: "1px solid #E0E0E0" }}>20 / page <ChevronDown className="size-3.5" /></button>
      </div>

      {/* Listing Detail Drawer */}
      {selectedListing && <ListingDetailDrawer listing={selectedListing} onClose={() => setSelectedListing(null)} />}
    </div>
  );
}
