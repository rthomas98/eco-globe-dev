"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

type Role = "buyer" | "seller" | "admin";
type DocStatus = "Verified" | "Pending review" | "Expiring soon" | "Rejected";

interface ManagedDocument {
  id: string;
  owner: string;
  name: string;
  type: string;
  linkedTo: string;
  uploaded: string;
  expires: string;
  status: DocStatus;
}

const initialDocuments: ManagedDocument[] = [
  {
    id: "DOC-7101",
    owner: "EcoPack Co.",
    name: "Black Gypsum COA.pdf",
    type: "Certificate of analysis",
    linkedTo: "Black Gypsum listing",
    uploaded: "Jul 10, 2026",
    expires: "Jul 10, 2027",
    status: "Verified",
  },
  {
    id: "DOC-7102",
    owner: "GreenHarvest Co.",
    name: "ACH Authorization.pdf",
    type: "Payment authorization",
    linkedTo: "CTR-1048",
    uploaded: "Jul 12, 2026",
    expires: "N/A",
    status: "Pending review",
  },
  {
    id: "DOC-7103",
    owner: "TerraGenesis Biofuels",
    name: "Polymer SDS v4.pdf",
    type: "Safety data sheet",
    linkedTo: "Scrap Polymer Blend",
    uploaded: "Jun 29, 2026",
    expires: "Aug 1, 2026",
    status: "Expiring soon",
  },
  {
    id: "DOC-7104",
    owner: "Metal Reclaim LLC",
    name: "Transformer inspection photos.zip",
    type: "Inspection evidence",
    linkedTo: "SHP-50012",
    uploaded: "Jul 6, 2026",
    expires: "N/A",
    status: "Verified",
  },
];

const roleIntro: Record<Role, { title: string; body: string }> = {
  buyer: {
    title: "Buyer document vault",
    body: "View contracts, invoices, COAs, delivery documents, and payment records tied to your orders.",
  },
  seller: {
    title: "Seller document vault",
    body: "Manage listing certifications, SDS files, proof of insurance, and shipment paperwork buyers rely on.",
  },
  admin: {
    title: "Platform document management",
    body: "Review submitted certificates, COAs, sustainability reports, contracts, invoices, and compliance evidence.",
  },
};

export function DocumentsCenter({ role }: { role: Role }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DocStatus | "All">("All");
  const [uploaded, setUploaded] = useState(false);
  const [preview, setPreview] = useState<ManagedDocument | null>(null);
  const intro = roleIntro[role];

  const visible = useMemo(() => {
    return documents.filter((doc) => {
      const matchesStatus = status === "All" || doc.status === status;
      const haystack = `${doc.id} ${doc.owner} ${doc.name} ${doc.type} ${doc.linkedTo}`.toLowerCase();
      return matchesStatus && haystack.includes(query.toLowerCase());
    });
  }, [documents, query, status]);

  const approve = (id: string) => {
    setDocuments((current) =>
      current.map((doc) => (doc.id === id ? { ...doc, status: "Verified" } : doc)),
    );
  };

  const remove = (id: string) => {
    setDocuments((current) => current.filter((doc) => doc.id !== id));
  };

  const uploadSample = () => {
    setUploaded(true);
    setDocuments((current) => [
      {
        id: `DOC-${Math.floor(8000 + Math.random() * 900)}`,
        owner: role === "buyer" ? "AgriCorp Solutions" : role === "seller" ? "Demo Seller Co." : "Platform upload",
        name: "Demo upload - sustainability report.pdf",
        type: "Sustainability report",
        linkedTo: role === "admin" ? "Compliance queue" : "Account profile",
        uploaded: "Just now",
        expires: "Jul 14, 2027",
        status: "Pending review",
      },
      ...current,
    ]);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <div className="px-8 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-emerald-700">DOCUMENTS</p>
            <h1 className="text-3xl font-bold text-neutral-950">{intro.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">{intro.body}</p>
          </div>
          <button
            type="button"
            onClick={uploadSample}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white"
          >
            <Upload className="size-4" />
            Upload sample document
          </button>
        </div>

        {uploaded && (
          <div className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100">
            Sample upload added to the review queue.
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex min-w-[280px] items-center gap-2 rounded-full bg-white px-4 py-2 ring-1 ring-neutral-200">
            <Search className="size-4 text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search documents"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          {(["All", "Verified", "Pending review", "Expiring soon", "Rejected"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                status === item ? "bg-neutral-950 text-white" : "bg-white text-neutral-700 ring-1 ring-neutral-200"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-5 py-3">Document</th>
                <th className="px-5 py-3">Owner</th>
                <th className="px-5 py-3">Linked to</th>
                <th className="px-5 py-3">Expires</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((doc) => (
                <tr key={doc.id} className="border-b border-neutral-100 last:border-b-0">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="size-5 text-neutral-500" />
                      <div>
                        <p className="text-sm font-semibold text-neutral-950">{doc.name}</p>
                        <p className="text-xs text-neutral-500">{doc.type} · {doc.uploaded}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-neutral-700">{doc.owner}</td>
                  <td className="px-5 py-4 text-sm text-neutral-700">{doc.linkedTo}</td>
                  <td className="px-5 py-4 text-sm text-neutral-700">{doc.expires}</td>
                  <td className="px-5 py-4"><DocumentBadge status={doc.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setPreview(doc)} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100" aria-label={`Preview ${doc.name}`}>
                        <Eye className="size-4" />
                      </button>
                      <button className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100" aria-label={`Download ${doc.name}`}>
                        <Download className="size-4" />
                      </button>
                      {(role === "admin" || doc.status === "Pending review") && (
                        <button onClick={() => approve(doc.id)} className="rounded-full p-2 text-emerald-700 hover:bg-emerald-50" aria-label={`Approve ${doc.name}`}>
                          <FileCheck2 className="size-4" />
                        </button>
                      )}
                      <button onClick={() => remove(doc.id)} className="rounded-full p-2 text-red-600 hover:bg-red-50" aria-label={`Delete ${doc.name}`}>
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-neutral-500">
                    No documents match the current search and filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-neutral-950">Document preview</h2>
            <p className="mt-1 text-sm text-neutral-500">{preview.name}</p>
            <div className="mt-5 rounded-xl bg-neutral-100 p-8 text-center">
              <FileText className="mx-auto mb-3 size-10 text-neutral-400" />
              <p className="text-sm font-medium text-neutral-800">Frontend preview placeholder</p>
              <p className="mt-1 text-xs text-neutral-500">Real PDFs will render from document storage later.</p>
            </div>
            <div className="mt-5 flex justify-end">
              <button onClick={() => setPreview(null)} className="rounded-full bg-neutral-950 px-5 py-2 text-sm font-semibold text-white">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentBadge({ status }: { status: DocStatus }) {
  const tone: Record<DocStatus, { className: string; icon: typeof CheckCircle2 }> = {
    Verified: { className: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
    "Pending review": { className: "bg-blue-100 text-blue-700", icon: FileCheck2 },
    "Expiring soon": { className: "bg-amber-100 text-amber-800", icon: AlertTriangle },
    Rejected: { className: "bg-red-100 text-red-700", icon: AlertTriangle },
  };
  const Icon = tone[status].icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[status].className}`}>
      <Icon className="size-3" />
      {status}
    </span>
  );
}
