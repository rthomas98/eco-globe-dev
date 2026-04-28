"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, LayoutGrid, List, SlidersHorizontal, Info, ChevronRight, MoreHorizontal, X, ChevronDown } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";
import { ListingMap } from "../public/listing-map";
import { useCustomListings } from "@/lib/custom-listings";

type ListingStatus = "Draft" | "Pending" | "Approved";
type Sustainability = "Verified" | "Partial";

interface Listing {
  name: string; id: string; category: string; available: number; price: string;
  sustainability: Sustainability; status: ListingStatus; location: string; image: string;
}

const listings: Listing[] = [
  { name: "Wood Sawdust Industrial High Quality", id: "EG-PROD-00023", category: "Polymer", available: 3500, price: "$400/ton", sustainability: "Verified", status: "Draft", location: "Baton Rouge, LA", image: "/products/wood-chips.png" },
  { name: "Household Cleaning Tools & Accessories Wood Chips Shavings Sawdust for Effective Cleaning", id: "EG-PROD-00024", category: "Refinery", available: 1400, price: "$400/ton", sustainability: "Verified", status: "Pending", location: "Lake Charles, LA", image: "/products/wood-shavings.png" },
  { name: "Natural Rutile Sand Concentrate 90%/95% TiO2 Wholesale for Titanium", id: "EG-PROD-00025", category: "Waste", available: 2000, price: "$400/ton", sustainability: "Verified", status: "Approved", location: "New Orleans, LA", image: "/products/rutile-sand.png" },
  { name: "Natural Zeolite Powder for Barn Odor Control, Ammonia Absorber", id: "EG-PROD-00026", category: "Plastic", available: 1700, price: "$400/ton", sustainability: "Partial", status: "Approved", location: "Monroe, LA", image: "/products/zeolite-powder.png" },
  { name: "Molecular Sieve Zeolite 13X for Drying Petrochemical Feedstocks of...", id: "EG-PROD-00027", category: "Plastic", available: 2300, price: "$400/ton", sustainability: "Partial", status: "Approved", location: "Shreveport, LA", image: "/products/molecular-sieve.png" },
  { name: "CBO Coal Tar Carbon Black Oil Feedstock", id: "EG-PROD-00028", category: "Plastic", available: 2300, price: "$400/ton", sustainability: "Partial", status: "Approved", location: "Lafayette, LA", image: "/products/coal-tar.png" },
  { name: "Granules Polypropylene Factory Plastic Raw Material Pellets", id: "EG-PROD-00029", category: "Plastic", available: 200, price: "$400/ton", sustainability: "Verified", status: "Approved", location: "Baton Rouge, LA", image: "/products/red-granules.png" },
];

function StatusBadge({ status }: { status: ListingStatus }) {
  const s: Record<ListingStatus, string> = { Draft: "bg-neutral-100 text-neutral-600", Pending: "bg-amber-50 text-amber-600", Approved: "bg-green-50 text-green-600" };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${s[status]}`}>{status}</span>;
}

function SustainabilityDot({ type }: { type: Sustainability }) {
  return <span className="flex items-center gap-1.5 text-sm text-neutral-700"><span className={`size-2 rounded-full ${type === "Verified" ? "bg-green-500" : "bg-amber-500"}`} />{type}</span>;
}

/* ─── Listing Detail Drawer ─── */
function ListingDetailDrawer({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const [tab, setTab] = useState<"overview" | "documents" | "activity">("overview");
  const images = ["/hero.jpg", "/hero.jpg", "/hero.jpg", "/hero.jpg", "/hero.jpg", "/hero.jpg", "/hero.jpg"];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-[720px] flex-col overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 bg-white px-6 pt-5 pb-0" style={{ borderBottom: "1px solid #F0F0F0" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="size-10 shrink-0 overflow-hidden rounded-lg"><img src={listing.image} alt="" className="size-full object-cover" /></div>
              <div>
                <div className="flex items-center gap-2"><h2 className="text-lg font-bold text-neutral-900">{listing.name}</h2><StatusBadge status={listing.status} /></div>
                <p className="text-xs text-neutral-500">{listing.location} · Delivery in 48 hrs · <span className="rounded bg-neutral-100 px-1.5 py-0.5">600 tons available</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><MoreHorizontal className="size-5 text-neutral-500" /></button>
              <button onClick={onClose} className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><X className="size-5 text-neutral-500" /></button>
            </div>
          </div>
          <div className="flex gap-6">
            {(["overview", "documents", "activity"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`pb-3 text-sm font-medium capitalize ${tab === t ? "text-neutral-900 border-b-2 border-neutral-900" : "text-neutral-400"}`}>
                {t === "activity" ? "Activity Log" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="p-6">
          {tab === "overview" && (
            <div className="flex flex-col gap-6">
              <section>
                <h3 className="mb-4 text-lg font-semibold text-neutral-900">Listing Info</h3>
                <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
                  <div className="grid grid-cols-2 gap-y-4 mb-4">
                    <div><p className="text-xs font-semibold text-neutral-500">Listing category</p><p className="text-sm text-neutral-900">Manufacture</p></div>
                    <div><p className="text-xs font-semibold text-neutral-500">Listing price</p><p className="text-sm text-neutral-900">$190-220</p></div>
                  </div>
                  <div className="flex gap-3 overflow-x-auto">
                    {images.map((img, i) => <div key={i} className="size-20 shrink-0 overflow-hidden rounded-lg"><img src={img} alt="" className="size-full object-cover" /></div>)}
                  </div>
                </div>
              </section>
              <section>
                <h3 className="mb-4 text-lg font-semibold text-neutral-900">Specifications</h3>
                <div className="grid grid-cols-2 gap-y-4 rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
                  {[["Material composition", "Rice Husk"], ["Listing type", "Dried"], ["Grade / purity", "Export Standard"], ["Color", "Natural Wood Color"], ["Shelf Life", "12 months"], ["Storage & handling", "In dry place"], ["Package", "123 lb/PP Bag"], ["Weight", "123 lb"], ["Usage", "Paper-making Industry"], ["Place of Origin", "Baton Rouge, LA"]].map(([k, v]) => (
                    <div key={k}><p className="text-xs font-semibold text-neutral-500">{k}</p><p className="text-sm text-neutral-900">{v}</p></div>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="mb-4 text-lg font-semibold text-neutral-900">Description</h3>
                <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
                  <p className="text-sm leading-relaxed text-neutral-700">Verified industrial feedstock with documented composition, certified origin, and full chain-of-custody from facility to delivery. Buyers receive an SDS, an availability window, and the option to run a transportation footprint estimate before committing.</p>
                  <button className="mt-2 text-sm font-bold text-neutral-900 underline">Read More</button>
                </div>
              </section>
              <section>
                <h3 className="mb-4 text-lg font-semibold text-neutral-900">Location</h3>
                <div className="h-[300px] overflow-hidden rounded-xl"><ListingMap /></div>
              </section>
              <section>
                <h3 className="mb-4 text-lg font-semibold text-neutral-900">Carbon Analytics</h3>
                <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
                  <div className="grid grid-cols-2 gap-y-4">
                    <div><p className="text-xs font-semibold text-neutral-500">Carbon footprint</p><p className="text-sm text-neutral-900">300 kg CO₂e/ton</p></div>
                    <div><p className="text-xs font-semibold text-neutral-500">Certification</p><p className="text-sm text-neutral-900">GRS Verified</p></div>
                  </div>
                </div>
              </section>
            </div>
          )}
          {tab === "documents" && (
            <div className="flex flex-col gap-3">
              {["Invoice_WoodSawdust_00023.pdf", "Carbon_Certificate_00023.pdf", "Bill_of_Lading_00023.pdf"].map((doc) => (
                <div key={doc} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ border: "1px solid #F0F0F0" }}>
                  <span className="text-sm text-neutral-900">{doc}</span>
                  <button className="text-neutral-400"><MoreHorizontal className="size-4" /></button>
                </div>
              ))}
            </div>
          )}
          {tab === "activity" && (
            <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
              {[{ e: "Listing created", d: "Jan 15, 2027 10:00 AM", a: true }, { e: "Submitted for review", d: "Jan 15, 2027 10:05 AM", a: true }, { e: "Admin approved", d: "Jan 16, 2027 9:00 AM", a: true }, { e: "Published to marketplace", d: "", a: false }, { e: "First inquiry received", d: "", a: false }].map((item, i, arr) => (
                <div key={item.e} className="flex gap-4">
                  <div className="flex flex-col items-center"><div className={`size-3 rounded-full ${item.a ? "bg-green-500" : "bg-neutral-300"}`} />{i < arr.length - 1 && <div className={`w-0.5 flex-1 ${item.a && arr[i + 1]?.a ? "bg-green-500" : "bg-neutral-200"}`} />}</div>
                  <div className="flex flex-1 items-center justify-between pb-5"><span className={`text-sm ${item.a ? "font-medium text-neutral-900" : "text-neutral-400"}`}>{item.e}</span>{item.d && <span className="text-xs text-neutral-500">{item.d}</span>}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Card View ─── */
function CardView({ listings, onSelect }: { listings: Listing[]; onSelect: (l: Listing) => void }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {listings.map((l, i) => (
        <div key={i} className="cursor-pointer overflow-hidden rounded-xl transition-shadow hover:shadow-md" onClick={() => onSelect(l)}>
          <div className="h-48 overflow-hidden"><img src={l.image} alt="" className="size-full object-cover" /></div>
          <div className="p-4">
            <h3 className="mb-1 text-sm font-semibold text-neutral-900 line-clamp-2">{l.name}</h3>
            <p className="mb-2 text-xs text-neutral-500">{l.location} · <SustainabilityDot type={l.sustainability} /></p>
            <span className="mb-3 inline-block rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{l.available} tons available</span>
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-neutral-900">{l.price.replace("/ton", "")} <span className="text-xs font-normal text-neutral-400">/ton</span></p>
              <StatusBadge status={l.status} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ─── */
export function ListingsPage() {
  const [view, setView] = useState<"list" | "card">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const customListings = useCustomListings();

  const merged = useMemo<Listing[]>(
    () => [
      ...customListings.map<Listing>((c) => ({
        name: c.title,
        id: `EG-${c.id.slice(-5).toUpperCase()}`,
        category: c.category,
        available: c.qtyNum,
        price: `${c.price}${c.unit}`,
        sustainability: "Verified",
        status: "Pending",
        location: c.location,
        image: c.image,
      })),
      ...listings,
    ],
    [customListings],
  );

  const filtered = merged.filter((l) => !searchQuery.trim() || l.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const pendingCount = merged.filter((l) => l.status === "Pending").length;

  return (
    <SellerLayout title="Listings">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h1 className="text-2xl font-bold text-neutral-900">Listings</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2" style={{ border: "1px solid #F0F0F0" }}>
            <Search className="size-4 text-neutral-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-400" />
          </div>
          <div className="flex items-center gap-2 rounded-full px-3 py-2" style={{ border: "1px solid #F0F0F0" }}>
            <button onClick={() => setView(view === "list" ? "card" : "list")} className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              {view === "list" ? <><LayoutGrid className="size-4" /> Card View</> : <><List className="size-4" /> List View</>}
            </button>
            <ChevronDown className="size-4 text-neutral-400" />
          </div>
          <button className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-neutral-700" style={{ border: "1px solid #F0F0F0" }}>
            <SlidersHorizontal className="size-4" /> Filters
          </button>
          <Link href="/seller/listings/add"><Button variant="primary" size="md">Add Listing</Button></Link>
        </div>
      </div>

      {/* Pending banner */}
      {pendingCount > 0 && (
        <div className="mb-5 flex items-center justify-between rounded-xl bg-blue-50 px-5 py-3">
          <div className="flex items-center gap-3">
            <Info className="size-5 text-blue-500" />
            <span className="text-sm text-neutral-700">{pendingCount} Listing pending approval</span>
          </div>
          <ChevronRight className="size-4 text-neutral-400" />
        </div>
      )}

      {view === "list" ? (
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="text-left" style={{ borderBottom: "1px solid #F0F0F0" }}>
              <th className="pb-3 text-sm font-medium text-neutral-500">Listing Name</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Category</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Available</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Price</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Sustainability</th>
              <th className="pb-3 text-sm font-medium text-neutral-500">Status</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l, i) => (
              <tr key={i} className="cursor-pointer hover:bg-neutral-50" style={{ borderBottom: "1px solid #F8F8F8" }} onClick={() => setSelectedListing(l)}>
                <td className="py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="size-10 shrink-0 overflow-hidden rounded-lg"><img src={l.image} alt="" className="size-full object-cover" /></div>
                    <div><p className="text-sm font-medium text-neutral-900 max-w-[300px] truncate">{l.name}</p><p className="text-xs text-neutral-400">{l.id}</p></div>
                  </div>
                </td>
                <td className="py-3.5 text-sm text-neutral-700">{l.category}</td>
                <td className="py-3.5 text-sm text-neutral-700">{l.available.toLocaleString()}</td>
                <td className="py-3.5 text-sm text-neutral-900">{l.price}</td>
                <td className="py-3.5"><SustainabilityDot type={l.sustainability} /></td>
                <td className="py-3.5"><StatusBadge status={l.status} /></td>
                <td className="py-3.5"><button className="text-neutral-400"><MoreHorizontal className="size-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <CardView listings={filtered} onSelect={setSelectedListing} />
      )}

      {selectedListing && <ListingDetailDrawer listing={selectedListing} onClose={() => setSelectedListing(null)} />}
    </SellerLayout>
  );
}
