"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Files,
  History,
  Link2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  X,
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

export function DocumentsCenter({
  role,
  documentId,
}: {
  role: Role;
  documentId?: string;
}) {
  if (role === "admin") {
    return <AdminDocumentOperations documentId={documentId} />;
  }
  return <PortalDocumentsCenter role={role} />;
}

function PortalDocumentsCenter({ role }: { role: Exclude<Role, "admin"> }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DocStatus | "All">("All");
  const [uploaded, setUploaded] = useState(false);
  const [preview, setPreview] = useState<ManagedDocument | null>(null);
  const intro = roleIntro[role];

  const visible = useMemo(() => {
    return documents.filter((doc) => {
      const matchesStatus = status === "All" || doc.status === status;
      const haystack =
        `${doc.id} ${doc.owner} ${doc.name} ${doc.type} ${doc.linkedTo}`.toLowerCase();
      return matchesStatus && haystack.includes(query.toLowerCase());
    });
  }, [documents, query, status]);

  const approve = (id: string) => {
    setDocuments((current) =>
      current.map((doc) =>
        doc.id === id ? { ...doc, status: "Verified" } : doc,
      ),
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
        owner: role === "buyer" ? "AgriCorp Solutions" : "Demo Seller Co.",
        name: "Demo upload - sustainability report.pdf",
        type: "Sustainability report",
        linkedTo: "Account profile",
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
            <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-emerald-700">
              DOCUMENTS
            </p>
            <h1 className="text-3xl font-bold text-neutral-950">
              {intro.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">
              {intro.body}
            </p>
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
          {(
            [
              "All",
              "Verified",
              "Pending review",
              "Expiring soon",
              "Rejected",
            ] as const
          ).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                status === item
                  ? "bg-neutral-950 text-white"
                  : "bg-white text-neutral-700 ring-1 ring-neutral-200"
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
                <tr
                  key={doc.id}
                  className="border-b border-neutral-100 last:border-b-0"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="size-5 text-neutral-500" />
                      <div>
                        <p className="text-sm font-semibold text-neutral-950">
                          {doc.name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {doc.type} · {doc.uploaded}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-neutral-700">
                    {doc.owner}
                  </td>
                  <td className="px-5 py-4 text-sm text-neutral-700">
                    {doc.linkedTo}
                  </td>
                  <td className="px-5 py-4 text-sm text-neutral-700">
                    {doc.expires}
                  </td>
                  <td className="px-5 py-4">
                    <DocumentBadge status={doc.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setPreview(doc)}
                        className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
                        aria-label={`Preview ${doc.name}`}
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
                        aria-label={`Download ${doc.name}`}
                      >
                        <Download className="size-4" />
                      </button>
                      {doc.status === "Pending review" && (
                        <button
                          type="button"
                          onClick={() => approve(doc.id)}
                          className="rounded-full p-2 text-emerald-700 hover:bg-emerald-50"
                          aria-label={`Approve ${doc.name}`}
                        >
                          <FileCheck2 className="size-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(doc.id)}
                        className="rounded-full p-2 text-red-600 hover:bg-red-50"
                        aria-label={`Delete ${doc.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-neutral-500"
                  >
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
            <h2 className="text-xl font-bold text-neutral-950">
              Document preview
            </h2>
            <p className="mt-1 text-sm text-neutral-500">{preview.name}</p>
            <div className="mt-5 rounded-xl bg-neutral-100 p-8 text-center">
              <FileText className="mx-auto mb-3 size-10 text-neutral-400" />
              <p className="text-sm font-medium text-neutral-800">
                Frontend preview placeholder
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Real PDFs will render from document storage later.
              </p>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-full bg-neutral-950 px-5 py-2 text-sm font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminDocumentOperations({ documentId }: { documentId?: string }) {
  const document = initialDocuments.find((item) => item.id === documentId);
  if (documentId && document)
    return <AdminDocumentDetail document={document} />;
  return <AdminDocumentHome />;
}

function AdminDocumentHome() {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DocStatus | "All">("All");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const visible = useMemo(
    () =>
      documents.filter((doc) => {
        const matchesStatus = status === "All" || doc.status === status;
        const haystack =
          `${doc.id} ${doc.owner} ${doc.name} ${doc.type} ${doc.linkedTo}`.toLowerCase();
        return matchesStatus && haystack.includes(query.toLowerCase());
      }),
    [documents, query, status],
  );
  const pending = documents.filter(
    (doc) => doc.status === "Pending review",
  ).length;
  const expiring = documents.filter(
    (doc) => doc.status === "Expiring soon",
  ).length;
  const verified = documents.filter((doc) => doc.status === "Verified").length;

  return (
    <div className="min-h-full bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
            DOCUMENT OPERATIONS
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-tight text-neutral-950">
            Control platform evidence, review queues, retention, and linked
            records.
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
            Review certificates, COAs, contracts, invoices, delivery evidence,
            and compliance records from upload through approval and retention.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
        >
          <Upload className="size-4" />
          Upload document
        </button>
      </div>

      {notice && <Notice message={notice} onClose={() => setNotice("")} />}

      <section className="mt-6 overflow-hidden rounded-3xl bg-neutral-950 p-6 text-white shadow-xl sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_560px] xl:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              <ShieldCheck className="size-4" />
              Evidence command center
            </p>
            <h2 className="mt-4 max-w-2xl text-2xl font-black sm:text-3xl">
              Make every marketplace decision traceable to trusted evidence.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">
              Centralized review ties documents to contracts, listings,
              shipments, accounts, and compliance controls.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DarkMetric value={String(documents.length)} label="Managed" />
            <DarkMetric value={String(verified)} label="Verified" />
            <DarkMetric value={String(pending)} label="In review" />
            <DarkMetric value="7 yr" label="Retention" />
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Managed documents"
          value={String(documents.length)}
          detail="Across platform workflows"
          icon={Files}
        />
        <Metric
          label="Pending review"
          value={String(pending)}
          detail="Admin decision required"
          icon={UserCheck}
        />
        <Metric
          label="Expiring soon"
          value={String(expiring)}
          detail="Replacement evidence needed"
          icon={AlertTriangle}
        />
        <Metric
          label="Policy coverage"
          value="100%"
          detail="Retention rule assigned"
          icon={ShieldCheck}
        />
      </div>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-neutral-950">
              Document inventory
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Search, filter, inspect, and move evidence through review.
            </p>
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <label className="relative min-w-56 flex-1 sm:max-w-xs">
              <span className="sr-only">Search documents</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search document, owner, or record"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
              />
            </label>
            <select
              aria-label="Filter documents by status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as DocStatus | "All")
              }
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700"
            >
              {(
                [
                  "All",
                  "Verified",
                  "Pending review",
                  "Expiring soon",
                  "Rejected",
                ] as const
              ).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="pb-3 font-semibold">Document</th>
                <th className="pb-3 font-semibold">Owner</th>
                <th className="pb-3 font-semibold">Linked record</th>
                <th className="pb-3 font-semibold">Uploaded</th>
                <th className="pb-3 font-semibold">Expires</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visible.map((doc) => (
                <tr key={doc.id} className="hover:bg-neutral-50">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                        <FileText className="size-5" />
                      </span>
                      <div>
                        <p className="font-bold text-neutral-900">{doc.name}</p>
                        <p className="mt-1 text-xs text-neutral-400">
                          {doc.id} · {doc.type}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-neutral-600">{doc.owner}</td>
                  <td className="py-4 font-semibold text-neutral-700">
                    {doc.linkedTo}
                  </td>
                  <td className="py-4 text-neutral-600">{doc.uploaded}</td>
                  <td className="py-4 text-neutral-600">{doc.expires}</td>
                  <td className="py-4">
                    <DocumentBadge status={doc.status} />
                  </td>
                  <td className="py-4 text-right">
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/documents/${doc.id}`)}
                      className="rounded-full bg-neutral-950 px-3 py-2 text-xs font-bold text-white"
                    >
                      Review document
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <div className="rounded-xl bg-neutral-50 p-10 text-center text-sm text-neutral-500">
              No documents match this search and filter.
            </div>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-violet-600" />
            <h2 className="text-lg font-black text-neutral-950">
              Review automation
            </h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <AutomationCard
              label="File integrity"
              value="Passed"
              detail="Malware and format checks"
            />
            <AutomationCard
              label="Record matching"
              value="98%"
              detail="Owner and linked entity"
            />
            <AutomationCard
              label="Expiry monitoring"
              value="Active"
              detail="60, 30, and 7 day alerts"
            />
          </div>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-black text-neutral-950">
            Retention policy
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Executed agreements and signature evidence retain for seven years.
            Listing and shipment evidence retain through the active relationship
            plus three years.
          </p>
          <button
            type="button"
            onClick={() =>
              setNotice("Retention policy report generated for the audit team.")
            }
            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700"
          >
            <Download className="size-4" />
            Export retention report
          </button>
        </section>
      </div>

      {uploadOpen && (
        <UploadDialog
          onClose={() => setUploadOpen(false)}
          onUpload={(document) => {
            setDocuments((current) => [document, ...current]);
            setUploadOpen(false);
            setNotice(
              `${document.name} uploaded and added to the admin review queue.`,
            );
          }}
        />
      )}
    </div>
  );
}

function AdminDocumentDetail({ document }: { document: ManagedDocument }) {
  const router = useRouter();
  const [tab, setTab] = useState<
    "Preview" | "Metadata" | "Linked records" | "Audit"
  >("Preview");
  const [reviewOverride, setReviewOverride] = useState<DocStatus | null>(null);
  const status = reviewOverride ?? document.status;
  const [notice, setNotice] = useState("");
  const [archived, setArchived] = useState(false);
  const audit = [
    {
      title: "Document uploaded",
      detail: `${document.owner} submitted ${document.name}.`,
      date: document.uploaded,
    },
    {
      title: "Integrity scan passed",
      detail: "File format, malware, and duplication checks passed.",
      date: "Automated review",
    },
    {
      title: "Linked record matched",
      detail: `Evidence connected to ${document.linkedTo}.`,
      date: "Automated review",
    },
  ];
  const linkedRoute = document.linkedTo.startsWith("CTR-")
    ? `/admin/contracts/${document.linkedTo}`
    : undefined;

  return (
    <div className="min-h-full bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => router.push("/admin/documents")}
        className="inline-flex items-center gap-2 text-sm font-bold text-neutral-600 hover:text-neutral-950"
      >
        <ArrowLeft className="size-4" />
        Back to documents
      </button>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white">
            <FileText className="size-7" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                {document.id}
              </p>
              <DocumentBadge status={status} />
              {archived && (
                <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-bold text-neutral-700">
                  Archived
                </span>
              )}
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">
              {document.name}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {document.type} · owned by {document.owner}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setReviewOverride("Rejected");
              setNotice(
                "Document rejected and replacement evidence requested.",
              );
            }}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => {
              setReviewOverride("Verified");
              setNotice("Document verified and released to linked workflows.");
            }}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
          >
            <FileCheck2 className="size-4" />
            Approve document
          </button>
        </div>
      </div>
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Owner"
          value={document.owner}
          detail="Submitting organization"
          icon={UserCheck}
        />
        <Metric
          label="Linked record"
          value={document.linkedTo}
          detail="Workflow dependency"
          icon={Link2}
        />
        <Metric
          label="Uploaded"
          value={document.uploaded}
          detail="Initial evidence receipt"
          icon={Upload}
        />
        <Metric
          label="Expires"
          value={document.expires}
          detail="Renewal monitoring"
          icon={RefreshCw}
        />
      </div>
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-neutral-200">
        {(["Preview", "Metadata", "Linked records", "Audit"] as const).map(
          (item) => (
            <button
              type="button"
              key={item}
              onClick={() => setTab(item)}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold ${tab === item ? "bg-neutral-950 text-white" : "text-neutral-500 hover:bg-neutral-50"}`}
            >
              {item}
            </button>
          ),
        )}
      </div>

      {tab === "Preview" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-neutral-950">
                  Evidence preview
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Secure admin preview of the retained record.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setNotice("Secure download prepared for this admin session.")
                }
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-2 text-xs font-bold"
              >
                <Download className="size-3.5" />
                Download
              </button>
            </div>
            <div className="mt-5 min-h-[520px] rounded-2xl bg-neutral-100 p-6 sm:p-10">
              <div className="mx-auto max-w-2xl bg-white p-8 shadow-lg">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
                  {document.type}
                </p>
                <h3 className="mt-4 text-2xl font-black text-neutral-950">
                  {document.name.replace(/\.(pdf|zip)$/i, "")}
                </h3>
                <p className="mt-2 text-sm text-neutral-500">
                  Prepared for {document.owner}
                </p>
                <div className="mt-8 space-y-4">
                  {[
                    "Document identity and submitting organization",
                    "Linked marketplace record and evidence purpose",
                    "Effective dates, certifications, and authorization",
                    "Retention and verification statement",
                  ].map((line, index) => (
                    <div
                      key={line}
                      className="border-b border-neutral-200 pb-4"
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                        Section {index + 1}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-700">
                        {line}. Verified platform metadata is retained with the
                        original uploaded record.
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex items-center gap-2 text-sm font-bold text-emerald-700">
                  <ShieldCheck className="size-4" />
                  Integrity scan passed
                </div>
              </div>
            </div>
          </section>
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
            <h2 className="font-black text-neutral-950">Review decision</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Confirm the document supports the linked workflow and meets active
              evidence policy.
            </p>
            <div className="mt-5 space-y-2">
              {[
                "Owner identity matched",
                "Linked record confirmed",
                "File integrity passed",
                "Expiry monitoring assigned",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"
                >
                  <CheckCircle2 className="size-4" />
                  {item}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setNotice(
                  "Replacement evidence request sent to the document owner.",
                )
              }
              className="mt-5 w-full rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-bold text-neutral-700"
            >
              Request replacement
            </button>
          </section>
        </div>
      )}
      {tab === "Metadata" && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-black text-neutral-950">
            Document metadata
          </h2>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <Detail label="Document ID" value={document.id} />
            <Detail label="Owner" value={document.owner} />
            <Detail label="Document type" value={document.type} />
            <Detail label="Filename" value={document.name} />
            <Detail label="Uploaded" value={document.uploaded} />
            <Detail label="Expires" value={document.expires} />
            <Detail label="Linked record" value={document.linkedTo} />
            <Detail label="Storage region" value="US Central" />
            <Detail
              label="Retention"
              value="Active relationship + policy period"
            />
          </dl>
        </section>
      )}
      {tab === "Linked records" && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-black text-neutral-950">
            Workflow dependencies
          </h2>
          <div className="mt-4 rounded-2xl border border-neutral-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                  Primary record
                </p>
                <p className="mt-2 text-lg font-black text-neutral-950">
                  {document.linkedTo}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  Verification state can approve, hold, or reopen this workflow.
                </p>
              </div>
              {linkedRoute && (
                <button
                  type="button"
                  onClick={() => router.push(linkedRoute)}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
                >
                  <Link2 className="size-4" />
                  Open linked record
                </button>
              )}
            </div>
          </div>
        </section>
      )}
      {tab === "Audit" && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-neutral-950">
                Evidence audit trail
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Immutable document and review activity.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setArchived(true);
                setNotice(
                  "Document archived under the active retention policy.",
                );
              }}
              disabled={archived}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-2 text-xs font-bold disabled:opacity-40"
            >
              <Archive className="size-3.5" />
              {archived ? "Archived" : "Archive record"}
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {audit.map((event) => (
              <div
                key={event.title}
                className="flex gap-3 rounded-xl bg-neutral-50 p-4"
              >
                <History className="mt-0.5 size-5 shrink-0 text-neutral-500" />
                <div>
                  <p className="font-bold text-neutral-900">{event.title}</p>
                  <p className="mt-1 text-sm text-neutral-600">
                    {event.detail}
                  </p>
                  <p className="mt-2 text-xs text-neutral-400">{event.date}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function UploadDialog({
  onClose,
  onUpload,
}: {
  onClose: () => void;
  onUpload: (document: ManagedDocument) => void;
}) {
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [linkedTo, setLinkedTo] = useState("");
  return (
    <dialog
      open
      aria-labelledby="upload-document-title"
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/40 p-4"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              SECURE UPLOAD
            </p>
            <h2
              id="upload-document-title"
              className="mt-2 text-2xl font-black text-neutral-950"
            >
              Add document evidence
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close upload dialog"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-neutral-100"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-6 grid gap-4">
          <label className="text-sm font-bold text-neutral-800">
            Document name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Insurance certificate.pdf"
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm"
            />
          </label>
          <label className="text-sm font-bold text-neutral-800">
            Owner
            <input
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              placeholder="Organization name"
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm"
            />
          </label>
          <label className="text-sm font-bold text-neutral-800">
            Linked record
            <input
              value={linkedTo}
              onChange={(event) => setLinkedTo(event.target.value)}
              placeholder="CTR-1048 or SHP-50012"
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim() || !owner.trim() || !linkedTo.trim()}
            onClick={() =>
              onUpload({
                id: `DOC-${7200 + Math.floor(Math.random() * 500)}`,
                owner: owner.trim(),
                name: name.trim(),
                type: "Admin upload",
                linkedTo: linkedTo.trim(),
                uploaded: "Just now",
                expires: "Jul 16, 2027",
                status: "Pending review",
              })
            }
            className="rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            Upload to review
          </button>
        </div>
      </div>
    </dialog>
  );
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-neutral-950">{value}</p>
          <p className="mt-1 text-xs text-neutral-500">{detail}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
          <Icon className="size-5" />
        </span>
      </div>
    </section>
  );
}
function DarkMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
      <p className="text-xl font-black">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
    </div>
  );
}
function AutomationCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl bg-neutral-50 p-4">
      <p className="text-xs font-bold text-neutral-500">{label}</p>
      <p className="mt-2 text-lg font-black text-neutral-950">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-bold text-neutral-900">{value}</dd>
    </div>
  );
}
function Notice({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-100"
    >
      <span className="flex items-center gap-2">
        <CheckCircle2 className="size-4" />
        {message}
      </span>
      <button type="button" aria-label="Dismiss message" onClick={onClose}>
        <X className="size-4" />
      </button>
    </div>
  );
}

const DOCUMENT_BADGE_TONES: Record<
  DocStatus,
  { className: string; icon: typeof CheckCircle2 }
> = {
  Verified: {
    className: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  "Pending review": {
    className: "bg-blue-100 text-blue-700",
    icon: FileCheck2,
  },
  "Expiring soon": {
    className: "bg-amber-100 text-amber-800",
    icon: AlertTriangle,
  },
  Rejected: { className: "bg-red-100 text-red-700", icon: AlertTriangle },
};

function DocumentBadge({ status }: { status: DocStatus }) {
  const Icon = DOCUMENT_BADGE_TONES[status].icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${DOCUMENT_BADGE_TONES[status].className}`}
    >
      <Icon className="size-3" />
      {status}
    </span>
  );
}
