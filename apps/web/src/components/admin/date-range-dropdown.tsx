"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

const ranges = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "6m", label: "Last 6 months" },
  { key: "1y", label: "Last year" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom range" },
];

interface DateRangeDropdownProps {
  value: string;
  onChange: (key: string) => void;
}

export function DateRangeDropdown({ value, onChange }: DateRangeDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = ranges.find((r) => r.key === value) ?? ranges[1];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-neutral-700"
        style={{ border: "1px solid #F0F0F0" }}
      >
        {selected.label} <ChevronDown className="size-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-12 z-30 w-[200px] rounded-xl bg-white py-1"
          style={{ border: "1px solid #F0F0F0", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
        >
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => { onChange(r.key); setOpen(false); }}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-neutral-50 ${
                r.key === value ? "font-medium text-neutral-900" : "text-neutral-600"
              }`}
            >
              {r.label}
              {r.key === value && <Check className="size-4 text-green-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
