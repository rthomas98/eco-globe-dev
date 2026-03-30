"use client";

import { X } from "lucide-react";
import { Button } from "@eco-globe/ui";

export interface FilterState {
  categories: string[];
  priceMin: string;
  priceMax: string;
  qtyMin: string;
  qtyMax: string;
  carbon: string[];
  carbonDataOnly: boolean;
  grades: string[];
}

export const defaultFilters: FilterState = {
  categories: [],
  priceMin: "",
  priceMax: "",
  qtyMin: "",
  qtyMax: "",
  carbon: [],
  carbonDataOnly: false,
  grades: [],
};

const categories = [
  "Plastics",
  "Rubber & Tire-Derived",
  "Oils & Liquid Feedstocks",
  "Biomass & Wood",
];

const carbonOptions = [
  "Under 300 kg CO₂e / ton",
  "300–500",
  "500+",
];

const gradeOptions = ["Standard", "Great"];

// Mock histogram data (30 bars)
const histogramBars = [
  3, 8, 12, 18, 22, 28, 35, 40, 38, 42, 45, 40, 35, 30, 28, 25, 32, 38, 42, 35, 28, 20, 15, 12, 18, 22, 10, 6, 4, 2,
];
const maxBar = Math.max(...histogramBars);

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-900">
      <div
        className="flex size-5 shrink-0 items-center justify-center rounded"
        style={{
          border: checked ? "none" : "1.5px solid #BDBDBD",
          backgroundColor: checked ? "#378853" : "white",
        }}
        onClick={() => onChange(!checked)}
      >
        {checked && (
          <svg className="size-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </div>
      <span>{label}</span>
    </label>
  );
}

function PriceInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center rounded-lg bg-white px-3 py-2.5" style={{ border: "1px solid #E0E0E0" }}>
      <span className="mr-2 text-sm text-neutral-500">$</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
      />
    </div>
  );
}

export function FiltersPanel({
  open,
  onClose,
  filters,
  onChange,
  onReset,
  listingCount,
}: {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onReset: () => void;
  listingCount: number;
}) {
  const activeCount =
    filters.categories.length +
    (filters.priceMin || filters.priceMax ? 1 : 0) +
    (filters.qtyMin || filters.qtyMax ? 1 : 0) +
    filters.carbon.length +
    (filters.carbonDataOnly ? 1 : 0) +
    filters.grades.length;

  const toggleArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-[420px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid #E0E0E0" }}>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-neutral-900">Filters</h2>
            {activeCount > 0 && (
              <span
                className="flex size-6 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "#378853" }}
              >
                {activeCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900">
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Product Category */}
          <div className="px-6 py-6" style={{ borderBottom: "1px solid #E0E0E0" }}>
            <h3 className="mb-4 text-base font-bold text-neutral-900">Product category</h3>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <Checkbox
                  key={cat}
                  checked={filters.categories.includes(cat)}
                  onChange={() => onChange({ ...filters, categories: toggleArray(filters.categories, cat) })}
                  label={cat}
                />
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="px-6 py-6" style={{ borderBottom: "1px solid #E0E0E0" }}>
            <h3 className="mb-4 text-base font-bold text-neutral-900">Price</h3>
            {/* Histogram */}
            <div className="mb-4 flex h-16 items-end gap-[2px]">
              {histogramBars.map((h, i) => {
                const pct = (h / maxBar) * 100;
                const inRange =
                  (!filters.priceMin || i >= parseInt(filters.priceMin) / 15) &&
                  (!filters.priceMax || i <= parseInt(filters.priceMax) / 15);
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{
                      height: `${pct}%`,
                      backgroundColor: inRange ? "#378853" : "#E0E0E0",
                    }}
                  />
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <PriceInput value={filters.priceMin} onChange={(v) => onChange({ ...filters, priceMin: v })} placeholder="Minimum" />
              <PriceInput value={filters.priceMax} onChange={(v) => onChange({ ...filters, priceMax: v })} placeholder="Maximum" />
            </div>
          </div>

          {/* Quantity Available */}
          <div className="px-6 py-6" style={{ borderBottom: "1px solid #E0E0E0" }}>
            <h3 className="mb-4 text-base font-bold text-neutral-900">Quantity Available</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-white px-3 py-2.5" style={{ border: "1px solid #E0E0E0" }}>
                <input
                  type="text"
                  value={filters.qtyMin}
                  onChange={(e) => onChange({ ...filters, qtyMin: e.target.value })}
                  placeholder="Minimum"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
                />
              </div>
              <div className="rounded-lg bg-white px-3 py-2.5" style={{ border: "1px solid #E0E0E0" }}>
                <input
                  type="text"
                  value={filters.qtyMax}
                  onChange={(e) => onChange({ ...filters, qtyMax: e.target.value })}
                  placeholder="Maximum"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
                />
              </div>
            </div>
          </div>

          {/* Carbon Footprint */}
          <div className="px-6 py-6" style={{ borderBottom: "1px solid #E0E0E0" }}>
            <h3 className="mb-4 text-base font-bold text-neutral-900">Carbon Footprint</h3>
            <div className="grid grid-cols-2 gap-3">
              {carbonOptions.map((opt) => (
                <Checkbox
                  key={opt}
                  checked={filters.carbon.includes(opt)}
                  onChange={() => onChange({ ...filters, carbon: toggleArray(filters.carbon, opt) })}
                  label={opt}
                />
              ))}
              <Checkbox
                checked={filters.carbonDataOnly}
                onChange={(v) => onChange({ ...filters, carbonDataOnly: v })}
                label="Show only listings with carbon data"
              />
            </div>
          </div>

          {/* Grade */}
          <div className="px-6 py-6" style={{ borderBottom: "1px solid #E0E0E0" }}>
            <h3 className="mb-4 text-base font-bold text-neutral-900">Grade</h3>
            <div className="grid grid-cols-2 gap-3">
              {gradeOptions.map((grade) => (
                <Checkbox
                  key={grade}
                  checked={filters.grades.includes(grade)}
                  onChange={() => onChange({ ...filters, grades: toggleArray(filters.grades, grade) })}
                  label={grade}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid #E0E0E0" }}>
          <button
            onClick={onReset}
            className="text-base font-bold text-neutral-900 underline"
          >
            Reset
          </button>
          <Button variant="primary" size="lg" onClick={onClose}>
            Show {listingCount} Listings
          </Button>
        </div>
      </div>
    </>
  );
}
