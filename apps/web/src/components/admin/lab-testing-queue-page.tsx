"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { FlaskConical, RefreshCw, Upload } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { describeBackendError, isBackendApiError } from "@/lib/backend-client";
import {
  createLabReport,
  fetchAdminLabRequests,
  fetchLabAssignees,
  isRealPdf,
  LAB_REQUEST_STATUSES,
  MAX_LAB_REPORT_BYTES,
  MAX_LAB_RESULTS,
  setLabReportPublished,
  updateAdminLabRequest,
  type LabAdminRequest,
  type LabAssignee,
  type LabReport,
  type LabRequestStatus,
  type LabResult,
} from "@/lib/lab-testing-api";
import {
  cleanHeadlineResults,
  describeRequester,
  formatLabDate,
  labStatusLabel,
  sharingLabel,
  turnaroundLabel,
  validateReportForm,
  type ReportFormError,
} from "@/lib/lab-testing";
import { readFileAsBase64 } from "@/lib/listings-api";
import { LabReportCard } from "@/components/lab-testing/lab-report-card";

type ListState =
  | { status: "loading" }
  | { status: "ready"; requests: LabAdminRequest[] }
  | { status: "error"; message: string };

const border = { border: "1px solid #E0E0E0" } as const;
const inputClass =
  "w-full rounded-lg bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20";

/**
 * Internal lab testing queue: same pattern as the pilot desk. Assignment,
 * status and notes per request, plus real PDF report attachment with actual
 * headline results. Only internal admins reach this page; the backend
 * enforces the same boundary.
 */
export function LabTestingQueuePage() {
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [assignees, setAssignees] = useState<LabAssignee[]>([]);
  const [statusFilter, setStatusFilter] = useState<LabRequestStatus | "">("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const detailsId = `${useId()}-details`;

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    Promise.all([fetchAdminLabRequests(statusFilter), fetchLabAssignees().catch(() => [] as LabAssignee[])])
      .then(([requests, people]) => {
        if (cancelled) return;
        setState({ status: "ready", requests });
        setAssignees(people);
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", message: describeBackendError(error, "The lab testing queue could not be loaded.") });
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter, version]);

  const requests = useMemo(() => (state.status === "ready" ? state.requests : []), [state]);
  const selected = useMemo(() => requests.find((r) => r.id === selectedId) ?? null, [requests, selectedId]);

  const replace = (updated: LabAdminRequest) =>
    setState((prev) => (prev.status === "ready" ? { status: "ready", requests: prev.requests.map((r) => (r.id === updated.id ? updated : r)) } : prev));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-6 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Internal</p>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-neutral-900"><FlaskConical className="size-7" aria-hidden="true" /> Lab testing queue</h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">Referral requests from listings and sample requests. Confirm the laboratory, scope, cost and turnaround with the requester before anything is booked. Nothing here contacts a laboratory.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/lab-testing/panels"><Button variant="secondary" size="md">Draft panels</Button></Link>
            <Button variant="secondary" size="md" onClick={reload}><RefreshCw className="size-4" aria-hidden="true" /> Refresh</Button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label htmlFor="lab-status-filter" className="text-sm text-neutral-700">Status</label>
          <select id="lab-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LabRequestStatus | "")} className="h-10 rounded-lg bg-white px-3 text-sm" style={border}>
            <option value="">All</option>
            {LAB_REQUEST_STATUSES.map((s) => <option key={s} value={s}>{labStatusLabel(s)}</option>)}
          </select>
        </div>

        {state.status === "loading" && <p className="rounded-xl bg-white p-6 text-sm text-neutral-600" role="status" style={border}>Loading requests…</p>}
        {state.status === "error" && (
          <div className="rounded-xl bg-red-50 p-6 text-sm text-red-700" role="alert">
            <p>{state.message}</p>
            <button type="button" onClick={reload} className="mt-2 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" aria-hidden="true" /> Retry</button>
          </div>
        )}
        {state.status === "ready" && requests.length === 0 && (
          <p className="rounded-xl bg-white p-6 text-sm text-neutral-600" style={border}>No lab testing requests{statusFilter ? ` with status ${labStatusLabel(statusFilter)}` : ""}.</p>
        )}
        {state.status === "ready" && requests.length > 0 && (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
            <div className="min-w-0 overflow-x-auto rounded-xl bg-white" style={border}>
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">Request</th>
                    <th scope="col" className="px-4 py-3">Listing</th>
                    <th scope="col" className="px-4 py-3">Source</th>
                    <th scope="col" className="px-4 py-3">Turnaround</th>
                    <th scope="col" className="px-4 py-3">Sharing</th>
                    <th scope="col" className="px-4 py-3">Owner</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => {
                    const owner = assignees.find((a) => a.userId === request.ownerUserId);
                    const active = request.id === selectedId;
                    return (
                      <tr
                        key={request.id}
                        data-selected={active || undefined}
                        onClick={() => setSelectedId(request.id)}
                        className={`cursor-pointer border-t border-neutral-100 transition-colors ${active ? "bg-emerald-50 shadow-[inset_3px_0_0_0_#059669]" : "hover:bg-neutral-50"}`}
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedId(request.id)}
                            aria-pressed={active}
                            aria-controls={detailsId}
                            className="rounded font-mono font-semibold text-neutral-900 underline decoration-neutral-400 underline-offset-2 hover:decoration-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/40"
                          >
                            LAB-{request.id}
                          </button>
                          <p className="text-xs text-neutral-500">{formatLabDate(request.createdAt.slice(0, 10))} · {describeRequester(request)}</p>
                        </td>
                        <td className="px-4 py-3 text-neutral-900">{request.listingTitle}<p className="text-xs text-neutral-500">{request.scope.panel ? `Panel ${request.scope.panel.name} v${request.panelVersion ?? request.scope.panel.version}` : "Scope to be confirmed"}</p></td>
                        <td className="px-4 py-3 text-neutral-700">{request.sampleRequestId ? `Sample #${request.sampleRequestId}` : "Listing"}</td>
                        <td className="px-4 py-3 text-neutral-700">{turnaroundLabel(request.turnaround)}</td>
                        <td className="px-4 py-3 text-neutral-700">{request.sharing === "shared" ? "Shared" : "Private"}</td>
                        <td className="px-4 py-3 text-neutral-700">{owner?.name ?? (request.ownerUserId ? `User #${request.ownerUserId}` : "Unassigned")}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-700">{labStatusLabel(request.status)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div
              id={detailsId}
              role="region"
              aria-label={selected ? `Request LAB-${selected.id} details` : "Request details"}
              className="min-w-0 lg:sticky lg:top-0 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
            >
              {selected ? (
                <RequestDetail key={selected.id} request={selected} assignees={assignees} onChange={replace} />
              ) : (
                <p className="rounded-xl bg-white p-6 text-sm text-neutral-600" style={border}>Select a request to assign it, change its status, add notes or attach a report.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RequestDetail({ request, assignees, onChange }: { request: LabAdminRequest; assignees: LabAssignee[]; onChange: (r: LabAdminRequest) => void }) {
  const id = useId();
  const [status, setStatus] = useState<LabRequestStatus>(request.status);
  const [owner, setOwner] = useState<string>(request.ownerUserId ? String(request.ownerUserId) : "");
  const [notes, setNotes] = useState(request.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [saved, setSaved] = useState(false);
  const [publishBusy, setPublishBusy] = useState<number | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const optionalLabels = request.scope.optionalTests.filter((t) => request.optionalTestIds.includes(t.id)).map((t) => t.label);
  const unknownIds = request.optionalTestIds.filter((tid) => !request.scope.optionalTests.some((t) => t.id === tid));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const patch: Parameters<typeof updateAdminLabRequest>[1] = {};
      if (status !== request.status) patch.status = status;
      const ownerId = owner ? Number(owner) : null;
      if (ownerId !== (request.ownerUserId ?? null)) patch.ownerUserId = ownerId;
      if (notes !== (request.notes ?? "")) patch.notes = notes;
      if (Object.keys(patch).length === 0) {
        setSaved(true);
      } else {
        const updated = await updateAdminLabRequest(request.id, patch);
        onChange(updated);
        setSaved(true);
      }
    } catch (error: unknown) {
      setSaveError({ message: describeBackendError(error, "The request could not be updated."), retryable: isBackendApiError(error) ? error.retryable : true });
    }
    setSaving(false);
  };

  const togglePublished = async (reportId: number, published: boolean) => {
    setPublishBusy(reportId);
    setPublishError(null);
    try {
      const updated = await setLabReportPublished(reportId, published);
      onChange({ ...request, reports: request.reports.map((r) => (r.id === updated.id ? updated : r)) });
    } catch (error: unknown) {
      setPublishError(describeBackendError(error, "Publication could not be changed."));
    }
    setPublishBusy(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl bg-white p-5" style={border} aria-labelledby={`${id}-scope`}>
        <h2 id={`${id}-scope`} className="text-lg font-bold text-neutral-900">LAB-{request.id} · {request.listingTitle}</h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">Requester</dt>
            <dd className="text-neutral-900">
              {request.companyName?.trim() || `Company #${request.companyId}`}
              {request.requestedByName?.trim() ? <><br />{request.requestedByName}</> : null}
              {request.requestedByEmail?.trim() ? <><br /><a href={`mailto:${request.requestedByEmail}`} className="underline">{request.requestedByEmail}</a></> : null}
              {!request.requestedByName?.trim() && !request.requestedByEmail?.trim() ? <><br /><span className="text-xs text-neutral-500">Requester contact not supplied by the backend.</span></> : null}
            </dd>
          </div>
          <div><dt className="text-xs uppercase tracking-wide text-neutral-500">Source</dt><dd className="text-neutral-900">{request.sampleRequestId ? `Sample request #${request.sampleRequestId}` : "Listing page"}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-neutral-500">Category / panel</dt><dd className="text-neutral-900">{request.categoryCode}{request.scope.panel ? ` · ${request.scope.panel.name} v${request.panelVersion ?? request.scope.panel.version}` : " · scope to be confirmed"}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-neutral-500">Turnaround</dt><dd className="text-neutral-900">{turnaroundLabel(request.turnaround)} (no duration promised)</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-neutral-500">Sharing</dt><dd className="text-neutral-900">{sharingLabel(request.sharing)}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-neutral-500">Requested</dt><dd className="text-neutral-900">{formatLabDate(request.createdAt.slice(0, 10))}</dd></div>
        </dl>
        {request.scope.panel && request.scope.panel.tests.length > 0 && (
          <p className="mt-3 text-sm text-neutral-700"><span className="font-semibold">Standard panel:</span> {request.scope.panel.tests.join(", ")}</p>
        )}
        <p className="mt-2 text-sm text-neutral-700"><span className="font-semibold">Add-ons / concerns ticked:</span> {optionalLabels.length > 0 ? optionalLabels.join("; ") : "none"}{unknownIds.length > 0 ? ` (ids: ${unknownIds.join(", ")})` : ""}</p>
        <p className="mt-2 whitespace-pre-line text-sm text-neutral-700"><span className="font-semibold">Something not listed:</span> {request.concerns?.trim() ? request.concerns : "—"}</p>
      </section>

      <section className="rounded-xl bg-white p-5" style={border} aria-labelledby={`${id}-handling`}>
        <h3 id={`${id}-handling`} className="text-base font-bold text-neutral-900">Handling</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-owner`} className="mb-1 block text-xs font-semibold text-neutral-700">Owner</label>
            <select id={`${id}-owner`} value={owner} onChange={(e) => setOwner(e.target.value)} className={inputClass} style={border}>
              <option value="">Unassigned</option>
              {assignees.map((a) => <option key={a.userId} value={a.userId}>{a.name}</option>)}
              {request.ownerUserId && !assignees.some((a) => a.userId === request.ownerUserId) && <option value={request.ownerUserId}>User #{request.ownerUserId}</option>}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-status`} className="mb-1 block text-xs font-semibold text-neutral-700">Status</label>
            <select id={`${id}-status`} value={status} onChange={(e) => setStatus(e.target.value as LabRequestStatus)} className={inputClass} style={border}>
              {LAB_REQUEST_STATUSES.map((s) => <option key={s} value={s}>{labStatusLabel(s)}</option>)}
            </select>
            {status === "completed" && request.reports.length === 0 && <p className="mt-1 text-xs text-amber-700">Completed requires an attached report.</p>}
          </div>
        </div>
        <div className="mt-3">
          <label htmlFor={`${id}-notes`} className="mb-1 block text-xs font-semibold text-neutral-700">Internal notes (never shown to companies)</label>
          <textarea id={`${id}-notes`} rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} style={border} placeholder="Laboratory contacted, quote received, scope confirmed with requester…" />
        </div>
        {saveError && (
          <div role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            <p>{saveError.message}</p>
            {saveError.retryable && <button type="button" onClick={() => void save()} className="mt-1 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" aria-hidden="true" /> Retry</button>}
          </div>
        )}
        {saved && !saveError && <p role="status" className="mt-3 text-sm text-emerald-700">Saved.</p>}
        <div className="mt-3 flex justify-end">
          <Button type="button" variant="primary" size="md" disabled={saving} aria-busy={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save handling"}</Button>
        </div>
      </section>

      <section className="rounded-xl bg-white p-5" style={border} aria-labelledby={`${id}-reports`}>
        <h3 id={`${id}-reports`} className="text-base font-bold text-neutral-900">Reports</h3>
        {request.reports.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No report attached yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {publishError && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{publishError}</p>}
            {request.reports.map((report) => (
              <div key={report.id} className="flex flex-col gap-2">
                <LabReportCard report={report} />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600">
                  <span>{report.published ? "Published to the listing" : "Not published"}{request.sharing !== "shared" ? " · requester consent is private, so it stays hidden from the listing" : ""}</span>
                  <button type="button" disabled={publishBusy === report.id} onClick={() => void togglePublished(report.id, !report.published)} className="font-semibold text-neutral-900 underline disabled:opacity-50">
                    {publishBusy === report.id ? "Saving…" : report.published ? "Withdraw publication" : "Publish to listing"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <ReportUploadForm request={request} onCreated={(report) => onChange({ ...request, reports: [...request.reports, report] })} />
      </section>
    </div>
  );
}

function emptyResult(): LabResult {
  return { label: "", value: "", unit: "" };
}

function ReportUploadForm({ request, onCreated }: { request: LabAdminRequest; onCreated: (report: LabReport) => void }) {
  const id = useId();
  const [laboratoryName, setLaboratoryName] = useState("");
  const [batchReference, setBatchReference] = useState("");
  const [sampleDate, setSampleDate] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [results, setResults] = useState<LabResult[]>([emptyResult()]);
  const [file, setFile] = useState<File | null>(null);
  const [fileIsPdf, setFileIsPdf] = useState<boolean | null>(null);
  const [published, setPublished] = useState(false);
  const [errors, setErrors] = useState<ReportFormError[]>([]);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const errorFor = (field: ReportFormError["field"]) => errors.find((e) => e.field === field)?.message;

  const onFile = async (next: File | null) => {
    setFile(next);
    setFileIsPdf(next ? await isRealPdf(next) : null);
  };

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (busy) return;
    const validation = validateReportForm(
      { laboratoryName, batchReference, sampleDate, reportDate, headlineResults: results, fileName: file?.name ?? null, fileSize: file?.size ?? null, fileIsPdf },
      MAX_LAB_REPORT_BYTES,
    );
    setErrors(validation);
    if (validation.length > 0 || !file) return;
    setBusy(true);
    setSubmitError(null);
    setDone(null);
    try {
      const contentBase64 = await readFileAsBase64(file);
      const report = await createLabReport(request.id, {
        laboratoryName: laboratoryName.trim(),
        batchReference: batchReference.trim(),
        sampleDate,
        reportDate,
        results: cleanHeadlineResults(results),
        fileName: file.name,
        contentBase64,
        published,
      });
      onCreated(report);
      setDone(`Report ${report.fileName} attached${report.published ? " and published" : ""}.`);
      setLaboratoryName("");
      setBatchReference("");
      setSampleDate("");
      setReportDate("");
      setResults([emptyResult()]);
      setFile(null);
      setFileIsPdf(null);
      setPublished(false);
    } catch (error: unknown) {
      setSubmitError({ message: describeBackendError(error, "The report could not be attached."), retryable: isBackendApiError(error) ? error.retryable : true });
    }
    setBusy(false);
  };

  return (
    <form className="mt-5 flex flex-col gap-3 rounded-xl bg-neutral-50 p-4" onSubmit={(e) => void submit(e)} noValidate aria-labelledby={`${id}-title`}>
      <h4 id={`${id}-title`} className="flex items-center gap-2 text-sm font-bold text-neutral-900"><Upload className="size-4" aria-hidden="true" /> Attach a laboratory report</h4>
      <p className="text-xs text-neutral-600">Enter the values exactly as they appear on the laboratory&apos;s PDF. The listing shows “Independently tested — laboratory, date” with the batch; never “EcoGlobe certified”.</p>
      {errors.length > 0 && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          <ul className="list-disc pl-5">{errors.map((e) => <li key={e.field}><a href={`#${id}-${e.field}`} className="underline">{e.message}</a></li>)}</ul>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-laboratoryName`} className="mb-1 block text-xs font-semibold text-neutral-700">Laboratory name</label>
          <input id={`${id}-laboratoryName`} value={laboratoryName} onChange={(e) => setLaboratoryName(e.target.value)} className={inputClass} style={border} aria-invalid={!!errorFor("laboratoryName")} />
        </div>
        <div>
          <label htmlFor={`${id}-batchReference`} className="mb-1 block text-xs font-semibold text-neutral-700">Batch reference</label>
          <input id={`${id}-batchReference`} value={batchReference} onChange={(e) => setBatchReference(e.target.value)} className={inputClass} style={border} aria-invalid={!!errorFor("batchReference")} />
        </div>
        <div>
          <label htmlFor={`${id}-sampleDate`} className="mb-1 block text-xs font-semibold text-neutral-700">Sample drawn on</label>
          <input id={`${id}-sampleDate`} type="date" value={sampleDate} onChange={(e) => setSampleDate(e.target.value)} className={inputClass} style={border} aria-invalid={!!errorFor("sampleDate")} />
        </div>
        <div>
          <label htmlFor={`${id}-reportDate`} className="mb-1 block text-xs font-semibold text-neutral-700">Report date</label>
          <input id={`${id}-reportDate`} type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className={inputClass} style={border} aria-invalid={!!errorFor("reportDate")} />
        </div>
      </div>
      <fieldset id={`${id}-headlineResults`}>
        <legend className="mb-1 text-xs font-semibold text-neutral-700">Headline results (1–{MAX_LAB_RESULTS}, as reported)</legend>
        <div className="flex flex-col gap-2">
          {results.map((result, index) => (
            <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <input aria-label={`Result ${index + 1} label`} placeholder="Label (e.g. Moisture)" value={result.label} onChange={(e) => setResults((prev) => prev.map((r, i) => (i === index ? { ...r, label: e.target.value } : r)))} className={inputClass} style={border} />
              <input aria-label={`Result ${index + 1} value`} placeholder="Value" value={result.value} onChange={(e) => setResults((prev) => prev.map((r, i) => (i === index ? { ...r, value: e.target.value } : r)))} className={inputClass} style={border} />
              <input aria-label={`Result ${index + 1} unit`} placeholder="Unit" value={result.unit} onChange={(e) => setResults((prev) => prev.map((r, i) => (i === index ? { ...r, unit: e.target.value } : r)))} className={inputClass} style={border} />
              <button type="button" aria-label={`Remove result ${index + 1}`} disabled={results.length === 1} onClick={() => setResults((prev) => prev.filter((_, i) => i !== index))} className="rounded-lg px-3 text-sm text-neutral-600 hover:text-neutral-900 disabled:opacity-40" style={border}>Remove</button>
            </div>
          ))}
        </div>
        {results.length < MAX_LAB_RESULTS && (
          <button type="button" onClick={() => setResults((prev) => [...prev, emptyResult()])} className="mt-2 text-xs font-semibold text-neutral-900 underline">Add another result</button>
        )}
      </fieldset>
      <div>
        <label htmlFor={`${id}-file`} className="mb-1 block text-xs font-semibold text-neutral-700">Report PDF (max 5 MB)</label>
        <input id={`${id}-file`} type="file" accept="application/pdf" onChange={(e) => void onFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-neutral-700 file:mr-3 file:rounded-full file:border-0 file:bg-neutral-900 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white" aria-invalid={!!errorFor("file")} />
        {file && fileIsPdf === false && <p className="mt-1 text-xs text-red-700">{file.name} does not start with a PDF signature.</p>}
      </div>
      <label htmlFor={`${id}-published`} className="flex items-start gap-2 text-xs text-neutral-700">
        <input id={`${id}-published`} type="checkbox" className="mt-0.5 size-4 accent-neutral-900" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        <span>Publish to the listing now. Shown publicly only while the requester&apos;s consent is “shared”; the requester and internal staff always keep access.</span>
      </label>
      {submitError && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          <p>{submitError.message}</p>
          {submitError.retryable && <button type="button" onClick={() => void submit()} className="mt-1 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" aria-hidden="true" /> Retry upload</button>}
        </div>
      )}
      {done && <p role="status" className="text-sm text-emerald-700">{done}</p>}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="md" disabled={busy} aria-busy={busy}>{busy ? "Uploading…" : "Attach report"}</Button>
      </div>
    </form>
  );
}
