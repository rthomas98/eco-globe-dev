"use client";

import { useDemoUser } from "@/lib/demo-user";

import { useRef, useState } from "react";
import Link from "next/link";
import { Check, Download, FileText, Search, Trash2, Upload, X } from "lucide-react";

import { LabReportsSection } from "@/components/lab-testing/lab-reports-section";
import { ErrorState, LoadingState, useBackendData } from "@/components/shared/data-state";
import { describeBackendError } from "@/lib/backend-client";
import { portalDate } from "@/lib/api-portal";
import {
  VAULT_CATEGORIES,
  deleteVaultDocument,
  downloadVaultDocument,
  fetchVaultDocuments,
  isVaultUnavailable,
  reviewVaultDocument,
  uploadVaultDocument,
  type VaultDocument,
} from "@/lib/api-documents";

type Role = "buyer" | "seller" | "admin";

const roleIntro: Record<Role, { title: string; body: string }> = {
  buyer: {
    title: "Buyer document vault",
    body: "Lab reports and company documents saved to EcoGlobe for your orders.",
  },
  seller: {
    title: "Seller document vault",
    body: "Lab reports and company documents such as certificates, SDS files and insurance.",
  },
  admin: {
    title: "Platform document management",
    body: "Company documents submitted to EcoGlobe and lab reports across the marketplace.",
  },
};

const relatedLinks: Record<Role, Array<{ label: string; href: string }>> = {
  buyer: [
    { label: "Signed contracts", href: "/buyer/contracts" },
    { label: "Shipment paperwork", href: "/buyer/logistics" },
  ],
  seller: [
    { label: "Listing documents", href: "/seller/listings" },
    { label: "Signed contracts", href: "/seller/contracts" },
    { label: "Shipment paperwork", href: "/seller/logistics" },
  ],
  admin: [
    { label: "Listing document review", href: "/admin/document-review" },
    { label: "Contracts", href: "/admin/contracts" },
    { label: "Logistics", href: "/admin/logistics" },
  ],
};

function categoryLabel(code: string) {
  return VAULT_CATEGORIES.find((c) => c.code === code)?.label ?? code.replace(/_/g, " ");
}

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsCenter({
  role,
  documentId,
}: {
  role: Role;
  documentId?: string;
}) {
  const intro = roleIntro[role];
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-emerald-700">DOCUMENTS</p>
          <h1 className="text-3xl font-bold text-neutral-950">{intro.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">{intro.body}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="text-neutral-500">Also see:</span>
            {relatedLinks[role].map((link) => (
              <Link key={link.href} href={link.href} className="font-semibold text-neutral-900 underline">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <LabReportsSection role={role} />
        </div>

        <CompanyDocumentVault role={role} highlightId={documentId} />
      </div>
    </div>
  );
}

function CompanyDocumentVault({ role, highlightId }: { role: Role; highlightId?: string }) {
  const companyId = useDemoUser()?.activeCompanyId;
  const docs = useBackendData(fetchVaultDocuments, [companyId], "Documents could not be loaded.");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const unavailable = docs.status === "error" && isVaultUnavailable(docs.rawError);

  const run = async (id: number, action: () => Promise<unknown>, success: string, failure: string) => {
    setBusyId(id);
    setActionError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      docs.reload();
    } catch (error) {
      setActionError(describeBackendError(error, failure));
    } finally {
      setBusyId(null);
    }
  };

  const visible = (docs.data ?? []).filter((doc) =>
    `${doc.fileName} ${doc.companyName ?? ""} ${categoryLabel(doc.category)}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200" aria-labelledby="vault-heading">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="vault-heading" className="text-lg font-bold text-neutral-900">
            Company documents
          </h2>
          <p className="text-sm text-neutral-500">
            {role === "admin"
              ? "Documents companies uploaded for review."
              : "Files you upload are stored with your company and visible to EcoGlobe staff for review."}
          </p>
        </div>
        {docs.status === "ready" && (docs.data ?? []).length > 0 && (
          <div className="flex min-w-[220px] items-center gap-2 rounded-full bg-white px-4 py-2 ring-1 ring-neutral-200">
            <Search className="size-4 text-neutral-400" />
            <input
              type="search"
              aria-label="Search documents"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search documents"
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
          </div>
        )}
      </div>

      {unavailable ? (
        <p className="rounded-xl bg-neutral-50 px-4 py-6 text-sm text-neutral-600">
          Uploading general company documents is not available in this environment yet. Lab reports,
          listing documents, signed contracts and shipment paperwork remain available in their own
          sections.
        </p>
      ) : (
        <>
          {role !== "admin" && docs.status === "ready" && (
            <UploadForm
              onUploaded={(name) => {
                setNotice(`${name} was uploaded and is awaiting review.`);
                docs.reload();
              }}
            />
          )}
          {notice && (
            <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {notice}
            </p>
          )}
          {actionError && (
            <p role="alert" className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </p>
          )}
          {docs.status === "loading" && !docs.data ? (
            <LoadingState label="Loading documents…" />
          ) : docs.status === "error" ? (
            <ErrorState message={docs.error ?? "Documents could not be loaded."} onRetry={docs.reload} />
          ) : visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-500">
              {(docs.data ?? []).length === 0 ? "No company documents yet." : "No documents match your search."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500" style={{ borderBottom: "1px solid #F0F0F0" }}>
                    <th className="py-3 pr-4">Document</th>
                    {role === "admin" && <th className="py-3 pr-4">Company</th>}
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Uploaded</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      role={role}
                      highlighted={highlightId === String(doc.id)}
                      busy={busyId === doc.id}
                      onDownload={() =>
                        void run(doc.id, () => downloadVaultDocument(doc), `${doc.fileName} downloaded.`, "The download failed.")
                      }
                      onDelete={() =>
                        void run(doc.id, () => deleteVaultDocument(doc.id), `${doc.fileName} was deleted.`, "The document was not deleted.")
                      }
                      onReview={(status, note) =>
                        void run(
                          doc.id,
                          () => reviewVaultDocument(doc.id, status, note),
                          `${doc.fileName} was ${status}.`,
                          "The review decision was not saved.",
                        )
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function UploadForm({ onUploaded }: { onUploaded: (fileName: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>(VAULT_CATEGORIES[0].code);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      await uploadVaultDocument(file, category);
      onUploaded(file.name);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(describeBackendError(err, `${file.name} was not uploaded.`));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl bg-neutral-50 p-4 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-neutral-700">
        File (PDF or image, up to 5 MB)
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700">
        Type
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-neutral-200"
        >
          {VAULT_CATEGORIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={!file || uploading}
        onClick={() => void submit()}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        <Upload className="size-4" />
        {uploading ? "Uploading…" : "Upload"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700 sm:basis-full">
          {error}
        </p>
      )}
    </div>
  );
}

function DocumentRow({
  doc,
  role,
  highlighted,
  busy,
  onDownload,
  onDelete,
  onReview,
}: {
  doc: VaultDocument;
  role: Role;
  highlighted: boolean;
  busy: boolean;
  onDownload: () => void;
  onDelete: () => void;
  onReview: (status: "approved" | "rejected", note: string) => void;
}) {
  const [note, setNote] = useState("");
  const review = (status: "approved" | "rejected") => {
    if (note.trim()) onReview(status, note.trim());
  };
  return (
    <tr style={{ borderBottom: "1px solid #F8F8F8" }} className={highlighted ? "bg-emerald-50" : "hover:bg-neutral-50"}>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <FileText className="size-4 shrink-0 text-neutral-400" />
          <div className="min-w-0">
            <p className="truncate font-medium text-neutral-900">{doc.fileName}</p>
            <p className="text-xs text-neutral-500">
              {formatSize(doc.sizeBytes)}
              {doc.uploadedByName ? ` · ${doc.uploadedByName}` : ""}
            </p>
          </div>
        </div>
      </td>
      {role === "admin" && <td className="py-3 pr-4 text-neutral-700">{doc.companyName ?? "—"}</td>}
      <td className="py-3 pr-4 text-neutral-700">{categoryLabel(doc.category)}</td>
      <td className="py-3 pr-4 text-neutral-700">{portalDate(doc.createdAt)}</td>
      <td className="py-3 pr-4">
        <StatusBadge status={doc.status} />
        {doc.reviewNote && <p className="mt-1 text-xs text-neutral-500">{doc.reviewNote}</p>}
      </td>
      <td className="py-3">
        <div className="flex justify-end gap-2">
          <IconButton label={`Download ${doc.fileName}`} disabled={busy} onClick={onDownload}>
            <Download className="size-4" />
          </IconButton>
          {role === "admin" && doc.status === "pending_review" && (
            <>
              <input
                aria-label={`Review note for ${doc.fileName}`}
                placeholder="Review note (required)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={2000}
                className="w-40 rounded-full bg-white px-3 py-1 text-xs ring-1 ring-neutral-200"
              />
              <IconButton label={`Reject ${doc.fileName}`} disabled={busy || !note.trim()} onClick={() => review("rejected")}>
                <X className="size-4" />
              </IconButton>
              <IconButton label={`Approve ${doc.fileName}`} disabled={busy || !note.trim()} onClick={() => review("approved")}>
                <Check className="size-4" />
              </IconButton>
            </>
          )}
          {role !== "admin" && (
            <IconButton label={`Delete ${doc.fileName}`} disabled={busy} onClick={onDelete}>
              <Trash2 className="size-4" />
            </IconButton>
          )}
        </div>
      </td>
    </tr>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-full bg-white text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-100 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "approved"
      ? "bg-emerald-100 text-emerald-700"
      : status === "rejected"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-800";
  const label = status === "pending_review" ? "Pending review" : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>;
}
