"use client";

import { Search, LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";

const mockListings = [
  { name: "Wood Sawdust Industrial High Quality", category: "Polymer", available: 2300, price: "$230/ton", sustainability: "A verified", status: "Active" as const },
  { name: "Recarpeted Cleaning Tools & Accessories Who...", category: "Refining", available: 1600, price: "$800/ton", sustainability: "A Pro-Rec", status: "Active" as const },
  { name: "Natural Textile Semi-Concentrate REVERA 15...", category: "Worn-S", available: 8000, price: "$485/ton", sustainability: "A verified", status: "Pending" as const },
  { name: "Natural Volatile Powder for Bio Celery Contro...", category: "Plastics", available: 4500, price: "$440/ton", sustainability: "A Pro-Sol", status: "Draft" as const },
  { name: "Metalic-like Steel Double 6th Of Sterling For El...", category: "Plastics", available: 3000, price: "$500/ton", sustainability: "A Pro-Sol", status: "Active" as const },
  { name: "CBS-Corp 14r Carbon Deca Of Petroleum o...", category: "Plastics", available: 1200, price: "$443/ton", sustainability: "A Pro-Sut", status: "Active" as const },
  { name: "Synectics Polypropylene Factory / Plastic Ble...", category: "Polyol", available: 300, price: "$443/ton", sustainability: "A Verified", status: "Draft" as const },
];

function StatusBadge({ status }: { status: "Active" | "Pending" | "Draft" }) {
  const styles = {
    Active: "bg-green-100 text-green-800",
    Pending: "bg-yellow-100 text-yellow-800",
    Draft: "bg-neutral-200 text-neutral-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

export function ListingsPage() {
  return (
    <SellerLayout title="Listings">
      <div className="flex flex-col gap-6">
        {/* Header row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2" style={{ border: "1px solid #E0E0E0" }}>
              <Search className="size-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Search listings..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500 sm:w-48"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg" style={{ border: "1px solid #E0E0E0" }}>
                <button className="flex items-center gap-1 bg-neutral-900 px-3 py-2 text-xs font-medium text-white first:rounded-l-lg">
                  <List className="size-3.5" /> List View
                </button>
                <button className="flex items-center gap-1 bg-white px-3 py-2 text-xs font-medium text-neutral-700 last:rounded-r-lg">
                  <LayoutGrid className="size-3.5" /> Card View
                </button>
              </div>
              <button className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-neutral-700" style={{ border: "1px solid #E0E0E0" }}>
                <SlidersHorizontal className="size-3.5" /> Filters
              </button>
            </div>
          </div>
          <Button variant="primary" size="md" className="w-full sm:w-auto">
            Add Listing
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl bg-white" style={{ border: "1px solid #E0E0E0" }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-neutral-500" style={{ borderBottom: "1px solid #E0E0E0" }}>
                <th className="px-4 py-3">Listing Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Sustainability</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockListings.map((listing, i) => (
                <tr
                  key={i}
                  className="cursor-pointer text-sm transition-colors hover:bg-neutral-50"
                  style={{ borderBottom: i < mockListings.length - 1 ? "1px solid #F5F5F5" : "none" }}
                >
                  <td className="px-4 py-3 font-medium text-neutral-900">{listing.name}</td>
                  <td className="px-4 py-3 text-neutral-700">{listing.category}</td>
                  <td className="px-4 py-3 text-neutral-700">{listing.available.toLocaleString()}</td>
                  <td className="px-4 py-3 text-neutral-700">{listing.price}</td>
                  <td className="px-4 py-3 text-neutral-700">{listing.sustainability}</td>
                  <td className="px-4 py-3"><StatusBadge status={listing.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}
