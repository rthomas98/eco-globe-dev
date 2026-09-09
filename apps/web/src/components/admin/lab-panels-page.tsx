"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { describeBackendError, isBackendApiError } from "@/lib/backend-client";
import {
  fetchLabPanels,
  LAB_GROUP_CODES,
  saveLabPanel,
  type LabGroupCode,
  type LabOptionalTest,
  type LabPanelWithReview,
  type LabPanelWrite,
  type LabReview,
} from "@/lib/lab-testing-api";
import { fetchLookups, type LookupOption } from "@/lib/listings-api";
import { LAB_GROUP_FALLBACK, panelPublishBlockers, slugifyTestCode } from "@/lib/lab-testing";

type ListState =
  | { status: "loading" }
  | { status: "ready"; panels: LabPanelWithReview[] }
  | { status: "error"; message: string };

const border = { border: "1px solid #E0E0E0" } as const;
const inputClass = "w-full rounded-lg bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20";

interface Draft {
  familyCode: string;
  name: string;
  materialTypeCodes: string[];
  tests: string[];
  optionalTests: LabOptionalTest[];
  review: LabReview;
}

const EMPTY_REVIEW: LabReview = { laboratoryName: "", reviewedBy: "", reviewedAt: "", evidence: "" };

function toDraft(panel: LabPanelWithReview | null): Draft {
  return {
    familyCode: panel?.familyCode ?? "",
    name: panel?.name ?? "",
    materialTypeCodes: panel?.materialTypeCodes ?? [],
    tests: panel?.tests ?? [],
    optionalTests: panel?.optionalTests ?? [],
    review: panel?.review ?? EMPTY_REVIEW,
  };
}

/**
 * Internal draft panel editor. Panels are configuration data held as
 * versions per family; every save appends a version. Drafts are internal
 * starting points, not lab-approved offerings, and publishing requires
 * explicit laboratory review evidence. This page never seeds example panels.
 */
export function LabPanelsPage() {
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [materialTypes, setMaterialTypes] = useState<LookupOption[]>([]);
  const [editing, setEditing] = useState<{ panel: LabPanelWithReview | null } | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    Promise.all([fetchLabPanels(), fetchLookups().catch(() => ({}) as Record<string, LookupOption[]>)])
      .then(([panels, lookups]) => {
        if (cancelled) return;
        setState({ status: "ready", panels });
        setMaterialTypes(lookups.materialTypes ?? lookups.MaterialTypes ?? []);
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", message: describeBackendError(error, "Panels could not be loaded.") });
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const families = useMemo(() => {
    if (state.status !== "ready") return [];
    const byFamily = new Map<string, LabPanelWithReview[]>();
    for (const panel of state.panels) {
      const list = byFamily.get(panel.familyCode) ?? [];
      list.push(panel);
      byFamily.set(panel.familyCode, list);
    }
    return Array.from(byFamily.entries()).map(([familyCode, versions]) => ({ familyCode, versions: versions.sort((a, b) => b.version - a.version) }));
  }, [state]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-6 sm:px-8">
        <Link href="/admin/lab-testing" className="mb-4 inline-block text-sm font-medium text-neutral-500 hover:text-neutral-900">← Back to lab testing queue</Link>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Internal configuration</p>
            <h1 className="text-3xl font-bold text-neutral-900">Testing panels</h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">Category-to-panel mapping held as data. Drafts are a starting point for a laboratory conversation, not a standard; they never appear to customers. Publishing requires the reviewing laboratory, reviewer, date and evidence.</p>
          </div>
          <Button variant="primary" size="md" onClick={() => setEditing({ panel: null })}>New draft panel</Button>
        </div>

        <p className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>Draft content is internal. Customers see “Testing scope to be confirmed” until a version is published with laboratory review evidence.</span>
        </p>

        {state.status === "loading" && <p className="rounded-xl bg-white p-6 text-sm text-neutral-600" role="status" style={border}>Loading panels…</p>}
        {state.status === "error" && (
          <div className="rounded-xl bg-red-50 p-6 text-sm text-red-700" role="alert">
            <p>{state.message}</p>
            <button type="button" onClick={reload} className="mt-2 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" aria-hidden="true" /> Retry</button>
          </div>
        )}
        {state.status === "ready" && families.length === 0 && <p className="rounded-xl bg-white p-6 text-sm text-neutral-600" style={border}>No panels recorded. Create a draft to start the laboratory conversation.</p>}
        {state.status === "ready" && families.length > 0 && (
          <div className="flex flex-col gap-4">
            {families.map(({ familyCode, versions }) => (
              <section key={familyCode} className="rounded-xl bg-white p-5" style={border} aria-labelledby={`family-${familyCode}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 id={`family-${familyCode}`} className="text-lg font-bold text-neutral-900">{versions[0].name}</h2>
                    <p className="text-xs text-neutral-500">Family <code>{familyCode}</code> · {versions.length} version{versions.length === 1 ? "" : "s"}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setEditing({ panel: versions[0] })}>New version from latest</Button>
                </div>
                <ul className="mt-3 flex flex-col gap-2">
                  {versions.map((panel) => (
                    <li key={panel.id} className="flex flex-col gap-1 rounded-lg bg-neutral-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="font-semibold text-neutral-900">v{panel.version}</span>
                        <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${panel.status === "published" ? "bg-emerald-100 text-emerald-800" : panel.status === "retired" ? "bg-neutral-200 text-neutral-600" : "bg-amber-100 text-amber-800"}`}>{panel.status}</span>
                        <p className="text-xs text-neutral-600">{panel.tests.length} panel tests · {panel.optionalTests.length} add-ons · materials: {panel.materialTypeCodes.length > 0 ? panel.materialTypeCodes.join(", ") : "none mapped"}</p>
                        <p className="text-xs text-neutral-500">{panel.review ? `Reviewed by ${panel.review.reviewedBy}, ${panel.review.laboratoryName}, ${panel.review.reviewedAt}` : "No laboratory review recorded"}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {editing && (
          <PanelEditor
            initial={editing.panel}
            materialTypes={materialTypes}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
          />
        )}
      </div>
    </div>
  );
}

function PanelEditor({ initial, materialTypes, onClose, onSaved }: { initial: LabPanelWithReview | null; materialTypes: LookupOption[]; onClose: () => void; onSaved: () => void }) {
  const id = useId();
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [testsText, setTestsText] = useState(() => (initial?.tests ?? []).join("\n"));
  const [materialText, setMaterialText] = useState(() => (initial?.materialTypeCodes ?? []).join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);

  const parsedTests = testsText.split("\n").map((t) => t.trim()).filter(Boolean);
  const parsedMaterials = materialText.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
  const reviewFilled = Object.values(draft.review).some((v) => v.trim());

  const buildBody = (status: LabPanelWrite["status"]): LabPanelWrite => ({
    familyCode: draft.familyCode.trim(),
    name: draft.name.trim(),
    materialTypeCodes: Array.from(new Set(parsedMaterials)),
    tests: Array.from(new Set(parsedTests)),
    optionalTests: draft.optionalTests.filter((t) => t.label.trim()).map((t) => ({ ...t, id: t.id || slugifyTestCode(t.label), label: t.label.trim() })),
    status,
    ...(reviewFilled ? { review: { ...draft.review, laboratoryName: draft.review.laboratoryName.trim(), reviewedBy: draft.review.reviewedBy.trim(), evidence: draft.review.evidence.trim() } } : {}),
  });

  const save = async (status: LabPanelWrite["status"]) => {
    if (busy) return;
    const body = buildBody(status);
    const problems: string[] = [];
    if (!/^[a-z][a-z0-9_-]+$/.test(body.familyCode)) problems.push("Family code must be lowercase letters, digits, hyphens or underscores.");
    if (!body.name) problems.push("Give the panel a name.");
    if (status === "published") problems.push(...panelPublishBlockers({ review: body.review ?? null, tests: body.tests, materialTypeCodes: body.materialTypeCodes }));
    setBlockers(problems);
    if (problems.length > 0) return;
    setBusy(true);
    setError(null);
    try {
      await saveLabPanel(body);
      onSaved();
    } catch (err: unknown) {
      setError({ message: describeBackendError(err, "The panel could not be saved."), retryable: isBackendApiError(err) ? err.retryable : true });
    }
    setBusy(false);
  };

  const setOptional = (index: number, patch: Partial<LabOptionalTest>) =>
    setDraft((prev) => ({ ...prev, optionalTests: prev.optionalTests.map((t, i) => (i === index ? { ...t, ...patch } : t)) }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close panel editor" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} className="relative z-10 flex max-h-dvh w-full flex-col gap-4 overflow-y-auto bg-white p-5 sm:max-h-[90dvh] sm:max-w-[720px] sm:rounded-2xl sm:p-8">
        <h2 id={`${id}-title`} className="text-xl font-bold text-neutral-900">{initial ? `New version of ${initial.name}` : "New draft panel"}</h2>
        <p className="text-xs text-neutral-500">Saving appends a new immutable version. Publishing retires the previously published version of this family.</p>
        {blockers.length > 0 && (
          <div role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700"><ul className="list-disc pl-5">{blockers.map((b) => <li key={b}>{b}</li>)}</ul></div>
        )}
        {error && (
          <div role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            <p>{error.message}</p>
            {error.retryable && <button type="button" onClick={() => void save("draft")} className="mt-1 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" aria-hidden="true" /> Retry as draft</button>}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-family`} className="mb-1 block text-xs font-semibold text-neutral-700">Family code</label>
            <input id={`${id}-family`} value={draft.familyCode} disabled={!!initial} onChange={(e) => setDraft((p) => ({ ...p, familyCode: e.target.value }))} placeholder="e.g. biomass_wood" className={inputClass} style={border} />
          </div>
          <div>
            <label htmlFor={`${id}-name`} className="mb-1 block text-xs font-semibold text-neutral-700">Panel name</label>
            <input id={`${id}-name`} value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} className={inputClass} style={border} />
          </div>
        </div>
        <div>
          <label htmlFor={`${id}-materials`} className="mb-1 block text-xs font-semibold text-neutral-700">Material type codes (comma separated){materialTypes.length > 0 ? ` · known: ${materialTypes.map((m) => m.code).join(", ")}` : ""}</label>
          <input id={`${id}-materials`} value={materialText} onChange={(e) => setMaterialText(e.target.value)} className={inputClass} style={border} />
        </div>
        <div>
          <label htmlFor={`${id}-tests`} className="mb-1 block text-xs font-semibold text-neutral-700">Standard panel tests (one per line)</label>
          <textarea id={`${id}-tests`} rows={5} value={testsText} onChange={(e) => setTestsText(e.target.value)} className={inputClass} style={border} />
        </div>
        <fieldset>
          <legend className="mb-1 text-xs font-semibold text-neutral-700">Optional add-on tests by group</legend>
          <div className="flex flex-col gap-2">
            {draft.optionalTests.map((test, index) => (
              <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr_auto]">
                <select aria-label={`Add-on ${index + 1} group`} value={test.group} onChange={(e) => setOptional(index, { group: e.target.value as LabGroupCode })} className={inputClass} style={border}>
                  {LAB_GROUP_CODES.map((g) => <option key={g} value={g}>{LAB_GROUP_FALLBACK[g].label}</option>)}
                </select>
                <input aria-label={`Add-on ${index + 1} label`} value={test.label} onChange={(e) => setOptional(index, { label: e.target.value, id: test.id || slugifyTestCode(e.target.value) })} className={inputClass} style={border} placeholder="Test label" />
                <button type="button" aria-label={`Remove add-on ${index + 1}`} onClick={() => setDraft((p) => ({ ...p, optionalTests: p.optionalTests.filter((_, i) => i !== index) }))} className="rounded-lg px-3 text-sm text-neutral-600" style={border}>Remove</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setDraft((p) => ({ ...p, optionalTests: [...p.optionalTests, { id: "", group: "processing", label: "" }] }))} className="mt-2 text-xs font-semibold text-neutral-900 underline">Add add-on test</button>
        </fieldset>
        <fieldset className="rounded-xl bg-neutral-50 p-4">
          <legend className="px-1 text-xs font-semibold text-neutral-700">Laboratory review (required to publish)</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-lab`} className="mb-1 block text-xs text-neutral-700">Reviewing laboratory</label>
              <input id={`${id}-lab`} value={draft.review.laboratoryName} onChange={(e) => setDraft((p) => ({ ...p, review: { ...p.review, laboratoryName: e.target.value } }))} className={inputClass} style={border} />
            </div>
            <div>
              <label htmlFor={`${id}-reviewer`} className="mb-1 block text-xs text-neutral-700">Reviewed by</label>
              <input id={`${id}-reviewer`} value={draft.review.reviewedBy} onChange={(e) => setDraft((p) => ({ ...p, review: { ...p.review, reviewedBy: e.target.value } }))} className={inputClass} style={border} />
            </div>
            <div>
              <label htmlFor={`${id}-reviewedAt`} className="mb-1 block text-xs text-neutral-700">Review date</label>
              <input id={`${id}-reviewedAt`} type="date" value={draft.review.reviewedAt} onChange={(e) => setDraft((p) => ({ ...p, review: { ...p.review, reviewedAt: e.target.value } }))} className={inputClass} style={border} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-evidence`} className="mb-1 block text-xs text-neutral-700">Evidence (what was confirmed or corrected)</label>
              <textarea id={`${id}-evidence`} rows={3} value={draft.review.evidence} onChange={(e) => setDraft((p) => ({ ...p, review: { ...p.review, evidence: e.target.value } }))} className={inputClass} style={border} />
            </div>
          </div>
        </fieldset>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="secondary" size="md" disabled={busy} onClick={() => void save("draft")}>{busy ? "Saving…" : "Save draft version"}</Button>
          <Button type="button" variant="primary" size="md" disabled={busy} onClick={() => void save("published")}>Publish version</Button>
        </div>
      </div>
    </div>
  );
}
