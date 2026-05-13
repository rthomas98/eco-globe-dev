"use client";

import { useState } from "react";
import {
  Upload,
  FileText,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";

type DocStatus = "Active" | "Pending review" | "Expiring soon" | "Expired";

interface DocItem {
  id: string;
  name: string;
  type: string;
  issuedBy: string;
  uploaded: string;
  expires?: string;
  status: DocStatus;
  size: string;
}

const documents: DocItem[] = [
  { id: "DOC-001", name: "GRS_Certificate_2026.pdf", type: "Sustainability cert", issuedBy: "Textile Exchange", uploaded: "2026-01-12", expires: "2027-01-12", status: "Active", size: "1.2 MB" },
  { id: "DOC-002", name: "ISO_9001_Audit_Report.pdf", type: "Quality cert", issuedBy: "TÜV SÜD", uploaded: "2025-11-05", expires: "2026-11-05", status: "Active", size: "2.4 MB" },
  { id: "DOC-003", name: "SDS_Sawdust_v3.pdf", type: "Safety data sheet", issuedBy: "Internal", uploaded: "2026-02-22", status: "Active", size: "640 KB" },
  { id: "DOC-004", name: "SDS_Coal_Tar_v2.pdf", type: "Safety data sheet", issuedBy: "Internal", uploaded: "2025-09-18", status: "Pending review", size: "720 KB" },
  { id: "DOC-005", name: "FSC_Chain_of_Custody.pdf", type: "Sustainability cert", issuedBy: "FSC", uploaded: "2025-05-30", expires: "2026-05-30", status: "Expiring soon", size: "880 KB" },
  { id: "DOC-006", name: "Business_License_LA.pdf", type: "Business license", issuedBy: "State of Louisiana", uploaded: "2024-08-01", expires: "2026-08-01", status: "Active", size: "212 KB" },
];

const DOC_TYPES = [
  "Sustainability cert",
  "Quality cert",
  "Safety data sheet",
  "Business license",
  "Insurance",
  "Other",
];

export function SellerDocumentsPage() {
  const [filter, setFilter] = useState<"All" | DocStatus>("All");
  const [uploadOpen, setUploadOpen] = useState(false);

  const visible = documents.filter((d) => filter === "All" || d.status === filter);
  const expiring = documents.filter((d) => d.status === "Expiring soon").length;

  return (
    <SellerLayout title="Documents">
      <div className="px-8 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Documents &amp; certifications</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Upload SDS sheets, sustainability certifications, and business
              licenses. Buyers see verified docs on your listings.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => setUploadOpen(true)}>
            <Upload className="size-4" />
            Upload document
          </Button>
        </div>

        {expiring > 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#FEF3C7", border: "1px solid #FDE68A" }}>
            <AlertCircle className="size-5 text-amber-600" />
            <p className="text-sm text-amber-900">
              <strong>{expiring}</strong> document{expiring === 1 ? "" : "s"} expiring within 30 days — renew to keep your listings verified.
            </p>
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-1.5">
          {(["All", "Active", "Pending review", "Expiring soon", "Expired"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === s
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
              style={filter !== s ? { border: "1px solid #E0E0E0" } : undefined}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
          <table className="w-full">
            <thead style={{ borderBottom: "1px solid #F0F0F0" }}>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <th className="px-5 py-3">Document</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Issued by</th>
                <th className="px-5 py-3">Expires</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d, i) => (
                <tr
                  key={d.id}
                  style={{ borderBottom: i === visible.length - 1 ? undefined : "1px solid #F4F4F5" }}
                  className="hover:bg-neutral-50"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="size-5 text-neutral-500" />
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{d.name}</p>
                        <p className="text-xs text-neutral-500">
                          {d.size} · uploaded {d.uploaded}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-neutral-700">{d.type}</td>
                  <td className="px-5 py-4 text-sm text-neutral-700">{d.issuedBy}</td>
                  <td className="px-5 py-4 text-sm text-neutral-700">{d.expires ?? "—"}</td>
                  <td className="px-5 py-4">
                    <DocStatusBadge status={d.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button title="Preview" className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100">
                        <Eye className="size-4" />
                      </button>
                      <button title="Download" className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100">
                        <Download className="size-4" />
                      </button>
                      <button title="Delete" className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </SellerLayout>
  );
}

function DocStatusBadge({ status }: { status: DocStatus }) {
  const tone: Record<DocStatus, { bg: string; fg: string; icon: typeof CheckCircle }> = {
    Active: { bg: "#DCFCE7", fg: "#166534", icon: CheckCircle },
    "Pending review": { bg: "#EDE9FE", fg: "#5B21B6", icon: AlertCircle },
    "Expiring soon": { bg: "#FEF3C7", fg: "#92400E", icon: AlertCircle },
    Expired: { bg: "#FEE2E2", fg: "#991B1B", icon: AlertCircle },
  };
  const t = tone[status];
  const Icon = t.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: t.bg, color: t.fg }}
    >
      <Icon className="size-3" />
      {status}
    </span>
  );
}

function UploadModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState(DOC_TYPES[0]);
  const [name, setName] = useState("");

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[480px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-neutral-900">Upload document</h2>
        <p className="mt-1 text-sm text-neutral-500">
          PDFs, images, and signed reports up to 25 MB.
        </p>
        <div className="mt-5 flex flex-col gap-4">
          <Field label="Document type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
            >
              {DOC_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Display name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GRS Certificate 2026"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
            />
          </Field>
          <Field label="File">
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-lg px-4 py-8 text-center text-sm text-neutral-500"
              style={{ border: "1px dashed #D4D4D8" }}
            >
              <Upload className="size-6" />
              <p>
                <span className="font-medium text-neutral-900">Click to upload</span> or
                drag and drop
              </p>
              <p className="text-xs text-neutral-400">PDF, PNG, JPG up to 25 MB</p>
            </div>
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={onClose}>
            Upload
          </Button>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-neutral-900">{label}</label>
      {children}
    </div>
  );
}
