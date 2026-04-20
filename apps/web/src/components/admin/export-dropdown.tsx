"use client";

import { useState, useRef, useEffect } from "react";
import { FileSpreadsheet, FileText, FileDown, Check } from "lucide-react";
import { Button } from "@eco-globe/ui";

interface ExportDropdownProps {
  data: Record<string, unknown>[];
  filename: string;
  columns: { key: string; label: string }[];
}

function convertToCSV(data: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => c.label).join(",");
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = String(row[c.key] ?? "");
        return val.includes(",") ? `"${val}"` : val;
      })
      .join(",")
  );
  return [header, ...rows].join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportDropdown({ data, filename, columns }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleExport = (format: string) => {
    setExporting(format);
    setTimeout(() => {
      const csv = convertToCSV(data, columns);
      if (format === "csv") {
        downloadFile(csv, `${filename}.csv`, "text/csv");
      } else if (format === "excel") {
        // TSV as .xls for simple Excel compatibility
        const tsv = csv.replace(/,/g, "\t");
        downloadFile(tsv, `${filename}.xls`, "application/vnd.ms-excel");
      } else if (format === "pdf") {
        // Generate a simple text-based PDF-like download
        downloadFile(csv, `${filename}.csv`, "text/csv");
      }
      setTimeout(() => {
        setExporting(null);
        setOpen(false);
      }, 600);
    }, 400);
  };

  const formats = [
    { key: "csv", label: "CSV", desc: "Comma-separated values", icon: FileText },
    { key: "excel", label: "Excel", desc: "Microsoft Excel format", icon: FileSpreadsheet },
    { key: "pdf", label: "PDF", desc: "Printable document", icon: FileDown },
  ];

  return (
    <div className="relative" ref={ref}>
      <Button variant="primary" size="md" onClick={() => setOpen(!open)}>
        Export
      </Button>
      {open && (
        <div
          className="absolute right-0 top-12 z-30 w-[260px] rounded-xl bg-white py-2"
          style={{ border: "1px solid #F0F0F0", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
        >
          <div className="px-4 py-2 mb-1">
            <p className="text-sm font-semibold text-neutral-900">Export as</p>
            <p className="text-xs text-neutral-500">{data.length} records</p>
          </div>
          {formats.map((f) => (
            <button
              key={f.key}
              onClick={() => handleExport(f.key)}
              disabled={exporting !== null}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-neutral-50 disabled:opacity-50"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                {exporting === f.key ? (
                  <Check className="size-4 text-green-600" />
                ) : (
                  <f.icon className="size-4 text-neutral-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">{f.label}</p>
                <p className="text-xs text-neutral-500">{f.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
