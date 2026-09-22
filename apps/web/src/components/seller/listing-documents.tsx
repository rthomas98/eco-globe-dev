"use client";

import { useRef, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Plus,
  Trash2,
  Download,
  AlertTriangle,
} from "lucide-react";
import { describeBackendError } from "@/lib/backend-client";
import {
  DOCUMENT_ACCEPT,
  deleteListingDocument,
  documentDownloadUrl,
  normalizeDocumentTypeCode,
  uploadListingDocument,
  type ListingDocument,
  type ListingDocumentTypeCode,
} from "@/lib/listings-api";

const TYPE_LABEL: Record<ListingDocumentTypeCode, string> = {
  sds: "Safety Data Sheet (SDS)",
  certification: "Certification",
  tds: "Technical Data Sheet (TDS)",
  coa: "Certificate of Analysis (COA)",
  photo: "Listing photo",
};

/** Human label for any document type code, including ones this form does not upload. */
export function documentTypeLabel(code: string | null | undefined) {
  const normalized = normalizeDocumentTypeCode(code) as ListingDocumentTypeCode;
  return TYPE_LABEL[normalized] ?? (code ?? "Document").replace(/_/g, " ");
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes || !Number.isFinite(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentRow({
  document,
  onDelete,
  busy,
}: {
  document: ListingDocument;
  onDelete?: () => void;
  busy?: boolean;
}) {
  const size = formatBytes(document.byteLength);
  const Icon = document.documentTypeCode === "photo" ? ImageIcon : FileText;
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3"
      style={{ border: "1px solid #E0E0E0" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="size-5 shrink-0 text-neutral-500" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900">
            {document.fileName}
          </p>
          <p className="text-xs text-neutral-500">
            {TYPE_LABEL[
              normalizeDocumentTypeCode(
                document.documentTypeCode,
              ) as ListingDocumentTypeCode
            ] ?? document.documentTypeCode}
            {size ? ` · ${size}` : ""}
            {document.verificationStatusCode
              ? ` · ${document.verificationStatusCode.replace(/_/g, " ")}`
              : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={documentDownloadUrl(document)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-900"
        >
          <Download className="size-4" />
          Download
        </a>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            aria-label={`Remove ${document.fileName}`}
            className="flex size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Upload, list and remove one type of listing document against a saved listing.
 * Requires the listing to exist on the backend first.
 */
export function ListingDocumentUploader({
  listingId,
  ensureListing,
  typeCode,
  documents,
  onChange,
  multiple = true,
  title,
  hint,
  required,
}: {
  listingId: number | null;
  ensureListing?: () => Promise<number>;
  typeCode: ListingDocumentTypeCode;
  documents: ListingDocument[];
  onChange: React.Dispatch<React.SetStateAction<ListingDocument[]>>;
  multiple?: boolean;
  title?: string;
  hint?: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mine = documents.filter(
    (doc) => normalizeDocumentTypeCode(doc.documentTypeCode) === typeCode,
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selectedFiles = Array.from(files);
    setBusy(true);
    setError("");
    const uploaded: ListingDocument[] = [];
    try {
      const savedId = listingId ?? (await ensureListing?.());
      if (!savedId)
        throw new Error("Save the listing draft first, then upload documents.");
      for (const file of selectedFiles) {
        uploaded.push(
          await uploadListingDocument({
            listingId: savedId,
            documentTypeCode: typeCode,
            file,
          }),
        );
      }
      onChange((current) => [...current, ...uploaded]);
    } catch (err) {
      if (uploaded.length > 0) onChange((current) => [...current, ...uploaded]);
      setError(
        describeBackendError(err, "The upload failed. Please try again."),
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (doc: ListingDocument) => {
    setBusy(true);
    setError("");
    try {
      await deleteListingDocument(doc.id);
      onChange((current) => current.filter((d) => d.id !== doc.id));
    } catch (err) {
      setError(describeBackendError(err, "The document could not be removed."));
    } finally {
      setBusy(false);
    }
  };

  const accept = DOCUMENT_ACCEPT[typeCode];
  const canAdd = multiple || mine.length === 0;

  return (
    <div className="flex flex-col gap-3">
      {title && (
        <p className="text-sm font-medium text-neutral-900">
          {title}
          {required && <span className="ml-1 text-red-600">*</span>}
        </p>
      )}
      {mine.length > 0 && (
        <div className="flex flex-col gap-2">
          {mine.map((doc) => (
            <DocumentRow
              key={doc.id}
              document={doc}
              busy={busy}
              onDelete={() => void handleDelete(doc)}
            />
          ))}
        </div>
      )}
      {canAdd && (
        <label
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-medium text-neutral-900 ${
            listingId === null && !ensureListing ? "opacity-60" : ""
          }`}
          style={{ border: "1px dashed #D0D0D0" }}
        >
          <Plus className="size-4" />
          {busy ? "Uploading…" : `Upload ${TYPE_LABEL[typeCode]}`}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            disabled={busy}
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </label>
      )}
      <p className="text-xs text-neutral-500">
        {hint ??
          (typeCode === "photo"
            ? "Accepts PNG, JPEG or WebP up to 5 MB each."
            : "Accepts PDF up to 5 MB.")}
        {listingId === null
          ? " Documents are stored with the saved listing."
          : ""}
      </p>
      {error && (
        <p className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
