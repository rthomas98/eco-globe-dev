"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, X } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import { buildDemoUser, type Facility } from "@/lib/demo-user";
import { SellerLayout } from "./seller-layout";

type Row = { label: string; value: React.ReactNode; action?: React.ReactNode };

type SellerCompanyState = {
  logoText: string;
  companyName: string;
  registrationNumber: string;
  industrySector: string;
  country: string;
  businessAddress: string;
  representativeName: string;
  representativeTitle: string;
  representativePhone: string;
  representativeEmail: string;
  certificationDocument: string;
  complianceStatus: string;
};

type EditableField = keyof SellerCompanyState;

type FacilityForm = {
  label: string;
  address: string;
};

const COMPANY_KEY = "ecoglobe.sellerCompanyProfile";
const FACILITIES_KEY = "ecoglobe.sellerCompanyFacilities";

const defaultSeller = buildDemoUser("seller");

const defaultCompany: SellerCompanyState = {
  logoText: "alo",
  companyName: "Alo World",
  registrationNumber: "1234567890",
  industrySector: defaultSeller.industry ?? "Chemicals",
  country: "Louisiana",
  businessAddress: "1165 Bayou Paul Ln, St Gabriel, Baton rouge, 93264 LA",
  representativeName: "William Stanley",
  representativeTitle: "Finance Manager",
  representativePhone: "1234567890",
  representativeEmail: "example@aloworld.com",
  certificationDocument: "example document here.pdf",
  complianceStatus: "Verified certification on file",
};

const defaultFacilities = defaultSeller.facilities ?? [];

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function InfoRow({ label, value, action }: Row) {
  return (
    <div
      className="flex items-center justify-between gap-6 px-6 py-5"
      style={{ borderBottom: "1px solid #F0F0F0" }}
    >
      <span className="w-[260px] shrink-0 text-sm text-neutral-700">{label}</span>
      <div className="flex-1 text-sm text-neutral-900">{value}</div>
      {action}
    </div>
  );
}

function ActionLink({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
    >
      {children}
    </button>
  );
}

function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
      {title && (
        <div className="px-6 pb-2 pt-6">
          <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

function FieldModal({
  title,
  label,
  value,
  error,
  onChange,
  onClose,
  onSave,
}: {
  title: string;
  label: string;
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label={`Close ${title}`}
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <section
        className="relative z-10 w-full max-w-[520px] rounded-3xl bg-white p-6 shadow-2xl"
        aria-label={title}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">
              Company profile
            </p>
            <h2 className="mt-1 text-2xl font-bold text-neutral-900">{title}</h2>
          </div>
          <button
            type="button"
            aria-label="Close form"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
          >
            <X className="size-4" />
          </button>
        </div>
        <Input
          id="seller-company-field"
          label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="md" onClick={onSave}>
            Save Changes
          </Button>
        </div>
      </section>
    </div>
  );
}

function FacilityModal({
  mode,
  form,
  error,
  onChange,
  onClose,
  onDelete,
  onSave,
}: {
  mode: "add" | "edit";
  form: FacilityForm;
  error: string | null;
  onChange: (next: FacilityForm) => void;
  onClose: () => void;
  onDelete?: () => void;
  onSave: () => void;
}) {
  const update = (key: keyof FacilityForm, value: string) =>
    onChange({ ...form, [key]: value });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close facility form"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <section
        className="relative z-10 w-full max-w-[560px] rounded-3xl bg-white p-6 shadow-2xl"
        aria-label={mode === "add" ? "Add facility form" : "Edit facility form"}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">
              Seller location
            </p>
            <h2 className="mt-1 text-2xl font-bold text-neutral-900">
              {mode === "add" ? "Add Location" : "Edit Location"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Store each plant by a recognizable facility name, then use that
              origin on listings.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close form"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-4">
          <Input
            id="seller-location-name"
            label="Facility name"
            placeholder="Example: Norco Plant"
            value={form.label}
            onChange={(event) => update("label", event.target.value)}
          />
          <Input
            id="seller-location-address"
            label="Facility address"
            placeholder="Example: 15536 River Rd, Norco, LA 70079"
            value={form.address}
            onChange={(event) => update("address", event.target.value)}
          />
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="text-sm font-semibold text-red-700 underline underline-offset-2 hover:text-red-800"
              >
                Delete location
              </button>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="md" onClick={onSave}>
              {mode === "add" ? "Save Location" : "Save Changes"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function SellerCompanyPage() {
  const [company, setCompany] = useState<SellerCompanyState>(defaultCompany);
  const [facilities, setFacilities] = useState<Facility[]>(defaultFacilities);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldEdit, setFieldEdit] = useState<{
    key: EditableField;
    label: string;
    value: string;
  } | null>(null);
  const [facilityMode, setFacilityMode] = useState<"add" | "edit" | null>(null);
  const [editingFacilityId, setEditingFacilityId] = useState<string | null>(null);
  const [facilityForm, setFacilityForm] = useState<FacilityForm>({
    label: "",
    address: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [documentMenuOpen, setDocumentMenuOpen] = useState(false);

  useEffect(() => {
    setCompany(readStored(COMPANY_KEY, defaultCompany));
    setFacilities(readStored(FACILITIES_KEY, defaultFacilities));
  }, []);

  const persistCompany = (next: SellerCompanyState) => {
    setCompany(next);
    writeStored(COMPANY_KEY, next);
  };

  const persistFacilities = (next: Facility[]) => {
    setFacilities(next);
    writeStored(FACILITIES_KEY, next);
  };

  const openFieldEdit = (key: EditableField, label: string) => {
    setFieldEdit({ key, label, value: company[key] });
    setError(null);
  };

  const saveField = () => {
    if (!fieldEdit) return;
    const value = fieldEdit.value.trim();
    if (!value) {
      setError(`Enter a value for ${fieldEdit.label}.`);
      return;
    }
    persistCompany({ ...company, [fieldEdit.key]: value });
    setNotice(`${fieldEdit.label} updated.`);
    setFieldEdit(null);
    setError(null);
  };

  const deleteLogo = () => {
    persistCompany({ ...company, logoText: "" });
    setNotice("Logo deleted.");
  };

  const openAddFacility = () => {
    setFacilityMode("add");
    setEditingFacilityId(null);
    setFacilityForm({ label: "", address: "" });
    setError(null);
  };

  const openEditFacility = (facility: Facility) => {
    setFacilityMode("edit");
    setEditingFacilityId(facility.id);
    setFacilityForm({ label: facility.label, address: facility.address });
    setError(null);
  };

  const closeFacilityModal = () => {
    setFacilityMode(null);
    setEditingFacilityId(null);
    setFacilityForm({ label: "", address: "" });
    setError(null);
  };

  const saveFacility = () => {
    const label = facilityForm.label.trim();
    const address = facilityForm.address.trim();
    if (!label || !address) {
      setError("Enter both a facility name and address.");
      return;
    }

    const nextFacility: Facility = {
      id: editingFacilityId ?? `seller-location-${Date.now().toString(36)}`,
      label,
      address,
    };
    const next =
      facilityMode === "edit" && editingFacilityId
        ? facilities.map((facility) =>
            facility.id === editingFacilityId ? nextFacility : facility,
          )
        : [...facilities, nextFacility];
    persistFacilities(next);
    setNotice(`${label} saved.`);
    closeFacilityModal();
  };

  const deleteFacility = () => {
    if (!editingFacilityId) return;
    const deleted = facilities.find((facility) => facility.id === editingFacilityId);
    persistFacilities(facilities.filter((facility) => facility.id !== editingFacilityId));
    setNotice(`${deleted?.label ?? "Location"} deleted.`);
    closeFacilityModal();
  };

  const deleteDocument = () => {
    persistCompany({
      ...company,
      certificationDocument: "No certification uploaded",
      complianceStatus: "Certification missing",
    });
    setDocumentMenuOpen(false);
    setNotice("Certification document deleted.");
  };

  const downloadDocument = () => {
    setDocumentMenuOpen(false);
    setNotice(`${company.certificationDocument} is ready to download.`);
  };

  return (
    <SellerLayout title="Company">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
        <h1 className="px-1 text-2xl font-bold text-neutral-900">Company</h1>

        {notice && (
          <div
            className="flex items-center justify-between gap-4 rounded-2xl bg-green-50 px-5 py-4 text-sm font-semibold text-green-800"
            style={{ border: "1px solid #BBF7D0" }}
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-green-900 underline underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        )}

        <SectionCard>
          <div
            className="flex items-center justify-between gap-6 px-6 py-5"
            style={{ borderBottom: "1px solid #F0F0F0" }}
          >
            <span className="w-[260px] shrink-0 text-sm text-neutral-700">Logo</span>
            <div className="flex-1">
              {company.logoText ? (
                <div className="flex size-14 items-center justify-center rounded-xl bg-neutral-900 text-xs font-bold text-white">
                  <span className="flex flex-col items-center leading-none">
                    <span className="text-base">◆</span>
                    <span className="mt-0.5 text-[10px] tracking-wider">
                      {company.logoText.slice(0, 8)}
                    </span>
                  </span>
                </div>
              ) : (
                <div className="flex size-14 items-center justify-center rounded-xl bg-neutral-100 text-[10px] font-bold uppercase text-neutral-400">
                  No logo
                </div>
              )}
            </div>
            <div className="flex items-center gap-5">
              <ActionLink onClick={deleteLogo}>Delete</ActionLink>
              <ActionLink onClick={() => openFieldEdit("logoText", "Logo text")}>
                Update
              </ActionLink>
            </div>
          </div>
          <InfoRow
            label="Company Name"
            value={company.companyName}
            action={
              <ActionLink onClick={() => openFieldEdit("companyName", "Company Name")}>
                Edit
              </ActionLink>
            }
          />
          <InfoRow
            label="Company Registration Number"
            value={company.registrationNumber}
            action={
              <ActionLink
                onClick={() =>
                  openFieldEdit("registrationNumber", "Company Registration Number")
                }
              >
                Edit
              </ActionLink>
            }
          />
          <InfoRow
            label="Industry Sector"
            value={company.industrySector}
            action={
              <ActionLink onClick={() => openFieldEdit("industrySector", "Industry Sector")}>
                Edit
              </ActionLink>
            }
          />
          <InfoRow
            label="Country"
            value={company.country}
            action={
              <ActionLink onClick={() => openFieldEdit("country", "Country")}>
                Edit
              </ActionLink>
            }
          />
          <InfoRow
            label="Business Address"
            value={company.businessAddress}
            action={
              <ActionLink onClick={() => openFieldEdit("businessAddress", "Business Address")}>
                Edit
              </ActionLink>
            }
          />
        </SectionCard>

        <SectionCard title="Locations">
          {facilities.map((facility) => (
            <InfoRow
              key={facility.id}
              label="Plant / facility"
              value={
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{facility.label}</span>
                  <span className="text-neutral-500">{facility.address}</span>
                </div>
              }
              action={
                <ActionLink onClick={() => openEditFacility(facility)}>Edit</ActionLink>
              }
            />
          ))}
          <div className="flex items-center justify-between gap-6 px-6 py-5">
            <span className="w-[260px] shrink-0 text-sm text-neutral-700">Add location</span>
            <div className="flex-1 text-sm text-neutral-500">
              Store each plant by a recognizable facility name, then use that origin on listings.
            </div>
            <ActionLink onClick={openAddFacility}>Add</ActionLink>
          </div>
        </SectionCard>

        <SectionCard title="Authorized Representative">
          <InfoRow
            label="Full name"
            value={company.representativeName}
            action={
              <ActionLink onClick={() => openFieldEdit("representativeName", "Full name")}>
                Edit
              </ActionLink>
            }
          />
          <InfoRow
            label="Job Title"
            value={company.representativeTitle}
            action={
              <ActionLink onClick={() => openFieldEdit("representativeTitle", "Job Title")}>
                Edit
              </ActionLink>
            }
          />
          <InfoRow
            label="Work Phone"
            value={company.representativePhone}
            action={
              <ActionLink onClick={() => openFieldEdit("representativePhone", "Work Phone")}>
                Edit
              </ActionLink>
            }
          />
          <InfoRow
            label="Work Email"
            value={company.representativeEmail}
            action={
              <ActionLink onClick={() => openFieldEdit("representativeEmail", "Work Email")}>
                Edit
              </ActionLink>
            }
          />
        </SectionCard>

        <SectionCard title="Document">
          <InfoRow
            label="Uploaded Certifications"
            value={company.certificationDocument}
            action={
              <div className="relative flex items-center gap-3">
                <ActionLink
                  onClick={() =>
                    openFieldEdit("certificationDocument", "Certification document")
                  }
                >
                  Update
                </ActionLink>
                <button
                  type="button"
                  aria-label="Document actions"
                  onClick={() => setDocumentMenuOpen((open) => !open)}
                  className="flex size-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                >
                  <MoreHorizontal className="size-4" />
                </button>
                {documentMenuOpen && (
                  <div
                    className="absolute right-0 top-9 z-20 w-[200px] rounded-xl bg-white py-1 shadow-xl"
                    style={{ border: "1px solid #F0F0F0" }}
                  >
                    <button
                      type="button"
                      onClick={downloadDocument}
                      className="w-full px-4 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={deleteDocument}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-700 hover:bg-red-50"
                    >
                      Delete document
                    </button>
                  </div>
                )}
              </div>
            }
          />
          <InfoRow
            label="Compliance Status"
            value={company.complianceStatus}
            action={
              <ActionLink onClick={() => openFieldEdit("complianceStatus", "Compliance Status")}>
                Edit
              </ActionLink>
            }
          />
        </SectionCard>
      </div>

      {fieldEdit && (
        <FieldModal
          title={`Edit ${fieldEdit.label}`}
          label={fieldEdit.label}
          value={fieldEdit.value}
          error={error}
          onChange={(value) => setFieldEdit({ ...fieldEdit, value })}
          onClose={() => {
            setFieldEdit(null);
            setError(null);
          }}
          onSave={saveField}
        />
      )}

      {facilityMode && (
        <FacilityModal
          mode={facilityMode}
          form={facilityForm}
          error={error}
          onChange={setFacilityForm}
          onClose={closeFacilityModal}
          onDelete={facilityMode === "edit" ? deleteFacility : undefined}
          onSave={saveFacility}
        />
      )}
    </SellerLayout>
  );
}
